import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getRoleById } from '@/server/directus/roles';

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

  // Verify against Directus role (single source of truth: usuarios.directus_role_id)
  const directusRoleId = sessionUser.directusRoleId;
  if (directusRoleId) {
    try {
      const roleRow = await getRoleById(String(directusRoleId));
      if (!roleRow || roleRow.admin_access !== true) {
        // Role exists but doesn't have admin_access -> deny
        // (unless ADMIN_NICKS fallback granted access, which is already in the token)
        if (sessionUser.directusAdminAccess !== true) forbid();
      }
    } catch {
      // Directus unreachable -> trust the token if it says admin
      if (sessionUser.directusAdminAccess !== true) forbid();
    }
  } else {
    // No directus_role_id at all -> only ADMIN_NICKS fallback can grant access
    if (sessionUser.directusAdminAccess !== true) forbid();
  }

  return { userId: sessionUser.id ?? null };
}
