import 'server-only';

import {
  directusService,
  directusUrl,
  serviceToken,
  rItems,
  rItem,
  uItem,
  dItem,
} from './client';
import type { DirectusUserLite, CollectionResponse } from './types';


export async function getDirectusUserById(userId: string): Promise<DirectusUserLite | null> {
  const row = await directusService
    .request(
      rItem('directus_users', userId, {
        fields: [
          'id',
          'email',
          'first_name',
          'last_name',
          'status',
          'role.id',
          'role.name',
          'role.admin_access',
          'role.app_access',
        ] as any,
      } as any),
    )
    .catch(() => null);
  return (row ?? null) as DirectusUserLite | null;
}

export async function searchUsers(
  q?: string,
  roleId?: string,
  status?: string,
  limit = 20,
  page = 1,
): Promise<{ items: DirectusUserLite[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (roleId) filter.role = { _eq: roleId };
  if (status) filter.status = { _eq: status };

  const items = (await directusService
    .request(
      rItems('directus_users', {
        search: q || undefined,
        limit,
        page,
        filter: Object.keys(filter).length ? (filter as any) : undefined,
        fields: [
          'id',
          'email',
          'first_name',
          'last_name',
          'status',
          'role.id',
          'role.name',
          'role.admin_access',
          'role.app_access',
        ] as any,
        sort: ['email'] as any,
      } as any),
    )
    .catch(() => [])) as DirectusUserLite[];

  const url = new URL(`${directusUrl}/items/directus_users`);
  if (q) url.searchParams.set('search', q);
  if (roleId) url.searchParams.set('filter[role][_eq]', roleId);
  if (status) url.searchParams.set('filter[status][_eq]', status);
  url.searchParams.set('limit', '0');
  url.searchParams.set('meta', 'total_count');
  let total = items.length;
  try {
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    });
    if (response.ok) {
      const json = (await response.json()) as CollectionResponse<DirectusUserLite>;
      if (typeof json?.meta?.total_count === 'number') {
        total = json.meta.total_count;
      }
    }
  } catch { }

  return { items, total };
}

export async function setDirectusUserStatus(userId: string, status: 'active' | 'suspended') {
  const payload: Partial<DirectusUserLite> = { status };
  return directusService.request(uItem('directus_users', userId, payload as any));
}

export async function deleteDirectusUser(userId: string) {
  return directusService.request(dItem('directus_users', userId));
}

export type { DirectusUserLite };
