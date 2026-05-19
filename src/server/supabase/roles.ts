import 'server-only';

import type { DirectusRoleLite } from '@/server/directus/types';
import { tableName } from './config';
import { queryOne, queryRows } from './db';

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  admin_access: boolean | null;
  app_access: boolean | null;
  sort?: number | null;
};

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

function mapRole(row: RoleRow): DirectusRoleLite {
  return {
    id: String(row.id),
    name: row.name ?? '',
    description: row.description ?? null,
    admin_access: row.admin_access === true,
    app_access: row.app_access !== false,
  };
}

export async function listRoles(): Promise<DirectusRoleLite[]> {
  const rows = await queryRows<RoleRow>(
    `select id::text as id, name, description, admin_access, app_access, sort
     from ${tableName('app_roles')}
     order by sort asc nulls last, name asc
     limit 100`,
  );
  return rows.map(mapRole);
}

export async function createRole(role: CreateRoleInput): Promise<DirectusRoleLite> {
  const row = await queryOne<RoleRow>(
    `insert into ${tableName('app_roles')} (name, description, admin_access, app_access)
     values ($1, $2, $3, $4)
     returning id::text as id, name, description, admin_access, app_access, sort`,
    [
      role.name,
      role.description ?? null,
      role.adminAccess ?? false,
      role.appAccess ?? true,
    ],
  );
  if (!row) throw new Error('ROLE_CREATE_FAILED');
  return mapRole(row);
}

export async function updateRole(roleId: string, patch: UpdateRoleInput): Promise<DirectusRoleLite> {
  const values: unknown[] = [roleId];
  const assignments: string[] = ['updated_at = now()'];
  if (patch.name !== undefined) {
    values.push(patch.name);
    assignments.push(`name = $${values.length}`);
  }
  if (patch.description !== undefined) {
    values.push(patch.description ?? null);
    assignments.push(`description = $${values.length}`);
  }
  if (patch.adminAccess !== undefined) {
    values.push(!!patch.adminAccess);
    assignments.push(`admin_access = $${values.length}`);
  }
  if (patch.appAccess !== undefined) {
    values.push(patch.appAccess ?? true);
    assignments.push(`app_access = $${values.length}`);
  }

  const row = await queryOne<RoleRow>(
    `update ${tableName('app_roles')}
     set ${assignments.join(', ')}
     where id = $1::uuid
     returning id::text as id, name, description, admin_access, app_access, sort`,
    values,
  );
  if (!row) throw new Error('ROLE_NOT_FOUND');
  return mapRole(row);
}

export async function getRoleMemberCounts(): Promise<{ counts: Record<string, number>; withoutRole: number }> {
  const rows = await queryRows<{ directus_role_id: string | null; count: string }>(
    `select directus_role_id, count(*)::text as count
     from ${tableName('users')}
     group by directus_role_id`,
  );

  const counts: Record<string, number> = {};
  let withoutRole = 0;
  for (const row of rows) {
    const count = Number(row.count) || 0;
    if (row.directus_role_id) counts[String(row.directus_role_id)] = count;
    else withoutRole += count;
  }
  return { counts, withoutRole };
}

export async function countRoleMembers(roleId: string): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `select count(*)::text as count from ${tableName('users')} where directus_role_id = $1`,
    [roleId],
  );
  return Number(row?.count) || 0;
}

export async function deleteRole(roleId: string): Promise<boolean> {
  const rows = await queryRows<{ id: string }>(
    `delete from ${tableName('app_roles')} where id = $1::uuid returning id::text as id`,
    [roleId],
  );
  return rows.length > 0;
}

export async function getRoleById(roleId: string): Promise<DirectusRoleLite | null> {
  const row = await queryOne<RoleRow>(
    `select id::text as id, name, description, admin_access, app_access, sort
     from ${tableName('app_roles')}
     where id = $1::uuid
     limit 1`,
    [roleId],
  );
  return row ? mapRole(row) : null;
}

export async function setUserRole(userId: string, roleId: string) {
  return queryOne<{ id: number }>(
    `update ${tableName('users')} set directus_role_id = $2 where id = $1 returning id`,
    [userId, roleId],
  );
}
