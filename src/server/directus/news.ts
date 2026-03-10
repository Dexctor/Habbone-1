import 'server-only';

import { directusService, rItems, rItem, cItem, uItem, dItem } from './client';
import type { NewsRecord, NewsCommentRecord } from './types';
import { stripHtml } from '@/lib/text-utils';

const NEWS_BADGE_IMAGE_RE =
  /(?:https?:)?\/\/[^"'\s>]*\/c_images\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]{2,})\.(?:gif|png)\b/gi;

export type NewsBadgeItem = {
  newsId: number;
  title: string;
  badgeCode: string;
  badgeAlbum: string;
  badgeImageUrl: string;
  articleUrl: string;
  publishedAt: string | null;
};

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

export async function toggleNewsCommentLike(commentId: number, author: string) {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) throw new Error('AUTHOR_REQUIRED');

  const rows = (await directusService
    .request(
      rItems('noticias_coment_curtidas' as any, {
        filter: {
          id_comentario: { _eq: commentId } as any,
          autor: { _eq: safeAuthor } as any,
        } as any,
        limit: 1 as any,
        fields: ['id'] as any,
      } as any),
    )
    .catch(() => [])) as any[];

  if (Array.isArray(rows) && rows.length > 0) {
    const id = (rows[0] as any)?.id;
    if (id != null) {
      await directusService.request(dItem('noticias_coment_curtidas' as any, id as any));
      return { liked: false };
    }
  }

  const payload: any = {
    id_comentario: commentId,
    autor: safeAuthor,
    data: Math.floor(Date.now() / 1000),
    status: 'ativo',
  };
  await directusService.request(cItem('noticias_coment_curtidas' as any, payload));
  return { liked: true };
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

export async function listPublicNewsBadges(limitNews = 160, limitBadges = 220): Promise<NewsBadgeItem[]> {
  const rows = await directusService
    .request(
      rItems('noticias', {
        fields: ['id', 'titulo', 'noticia', 'data'],
        sort: ['-data'],
        limit: limitNews,
      } as any),
    )
    .catch(() => [] as NewsRecord[]);

  if (!Array.isArray(rows) || rows.length === 0) return [];

  const out: NewsBadgeItem[] = [];

  for (const row of rows as NewsRecord[]) {
    const newsId = Number((row as any)?.id ?? 0);
    if (!Number.isFinite(newsId) || newsId <= 0) continue;

    const html = String((row as any)?.noticia ?? '');
    if (!html) continue;
    if (!html.includes('/c_images/')) continue;

    const title = stripHtml(String((row as any)?.titulo ?? '')).trim() || `Article #${newsId}`;
    const publishedAt =
      typeof (row as any)?.data === 'string' || (row as any)?.data === null
        ? ((row as any)?.data as string | null)
        : null;

    const seenForNews = new Set<string>();
    NEWS_BADGE_IMAGE_RE.lastIndex = 0;

    let match: RegExpExecArray | null = null;
    while ((match = NEWS_BADGE_IMAGE_RE.exec(html)) !== null) {
      const album = String(match[1] || '').trim();
      const badgeCodeRaw = String(match[2] || '').trim();
      const badgeCode = badgeCodeRaw.toUpperCase();
      if (!album || !badgeCode) continue;

      const dedupeKey = `${album}:${badgeCode}`;
      if (seenForNews.has(dedupeKey)) continue;
      seenForNews.add(dedupeKey);

      out.push({
        newsId,
        title,
        badgeCode: badgeCodeRaw,
        badgeAlbum: album,
        badgeImageUrl: `https://images.habbo.com/c_images/${album}/${badgeCode}.gif`,
        articleUrl: `/news/${newsId}`,
        publishedAt,
      });

      if (out.length >= limitBadges) return out;
    }
  }

  return out;
}

export type { NewsRecord, NewsCommentRecord };
