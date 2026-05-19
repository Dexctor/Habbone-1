import type { StoryRecord } from '@/server/directus/types';

export type SupabaseStoryRow = {
  id: number;
  title: string | null;
  image: string | null;
  author_nick: string | null;
  status: string | null;
  published_at: string | Date | null;
  created_at: string | Date | null;
};

export function isoToUnixSeconds(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? Math.floor(time / 1000) : null;
}

function isoString(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function mapSupabaseStory(row: SupabaseStoryRow): StoryRecord {
  const date = row.published_at ?? row.created_at ?? null;
  const unix = isoToUnixSeconds(date);

  return {
    id: Number(row.id),
    autor: row.author_nick ?? null,
    image: row.image ?? null,
    imagem: row.image ?? null,
    titulo: row.title ?? null,
    status: row.status ?? null,
    data: unix != null ? String(unix) : null,
    dta: unix,
    date_created: isoString(row.created_at),
  };
}
