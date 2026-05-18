import 'server-only';

import { queryRows } from './db';
import { tableName } from './config';

async function countLikes(table: string, commentIds: number[]): Promise<Record<number, number>> {
  const ids = commentIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) return {};

  const rows = await queryRows<{ comment: number; count: string }>(
    `select comment, count(*)::text as count
     from ${tableName(table)}
     where comment = any($1::int[])
     group by comment`,
    [ids],
  );

  return rows.reduce<Record<number, number>>((acc, row) => {
    acc[Number(row.comment)] = Number(row.count) || 0;
    return acc;
  }, {});
}

export function getLikesMapForNewsComments(commentIds: number[]): Promise<Record<number, number>> {
  return countLikes('article_comment_likes', commentIds);
}

export function getLikesMapForTopicComments(commentIds: number[]): Promise<Record<number, number>> {
  return countLikes('forum_comment_likes', commentIds);
}
