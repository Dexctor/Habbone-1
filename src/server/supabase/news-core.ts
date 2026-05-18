import type { NewsCommentRecord, NewsRecord } from '@/server/directus/types';

export type SupabaseNewsRow = {
  id: number;
  title: string | null;
  summary: string | null;
  cover_image: string | null;
  body: string | null;
  author_nick: string | null;
  published_at: string | Date | null;
  status: string | null;
};

export type SupabaseNewsCommentRow = {
  id: number;
  article: number;
  content: string | null;
  author_nick: string | null;
  created_at: string | Date | null;
  status: string | null;
};

export function dateToUnixSeconds(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? String(Math.floor(time / 1000)) : null;
}

export function mapSupabaseNews(row: SupabaseNewsRow): NewsRecord {
  return {
    id: Number(row.id),
    titulo: row.title ?? '',
    descricao: row.summary ?? null,
    imagem: row.cover_image ?? null,
    noticia: row.body ?? '',
    autor: row.author_nick ?? null,
    data: dateToUnixSeconds(row.published_at),
    status: row.status ?? null,
  };
}

export function mapSupabaseNewsComment(row: SupabaseNewsCommentRow): NewsCommentRecord {
  return {
    id: Number(row.id),
    id_noticia: Number(row.article),
    comentario: row.content ?? '',
    autor: row.author_nick ?? null,
    data: dateToUnixSeconds(row.created_at),
    status: row.status ?? null,
  };
}
