import 'server-only';

import { pbList, pbFirst, pbUpdate, pbDelete, pbCount } from './pb-helpers';
import { TABLES } from './tables';
import type { LegacyUserLite } from './types';

const USERS_TABLE = TABLES.users;

/**
 * Admin "users" service (PocketBase).
 *
 * Keeps the legacy-lite output shape the admin UI expects (banido='s',
 * ativado='n', status string). In v2 the role is a relation (`role`), exposed
 * under the legacy name `directus_role_id`.
 */

const SEARCH_FIELDS = 'id,email,nick,active,banned,role';
const LIST_FIELDS = 'id,nick,email,active,banned,created';
const LIST_SORT = '-created';

function v2ToLegacyLite(row: any): LegacyUserLite {
  return {
    id: String(row.id),
    email: row.email ?? null,
    nick: row.nick ?? null,
    status: row.banned ? 'suspended' : row.active ? 'active' : 'inactive',
    role: null,
    directus_role_id: row.role ? String(row.role) : null,
    banido: row.banned ? 's' : 'n',
    ativado: row.active ? 's' : 'n',
  };
}

function mapListRow(row: any): Record<string, unknown> {
  return {
    id: String(row.id),
    nick: row.nick,
    email: row.email,
    ativado: row.active ? 's' : 'n',
    banido: row.banned ? 's' : 'n',
    status: row.banned ? 'suspended' : row.active ? 'active' : 'inactive',
    data_criacao: row.created ? Math.floor(Date.parse(row.created) / 1000) : null,
  };
}

/* getLegacyUserByEmail ------------------------------------------------ */

export async function getLegacyUserByEmail(email?: string | null) {
  const e = (email || '').trim();
  if (!e) return null;
  const r = await pbFirst<any>(
    USERS_TABLE,
    { email: { _eq: e } },
    { fields: 'id,email,banned,active' },
  ).catch(() => null);
  if (!r) return null;
  return {
    id: String(r.id),
    email: r.email ?? null,
    banido: r.banned ? 's' : 'n',
    ativado: r.active ? 's' : 'n',
  };
}

/* searchLegacyUsuarios ----------------------------------------------- */

export async function searchLegacyUsuarios(
  q?: string,
  limit = 20,
  page = 1,
  filters?: { roleName?: string | null; roleId?: string | null; status?: string | null },
): Promise<{ items: LegacyUserLite[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (filters?.roleId) filter.role = { _eq: filters.roleId };
  if (filters?.status === 'suspended') filter.banned = { _eq: true };
  else if (filters?.status === 'active') {
    filter.banned = { _eq: false };
    filter.active = { _eq: true };
  } else if (filters?.status === 'inactive') {
    filter.active = { _eq: false };
  }
  if (q) {
    filter._or = [{ nick: { _contains: q } }, { email: { _contains: q } }];
  }
  const hasFilter = Object.keys(filter).length > 0;

  try {
    const [rawItems, total] = await Promise.all([
      pbList<any>(USERS_TABLE, {
        filter: hasFilter ? filter : undefined,
        perPage: limit,
        page,
        sort: 'nick',
        fields: SEARCH_FIELDS,
      }),
      pbCount(USERS_TABLE, hasFilter ? filter : undefined),
    ]);
    return { items: rawItems.map(v2ToLegacyLite), total };
  } catch {
    return { items: [], total: 0 };
  }
}

/* Mutations ----------------------------------------------------------- */

export async function setLegacyUserRole(userId: string, _roleName: string) {
  // v2 has no plain role string column — use setLegacyUserRoleId. Kept for API compat.
  return { id: userId };
}

export async function setLegacyUserRoleId(userId: string, directusRoleId: string, _roleName?: string) {
  // v2: the role is a relation. Direct update (the old raw-PATCH workaround for
  // the Directus SDK is no longer needed).
  return pbUpdate(USERS_TABLE, String(userId), { role: directusRoleId });
}

export async function setLegacyUserBanStatus(userId: string, banned: boolean) {
  return pbUpdate(USERS_TABLE, String(userId), { banned, active: !banned });
}

export async function deleteLegacyUser(userId: string) {
  return pbDelete(USERS_TABLE, String(userId));
}

export async function adminListUsers(limit = 500) {
  const rows = await pbList<any>(USERS_TABLE, {
    perPage: limit,
    sort: LIST_SORT,
    fields: LIST_FIELDS,
  });
  return rows.map(mapListRow);
}

export type { LegacyUserLite };
