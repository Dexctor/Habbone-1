import 'server-only';

import { directusService, rItems, rItem, cItem, uItem, dItem } from './client';
import { directusFetch } from './fetch';
import { TABLES, USE_V2 } from './tables';
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

/* ------------------------------------------------------------------ */
/*  Column <-> domain mapping                                          */
/*                                                                     */
/*  The v2 schema uses English column names and a real M2O for author. */
/*  Callers of this service speak "legacy portuguese" (titulo, noticia,*/
/*  autor, data, imagem, descricao). We translate at the boundary so   */
/*  no downstream code has to care which schema is active.             */
/* ------------------------------------------------------------------ */

// fields list for SELECT — legacy vs v2
const NEWS_SELECT_FIELDS = USE_V2
  ? ['id', 'title', 'summary', 'cover_image', 'body', 'author', 'published_at', 'status']
  : ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'autor', 'data', 'status'];

const NEWS_CARD_FIELDS = USE_V2
  ? ['id', 'title', 'summary', 'cover_image', 'published_at']
  : ['id', 'titulo', 'descricao', 'imagem', 'data'];

const NEWS_COMMENT_SELECT = USE_V2
  ? 'id,article,content,author,created_at,status'
  : 'id,id_noticia,comentario,autor,data,status';

const NEWS_COMMENT_LIKE_TABLE = TABLES.articleCommentLikes;
const NEWS_COMMENT_LIKE_FIELDS = USE_V2
  ? { fk: 'comment', author: 'user', data: 'created_at' }
  : { fk: 'id_comentario', author: 'autor', data: 'data' };

type V2NewsRow = {
  id: number;
  title: string | null;
  summary: string | null;
  cover_image: string | null;
  body: string | null;
  author: number | null;
  published_at: string | null;
  status: string | null;
};

type V2NewsCommentRow = {
  id: number;
  article: number;
  content: string | null;
  author: number | null;
  created_at: string | null;
  status: string | null;
};

// Lazy cache: user id -> nick. We only populate it when v2 is active and we
// need to resolve M2O author ids back to a display name for downstream code.
let userCache: Map<number, string> | null = null;

async function ensureUserCache(): Promise<Map<number, string>> {
  if (!USE_V2) return new Map();
  if (userCache) return userCache;
  const res = await directusService
    .request(
      rItems(TABLES.users, {
        limit: 5000,
        fields: ['id', 'nick'],
      } as any),
    )
    .catch(() => [] as any[]);
  const map = new Map<number, string>();
  for (const u of (res as { id: number; nick: string }[]) ?? []) {
    map.set(Number(u.id), String(u.nick || ''));
  }
  userCache = map;
  return map;
}

