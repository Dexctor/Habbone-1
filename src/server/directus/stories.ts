import 'server-only';

import {
  directusService,
  directusUrl,
  serviceToken,
  STORIES_TABLE,
  STORIES_FOLDER_ID,
  rItems,
  cItem,
} from './client';
import { resolveStoriesTables } from '@/lib/directus/tables';
import { parseTimestamp } from '@/lib/date-utils';

type StoryRowInput = {
  author: string;
  imageId: string;
  title?: string | null;
  status?: string | null;
};

export async function uploadFileToDirectus(
  file: File,
  filename: string,
  mimeType: string,
): Promise<{ id: string }> {
  const safeName = filename?.trim() || `story-${Date.now()}`;
  const effectiveMime = mimeType?.trim() || file.type || 'application/octet-stream';
  const formData = new FormData();
  formData.set('file', file, safeName);
  formData.set('title', safeName);
  if (STORIES_FOLDER_ID) formData.set('folder', STORIES_FOLDER_ID);

  const response = await fetch(`${directusUrl}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceToken}`,
    },
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

export async function createStoryRow(input: StoryRowInput) {
  const table = STORIES_TABLE || 'usuarios_storie';
  const nowIso = new Date().toISOString();
  const unixSeconds = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    autor: input.author,
    image: input.imageId,
    imagem: input.imageId,
    image_id: input.imageId,
    status: input.status ?? 'public',
    data: nowIso,
    dta: unixSeconds,
    published_at: input.status === 'draft' ? null : nowIso,
  };
  if (input.title) payload.titulo = input.title;

  try {
    return await directusService.request(cItem(table as any, payload as any));
  } catch {
    const response = await fetch(`${directusUrl}/items/${encodeURIComponent(table)}`, {
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

export async function countStoriesThisMonthByAuthor(author: string): Promise<number> {
  if (!author) return 0;
  const table = STORIES_TABLE || 'usuarios_storie';
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startIso = startOfMonth.toISOString();

  const url = new URL(`${directusUrl}/items/${encodeURIComponent(table)}`);
  url.searchParams.set('filter[autor][_eq]', author);
  url.searchParams.set('filter[_or][0][published_at][_gte]', startIso);
  url.searchParams.set('filter[_or][1][date_created][_gte]', startIso);
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

  const rows = (await directusService
    .request(
      rItems(table as any, {
        filter: { autor: { _eq: author } } as any,
        limit: 100 as any,
        sort: ['-date_created'] as any,
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
  const candidates = [row?.date_created, row?.dateCreated, row?.created_at, row?.createdAt, row?.data, row?.dta];
  for (const candidate of candidates) {
    const ms = parseTimestamp(candidate, { numeric: 'auto', numericString: 'number' });
    if (ms) return ms;
  }
  return 0;
}

export async function listStoriesService(limit = 30): Promise<unknown[]> {
  for (const col of resolveStoriesTables()) {
    try {
      const rows = await directusService.request(
        rItems(col as any, {
          sort: ['-id'] as any,
          limit,
        } as any),
      );
      if (Array.isArray(rows) && rows.length) return rows as any[];
    } catch { }
  }
  return [] as any[];
}
