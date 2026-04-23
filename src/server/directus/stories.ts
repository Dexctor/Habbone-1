import 'server-only';

import {
  directusService,
  directusUrl,
  serviceToken,
  STORIES_FOLDER_ID,
  rItems,
  cItem,
  uItem,
  dItem,
} from './client';
import { TABLES, USE_V2 } from './tables';
import { resolveUserId, resolveUserNicks, isoToUnixSeconds, nowIso } from './user-cache';
import type { StoryRecord } from './types';
import { parseTimestamp } from '@/lib/date-utils';

const TABLE = TABLES.stories;

// ============ TYPES ============

type StoryRowInput = {
  author: string;
  imageId: string;
  title?: string | null;
  status?: string | null;
};

type V2StoryRow = {
  id: number;
  title: string | null;
  image: string | null;
  author: number | null;
  status: string | null;
  published_at: string | null;
  created_at: string | null;
};

// ============ TRANSLATORS ============

async function v2StoriesToLegacy(rows: V2StoryRow[]): Promise<StoryRecord[]> {
  const nickMap = await resolveUserNicks(rows.map((r) => r.author));
  return rows.map((r) => ({
    id: r.id,
    autor: r.author ? nickMap.get(r.author) ?? null : null,
    image: r.image ?? null,
    imagem: r.image ?? null,
    titulo: r.title ?? null,
    status: r.status ?? null,
    data: isoToUnixSeconds(r.published_at ?? r.created_at)?.toString() ?? null,
    dta: isoToUnixSeconds(r.published_at ?? r.created_at),
    date_created: r.created_at ?? null,
  }));
}

// ============ FILE UPLOAD ============