async function resolveAuthorId(nick: string | null | undefined): Promise<number | null> {
  if (!USE_V2 || !nick) return null;
  const cache = await ensureUserCache();
  for (const [id, n] of cache) if (n.toLowerCase() === String(nick).toLowerCase()) return id;
  return null;
}

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
  const cache = await ensureUserCache();
  const nick = row.author ? cache.get(row.author) ?? null : null;
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
  const cache = await ensureUserCache();
  const nick = row.author ? cache.get(row.author) ?? null : null;
  return {
    id: row.id,
    id_noticia: row.article,
    comentario: row.content ?? '',
    autor: nick ?? null,
    data: isoToUnixSeconds(row.created_at)?.toString() ?? null,
    status: row.status ?? null,
  } as unknown as NewsCommentRecord;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function adminListNews(limit = 500): Promise<NewsRecord[]> {
  const rows = (await directusService.request(
    rItems(TABLES.articles, {
      limit,
      sort: [USE_V2 ? '-published_at' : '-data'],
      fields: NEWS_SELECT_FIELDS,
    } as any),
  )) as any[];

  if (!USE_V2) return rows as NewsRecord[];
  return Promise.all((rows as V2NewsRow[]).map(v2NewsToLegacy));
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
  if (USE_V2) {
    const authorId = await resolveAuthorId(data.autor);
    const payload: Record<string, unknown> = {
      title: data.titulo,
      summary: data.descricao ?? null,
      cover_image: data.imagem ?? null,
      body: data.noticia,
      author: authorId,
      status: data.status ?? 'published',
      published_at: data.data ? unixSecondsToIso(data.data) : new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    const created = (await directusService.request(cItem(TABLES.articles, payload))) as V2NewsRow;
    return v2NewsToLegacy(created);
  }

  const payload: any = {
    titulo: data.titulo,
    descricao: data.descricao ?? null,
    imagem: data.imagem ?? null,
    noticia: data.noticia,
    autor: data.autor ?? null,
    data: data.data ?? Math.floor(Date.now() / 1000),
    status: data.status ?? 'published',
  };
  return directusService.request(cItem(TABLES.articles, payload)) as Promise<NewsRecord>;
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
  if (USE_V2) {
    const mapped: Record<string, unknown> = {};
    if ('titulo' in patch) mapped.title = patch.titulo;
    if ('descricao' in patch) mapped.summary = patch.descricao;
    if ('imagem' in patch) mapped.cover_image = patch.imagem;
    if ('noticia' in patch) mapped.body = patch.noticia;
    if ('autor' in patch) mapped.author = await resolveAuthorId(patch.autor);
    if ('data' in patch) mapped.published_at = unixSecondsToIso(patch.data);
    if ('status' in patch) mapped.status = patch.status;
    const updated = (await directusService.request(uItem(TABLES.articles, id, mapped as any))) as V2NewsRow;
    return v2NewsToLegacy(updated);
  }
  return directusService.request(uItem(TABLES.articles, id, patch as any)) as Promise<NewsRecord>;
}

export async function adminDeleteNews(id: number) {
  return directusService.request(dItem(TABLES.articles, id));
}

export async function listNewsByAuthorService(author: string, limit = 30): Promise<NewsRecord[]> {
  if (!author) return [];

  if (USE_V2) {
    const authorId = await resolveAuthorId(author);
    if (!authorId) return [];
    const rows = (await directusService
      .request(
        rItems(TABLES.articles, {
          filter: { author: { _eq: authorId } } as any,
          fields: NEWS_CARD_FIELDS as any,
          sort: ['-published_at'] as any,
          limit: limit as any,
        } as any),
      )
      .catch(() => [])) as V2NewsRow[];
    return Promise.all(rows.map(v2NewsToLegacy));
  }

  const rows = await directusService
    .request(
      rItems(TABLES.articles, {
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
  try {
    const params: Record<string, string> = {
      limit: String(limit),
      sort: USE_V2 ? '-created_at' : '-data',
      fields: NEWS_COMMENT_SELECT,
    };
    if (newsId) {
      params[USE_V2 ? 'filter[article][_eq]' : 'filter[id_noticia][_eq]'] = String(newsId);
    }
    const json = await directusFetch<{ data: any[] }>(`/items/${TABLES.articleComments}`, { params });
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (!USE_V2) return rows as NewsCommentRecord[];
    return Promise.all((rows as V2NewsCommentRow[]).map(v2NewsCommentToLegacy));
  } catch {
    return [];
  }
}

export async function adminUpdateNewsComment(
  id: number,
  patch: Partial<{ comentario: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<NewsCommentRecord> {
  if (USE_V2) {
    const mapped: Record<string, unknown> = {};
    if ('comentario' in patch) mapped.content = patch.comentario;
    if ('autor' in patch) mapped.author = await resolveAuthorId(patch.autor);
    if ('data' in patch) mapped.created_at = unixSecondsToIso(patch.data);
    if ('status' in patch) mapped.status = patch.status;
    const updated = (await directusService.request(uItem(TABLES.articleComments, id, mapped as any))) as V2NewsCommentRow;
    return v2NewsCommentToLegacy(updated);
  }
  return directusService.request(uItem(TABLES.articleComments, id, patch as any)) as Promise<NewsCommentRecord>;
}

export async function adminDeleteNewsComment(id: number) {
  return directusService.request(dItem(TABLES.articleComments, id));
}

export async function createNewsComment(input: {
  newsId: number;
  author: string;
  content: string;
  status?: string | null;
}): Promise<NewsCommentRecord> {
  if (USE_V2) {
    const authorId = await resolveAuthorId(input.author);
    const payload: Record<string, unknown> = {
      article: input.newsId,
      content: input.content,
      author: authorId,
      status: input.status ?? 'active',
    };
    const created = (await directusService.request(cItem(TABLES.articleComments, payload as any))) as V2NewsCommentRow;
    return v2NewsCommentToLegacy(created);
  }

  const payload: Record<string, unknown> = {
    id_noticia: input.newsId,
    comentario: input.content,
    autor: input.author || 'Anonyme',
    data: Math.floor(Date.now() / 1000),
    status: input.status ?? 'ativo',
  };
  return directusService.request(cItem(TABLES.articleComments, payload as any)) as Promise<NewsCommentRecord>;
}

export async function toggleNewsCommentLike(commentId: number, author: string) {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) throw new Error('AUTHOR_REQUIRED');

  const { fk, author: authorCol } = NEWS_COMMENT_LIKE_FIELDS;
  const authorValue: number | string | null = USE_V2 ? await resolveAuthorId(safeAuthor) : safeAuthor;
  if (authorValue == null) throw new Error('AUTHOR_NOT_FOUND');

  const rows = (await directusService
    .request(
      rItems(NEWS_COMMENT_LIKE_TABLE as any, {
        filter: {
          [fk]: { _eq: commentId } as any,
          [authorCol]: { _eq: authorValue } as any,
        } as any,
        limit: 1 as any,
        fields: ['id'] as any,
      } as any),
    )
    .catch(() => [])) as any[];

  if (Array.isArray(rows) && rows.length > 0) {
    const id = (rows[0] as any)?.id;
    if (id != null) {
      await directusService.request(dItem(NEWS_COMMENT_LIKE_TABLE as any, id as any));
      return { liked: false };
    }
  }

  const payload: Record<string, unknown> = USE_V2
    ? { [fk]: commentId, [authorCol]: authorValue }
    : { [fk]: commentId, [authorCol]: authorValue, data: Math.floor(Date.now() / 1000), status: 'ativo' };
  await directusService.request(cItem(NEWS_COMMENT_LIKE_TABLE as any, payload));
  return { liked: true };
}

// ============ PUBLIC FETCHER FUNCTIONS ============

export async function getPublicNews(query?: string): Promise<NewsRecord[]> {
  const q = typeof query === 'string' ? query.trim() : '';
  const rows = (await directusService.request(
    rItems(TABLES.articles, {
      fields: NEWS_SELECT_FIELDS,
      sort: [USE_V2 ? '-published_at' : '-data'],
      limit: 24,
      ...(q ? { search: q } : {}),
    } as any),
  )) as any[];
  if (!USE_V2) return rows as NewsRecord[];
  return Promise.all((rows as V2NewsRow[]).map(v2NewsToLegacy));
}

export async function getPublicNewsById(id: number): Promise<NewsRecord> {
  const row = (await directusService.request(
    rItem(TABLES.articles, id, { fields: NEWS_SELECT_FIELDS } as any),
  )) as any;
  if (!USE_V2) return row as NewsRecord;
  return v2NewsToLegacy(row as V2NewsRow);
}

export async function listPublicNewsForCards(limit = 60): Promise<NewsRecord[]> {
  const rows = (await directusService.request(
    rItems(TABLES.articles, {
      fields: NEWS_CARD_FIELDS,
      sort: [USE_V2 ? '-published_at' : '-data'],
      limit,
    } as any),
  )) as any[];
  if (!USE_V2) return rows as NewsRecord[];
  return Promise.all((rows as V2NewsRow[]).map(v2NewsToLegacy));
}

export async function getPublicNewsComments(newsId: number): Promise<NewsCommentRecord[]> {
  try {
    const params: Record<string, string> = {
      fields: NEWS_COMMENT_SELECT,
      sort: USE_V2 ? 'created_at' : 'data',
      limit: '200',
    };
    params[USE_V2 ? 'filter[article][_eq]' : 'filter[id_noticia][_eq]'] = String(newsId);
    const json = await directusFetch<{ data: any[] }>(`/items/${TABLES.articleComments}`, { params });
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (!USE_V2) return rows as NewsCommentRecord[];
    return Promise.all((rows as V2NewsCommentRow[]).map(v2NewsCommentToLegacy));
  } catch {
    return [];
  }
}

export async function listPublicNewsBadges(limitNews = 160, limitBadges = 220): Promise<NewsBadgeItem[]> {
  let rows: Array<{ id: number; titulo?: string | null; noticia?: string | null; data?: string | null }> = [];
  try {
    const json = await directusFetch<{ data: any[] }>(`/items/${TABLES.articles}`, {
      params: {
        fields: USE_V2 ? 'id,title,body,published_at' : 'id,titulo,noticia,data',
        sort: USE_V2 ? '-published_at' : '-data',
        limit: String(limitNews),
      },
    });
    const raw = Array.isArray(json?.data) ? json.data : [];
    rows = raw.map((r: any) =>
      USE_V2
        ? { id: Number(r.id), titulo: r.title, noticia: r.body, data: r.published_at }
        : r,
    );
  } catch {}

  if (rows.length === 0) return [];

  const out: NewsBadgeItem[] = [];

  for (const row of rows) {
    const newsId = Number(row?.id ?? 0);
    if (!Number.isFinite(newsId) || newsId <= 0) continue;

    const html = String(row?.noticia ?? '');
    if (!html) continue;
    if (!html.includes('/c_images/')) continue;

    const title = stripHtml(String(row?.titulo ?? '')).trim() || `Article #${newsId}`;
    const publishedAt = typeof row?.data === 'string' || row?.data === null ? row?.data ?? null : null;

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
