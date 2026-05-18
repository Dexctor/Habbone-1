import 'server-only';

import { directusUrl, serviceToken } from './client';
import { appendDirectusParams, type DirectusQueryParams } from './fetch-core';

/**
 * Authenticated fetch to the Directus REST API.
 * Replaces ~24 manual fetch() calls across service files.
 *
 * Usage:
 * ```ts
 * const data = await directusFetch<{ data: MyType[] }>('/items/my_table?limit=10');
 * ```
 */
export async function directusFetch<T = unknown>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    params?: DirectusQueryParams;
  },
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${directusUrl}${path}`);
  appendDirectusParams(url, options?.params);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceToken}`,
  };

  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    headers,
    cache: 'no-store',
  };

  if (options?.body) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url.toString(), fetchOptions);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Directus ${res.status}: ${text.slice(0, 200)}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/**
 * Shorthand to count items via Directus meta.
 */
export async function directusCount(
  collection: string,
  filter?: Record<string, string>,
): Promise<number> {
  try {
    const json = await directusFetch<{ meta?: { total_count?: number } }>(`/items/${encodeURIComponent(collection)}`, {
      params: {
        limit: '0',
        meta: 'total_count',
        ...(filter ?? {}),
      },
    });
    return Number(json?.meta?.total_count ?? 0);
  } catch {
    return 0;
  }
}