export async function uploadFileToDirectus(
  file: File,
  filename: string,
  mimeType: string,
): Promise<{ id: string }> {
  const safeName = filename?.trim() || `story-${Date.now()}`;
  const formData = new FormData();
  formData.set('file', file, safeName);
  formData.set('title', safeName);
  if (STORIES_FOLDER_ID) formData.set('folder', STORIES_FOLDER_ID);

  const response = await fetch(`${directusUrl}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceToken}` },
    body: formData,
  }).catch((error: unknown) => {
    throw new Error(`UPLOAD_NETWORK_ERROR: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`UPLOAD_FAILED: ${response.status} ${body}`);
  }

  const json = (await response.json().catch(() => ({}))) as Record<string, any>;
  const data = (json?.data ?? json) as Record<string, any>;
  const id = data?.id ?? null;
  if (!id) throw new Error('UPLOAD_FAILED_NO_ID');
  return { id: String(id) };
}

// ============ CREATE ============

export async function createStoryRow(input: StoryRowInput) {
  if (USE_V2) {
    const authorId = await resolveUserId(input.author);
    const publishedAt = input.status === 'draft' ? null : nowIso();
    const payload: Record<string, unknown> = {
      author: authorId,
      image: input.imageId,
      title: input.title ?? null,
      status: input.status === 'public' ? 'public' : input.status === 'hidden' ? 'hidden' : input.status === 'draft' ? 'draft' : 'public',
      published_at: publishedAt,
    };
    try {
      return await directusService.request(cItem(TABLE as any, payload as any));
    } catch (e) {
      throw new Error(`CREATE_STORY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Legacy: multiple date columns, unknown field shape → send them all
  const unixSeconds = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    autor: input.author,
    image: input.imageId,
    imagem: input.imageId,
    image_id: input.imageId,
    status: input.status ?? 'public',
    data: unixSeconds,
    dta: unixSeconds,
    date_created: new Date().toISOString(),
    published_at: input.status === 'draft' ? null : new Date().toISOString(),
  };
  if (input.title) payload.titulo = input.title;

  try {
    return await directusService.request(cItem(TABLE as any, payload as any));
  } catch {
    const response = await fetch(`${directusUrl}/items/${encodeURIComponent(TABLE)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`CREATE_STORY_FAILED: ${response.status} ${body}`);
    }
    const json = (await response.json().catch(() => ({}))) as Record<string, any>;
    return json?.data ?? json;
  }
}

// ============ COUNT ============

export async function countStoriesThisMonthByAuthor(author: string): Promise<number> {
  if (!author) return 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (USE_V2) {
    const authorId = await resolveUserId(author);
    if (!authorId) return 0;
    const startIso = startOfMonth.toISOString().slice(0, 19).replace('T', ' ');
    const url = new URL(`${directusUrl}/items/${encodeURIComponent(TABLE)}`);
    url.searchParams.set('filter[author][_eq]', String(authorId));
    url.searchParams.set('filter[created_at][_gte]', startIso);
    url.searchParams.set('limit', '0');
    url.searchParams.set('meta', 'total_count');

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    }).catch(() => null);

    if (response?.ok) {
      const json = (await response.json().catch(() => null)) as Record<string, any> | null;
      const total = Number(json?.meta?.total_count ?? 0);
      if (Number.isFinite(total) && total >= 0) return total;
    }
    return 0;
  }

  // Legacy
  const startUnix = Math.floor(startOfMonth.getTime() / 1000);
  const url = new URL(`${directusUrl}/items/${encodeURIComponent(TABLE)}`);
  url.searchParams.set('filter[autor][_eq]', author);
  url.searchParams.set('filter[data][_gte]', String(startUnix));
  url.searchParams.set('limit', '0');
  url.searchParams.set('meta', 'total_count');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  }).catch(() => null);

  if (response?.ok) {
    const json = (await response.json().catch(() => null)) as Record<string, any> | null;
    const total = Number(json?.meta?.total_count ?? 0);
    if (Number.isFinite(total) && total >= 0) return total;
  }

  // Fallback
  const rows = (await directusService
    .request(
      rItems(TABLE as any, {
        filter: { autor: { _eq: author } } as any,
        limit: 100 as any,
        sort: ['-data'] as any,
      } as any),
    )
    .catch(() => [])) as any[];

  if (!Array.isArray(rows)) return 0;
  const startMs = startOfMonth.getTime();
  let count = 0;
  for (const row of rows) {
    const timestamp = extractStoryTimestamp(row);
    if (timestamp >= startMs) count += 1;
    if (count >= 10) break;
  }
  return count;
}

function extractStoryTimestamp(row: any): number {
  if (!row || typeof row !== 'object') return 0;
  const candidates = [row?.date_created, row?.data, row?.dta, row?.published_at, row?.created_at];
  for (const candidate of candidates) {
    const ms = parseTimestamp(candidate, { numeric: 'auto', numericString: 'number' });
    if (ms) return ms;
  }
  return 0;
}

// ============ LIST ============

export async function listStoriesService(limit = 30): Promise<StoryRecord[]> {
  try {
    const rows = (await directusService.request(
      rItems(TABLE as any, {
        sort: ['-id'] as any,
        limit,
      } as any),
    )) as any[];
    if (!Array.isArray(rows)) return [];
    if (!USE_V2) return rows as StoryRecord[];
    return v2StoriesToLegacy(rows as V2StoryRow[]);
  } catch {
    return [];
  }
}

// ============ ADMIN FUNCTIONS ============

export async function adminListStories(limit = 500): Promise<StoryRecord[]> {
  return listStoriesService(limit);
}

export async function adminUpdateStory(id: number, patch: Partial<StoryRecord>): Promise<void> {
  if (USE_V2) {
    const mapped: Record<string, unknown> = {};
    if ('titulo' in patch) mapped.title = patch.titulo;
    if ('image' in patch) mapped.image = patch.image;
    if ('imagem' in patch && !('image' in patch)) mapped.image = patch.imagem;
    if ('status' in patch) mapped.status = patch.status;
    if ('autor' in patch) mapped.author = await resolveUserId(patch.autor);
    await directusService.request(uItem(TABLE as any, id, mapped as any));
    return;
  }
  await directusService.request(uItem(TABLE as any, id, patch as any));
}

export async function adminDeleteStory(id: number): Promise<void> {
  await directusService.request(dItem(TABLE as any, id));
}
