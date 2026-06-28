import 'server-only';

import { pbList, pbCreate, pbUpdate, pbDelete, pbCount, pbUploadFile } from './helpers';
import { TABLES } from './tables';
import { resolveUserId, resolveUserNicks, isoToUnixSeconds, nowIso } from './user-cache';
import type { StoryRecord } from './types';

const TABLE = TABLES.stories;

// ============ TYPES ============

type StoryRowInput = {
  author: string;
  imageId: string; // image URL/reference stored as text (schema-v2 §3.9)
  title?: string | null;
  status?: string | null;
};

// NB: the `stories` collection has NO system `created` field (unlike the others).
// Use `published_at` for ordering/dates.
type V2StoryRow = {
  id: string;
  title: string | null;
  image: string | null;
  author: string | null;
  status: string | null;
  published_at: string | null;
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
    data: isoToUnixSeconds(r.published_at)?.toString() ?? null,
    dta: isoToUnixSeconds(r.published_at),
    date_created: r.published_at ?? null,
  })) as unknown as StoryRecord[];
}

// ============ FILE UPLOAD ============

export async function uploadStoryFile(
  file: File,
  _filename: string,
  _mimeType: string,
): Promise<{ id: string }> {
  const uploaded = await pbUploadFile(file, { context: 'story' });
  return { id: uploaded.url };
}

// ============ CREATE ============

export async function createStoryRow(input: StoryRowInput) {
  const authorId = await resolveUserId(input.author);
  const publishedAt = input.status === 'draft' ? null : nowIso();
  const payload: Record<string, unknown> = {
    author: authorId,
    image: input.imageId,
    title: input.title ?? null,
    status:
      input.status === 'public'
        ? 'public'
        : input.status === 'hidden'
          ? 'hidden'
          : input.status === 'draft'
            ? 'draft'
            : 'public',
    published_at: publishedAt,
  };
  try {
    return await pbCreate(TABLE, payload);
  } catch (e) {
    throw new Error(`CREATE_STORY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ============ COUNT ============

export async function countStoriesThisMonthByAuthor(author: string): Promise<number> {
  if (!author) return 0;
  const authorId = await resolveUserId(author);
  if (!authorId) return 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startIso = startOfMonth.toISOString().slice(0, 19).replace('T', ' ');

  try {
    return await pbCount(TABLE, {
      author: { _eq: authorId },
      published_at: { _gte: startIso },
    });
  } catch {
    return 0;
  }
}

// ============ LIST ============

export async function listStoriesService(limit = 30): Promise<StoryRecord[]> {
  return listStoryRows({ limit, publicOnly: true });
}

async function listStoryRows({
  limit,
  publicOnly,
}: {
  limit: number;
  publicOnly: boolean;
}): Promise<StoryRecord[]> {
  try {
    const rows = await pbList<V2StoryRow>(TABLE, {
      filter: publicOnly ? { status: { _eq: 'public' } } : undefined,
      sort: '-published_at',
      perPage: limit,
      fields: 'id,title,image,author,status,published_at',
    });
    return v2StoriesToLegacy(rows);
  } catch {
    return [];
  }
}

// ============ ADMIN FUNCTIONS ============

export async function adminListStories(limit = 500): Promise<StoryRecord[]> {
  return listStoryRows({ limit, publicOnly: false });
}

export async function adminUpdateStory(id: string, patch: Partial<StoryRecord>): Promise<void> {
  const mapped: Record<string, unknown> = {};
  if ('titulo' in patch) mapped.title = (patch as any).titulo;
  if ('image' in patch) mapped.image = (patch as any).image;
  if ('imagem' in patch && !('image' in patch)) mapped.image = (patch as any).imagem;
  if ('status' in patch) mapped.status = (patch as any).status;
  if ('autor' in patch) mapped.author = await resolveUserId((patch as any).autor);
  await pbUpdate(TABLE, id, mapped);
}

export async function adminDeleteStory(id: string): Promise<void> {
  await pbDelete(TABLE, id);
}
