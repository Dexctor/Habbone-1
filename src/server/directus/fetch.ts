import 'server-only';

import { pbCreate, pbCount } from './pb-helpers';

/**
 * Compatibility shims kept during the Directus -> PocketBase migration.
 *
 * The old `directusFetch` was a thin authenticated REST wrapper around the
 * Directus API. Only a couple of call sites still use these; the rest of the
 * service layer has moved to the typed helpers in ./pb-helpers. These shims
 * route the remaining legacy-shaped calls onto PocketBase.
 *
 * Prefer pb-helpers directly in new/ported code. These will be removed once
 * the last call sites (badges create, admin count) are ported.
 */

/** Extract the collection name from a legacy "/items/<collection>" path. */
function collectionFromPath(path: string): string {
  const m = /^\/items\/([^/?]+)/.exec(path);
  if (!m) {
    throw new Error(`directusFetch shim: unsupported path "${path}" (expected /items/<collection>)`);
  }
  return decodeURIComponent(m[1]);
}

/**
 * Minimal compatibility wrapper. Supports the one remaining shape used in the
 * codebase: POST /items/<collection> with a JSON body (record creation).
 */
export async function directusFetch<T = any>(
  path: string,
  options?: { method?: string; body?: unknown; params?: Record<string, string> },
): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const collection = collectionFromPath(path);

  if (method === 'POST') {
    return (await pbCreate(collection, (options?.body ?? {}) as Record<string, unknown>)) as T;
  }

  throw new Error(
    `directusFetch shim: method ${method} on ${path} is not supported — use pb-helpers (pbList/pbOne/...) instead`,
  );
}

/** Count items in a collection (optionally not filtered). */
export async function directusCount(
  collection: string,
  _filter?: Record<string, string>,
): Promise<number> {
  // The legacy filter shape (querystring) is not translated here; the only
  // caller (admin.ts) passes no filter. Filtered counts use pbCount directly.
  return pbCount(collection);
}
