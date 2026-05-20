import 'server-only';

import type { StoryRecord } from '@/server/directus/types';
import { tableName } from './config';
import { queryOne, queryRows } from './db';
import { mapSupabaseStory, type SupabaseStoryRow } from './stories-core';

type StoryRowInput = {
  author: string;
  imageId: string;
  title?: string | null;
  status?: string | null;
};

function storySelectSql(): string {
  return `
    select
      s.id,
      s.title,
      s.image,
      u.nick as author_nick,
      s.status,
      s.published_at,
      s.created_at
    from ${tableName('stories')} s
    left join ${tableName('users')} u on u.id = s.author
  `;
}

function normalizeStoryStatus(status: string | null | undefined): string {
  if (status === 'draft') return 'draft';
  if (status === 'hidden') return 'hidden';
  return 'public';
}

export async function createStoryRow(input: StoryRowInput): Promise<StoryRecord> {
  const status = normalizeStoryStatus(input.status);
  const row = await queryOne<SupabaseStoryRow>(
    `with author_row as (
       select id from ${tableName('users')} where lower(nick) = lower($1) limit 1
     )
     insert into ${tableName('stories')} (author, image, title, status, published_at)
     values ((select id from author_row), $2, $3, $4::text, case when $4::text = 'draft' then null else now() end)
     returning
       id,
       title,
       image,
       (select nick from ${tableName('users')} where id = author) as author_nick,
       status,
       published_at,
       created_at`,
    [input.author, input.imageId, input.title ?? null, status],
  );
  if (!row) throw new Error('CREATE_STORY_FAILED');
  return mapSupabaseStory(row);
}

export async function countStoriesThisMonthByAuthor(author: string): Promise<number> {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) return 0;

  const row = await queryOne<{ count: string }>(
    `select count(*)::text as count
     from ${tableName('stories')} s
     join ${tableName('users')} u on u.id = s.author
     where lower(u.nick) = lower($1)
       and s.created_at >= date_trunc('month', now())`,
    [safeAuthor],
  );
  return Number(row?.count) || 0;
}

export async function listStoriesService(limit = 30): Promise<StoryRecord[]> {
  const rows = await queryRows<SupabaseStoryRow>(
    `${storySelectSql()}
     order by s.id desc
     limit $1`,
    [limit],
  );
  return rows.map(mapSupabaseStory);
}

export async function adminListStories(limit = 500): Promise<StoryRecord[]> {
  return listStoriesService(limit);
}

export async function adminUpdateStory(id: number, patch: Partial<StoryRecord>): Promise<void> {
  const values: unknown[] = [id];
  const assignments: string[] = [];

  if ('titulo' in patch) {
    values.push(patch.titulo ?? null);
    assignments.push(`title = $${values.length}`);
  }
  if ('image' in patch) {
    values.push(patch.image ?? null);
    assignments.push(`image = $${values.length}`);
  } else if ('imagem' in patch) {
    values.push(patch.imagem ?? null);
    assignments.push(`image = $${values.length}`);
  }
  if ('status' in patch) {
    values.push(normalizeStoryStatus(patch.status));
    assignments.push(`status = $${values.length}`);
  }
  if ('autor' in patch) {
    values.push(patch.autor ?? null);
    assignments.push(`author = (select id from ${tableName('users')} where lower(nick) = lower($${values.length}) limit 1)`);
  }

  if (assignments.length === 0) return;

  await queryRows(
    `update ${tableName('stories')}
     set ${assignments.join(', ')}
     where id = $1`,
    values,
  );
}

export async function adminDeleteStory(id: number): Promise<void> {
  await queryRows(`delete from ${tableName('stories')} where id = $1`, [id]);
}
