import 'server-only';

import * as supabaseUsers from '@/server/supabase/users';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. The signatures preserve the legacy ones (some functions had
 * extra string args that are no-ops under Supabase since the schema uses
 * directus_role_id directly).
 */

export {
  getLegacyUserByEmail,
  searchLegacyUsuarios,
  setLegacyUserBanStatus,
  deleteLegacyUser,
  adminListUsers,
} from '@/server/supabase/users';

export async function setLegacyUserRole(userId: number | string, _roleName: string) {
  return supabaseUsers.setLegacyUserRole(userId);
}

export async function setLegacyUserRoleId(
  userId: number | string,
  directusRoleId: string,
  _roleName?: string,
) {
  return supabaseUsers.setLegacyUserRoleId(userId, directusRoleId);
}

export type { LegacyUserLite } from './types';
