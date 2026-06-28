import 'server-only';

import { pbList, pbOne, pbCreate, pbUpdate } from './helpers';
import { TABLES } from './tables';
import type { AdminUserLite, RoleLite } from './types';

/**
 * Roles service (PocketBase).
 *
 * PocketBase stores `admin_access` directly on the `roles` collection, so role
 * management is straightforward CRUD.
 */

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

type RoleRow = {
  id: string;
  name?: string;
  description?: string | null;
  admin_access?: boolean;
  app_access?: boolean;
};

function toLite(row: RoleRow): RoleLite {
  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? null,
    admin_access: row.admin_access ?? false,
    app_access: row.app_access ?? false,
  };
}

export async function listRoles(): Promise<RoleLite[]> {
  const rows = await pbList<RoleRow>(TABLES.roles, {
    sort: 'name',
    fields: 'id,name,description,admin_access,app_access',
    perPage: 200,
  }).catch(() => [] as RoleRow[]);
  return rows.map(toLite);
}

export async function createRole(role: CreateRoleInput): Promise<RoleLite> {
  const created = await pbCreate<RoleRow>(TABLES.roles, {
    name: role.name,
    description: role.description ?? null,
    admin_access: role.adminAccess ?? false,
    app_access: role.appAccess ?? true,
  });
  return toLite(created);
}

export async function updateRole(roleId: string, patch: UpdateRoleInput): Promise<RoleLite> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description ?? null;
  if (patch.adminAccess !== undefined) payload.admin_access = !!patch.adminAccess;
  if (patch.appAccess !== undefined) payload.app_access = patch.appAccess ?? true;
  const updated = await pbUpdate<RoleRow>(TABLES.roles, roleId, payload);
  return toLite(updated);
}

export async function getRoleById(roleId: string): Promise<RoleLite | null> {
  const row = await pbOne<RoleRow>(TABLES.roles, roleId, {
    fields: 'id,name,description,admin_access,app_access',
  });
  return row ? toLite(row) : null;
}

/** Assign a role (by id) to a user. */
export async function setUserRole(userId: string, roleId: string) {
  return pbUpdate(TABLES.users, userId, { role: roleId });
}

export type { AdminUserLite, RoleLite };
