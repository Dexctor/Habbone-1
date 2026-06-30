import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getRoleById } from '@/server/pocketbase/roles';
import { getUserBySessionIdentity } from '@/server/pocketbase/users';

export type AdminAssertion = { userId: string | null };

export async function assertAdmin(): Promise<AdminAssertion> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const err = new Error('UNAUTHORIZED') as Error & { status: number };
    err.status = 401;
    throw err;
  }
  const sessionUser = session.user;

  const forbid = () => {
    const err = new Error('FORBIDDEN') as Error & { status: number };
    err.status = 403;
    throw err;
  };

  const currentUser = await getUserBySessionIdentity({
    id: sessionUser.id,
    nick: sessionUser.nick,
    hotel: sessionUser.hotel,
  }).catch(() => null);

  const roleId = currentUser?.role_id || sessionUser.roleId;
  if (roleId) {
    try {
      const roleRow = await getRoleById(String(roleId));
      if (roleRow?.admin_access === true) return { userId: currentUser?.id ?? sessionUser.id ?? null };
      if (sessionUser.adminAccess !== true || sessionUser.role !== 'admin') forbid();
    } catch {
      // Backend unreachable -> trust the token only if it already says admin.
      if (sessionUser.adminAccess !== true || sessionUser.role !== 'admin') forbid();
    }
  } else {
    if (sessionUser.adminAccess !== true || sessionUser.role !== 'admin') forbid();
  }

  return { userId: currentUser?.id ?? sessionUser.id ?? null };
}
