import 'server-only';

import {
  directusService,
  directusUrl,
  serviceToken,
  STORIES_TABLE,
  STORIES_FOLDER_ID,
  rItems,
  cItem,
  uItem,
  dItem,
} from './client';
import type { StoryRecord } from './types';
import { parseTimestamp } from '@/lib/date-utils';

// ============ CONSTANTS ============

/** Resolved table name — single source of truth */
const TABLE = STORIES_TABLE || 'usuarios_storie';

// ============ TYPES ============

type StoryRowInput = {
  author: string;
  imageId: string;
  title?: string | null;
  status?: string | null;
};

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
  const nowIso = new Date().toISOString();
  const unixSeconds = Math.floor(Date.now() / 1000);

  const payload: Record<string, unknown> = {
    autor: input.author,
    image: input.imageId,           // Possible column name
    imagem: input.imageId,          // Possible column name (Portuguese)
    image_id: input.imageId,        // Possible column name
    status: input.status ?? 'public',
    data: unixSeconds,              // Legacy integer timestamp (unix seconds)
    dta: unixSeconds,               // Legacy column alias
    date_created: nowIso,           // ISO string for Directus metadata
    published_at: input.status === 'draft' ? null : nowIso,
  };
  if (input.title) payload.titulo = input.title;

  try {
    return await directusService.request(cItem(TABLE as any, payload as any));
  } catch {
    // Fallback: raw POST — Directus ignores unknown fields gracefully
    const response = await fetch(`${directusUrl}/items/${encodeURIComponent(TABLE)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        'Content-Type': 'application/json',
      },
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
  const startUnix = Math.floor(startOfMonth.getTime() / 1000);

  // Try aggregate count first
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

  // Fallback: manual count
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
  const candidates = [row?.date_created, row?.data, row?.dta];
  for (const candidate of candidates) {
    const ms = parseTimestamp(candidate, { numeric: 'auto', numericString: 'number' });
    if (ms) return ms;
  }
  return 0;
}

// ============ LIST ============

export async function listStoriesService(limit = 30): Promise<StoryRecord[]> {
  try {
    const rows = await directusService.request(
      rItems(TABLE as any, {
        sort: ['-id'] as any,
        limit,
      } as any),
    );
    if (Array.isArray(rows)) return rows as StoryRecord[];
  } catch { }
  return [];
}

// ============ ADMIN FUNCTIONS ============

export async function adminListStories(limit = 500): Promise<StoryRecord[]> {
  return listStoriesService(limit);
}

export async function adminUpdateStory(id: number, patch: Partial<StoryRecord>): Promise<void> {
  await directusService.request(uItem(TABLE as any, id, patch as any));
}

export async function adminDeleteStory(id: number): Promise<void> {
  await directusService.request(dItem(TABLE as any, id));
}
