import 'server-only';

import { pbList, pbOne, pbCreate, pbUpdate } from './pb-helpers';
import { TABLES } from './tables';
import type { DirectusRoleLite, DirectusUserLite } from './types';

/**
 * Roles service (PocketBase).
 *
 * Big simplification vs Directus: in Directus v11+ `admin_access` lived on
 * *policies* and required resolving a role's policy array (cache + extra calls).
 * In PocketBase, `admin_access` is a plain boolean column on the `roles`
 * collection, so this whole module collapses to straightforward CRUD.
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

function toLite(row: RoleRow): DirectusRoleLite {
  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? null,
    admin_access: row.admin_access ?? false,
    app_access: row.app_access ?? false,
  };
}

export async function listRoles(): Promise<DirectusRoleLite[]> {
  const rows = await pbList<RoleRow>(TABLES.roles, {
    sort: 'name',
    fields: 'id,name,description,admin_access,app_access',
    perPage: 200,
  }).catch(() => [] as RoleRow[]);
  return rows.map(toLite);
}

export async function createRole(role: CreateRoleInput): Promise<DirectusRoleLite> {
  const created = await pbCreate<RoleRow>(TABLES.roles, {
    name: role.name,
    description: role.description ?? null,
    admin_access: role.adminAccess ?? false,
    app_access: role.appAccess ?? true,
  });
  return toLite(created);
}

export async function updateRole(roleId: string, patch: UpdateRoleInput): Promise<DirectusRoleLite> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.description !== undefined) payload.description = patch.description ?? null;
  if (patch.adminAccess !== undefined) payload.admin_access = !!patch.adminAccess;
  if (patch.appAccess !== undefined) payload.app_access = patch.appAccess ?? true;
  const updated = await pbUpdate<RoleRow>(TABLES.roles, roleId, payload);
  return toLite(updated);
}

export async function getRoleById(roleId: string): Promise<DirectusRoleLite | null> {
  const row = await pbOne<RoleRow>(TABLES.roles, roleId, {
    fields: 'id,name,description,admin_access,app_access',
  });
  return row ? toLite(row) : null;
}

/** Assign a role (by id) to a user. */
export async function setUserRole(userId: string, roleId: string) {
  return pbUpdate(TABLES.users, userId, { role: roleId });
}

export type { DirectusRoleLite, DirectusUserLite };
