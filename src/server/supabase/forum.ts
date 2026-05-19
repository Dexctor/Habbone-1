import 'server-only';

import type { ForumCategoryRecord, ForumCommentRecord, ForumTopicRecord } from '@/server/directus/types';
import { queryOne, queryRows } from './db';
import { tableName } from './config';
import {
  mapSupabaseForumCategory,
  mapSupabaseForumComment,
  mapSupabaseForumTopic,
  type SupabaseForumCategoryRow,
  type SupabaseForumCommentRow,
  type SupabaseForumTopicRow,
} from './forum-core';

function topicSelectSql(): string {
  return `
    select
      t.id,
      t.title,
      t.body,
      t.cover_image,
      u.nick as author_nick,
      t.created_at,
      t.views,
      t.pinned,
      t.locked,
      t.status,
      t.category
    from ${tableName('forum_topics')} t
    left join ${tableName('users')} u on u.id = t.author
  `;
}

export async function getPublicTopics(limit = 50): Promise<ForumTopicRecord[]> {
  const rows = await queryRows<SupabaseForumTopicRow>(
    `${topicSelectSql()}
     order by t.pinned desc nulls last, t.created_at desc nulls last, t.id desc
     limit $1`,
    [limit],
  );
  return rows.map(mapSupabaseForumTopic);
}

export async function getPublicTopicById(id: number): Promise<ForumTopicRecord> {
  const row = await queryOne<SupabaseForumTopicRow>(
    `${topicSelectSql()} where t.id = $1 limit 1`,
    [id],
  );
  if (!row) throw new Error('FORUM_TOPIC_NOT_FOUND');
  return mapSupabaseForumTopic(row);
}

export async function createForumTopic(data: {
  titulo: string;
  conteudo: string;
  autor: string;
  imagem?: string | null;
  cat_id?: number | string | null;
}): Promise<ForumTopicRecord> {
  const row = await queryOne<SupabaseForumTopicRow>(
    `with author_row as (
       select id from ${tableName('users')} where lower(nick) = lower($3) limit 1
     )
     insert into ${tableName('forum_topics')} (title, body, author, cover_image, category, status, views, pinned, locked)
     values ($1, $2, (select id from author_row), $4, $5, 'active', 0, false, false)
     returning
       id,
       title,
       body,
       cover_image,
       (select nick from ${tableName('users')} where id = author) as author_nick,
       created_at,
       views,
       pinned,
       locked,
       status,
       category`,
    [data.titulo, data.conteudo, data.autor, data.imagem ?? null, data.cat_id ? Number(data.cat_id) : 1],
  );
  if (!row) throw new Error('FORUM_TOPIC_CREATE_FAILED');
  return mapSupabaseForumTopic(row);
}

export async function getPublicTopicComments(topicId: number): Promise<ForumCommentRecord[]> {
  const rows = await queryRows<SupabaseForumCommentRow>(
    `select
       c.id,
       c.topic,
       c.content,
       u.nick as author_nick,
       c.created_at,
       c.status
     from ${tableName('forum_comments')} c
     left join ${tableName('users')} u on u.id = c.author
     where c.topic = $1
     order by c.created_at asc nulls last, c.id asc
     limit 500`,
    [topicId],
  );
  return rows.map(mapSupabaseForumComment);
}

export async function createForumComment(input: {
  topicId: number;
  author: string;
  content: string;
  status?: string | null;
}): Promise<ForumCommentRecord> {
  const row = await queryOne<SupabaseForumCommentRow>(
    `with author_row as (
       select id from ${tableName('users')} where lower(nick) = lower($2) limit 1
     )
     insert into ${tableName('forum_comments')} (topic, content, author, status)
     values ($1, $3, (select id from author_row), coalesce($4, 'active'))
     returning
       id,
       topic,
       content,
       (select nick from ${tableName('users')} where id = author) as author_nick,
       created_at,
       status`,
    [input.topicId, input.author, input.content, input.status ?? null],
  );
  if (!row) throw new Error('FORUM_COMMENT_CREATE_FAILED');
  return mapSupabaseForumComment(row);
}

export async function toggleForumCommentLike(commentId: number, author: string): Promise<{ liked: boolean }> {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) throw new Error('AUTHOR_REQUIRED');

  const existing = await queryOne<{ id: number }>(
    `select l.id
     from ${tableName('forum_comment_likes')} l
     join ${tableName('users')} u on u.id = l."user"
     where l.comment = $1 and lower(u.nick) = lower($2)
     limit 1`,
    [commentId, safeAuthor],
  );

  if (existing?.id) {
    await queryRows(`delete from ${tableName('forum_comment_likes')} where id = $1`, [existing.id]);
    return { liked: false };
  }

  const inserted = await queryOne<{ id: number }>(
    `with author_row as (
       select id from ${tableName('users')} where lower(nick) = lower($2) limit 1
     )
     insert into ${tableName('forum_comment_likes')} (comment, "user")
     select $1, id from author_row
     on conflict (comment, "user") do nothing
     returning id`,
    [commentId, safeAuthor],
  );
  if (!inserted) throw new Error('AUTHOR_NOT_FOUND');
  return { liked: true };
}

export async function setTopicVote(topicId: number, author: string, vote: 1 | -1) {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) throw new Error('AUTHOR_REQUIRED');

  const existing = await queryOne<{ id: number; value: number }>(
    `select v.id, v.value
     from ${tableName('forum_topic_votes')} v
     join ${tableName('users')} u on u.id = v."user"
     where v.topic = $1 and lower(u.nick) = lower($2)
     limit 1`,
    [topicId, safeAuthor],
  );

  if (existing?.id) {
    if (Number(existing.value) === vote) {
      await queryRows(`delete from ${tableName('forum_topic_votes')} where id = $1`, [existing.id]);
      return { removed: true };
    }
    await queryRows(`update ${tableName('forum_topic_votes')} set value = $2 where id = $1`, [existing.id, vote]);
    return { updated: true };
  }

  const inserted = await queryOne<{ id: number }>(
    `with author_row as (
       select id from ${tableName('users')} where lower(nick) = lower($2) limit 1
     )
     insert into ${tableName('forum_topic_votes')} (topic, "user", value)
     select $1, id, $3 from author_row
     on conflict (topic, "user") do update set value = excluded.value
     returning id`,
    [topicId, safeAuthor, vote],
  );
  if (!inserted) throw new Error('AUTHOR_NOT_FOUND');
  return { created: true };
}

export async function getTopicVoteSummary(topicId: number): Promise<{ up: number; down: number }> {
  const rows = await queryRows<{ up: string; down: string }>(
    `select
       count(*) filter (where value > 0)::text as up,
       count(*) filter (where value < 0)::text as down
     from ${tableName('forum_topic_votes')}
     where topic = $1`,
    [topicId],
  );
  const row = rows[0];
  return { up: Number(row?.up) || 0, down: Number(row?.down) || 0 };
}

export async function listPublicForumCategories(): Promise<ForumCategoryRecord[]> {
  const rows = await queryRows<SupabaseForumCategoryRow>(
    `select id, name, description, active, icon, slug, sort
     from ${tableName('forum_categories')}
     order by sort asc nulls last, name asc
     limit 100`,
  );
  return rows.map(mapSupabaseForumCategory);
}
