import 'server-only';

import {
  directusService,
  directusUrl,
  serviceToken,
  USERS_TABLE,
  rItems,
  uItem,
  dItem,
} from './client';
import type { LegacyUserLite, CollectionResponse } from './types';

export async function getLegacyUserByEmail(email?: string | null) {
  const e = (email || '').trim();
  if (!e) return null;
  const rows = await directusService
    .request(
      rItems(USERS_TABLE as any, {
        filter: { email: { _eq: e } } as any,
        fields: ['id', 'email', 'banido', 'ativado'] as any,
        limit: 1 as any,
      } as any),
    )
    .catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function searchLegacyUsuarios(
  q?: string,
  limit = 20,
  page = 1,
  filters?: { roleName?: string | null; roleId?: string | null; status?: string | null },
): Promise<{ items: LegacyUserLite[]; total: number }> {
  const applyFilters = (params: URLSearchParams) => {
    if (q) params.set('search', q);
    if (filters?.roleId) params.set('filter[directus_role_id][_eq]', String(filters.roleId));
    else if (filters?.roleName) params.set('filter[role][_eq]', String(filters.roleName));
    if (filters?.status) params.set('filter[status][_eq]', String(filters.status));
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
      fields: ['id', 'email', 'nick', 'status', 'role', 'directus_role_id', 'banido', 'ativado'],
    };
    if (q) params.search = q;
    const filter: Record<string, unknown> = {};
    if (filters?.roleId) filter.directus_role_id = { _eq: filters.roleId };
    else if (filters?.roleName) filter.role = { _eq: filters.roleName };
    if (filters?.status) filter.status = { _eq: filters.status };
    if (Object.keys(filter).length > 0) {
      params.filter = filter as any;
    }
    const items = (await directusService
      .request(rItems(USERS_TABLE as any, params as any))
      .catch(() => [])) as LegacyUserLite[];

    if (Array.isArray(items) && items.length > 0) {
      const total = await fetchTotalCount();
      return { items, total: total ?? items.length };
    }
  } catch { }

  try {
    const url = new URL(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('page', String(page));
    url.searchParams.set('fields', 'id,email,nick,status,role,directus_role_id,banido,ativado');
    applyFilters(url.searchParams);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`LEGACY_USERS_FETCH_FAILED:${response.status}`);
    const payload = (await response.json()) as CollectionResponse<LegacyUserLite>;
    const items = Array.isArray(payload?.data) ? payload.data : [];
    const total = await fetchTotalCount();
    return { items, total: total ?? items.length };
  } catch { }

  return { items: [], total: 0 };
}

export async function setLegacyUserRole(userId: number | string, roleName: string) {
  const payload: Partial<LegacyUserLite> = { role: roleName };
  return directusService.request(uItem(USERS_TABLE as any, String(userId), payload as any));
}

export async function setLegacyUserRoleId(userId: number | string, directusRoleId: string, roleName?: string) {
  const payload: Partial<LegacyUserLite> = { directus_role_id: directusRoleId };
  if (roleName) payload.role = roleName;
  return directusService.request(uItem(USERS_TABLE as any, String(userId), payload as any));
}

export async function setLegacyUserBanStatus(userId: number | string, banned: boolean) {
  // Only write banido + ativado — the legacy `status` column has a DB trigger
  // that nullifies some required field when it changes, which makes Directus
  // reject the PATCH with CONTAINS_NULL_VALUES. The admin search already
  // derives "suspended | active" from banido/ativado, so we keep status out.
  const payload: Partial<LegacyUserLite> = {
    banido: banned ? 's' : 'n',
    ativado: banned ? 'n' : 's',
  };
  return directusService.request(uItem(USERS_TABLE as any, String(userId), payload as any));
}

export async function deleteLegacyUser(userId: number | string) {
  return directusService.request(dItem(USERS_TABLE as any, String(userId)));
}

export async function adminListUsers(limit = 500) {
  return directusService.request(
    rItems(USERS_TABLE as any, {
      limit,
      sort: ['-data_criacao'],
      fields: ['id', 'nick', 'email', 'ativado', 'banido', 'status', 'data_criacao'],
    } as any),
  );
}

export type { LegacyUserLite };
