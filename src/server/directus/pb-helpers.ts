import 'server-only';

import { pbAdmin } from './client';
import { directusFilterToPB } from './pb-filter';

/**
 * Typed PocketBase data-access helpers used by the service layer.
 *
 * They accept a Directus-flavoured options shape (filter object, sort string,
 * fields, pagination) so the 20 service files keep building familiar queries,
 * but execute them against PocketBase. Filters are translated + escaped by
 * directusFilterToPB.
 */

export type ListOptions = {
  /** Directus-style filter object, e.g. { author: { _eq: 'x' } }. */
  filter?: Record<string, unknown>;
  /** PB/Directus sort string, e.g. '-created' or 'name'. Comma-separated for multi. */
  sort?: string;
  /** Comma-separated projection, e.g. 'id,title'. */
  fields?: string;
  /** Relations to expand, e.g. 'author,category'. */
  expand?: string;
  /** Page size. Defaults to a large value to mimic Directus "give me all". */
  perPage?: number;
  /** 1-based page. */
  page?: number;
};

function buildCommonParams(opts: ListOptions | undefined): Record<string, string> {
  const params: Record<string, string> = {};
  if (opts?.filter) {
    const f = directusFilterToPB(opts.filter);
    if (f) params.filter = f;
  }
  if (opts?.sort) params.sort = opts.sort;
  if (opts?.fields) params.fields = opts.fields;
  if (opts?.expand) params.expand = opts.expand;
  return params;
}

/** List records (single page; perPage defaults high to approximate "all"). */
export async function pbList<T = any>(collection: string, opts?: ListOptions): Promise<T[]> {
  const pb = await pbAdmin();
  const page = opts?.page ?? 1;
  const perPage = opts?.perPage ?? 500;
  const res = await pb.collection(collection).getList(page, perPage, buildCommonParams(opts));
  return res.items as T[];
}

/** Fetch ALL records across pages (use when the set can exceed one page). */
export async function pbFullList<T = any>(collection: string, opts?: ListOptions): Promise<T[]> {
  const pb = await pbAdmin();
  const params = buildCommonParams(opts);
  return (await pb.collection(collection).getFullList({ batch: 500, ...params })) as T[];
}

/** Fetch one record by id. Returns null if not found (404). */
export async function pbOne<T = any>(
  collection: string,
  id: string,
  opts?: { fields?: string; expand?: string },
): Promise<T | null> {
  const pb = await pbAdmin();
  try {
    const params: Record<string, string> = {};
    if (opts?.fields) params.fields = opts.fields;
    if (opts?.expand) params.expand = opts.expand;
    return (await pb.collection(collection).getOne(id, params)) as T;
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

/** Fetch the first record matching a filter, or null. */
export async function pbFirst<T = any>(
  collection: string,
  filter: Record<string, unknown>,
  opts?: { sort?: string; fields?: string; expand?: string },
): Promise<T | null> {
  const pb = await pbAdmin();
  const f = directusFilterToPB(filter);
  try {
    const params: Record<string, string> = {};
    if (opts?.sort) params.sort = opts.sort;
    if (opts?.fields) params.fields = opts.fields;
    if (opts?.expand) params.expand = opts.expand;
    return (await pb.collection(collection).getFirstListItem(f, params)) as T;
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

/** Create a record. */
export async function pbCreate<T = any>(collection: string, data: Record<string, unknown>): Promise<T> {
  const pb = await pbAdmin();
  return (await pb.collection(collection).create(data)) as T;
}

/** Update a record by id. */
export async function pbUpdate<T = any>(
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<T> {
  const pb = await pbAdmin();
  return (await pb.collection(collection).update(id, data)) as T;
}

/** Delete a record by id. Returns true on success. */
export async function pbDelete(collection: string, id: string): Promise<boolean> {
  const pb = await pbAdmin();
  await pb.collection(collection).delete(id);
  return true;
}

/** Count records matching an optional Directus-style filter. */
export async function pbCount(collection: string, filter?: Record<string, unknown>): Promise<number> {
  const pb = await pbAdmin();
  const params: Record<string, string> = {};
  if (filter) {
    const f = directusFilterToPB(filter);
    if (f) params.filter = f;
  }
  // getList(1,1) returns totalItems without fetching all rows.
  const res = await pb.collection(collection).getList(1, 1, params);
  return res.totalItems;
}

/**
 * Upload a file to the `uploads` collection and return its public URL + id.
 *
 * Replaces the old Directus /files API. PocketBase attaches files to records,
 * so we store each upload as a row in the dedicated `uploads` collection (file
 * field, public read) and return the served file URL.
 */
export async function pbUploadFile(
  file: File,
  meta?: { uploadedBy?: string; context?: string },
): Promise<{ id: string; url: string }> {
  const pb = await pbAdmin();
  const form = new FormData();
  form.append('file', file);
  if (meta?.uploadedBy) form.append('uploaded_by', meta.uploadedBy);
  if (meta?.context) form.append('context', meta.context);

  const rec: any = await pb.collection('uploads').create(form);
  const filename = Array.isArray(rec.file) ? rec.file[0] : rec.file;
  const url = pb.files.getURL(rec, filename);
  return { id: rec.id, url };
}
