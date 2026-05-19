import type { ForumCategoryRecord, ForumCommentRecord, ForumTopicRecord } from '@/server/directus/types';

export type SupabaseForumTopicRow = {
  id: number;
  title: string | null;
  body: string | null;
  cover_image: string | null;
  author_nick: string | null;
  created_at: string | Date | null;
  views: number | null;
  pinned: boolean | null;
  locked: boolean | null;
  status: string | null;
  category: number | null;
};

export type SupabaseForumCommentRow = {
  id: number;
  topic: number;
  content: string | null;
  author_nick: string | null;
  created_at: string | Date | null;
  status: string | null;
};

export type SupabaseForumCategoryRow = {
  id: number;
  name: string | null;
  description: string | null;
  active: boolean | null;
  icon: string | null;
  slug: string | null;
  sort: number | null;
};

export function dateToUnixSeconds(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? String(Math.floor(time / 1000)) : null;
}

export function mapSupabaseForumTopic(row: SupabaseForumTopicRow): ForumTopicRecord {
  return {
    id: Number(row.id),
    titulo: row.title ?? '',
    conteudo: row.body ?? null,
    imagem: row.cover_image ?? null,
    autor: row.author_nick ?? null,
    data: dateToUnixSeconds(row.created_at),
    views: row.views ?? null,
    fixo: row.pinned ? 's' : 'n',
    fechado: row.locked ? 's' : 'n',
    status: row.status ?? null,
    cat_id: row.category ?? null,
  };
}

export function mapSupabaseForumComment(row: SupabaseForumCommentRow): ForumCommentRecord {
  return {
    id: Number(row.id),
    id_forum: Number(row.topic),
    comentario: row.content ?? '',
    autor: row.author_nick ?? null,
    data: dateToUnixSeconds(row.created_at),
    status: row.status ?? null,
  };
}

export function mapSupabaseForumCategory(row: SupabaseForumCategoryRow): ForumCategoryRecord {
  return {
    id: Number(row.id),
    nome: row.name ?? '',
    descricao: row.description ?? null,
    status: row.active ? 'ativo' : 'inativo',
    imagem: row.icon ?? null,
    slug: row.slug ?? null,
    ordem: row.sort ?? null,
  };
}
