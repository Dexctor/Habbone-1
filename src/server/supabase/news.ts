import 'server-only';

import { stripHtml } from '@/lib/text-utils';
import type { NewsCommentRecord, NewsRecord } from '@/server/directus/types';
import { queryOne, queryRows } from './db';
import { mapSupabaseNews, mapSupabaseNewsComment, type SupabaseNewsCommentRow, type SupabaseNewsRow } from './news-core';
import { tableName } from './config';

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

function articleSelectSql(): string {
  return `
    select
      a.id,
      a.title,
      a.summary,
      a.cover_image,
      a.body,
      u.nick as author_nick,
      a.published_at,
      a.status
    from ${tableName('articles')} a
    left join ${tableName('users')} u on u.id = a.author
  `;
}

export async function getPublicNews(query?: string): Promise<NewsRecord[]> {
  const q = String(query || '').trim();
  const where = q
    ? `where a.title ilike $1 or a.summary ilike $1 or a.body ilike $1`
    : '';
  const rows = await queryRows<SupabaseNewsRow>(
    `${articleSelectSql()}
     ${where}
     order by a.published_at desc nulls last, a.id desc
     limit 24`,
    q ? [`%${q}%`] : [],
  );
  return rows.map(mapSupabaseNews);
}

export async function adminListNews(limit = 500): Promise<NewsRecord[]> {
  const rows = await queryRows<SupabaseNewsRow>(
    `${articleSelectSql()}
     order by a.published_at desc nulls last, a.id desc
     limit $1`,
    [limit],
  );
  return rows.map(mapSupabaseNews);
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
  const row = await queryOne<SupabaseNewsRow>(
    `with author_row as (
       select id from ${tableName('users')} where lower(nick) = lower($5) limit 1
     )
     insert into ${tableName('articles')} (title, summary, cover_image, body, author, status, published_at)
     values ($1, $2, $3, $4, (select id from author_row), coalesce($6, 'published'), coalesce($7::timestamp, now()))
     returning
       id,
       title,
       summary,
       cover_image,
       body,
       (select nick from ${tableName('users')} where id = author) as author_nick,
       published_at,
       status`,
    [
      data.titulo,
      data.descricao ?? null,
      data.imagem ?? null,
      data.noticia,
      data.autor ?? '',
      data.status ?? 'published',
      data.data ? new Date(Number(data.data) > 1e11 ? Number(data.data) : Number(data.data) * 1000).toISOString() : null,
    ],
  );
  if (!row) throw new Error('NEWS_CREATE_FAILED');
  return mapSupabaseNews(row);
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
  const values: unknown[] = [id];
  const assignments: string[] = [];
  if ('titulo' in patch) {
    values.push(patch.titulo ?? '');
    assignments.push(`title = $${values.length}`);
  }
  if ('descricao' in patch) {
    values.push(patch.descricao ?? null);
    assignments.push(`summary = $${values.length}`);
  }
  if ('imagem' in patch) {
    values.push(patch.imagem ?? null);
    assignments.push(`cover_image = $${values.length}`);
  }
  if ('noticia' in patch) {
    values.push(patch.noticia ?? '');
    assignments.push(`body = $${values.length}`);
  }
  if ('autor' in patch) {
    values.push(patch.autor ?? '');
    assignments.push(`author = (select id from ${tableName('users')} where lower(nick) = lower($${values.length}) limit 1)`);
  }
  if ('data' in patch) {
    const raw = Number(patch.data);
    values.push(Number.isFinite(raw) && raw > 0 ? new Date(raw > 1e11 ? raw : raw * 1000).toISOString() : null);
    assignments.push(`published_at = $${values.length}`);
  }
  if ('status' in patch) {
    values.push(patch.status ?? null);
    assignments.push(`status = $${values.length}`);
  }

  if (assignments.length === 0) return getPublicNewsById(id);

  const row = await queryOne<SupabaseNewsRow>(
    `update ${tableName('articles')}
     set ${assignments.join(', ')}
     where id = $1
     returning
       id,
       title,
       summary,
       cover_image,
       body,
       (select nick from ${tableName('users')} where id = author) as author_nick,
       published_at,
       status`,
    values,
  );
  if (!row) throw new Error('NEWS_NOT_FOUND');
  return mapSupabaseNews(row);
}

export async function adminDeleteNews(id: number): Promise<void> {
  await queryRows(`delete from ${tableName('articles')} where id = $1`, [id]);
}

export async function listNewsByAuthorService(author: string, limit = 30): Promise<NewsRecord[]> {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) return [];
  const rows = await queryRows<SupabaseNewsRow>(
    `${articleSelectSql()}
     where lower(u.nick) = lower($1)
     order by a.published_at desc nulls last, a.id desc
     limit $2`,
    [safeAuthor, limit],
  );
  return rows.map(mapSupabaseNews);
}

export async function getPublicNewsById(id: number): Promise<NewsRecord> {
  const row = await queryOne<SupabaseNewsRow>(
    `${articleSelectSql()} where a.id = $1 limit 1`,
    [id],
  );
  if (!row) throw new Error('NEWS_NOT_FOUND');
  return mapSupabaseNews(row);
}

export async function listPublicNewsForCards(limit = 60): Promise<NewsRecord[]> {
  const rows = await queryRows<SupabaseNewsRow>(
    `${articleSelectSql()}
     order by a.published_at desc nulls last, a.id desc
     limit $1`,
    [limit],
  );
  return rows.map(mapSupabaseNews);
}

