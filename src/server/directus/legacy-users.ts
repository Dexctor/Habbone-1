import 'server-only';

import {
  directusService,
  directusUrl,
  serviceToken,
  rItems,
  uItem,
  dItem,
} from './client';
import { TABLES, USE_V2 } from './tables';
import type { LegacyUserLite, CollectionResponse } from './types';
import { isSupabaseDataEnabled } from '@/server/supabase/config';
import * as supabaseUsers from '@/server/supabase/users';

const USERS_TABLE = TABLES.users;

/* ------------------------------------------------------------------ */
/*  Field lists                                                        */
/* ------------------------------------------------------------------ */

const SEARCH_FIELDS = USE_V2
  ? ['id', 'email', 'nick', 'active', 'banned', 'directus_role_id']
  : ['id', 'email', 'nick', 'status', 'role', 'directus_role_id', 'banido', 'ativado'];

const LIST_FIELDS = USE_V2
  ? ['id', 'nick', 'email', 'active', 'banned', 'created_at']
  : ['id', 'nick', 'email', 'ativado', 'banido', 'status', 'data_criacao'];

const LIST_SORT = USE_V2 ? ['-created_at'] : ['-data_criacao'];

/* ------------------------------------------------------------------ */
/*  Translators v2 → LegacyUserLite                                    */
/*                                                                     */
/*  The app keeps speaking "legacy lite" (banido='s', ativado='n',     */
/*  status string). When v2 is active we translate on the way out.     */
/* ------------------------------------------------------------------ */

function v2ToLegacyLite(row: any): LegacyUserLite {
  return {
    id: row.id,
    email: row.email ?? null,
    nick: row.nick ?? null,
    status: row.banned ? 'suspended' : row.active ? 'active' : 'inactive',
    role: null, // legacy had a plain string here; rely on directus_role_id now
    directus_role_id: row.directus_role_id ?? null,
    banido: row.banned ? 's' : 'n',
    ativado: row.active ? 's' : 'n',
  };
}

function mapListRow(row: any): Record<string, unknown> {
  // adminListUsers callers read fields like `data_criacao` directly
  if (!USE_V2) return row;
  return {
    id: row.id,
    nick: row.nick,
    email: row.email,
    ativado: row.active ? 's' : 'n',
    banido: row.banned ? 's' : 'n',
    status: row.banned ? 'suspended' : row.active ? 'active' : 'inactive',
    data_criacao: row.created_at ? Math.floor(Date.parse(row.created_at) / 1000) : null,
  };
}

/* ------------------------------------------------------------------ */
/*  getLegacyUserByEmail                                               */
/* ------------------------------------------------------------------ */

export async function getLegacyUserByEmail(email?: string | null) {
  if (isSupabaseDataEnabled()) return supabaseUsers.getLegacyUserByEmail(email);

  const e = (email || '').trim();
  if (!e) return null;

  const fields = USE_V2
    ? ['id', 'email', 'banned', 'active']
    : ['id', 'email', 'banido', 'ativado'];

  const rows = (await directusService
    .request(
      rItems(USERS_TABLE as any, {
        filter: { email: { _eq: e } } as any,
        fields: fields as any,
        limit: 1 as any,
      } as any),
    )
    .catch(() => [])) as any[];

  if (!Array.isArray(rows) || rows.length === 0) return null;
  if (!USE_V2) return rows[0];
  const r = rows[0];
  return {
    id: r.id,
    email: r.email ?? null,
    banido: r.banned ? 's' : 'n',
    ativado: r.active ? 's' : 'n',
  };
}

/* ------------------------------------------------------------------ */
/*  searchLegacyUsuarios                                               */
/* ------------------------------------------------------------------ */

