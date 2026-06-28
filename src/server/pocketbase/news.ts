import 'server-only';

import { pbList, pbOne, pbFirst, pbCreate, pbUpdate, pbDelete } from './helpers';
import { TABLES } from './tables';
import { resolveUserId, resolveUserNick } from './user-cache';
import type { NewsRecord, NewsCommentRecord } from './types';
import { stripHtml } from '@/lib/text-utils';

const NEWS_BADGE_IMAGE_RE =
  /(?:https?:)?\/\/[^"'\s>]*\/c_images\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]{2,})\.(?:gif|png)\b/gi;

export type NewsBadgeItem = {
  newsId: string;
  title: string;
  badgeCode: string;
  badgeAlbum: string;
  badgeImageUrl: string;
  articleUrl: string;
  publishedAt: string | null;
};

/* ------------------------------------------------------------------ */
/*  Column <-> domain mapping (v2 English <-> legacy portuguese out)    */
/* ------------------------------------------------------------------ */

const NEWS_SELECT_FIELDS = 'id,title,summary,cover_image,body,author,published_at,status';
const NEWS_CARD_FIELDS = 'id,title,summary,cover_image,published_at';
const NEWS_COMMENT_SELECT = 'id,article,content,author,created,status';
const NEWS_COMMENT_LIKE_TABLE = TABLES.articleCommentLikes;

type V2NewsRow = {
  id: string;
  title: string | null;
  summary: string | null;
  cover_image: string | null;
  body: string | null;
  author: string | null;
  published_at: string | null;
  status: string | null;
};

type V2NewsCommentRow = {
  id: string;
  article: string;
  content: string | null;
  author: string | null;
  created: string | null;
  status: string | null;
};

function isoToUnixSeconds(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

function unixSecondsToIso(unix: number | string | null | undefined): string | null {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n > 1e11 ? n : n * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

async function v2NewsToLegacy(row: V2NewsRow): Promise<NewsRecord> {
  const nick = await resolveUserNick(row.author);
  return {
    id: row.id,
    titulo: row.title ?? '',
    descricao: row.summary ?? null,
    imagem: row.cover_image ?? null,
    noticia: row.body ?? '',
    autor: nick ?? null,
    data: isoToUnixSeconds(row.published_at)?.toString() ?? null,
    status: row.status ?? null,
  } as unknown as NewsRecord;
}

async function v2NewsCommentToLegacy(row: V2NewsCommentRow): Promise<NewsCommentRecord> {
  const nick = await resolveUserNick(row.author);
  return {
    id: row.id,
    id_noticia: row.article,
    comentario: row.content ?? '',
    autor: nick ?? null,
    data: isoToUnixSeconds(row.created)?.toString() ?? null,
    status: row.status ?? null,
  } as unknown as NewsCommentRecord;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function adminListNews(limit = 500): Promise<NewsRecord[]> {
  const rows = await pbList<V2NewsRow>(TABLES.articles, {
    perPage: limit,
    sort: '-published_at',
    fields: NEWS_SELECT_FIELDS,
  });
  return Promise.all(rows.map(v2NewsToLegacy));
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
  const authorId = await resolveUserId(data.autor);
  const created = await pbCreate<V2NewsRow>(TABLES.articles, {
    title: data.titulo,
    summary: data.descricao ?? null,
    cover_image: data.imagem ?? null,
    body: data.noticia,
    author: authorId,
    status: data.status ?? 'published',
    published_at: data.data ? unixSecondsToIso(data.data) : new Date().toISOString().slice(0, 19).replace('T', ' '),
  });
  return v2NewsToLegacy(created);
}

export async function adminUpdateNews(
  id: string,
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
  const mapped: Record<string, unknown> = {};
  if ('titulo' in patch) mapped.title = patch.titulo;
  if ('descricao' in patch) mapped.summary = patch.descricao;
  if ('imagem' in patch) mapped.cover_image = patch.imagem;
  if ('noticia' in patch) mapped.body = patch.noticia;
  if ('autor' in patch) mapped.author = await resolveUserId(patch.autor);
  if ('data' in patch) mapped.published_at = unixSecondsToIso(patch.data);
  if ('status' in patch) mapped.status = patch.status;
  const updated = await pbUpdate<V2NewsRow>(TABLES.articles, id, mapped);
  return v2NewsToLegacy(updated);
}

export async function adminDeleteNews(id: string) {
  return pbDelete(TABLES.articles, id);
}

export async function listNewsByAuthorService(author: string, limit = 30): Promise<NewsRecord[]> {
  if (!author) return [];
  const authorId = await resolveUserId(author);
  if (!authorId) return [];
  const rows = await pbList<V2NewsRow>(TABLES.articles, {
    filter: { author: { _eq: authorId } },
    fields: NEWS_CARD_FIELDS,
    sort: '-published_at',
    perPage: limit,
  });
  return Promise.all(rows.map(v2NewsToLegacy));
}

export async function adminListNewsComments(limit = 500, newsId?: string): Promise<NewsCommentRecord[]> {
  try {
    const rows = await pbList<V2NewsCommentRow>(TABLES.articleComments, {
      filter: newsId ? { article: { _eq: newsId } } : undefined,
      sort: '-created',
      perPage: limit,
      fields: NEWS_COMMENT_SELECT,
    });
    return Promise.all(rows.map(v2NewsCommentToLegacy));
  } catch {
    return [];
  }
}

export async function adminUpdateNewsComment(
  id: string,
  patch: Partial<{ comentario: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<NewsCommentRecord> {
  const mapped: Record<string, unknown> = {};
  if ('comentario' in patch) mapped.content = patch.comentario;
  if ('autor' in patch) mapped.author = await resolveUserId(patch.autor);
  if ('status' in patch) mapped.status = patch.status;
  const updated = await pbUpdate<V2NewsCommentRow>(TABLES.articleComments, id, mapped);
  return v2NewsCommentToLegacy(updated);
}

export async function adminDeleteNewsComment(id: string) {
  return pbDelete(TABLES.articleComments, id);
}

export async function createNewsComment(input: {
  newsId: string;
  author: string;
  content: string;
  status?: string | null;
}): Promise<NewsCommentRecord> {
  const authorId = await resolveUserId(input.author);
  const created = await pbCreate<V2NewsCommentRow>(TABLES.articleComments, {
    article: input.newsId,
    content: input.content,
    author: authorId,
    status: input.status ?? 'active',
  });
  return v2NewsCommentToLegacy(created);
}

export async function toggleNewsCommentLike(commentId: string, author: string) {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) throw new Error('AUTHOR_REQUIRED');

  const authorId = await resolveUserId(safeAuthor);
  if (authorId == null) throw new Error('AUTHOR_NOT_FOUND');

  const existing = await pbFirst<{ id: string }>(NEWS_COMMENT_LIKE_TABLE, {
    comment: { _eq: commentId },
    user: { _eq: authorId },
  }).catch(() => null);

  if (existing?.id) {
    await pbDelete(NEWS_COMMENT_LIKE_TABLE, existing.id);
    return { liked: false };
  }

  await pbCreate(NEWS_COMMENT_LIKE_TABLE, { comment: commentId, user: authorId });
  return { liked: true };
}

// ============ PUBLIC FETCHER FUNCTIONS ============

export async function getPublicNews(query?: string): Promise<NewsRecord[]> {
  const q = typeof query === 'string' ? query.trim() : '';
  // Only published articles, and serve them all (client paginates). Without this
  // the list was capped at 24 of 95 articles.
  const filter: Record<string, unknown> = { status: { _eq: 'published' } };
  if (q) filter._or = [{ title: { _contains: q } }, { body: { _contains: q } }];
  const rows = await pbList<V2NewsRow>(TABLES.articles, {
    fields: NEWS_SELECT_FIELDS,
    sort: '-published_at',
    perPage: 200,
    filter,
  });
  return Promise.all(rows.map(v2NewsToLegacy));
}

export async function getPublicNewsById(id: string): Promise<NewsRecord | null> {
  const row = await pbOne<V2NewsRow>(TABLES.articles, id, { fields: NEWS_SELECT_FIELDS });
  return row ? v2NewsToLegacy(row) : null;
}

export async function listPublicNewsForCards(limit = 60): Promise<NewsRecord[]> {
  const rows = await pbList<V2NewsRow>(TABLES.articles, {
    fields: NEWS_CARD_FIELDS,
    sort: '-published_at',
    perPage: limit,
    filter: { status: { _eq: 'published' } },
  });
  return Promise.all(rows.map(v2NewsToLegacy));
}

export async function getPublicNewsComments(newsId: string): Promise<NewsCommentRecord[]> {
  try {
    const rows = await pbList<V2NewsCommentRow>(TABLES.articleComments, {
      fields: NEWS_COMMENT_SELECT,
      sort: 'created',
      perPage: 200,
      filter: { article: { _eq: newsId } },
    });
    return Promise.all(rows.map(v2NewsCommentToLegacy));
  } catch {
    return [];
  }
}

export async function listPublicNewsBadges(limitNews = 160, limitBadges = 220): Promise<NewsBadgeItem[]> {
  let rows: Array<{ id: string; titulo?: string | null; noticia?: string | null; data?: string | null }> = [];
  try {
    const raw = await pbList<any>(TABLES.articles, {
      fields: 'id,title,body,published_at',
      sort: '-published_at',
      perPage: limitNews,
    });
    rows = raw.map((r: any) => ({ id: String(r.id), titulo: r.title, noticia: r.body, data: r.published_at }));
  } catch {}

  if (rows.length === 0) return [];

  const out: NewsBadgeItem[] = [];

  for (const row of rows) {
    const newsId = String(row?.id ?? '');
    if (!newsId) continue;

    const html = String(row?.noticia ?? '');
    if (!html || !html.includes('/c_images/')) continue;

    const title = stripHtml(String(row?.titulo ?? '')).trim() || `Article ${newsId}`;
    const publishedAt = typeof row?.data === 'string' ? row.data : null;

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