export async function getPublicNewsComments(newsId: number): Promise<NewsCommentRecord[]> {
  const rows = await queryRows<SupabaseNewsCommentRow>(
    `select
       c.id,
       c.article,
       c.content,
       u.nick as author_nick,
       c.created_at,
       c.status
     from ${tableName('article_comments')} c
     left join ${tableName('users')} u on u.id = c.author
     where c.article = $1
     order by c.created_at asc nulls last, c.id asc
     limit 200`,
    [newsId],
  );
  return rows.map(mapSupabaseNewsComment);
}

export async function adminListNewsComments(limit = 500, newsId?: number): Promise<NewsCommentRecord[]> {
  const rows = await queryRows<SupabaseNewsCommentRow>(
    `select
       c.id,
       c.article,
       c.content,
       u.nick as author_nick,
       c.created_at,
       c.status
     from ${tableName('article_comments')} c
     left join ${tableName('users')} u on u.id = c.author
     ${newsId ? 'where c.article = $2' : ''}
     order by c.created_at desc nulls last, c.id desc
     limit $1`,
    newsId ? [limit, newsId] : [limit],
  );
  return rows.map(mapSupabaseNewsComment);
}

export async function adminUpdateNewsComment(
  id: number,
  patch: Partial<{ comentario: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<NewsCommentRecord> {
  const values: unknown[] = [id];
  const assignments: string[] = [];
  if ('comentario' in patch) {
    values.push(patch.comentario ?? '');
    assignments.push(`content = $${values.length}`);
  }
  if ('autor' in patch) {
    values.push(patch.autor ?? '');
    assignments.push(`author = (select id from ${tableName('users')} where lower(nick) = lower($${values.length}) limit 1)`);
  }
  if ('data' in patch) {
    const raw = Number(patch.data);
    values.push(Number.isFinite(raw) && raw > 0 ? new Date(raw > 1e11 ? raw : raw * 1000).toISOString() : null);
    assignments.push(`created_at = $${values.length}`);
  }
  if ('status' in patch) {
    values.push(patch.status ?? null);
    assignments.push(`status = $${values.length}`);
  }
  if (assignments.length === 0) throw new Error('NEWS_COMMENT_NO_PATCH');

  const row = await queryOne<SupabaseNewsCommentRow>(
    `update ${tableName('article_comments')}
     set ${assignments.join(', ')}
     where id = $1
     returning
       id,
       article,
       content,
       (select nick from ${tableName('users')} where id = author) as author_nick,
       created_at,
       status`,
    values,
  );
  if (!row) throw new Error('NEWS_COMMENT_NOT_FOUND');
  return mapSupabaseNewsComment(row);
}

export async function adminDeleteNewsComment(id: number): Promise<void> {
  await queryRows(`delete from ${tableName('article_comments')} where id = $1`, [id]);
}

export async function createNewsComment(input: {
  newsId: number;
  author: string;
  content: string;
  status?: string | null;
}): Promise<NewsCommentRecord> {
  const row = await queryOne<SupabaseNewsCommentRow>(
    `with author_row as (
       select id from ${tableName('users')} where lower(nick) = lower($2) limit 1
     )
     insert into ${tableName('article_comments')} (article, content, author, status)
     values ($1, $3, (select id from author_row), coalesce($4, 'active'))
     returning
       id,
       article,
       content,
       (select nick from ${tableName('users')} where id = author) as author_nick,
       created_at,
       status`,
    [input.newsId, input.author, input.content, input.status ?? null],
  );
  if (!row) throw new Error('COMMENT_CREATE_FAILED');
  return mapSupabaseNewsComment(row);
}

export async function toggleNewsCommentLike(commentId: number, author: string): Promise<{ liked: boolean }> {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) throw new Error('AUTHOR_REQUIRED');

  const existing = await queryOne<{ id: number }>(
    `select l.id
     from ${tableName('article_comment_likes')} l
     join ${tableName('users')} u on u.id = l."user"
     where l.comment = $1 and lower(u.nick) = lower($2)
     limit 1`,
    [commentId, safeAuthor],
  );

  if (existing?.id) {
    await queryRows(`delete from ${tableName('article_comment_likes')} where id = $1`, [existing.id]);
    return { liked: false };
  }

  const inserted = await queryOne<{ id: number }>(
    `with author_row as (
       select id from ${tableName('users')} where lower(nick) = lower($2) limit 1
     )
     insert into ${tableName('article_comment_likes')} (comment, "user")
     select $1, id from author_row
     on conflict (comment, "user") do nothing
     returning id`,
    [commentId, safeAuthor],
  );

  if (!inserted) throw new Error('AUTHOR_NOT_FOUND');
  return { liked: true };
}

export async function listPublicNewsBadges(limitNews = 160, limitBadges = 220): Promise<NewsBadgeItem[]> {
  const rows = await queryRows<SupabaseNewsRow>(
    `${articleSelectSql()}
     order by a.published_at desc nulls last, a.id desc
     limit $1`,
    [limitNews],
  );

  const out: NewsBadgeItem[] = [];
  for (const row of rows) {
    const newsId = Number(row.id || 0);
    if (!newsId) continue;

    const html = String(row.body ?? '');
    if (!html || !html.includes('/c_images/')) continue;

    const title = stripHtml(String(row.title ?? '')).trim() || `Article #${newsId}`;
    const publishedAt = row.published_at instanceof Date
      ? row.published_at.toISOString()
      : row.published_at;

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
        publishedAt: publishedAt ?? null,
      });

      if (out.length >= limitBadges) return out;
    }
  }

  return out;
}
