import 'server-only';

import { pbList } from './pb-helpers';
import { TABLES } from './tables';

type LikeRow = { comment: string };

type LikesTable = typeof TABLES.articleCommentLikes | typeof TABLES.forumCommentLikes;

/**
 * Count likes per comment for a set of comment ids.
 *
 * v2: like tables (article_comment_likes / forum_comment_likes) reference the
 * comment via the `comment` relation. Comment ids are PocketBase strings.
 */
export async function getLikesMapForComments(
  table: LikesTable,
  commentIds: string[],
): Promise<Record<string, number>> {
  if (!commentIds?.length) return {};

  const likes = await pbList<LikeRow>(table, {
    filter: { comment: { _in: commentIds } },
    fields: 'comment',
    perPage: 5000,
  });

  return likes.reduce((acc: Record<string, number>, row: LikeRow) => {
    const cid = String(row.comment);
    if (!cid) return acc;
    acc[cid] = (acc[cid] ?? 0) + 1;
    return acc;
  }, {});
}

/** Likes map for article (news) comments. */
export function getLikesMapForNewsComments(commentIds: string[]): Promise<Record<string, number>> {
  return getLikesMapForComments(TABLES.articleCommentLikes, commentIds);
}

/** Likes map for forum comments. */
export function getLikesMapForTopicComments(commentIds: string[]): Promise<Record<string, number>> {
  return getLikesMapForComments(TABLES.forumCommentLikes, commentIds);
}
