export type LikeReadConfig = {
  table: string;
  commentField: string;
};

export type LikeCountRow = Record<string, number | string | null | undefined>;

export function getCommentLikeReadConfig(kind: 'news' | 'forum', useV2: boolean): LikeReadConfig {
  if (kind === 'news') {
    return useV2
      ? { table: 'article_comment_likes', commentField: 'comment' }
      : { table: 'noticias_coment_curtidas', commentField: 'id_comentario' };
  }

  return useV2
    ? { table: 'forum_comment_likes', commentField: 'comment' }
    : { table: 'forum_coment_curtidas', commentField: 'id_comentario' };
}

export function countLikesByComment(rows: LikeCountRow[], commentField: string): Record<number, number> {
  return rows.reduce((acc: Record<number, number>, row) => {
    const cid = Number(row[commentField]);
    if (!Number.isFinite(cid) || cid <= 0) return acc;
    acc[cid] = (acc[cid] ?? 0) + 1;
    return acc;
  }, {});
}
