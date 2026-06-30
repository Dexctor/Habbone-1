import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getRoleById } from '@/server/pocketbase/roles';

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

  // Quick check: the JWT role must be 'admin'
  if (sessionUser.role !== 'admin') {
    forbid();
  }

  const roleId = sessionUser.roleId;
  if (roleId) {
    try {
      const roleRow = await getRoleById(String(roleId));
      if (!roleRow || roleRow.admin_access !== true) {
        if (sessionUser.adminAccess !== true) forbid();
      }
    } catch {
      // Backend unreachable -> trust the token only if it already says admin.
      if (sessionUser.adminAccess !== true) forbid();
    }
  } else {
    if (sessionUser.adminAccess !== true) forbid();
  }

  return { userId: sessionUser.id ?? null };
}
