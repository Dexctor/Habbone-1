import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. The role types remain re-exported from `./types` so existing
 * consumers keep compiling.
 */

export {
  listRoles,
  createRole,
  updateRole,
  getRoleMemberCounts,
  countRoleMembers,
  deleteRole,
  getRoleById,
  setUserRole,
} from '@/server/supabase/roles';

export type CreateRoleInput = {
  name: string;
  description?: string | null;
  adminAccess?: boolean;
  appAccess?: boolean;
};

export type UpdateRoleInput = Partial<{
  name: string;
  description: string | null;
  adminAccess: boolean;
  appAccess: boolean;
}>;

export type { DirectusRoleLite, DirectusUserLite } from './types';