export async function searchLegacyUsuarios(
  q?: string,
  limit = 20,
  page = 1,
  filters?: { roleName?: string | null; roleId?: string | null; status?: string | null },
): Promise<{ items: LegacyUserLite[]; total: number }> {
  if (isSupabaseDataEnabled()) return supabaseUsers.searchLegacyUsuarios(q, limit, page, filters);

  const applyFilters = (params: URLSearchParams) => {
    if (q) params.set('search', q);
    if (filters?.roleId) params.set('filter[directus_role_id][_eq]', String(filters.roleId));
    else if (filters?.roleName && !USE_V2) params.set('filter[role][_eq]', String(filters.roleName));
    if (filters?.status) {
      if (USE_V2) {
        // map legacy status string -> v2 booleans
        if (filters.status === 'suspended') params.set('filter[banned][_eq]', 'true');
        else if (filters.status === 'active') {
          params.set('filter[banned][_eq]', 'false');
          params.set('filter[active][_eq]', 'true');
        } else if (filters.status === 'inactive') {
          params.set('filter[active][_eq]', 'false');
        }
      } else {
        params.set('filter[status][_eq]', String(filters.status));
      }
    }
  };

  const fetchTotalCount = async (): Promise<number | null> => {
    const totalUrl = new URL(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}`);
    applyFilters(totalUrl.searchParams);
    totalUrl.searchParams.set('limit', '0');
    totalUrl.searchParams.set('meta', 'total_count');
    try {
      const response = await fetch(totalUrl.toString(), {
        headers: { Authorization: `Bearer ${serviceToken}` },
        cache: 'no-store',
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as CollectionResponse<LegacyUserLite>;
      return typeof payload?.meta?.total_count === 'number' ? payload.meta.total_count : null;
    } catch {
      return null;
    }
  };

  try {
    const params: Record<string, unknown> = {
      limit,
      page,
      fields: SEARCH_FIELDS,
    };
    if (q) params.search = q;
    const filter: Record<string, unknown> = {};
    if (filters?.roleId) filter.directus_role_id = { _eq: filters.roleId };
    else if (filters?.roleName && !USE_V2) filter.role = { _eq: filters.roleName };
    if (filters?.status) {
      if (USE_V2) {
        if (filters.status === 'suspended') filter.banned = { _eq: true };
        else if (filters.status === 'active') {
          filter.banned = { _eq: false };
          filter.active = { _eq: true };
        } else if (filters.status === 'inactive') {
          filter.active = { _eq: false };
        }
      } else {
        filter.status = { _eq: filters.status };
      }
    }
    if (Object.keys(filter).length > 0) {
      params.filter = filter as any;
    }
    const rawItems = (await directusService
      .request(rItems(USERS_TABLE as any, params as any))
      .catch(() => [])) as any[];
    const items = Array.isArray(rawItems) ? rawItems.map((r) => (USE_V2 ? v2ToLegacyLite(r) : r)) : [];

    if (items.length > 0) {
      const total = await fetchTotalCount();
      return { items, total: total ?? items.length };
    }
  } catch { }

  // Fallback path
  try {
    const url = new URL(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));
    url.searchParams.set('fields', SEARCH_FIELDS.join(','));
    applyFilters(url.searchParams);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`USERS_FETCH_FAILED:${response.status}`);
    const payload = (await response.json()) as CollectionResponse<any>;
    const raw = Array.isArray(payload?.data) ? payload.data : [];
    const items = raw.map((r) => (USE_V2 ? v2ToLegacyLite(r) : r));
    const total = await fetchTotalCount();
    return { items, total: total ?? items.length };
  } catch { }

  return { items: [], total: 0 };
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export async function setLegacyUserRole(userId: number | string, roleName: string) {
  if (isSupabaseDataEnabled()) return supabaseUsers.setLegacyUserRole(userId);

  // In v2 there is no plain `role` string column — rely on setLegacyUserRoleId.
  if (USE_V2) {
    // no-op kept for API compat
    return { id: userId };
  }
  const payload: Partial<LegacyUserLite> = { role: roleName };
  return directusService.request(uItem(USERS_TABLE as any, String(userId), payload as any));
}

export async function setLegacyUserRoleId(userId: number | string, directusRoleId: string, roleName?: string) {
  if (isSupabaseDataEnabled()) return supabaseUsers.setLegacyUserRoleId(userId, directusRoleId);

  // Bypass the @directus/sdk and PATCH directly. We hit a case in prod where
  // the SDK accepted the call, returned success, but the row never changed.
  // A raw PATCH gives us a real HTTP status + response body to surface errors.
  const payload: Record<string, unknown> = USE_V2
    ? { directus_role_id: directusRoleId }
    : roleName
      ? { directus_role_id: directusRoleId, role: roleName }
      : { directus_role_id: directusRoleId };

  const url = `${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${encodeURIComponent(String(userId))}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${serviceToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('[setLegacyUserRoleId] Directus PATCH failed', {
      userId,
      status: res.status,
      response: text.slice(0, 500),
    });
    throw new Error(`DIRECTUS_PATCH_FAILED_${res.status}`);
  }
  try {
    return JSON.parse(text)?.data ?? null;
  } catch {
    return null;
  }
}

export async function setLegacyUserBanStatus(userId: number | string, banned: boolean) {
  if (isSupabaseDataEnabled()) return supabaseUsers.setLegacyUserBanStatus(userId, banned);

  if (USE_V2) {
    const payload = { banned, active: !banned };
    return directusService.request(uItem(USERS_TABLE as any, String(userId), payload as any));
  }
  // Legacy: only write banido + ativado (status ENUM rejects 'suspended')
  const payload: Partial<LegacyUserLite> = {
    banido: banned ? 's' : 'n',
    ativado: banned ? 'n' : 's',
  };
  return directusService.request(uItem(USERS_TABLE as any, String(userId), payload as any));
}

export async function deleteLegacyUser(userId: number | string) {
  if (isSupabaseDataEnabled()) return supabaseUsers.deleteLegacyUser(userId);

  return directusService.request(dItem(USERS_TABLE as any, String(userId)));
}

export async function adminListUsers(limit = 500) {
  if (isSupabaseDataEnabled()) return supabaseUsers.adminListUsers(limit);

  const rows = (await directusService.request(
    rItems(USERS_TABLE as any, {
      limit,
      sort: LIST_SORT,
      fields: LIST_FIELDS,
    } as any),
  )) as any[];
  if (!USE_V2) return rows;
  return rows.map(mapListRow);
}

export type { LegacyUserLite };
