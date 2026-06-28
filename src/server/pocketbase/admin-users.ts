import 'server-only';

import { pbList, pbOne, pbUpdate, pbDelete, pbCount } from './helpers';
import { TABLES } from './tables';
import type { AdminUserLite } from './types';

/**
 * Admin users service (PocketBase).
 *
 * App users live in the PocketBase `users` auth collection with a `role`
 * relation. The returned shape is still compatible with the admin UI.
 */

const USERS = TABLES.users;

const USER_FIELDS = 'id,email,nick,active,banned,role,expand.role.id,expand.role.name,expand.role.admin_access,expand.role.app_access';

function toLite(row: any): AdminUserLite {
  const role = row?.expand?.role;
  return {
    id: String(row.id),
    email: row.email ?? null,
    first_name: row.nick ?? null, // map nick -> first_name slot for UI compat
    last_name: null,
    status: row.banned ? 'suspended' : row.active ? 'active' : 'inactive',
    role: role
      ? {
          id: String(role.id),
          name: role.name,
          admin_access: role.admin_access === true,
          app_access: role.app_access === true,
        }
      : (row.role ? String(row.role) : null),
  };
}

export async function getAdminUserById(userId: string): Promise<AdminUserLite | null> {
  const row = await pbOne<any>(USERS, userId, { fields: USER_FIELDS, expand: 'role' }).catch(
    () => null,
  );
  return row ? toLite(row) : null;
}

export async function searchUsers(
  q?: string,
  roleId?: string,
  status?: string,
  limit = 20,
  page = 1,
): Promise<{ items: AdminUserLite[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (roleId) filter.role = { _eq: roleId };
  if (status === 'active') filter.active = { _eq: true };
  if (status === 'suspended') filter.banned = { _eq: true };
  // free-text search across nick/email
  if (q) {
    filter._or = [{ nick: { _contains: q } }, { email: { _contains: q } }];
  }
  const hasFilter = Object.keys(filter).length > 0;

  const [items, total] = await Promise.all([
    pbList<any>(USERS, {
      filter: hasFilter ? filter : undefined,
      perPage: limit,
      page,
      sort: 'nick',
      fields: USER_FIELDS,
      expand: 'role',
    }).catch(() => [] as any[]),
    pbCount(USERS, hasFilter ? filter : undefined).catch(() => 0),
  ]);

  return { items: items.map(toLite), total };
}

export async function setAdminUserStatus(userId: string, status: 'active' | 'suspended') {
  const payload =
    status === 'suspended' ? { banned: true } : { banned: false, active: true };
  return pbUpdate(USERS, userId, payload);
}

export async function deleteAdminUser(userId: string) {
  return pbDelete(USERS, userId);
}

export type { AdminUserLite };
