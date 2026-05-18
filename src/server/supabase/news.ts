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
