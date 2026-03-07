import 'server-only';

import { directusService, rItems, rItem, cItem, uItem, dItem } from './client';
import type { NewsRecord, NewsCommentRecord } from './types';

export async function adminListNews(limit = 500): Promise<NewsRecord[]> {
  return directusService.request(
    rItems('noticias', {
      limit,
      sort: ['-data'],
      fields: ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'autor', 'data', 'status'],
    } as any),
  ) as Promise<NewsRecord[]>;
}

export async function adminCreateNews(data: {
  titulo: string;
  descricao?: string | null;
  imagem?: string | null;
  noticia: string;
  autor?: string | null;
  data?: string | null;
  status?: string | null;
}): Promise<NewsRecord> {
  const payload: any = {
    titulo: data.titulo,
    descricao: data.descricao ?? null,
    imagem: data.imagem ?? null,
    noticia: data.noticia,
    autor: data.autor ?? null,
    data: data.data ?? new Date().toISOString(),
    status: data.status ?? null,
  };
  return directusService.request(cItem('noticias', payload)) as Promise<NewsRecord>;
}

export async function adminUpdateNews(
  id: number,
  patch: Partial<{
    titulo: string;
    descricao: string | null;
    imagem: string | null;
    noticia: string;
    autor: string | null;
    data: string | null;
    status: string | null;
  }>,
): Promise<NewsRecord> {
  return directusService.request(uItem('noticias', id, patch as any)) as Promise<NewsRecord>;
}

export async function adminDeleteNews(id: number) {
  return directusService.request(dItem('noticias', id));
}

export async function listNewsByAuthorService(author: string, limit = 30): Promise<NewsRecord[]> {
  if (!author) return [];
  const rows = await directusService
    .request(
      rItems('noticias', {
        filter: { autor: { _eq: author } } as any,
        fields: ['id', 'titulo', 'descricao', 'imagem', 'autor', 'data', 'status'] as any,
        sort: ['-data'] as any,
        limit: limit as any,
      } as any),
    )
    .catch(() => [] as NewsRecord[]);
  return Array.isArray(rows) ? (rows as NewsRecord[]) : [];
}

export async function adminListNewsComments(limit = 500, newsId?: number): Promise<NewsCommentRecord[]> {
  return directusService.request(
    rItems('noticias_coment', {
      limit,
      sort: ['-data'],
      filter: newsId ? { id_noticia: { _eq: newsId } } : undefined,
      fields: ['id', 'id_noticia', 'comentario', 'autor', 'data', 'status'],
    } as any),
  ) as Promise<NewsCommentRecord[]>;
}

export async function adminUpdateNewsComment(
  id: number,
  patch: Partial<{ comentario: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<NewsCommentRecord> {
  return directusService.request(uItem('noticias_coment', id, patch as any)) as Promise<NewsCommentRecord>;
}

export async function adminDeleteNewsComment(id: number) {
  return directusService.request(dItem('noticias_coment', id));
}

export async function createNewsComment(input: {
  newsId: number;
  author: string;
  content: string;
  status?: string | null;
}): Promise<NewsCommentRecord> {
  const payload: Record<string, unknown> = {
    id_noticia: input.newsId,
    comentario: input.content,
    autor: input.author || 'Anonyme',
    data: new Date().toISOString(),
    status: input.status ?? 'public',
  };
  return directusService.request(cItem('noticias_coment', payload as any)) as Promise<NewsCommentRecord>;
}

// ============ PUBLIC FETCHER FUNCTIONS ============
// Replace the old lib/directus/news.ts (which had no auth token)

export function getPublicNews(query?: string): Promise<NewsRecord[]> {
  const q = typeof query === 'string' ? query.trim() : '';
  return directusService.request(
    rItems('noticias', {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'status', 'autor', 'data'],
      sort: ['-data'],
      limit: 24,
      ...(q ? { search: q } : {}),
    } as any),
  ) as Promise<NewsRecord[]>;
}

export function getPublicNewsById(id: number): Promise<NewsRecord> {
  return directusService.request(
    rItem('noticias', id, {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'autor', 'data', 'status'],
    } as any),
  ) as Promise<NewsRecord>;
}

export function listPublicNewsForCards(limit = 60): Promise<NewsRecord[]> {
  return directusService.request(
    rItems('noticias', {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'data'],
      sort: ['-data'],
      limit,
    } as any),
  ) as Promise<NewsRecord[]>;
}

export function getPublicNewsComments(newsId: number): Promise<NewsCommentRecord[]> {
  return directusService.request(
    rItems('noticias_coment', {
      filter: { id_noticia: { _eq: newsId } },
      fields: ['id', 'id_noticia', 'comentario', 'autor', 'data', 'status'],
      sort: ['data'],
      limit: 200,
    } as any),
  ) as Promise<NewsCommentRecord[]>;
}

export type { NewsRecord, NewsCommentRecord };
