import 'server-only';

import { pbList, pbOne, pbFirst, pbCreate, pbUpdate, pbDelete } from './pb-helpers';
import { TABLES } from './tables';
import { resolveUserId, resolveUserNicks, unixSecondsToIso, isoToUnixSeconds } from './user-cache';
import type { ForumTopicRecord, ForumPostRecord, ForumCommentRecord, ForumCategoryRecord } from './types';

/* ------------------------------------------------------------------ */
/*  Column sets (v2)                                                   */
/* ------------------------------------------------------------------ */

// `created` (autodate) added to all collections in migration step 11. New
// content gets a real timestamp; legacy rows share the field-add date (their
// original legacy `data` wasn't preserved at migration time).
const TOPIC_FIELDS = 'id,title,body,cover_image,author,created,views,pinned,locked,status,category';
const TOPIC_LIST_SORT = '-created';
const COMMENT_SELECT = 'id,topic,content,author,created,status';
const CATEGORY_FIELDS = 'id,name,description,active,icon,slug,sort';
const CATEGORY_SORT = 'name';

const LIKE_TABLE = TABLES.forumCommentLikes;
const VOTE_TABLE = TABLES.forumTopicVotes;

/* ------------------------------------------------------------------ */
/*  v2 row types + translators                                         */
/* ------------------------------------------------------------------ */

type V2Topic = {
  id: string;
  title: string | null;
  body: string | null;
  cover_image: string | null;
  author: string | null;
  created: string | null;
  views: number | null;
  pinned: boolean | null;
  locked: boolean | null;
  status: string | null;
  category: string | null;
};

type V2Comment = {
  id: string;
  topic: string;
  content: string | null;
  author: string | null;
  created: string | null;
  status: string | null;
};

type V2Category = {
  id: string;
  name: string | null;
  description: string | null;
  active: boolean | null;
  icon: string | null;
  slug: string | null;
  sort: number | null;
};

async function v2TopicsToLegacy(rows: V2Topic[]): Promise<ForumTopicRecord[]> {
  const nickMap = await resolveUserNicks(rows.map((r) => r.author));
  return rows.map((r) => ({
    id: r.id,
    titulo: r.title ?? '',
    conteudo: r.body ?? null,
    imagem: r.cover_image ?? null,
    autor: r.author ? nickMap.get(r.author) ?? null : null,
    data: isoToUnixSeconds(r.created)?.toString() ?? null,
    views: r.views ?? null,
    fixo: r.pinned ? 's' : 'n',
    fechado: r.locked ? 's' : 'n',
    status: r.status ?? null,
    cat_id: r.category ?? null,
  })) as unknown as ForumTopicRecord[];
}

async function v2CommentsToLegacy(rows: V2Comment[]): Promise<ForumCommentRecord[]> {
  const nickMap = await resolveUserNicks(rows.map((r) => r.author));
  return rows.map((r) => ({
    id: r.id,
    id_forum: r.topic,
    comentario: r.content ?? '',
    autor: r.author ? nickMap.get(r.author) ?? null : null,
    data: isoToUnixSeconds(r.created)?.toString() ?? null,
    status: r.status ?? null,
  })) as unknown as ForumCommentRecord[];
}

function v2CategoriesToLegacy(rows: V2Category[]): ForumCategoryRecord[] {
  return rows.map((r) => ({
    id: r.id,
    nome: r.name ?? '',
    descricao: r.description ?? null,
    status: r.active ? 'ativo' : 'inativo',
    imagem: r.icon ?? null,
    slug: r.slug ?? null,
    ordem: r.sort ?? null,
  })) as unknown as ForumCategoryRecord[];
}

function yesNoToBool(v: unknown): boolean {
  return String(v ?? '').toLowerCase() === 's' || v === true;
}

/* ------------------------------------------------------------------ */
/*  Topic: list/read                                                   */
/* ------------------------------------------------------------------ */

export async function adminListForumTopics(limit = 200): Promise<ForumTopicRecord[]> {
  const rows = await pbList<V2Topic>(TABLES.forumTopics, {
    perPage: limit,
    sort: TOPIC_LIST_SORT,
    fields: TOPIC_FIELDS,
  });
  return v2TopicsToLegacy(rows);
}

export async function listForumTopicsWithCategories(limit = 50): Promise<ForumTopicRecord[]> {
  return adminListForumTopics(limit);
}

export async function listForumTopicsByAuthorService(author: string, limit = 30): Promise<ForumTopicRecord[]> {
  if (!author) return [];
  const authorId = await resolveUserId(author);
  if (!authorId) return [];
  const rows = await pbList<V2Topic>(TABLES.forumTopics, {
    filter: { author: { _eq: authorId } },
    fields: TOPIC_FIELDS,
    sort: TOPIC_LIST_SORT,
    perPage: limit,
  }).catch(() => [] as V2Topic[]);
  return v2TopicsToLegacy(rows);
}

export async function getPublicTopics(limit = 50): Promise<ForumTopicRecord[]> {
  // Public list: only active topics (admin sees all via adminListForumTopics).
  const rows = await pbList<V2Topic>(TABLES.forumTopics, {
    perPage: limit,
    sort: TOPIC_LIST_SORT,
    fields: TOPIC_FIELDS,
    filter: { status: { _eq: 'active' } },
  });
  return v2TopicsToLegacy(rows);
}

export async function getPublicTopicById(id: string): Promise<ForumTopicRecord | null> {
  const row = await pbOne<V2Topic>(TABLES.forumTopics, id, { fields: TOPIC_FIELDS });
  if (!row) return null;
  const [legacy] = await v2TopicsToLegacy([row]);
  return legacy;
}

/* ------------------------------------------------------------------ */
/*  Topic: write                                                       */
/* ------------------------------------------------------------------ */

export async function createForumTopic(data: {
  titulo: string;
  conteudo: string;
  autor: string;
  imagem?: string | null;
  cat_id?: string | null;
}): Promise<ForumTopicRecord> {
  const authorId = await resolveUserId(data.autor);
  const created = await pbCreate<V2Topic>(TABLES.forumTopics, {
    title: data.titulo,
    body: data.conteudo,
    author: authorId,
    cover_image: data.imagem ?? null,
    category: data.cat_id ?? null,
    status: 'active',
    views: 0,
    pinned: false,
    locked: false,
  });
  const [legacy] = await v2TopicsToLegacy([created]);
  return legacy;
}

export async function adminUpdateForumTopic(
  id: string,
  patch: Partial<{
    titulo: string;
    conteudo: string | null;
    imagem: string | null;
    autor: string | null;
    data: string | null;
    views: number | null;
    fixo: boolean | number | string;
    fechado: boolean | number | string;
    status: string | null;
  }>,
): Promise<ForumTopicRecord> {
  const mapped: Record<string, unknown> = {};
  if ('titulo' in patch) mapped.title = patch.titulo;
  if ('conteudo' in patch) mapped.body = patch.conteudo;
  if ('imagem' in patch) mapped.cover_image = patch.imagem;
  if ('autor' in patch) mapped.author = await resolveUserId(patch.autor);
  // forum_topics has no `created` field — date edits are dropped.
  if ('views' in patch) mapped.views = patch.views;
  if ('fixo' in patch) mapped.pinned = yesNoToBool(patch.fixo);
  if ('fechado' in patch) mapped.locked = yesNoToBool(patch.fechado);
  if ('status' in patch)
    mapped.status = patch.status === 'ativo' ? 'active' : patch.status === 'inativo' ? 'hidden' : patch.status;
  const updated = await pbUpdate<V2Topic>(TABLES.forumTopics, id, mapped);
  const [legacy] = await v2TopicsToLegacy([updated]);
  return legacy;
}

export async function adminDeleteForumTopic(id: string) {
  return pbDelete(TABLES.forumTopics, id);
}

/* ------------------------------------------------------------------ */
/*  Posts — forum_posts does not exist in v2 (use comments instead)    */
/* ------------------------------------------------------------------ */

export async function adminListForumPosts(_limit = 500): Promise<ForumPostRecord[]> {
  return [];
}

export async function adminCreateForumPost(_data: {
  id_topico: string;
  conteudo: string;
  autor?: string | null;
  data?: string | null;
  status?: string | null;
}): Promise<ForumPostRecord> {
  throw new Error('forum_posts is deprecated in v2 — use forum comments instead');
}

export async function adminUpdateForumPost(
  _id: string,
  _patch: Partial<{ conteudo: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<ForumPostRecord> {
  throw new Error('forum_posts is deprecated in v2');
}

export async function adminDeleteForumPost(id: string) {
  return { id };
}

export function getPublicPostById(_id: string): Promise<ForumPostRecord> {
  return Promise.reject(new Error('forum_posts deprecated in v2'));
}

/* ------------------------------------------------------------------ */
/*  Comments                                                           */
/* ------------------------------------------------------------------ */

export async function adminListForumComments(limit = 500, topicId?: string): Promise<ForumCommentRecord[]> {
  try {
    const rows = await pbList<V2Comment>(TABLES.forumComments, {
      filter: topicId ? { topic: { _eq: topicId } } : undefined,
      sort: '-created',
      perPage: limit,
      fields: COMMENT_SELECT,
    });
    return v2CommentsToLegacy(rows);
  } catch {
    return [];
  }
}

export async function adminUpdateForumComment(
  id: string,
  patch: Partial<{ comentario: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<ForumCommentRecord> {
  const mapped: Record<string, unknown> = {};
  if ('comentario' in patch) mapped.content = patch.comentario;
  if ('autor' in patch) mapped.author = await resolveUserId(patch.autor);
  if ('status' in patch)
    mapped.status = patch.status === 'ativo' ? 'active' : patch.status === 'inativo' ? 'hidden' : patch.status;
  const updated = await pbUpdate<V2Comment>(TABLES.forumComments, id, mapped);
  const [legacy] = await v2CommentsToLegacy([updated]);
  return legacy;
}

export async function adminDeleteForumComment(id: string) {
  return pbDelete(TABLES.forumComments, id);
}

export async function createForumComment(input: {
  topicId: string;
  author: string;
  content: string;
  status?: string | null;
}): Promise<ForumCommentRecord> {
  const authorId = await resolveUserId(input.author);
  const created = await pbCreate<V2Comment>(TABLES.forumComments, {
    topic: input.topicId,
    content: input.content,
    author: authorId,
    status: input.status ?? 'active',
  });
  const [legacy] = await v2CommentsToLegacy([created]);
  return legacy;
}

export async function getPublicTopicComments(topicId: string): Promise<ForumCommentRecord[]> {
  try {
    const rows = await pbList<V2Comment>(TABLES.forumComments, {
      fields: COMMENT_SELECT,
      sort: 'created',
      perPage: 500,
      filter: { topic: { _eq: topicId } },
    });
    return v2CommentsToLegacy(rows);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Likes on comments                                                  */
/* ------------------------------------------------------------------ */

export async function toggleForumCommentLike(commentId: string, author: string) {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) throw new Error('AUTHOR_REQUIRED');

  const userId = await resolveUserId(safeAuthor);
  if (userId == null) throw new Error('AUTHOR_NOT_FOUND');

  const existing = await pbFirst<{ id: string }>(LIKE_TABLE, {
    comment: { _eq: commentId },
    user: { _eq: userId },
  }).catch(() => null);

  if (existing?.id) {
    await pbDelete(LIKE_TABLE, existing.id);
    return { liked: false };
  }

  await pbCreate(LIKE_TABLE, { comment: commentId, user: userId });
  return { liked: true };
}

/* ------------------------------------------------------------------ */
/*  Reports — no v2 table designed yet                                 */
/* ------------------------------------------------------------------ */

export async function reportForumComment(_commentId: string, _author: string) {
  return null;
}

/* ------------------------------------------------------------------ */
/*  Topic votes (v2: value enum 'up' | 'down', one row per topic+user) */
/* ------------------------------------------------------------------ */

function voteToValue(vote: 1 | -1): 'up' | 'down' {
  return vote === 1 ? 'up' : 'down';
}

export async function setTopicVote(topicId: string, author: string, vote: 1 | -1) {
  const userId = await resolveUserId(author);
  if (!userId) throw new Error('AUTHOR_NOT_FOUND');
  const value = voteToValue(vote);

  const existing = await pbFirst<{ id: string; value: string }>(
    VOTE_TABLE,
    { topic: { _eq: topicId }, user: { _eq: userId } },
    { fields: 'id,value' },
  ).catch(() => null);

  if (existing?.id) {
    if (existing.value === value) {
      await pbDelete(VOTE_TABLE, existing.id);
      return { removed: true };
    }
    await pbUpdate(VOTE_TABLE, existing.id, { value });
    return { updated: true };
  }

  await pbCreate(VOTE_TABLE, { topic: topicId, user: userId, value });
  return { created: true };
}

export async function getTopicVoteSummary(topicId: string): Promise<{ up: number; down: number }> {
  try {
    const rows = await pbList<{ value: string }>(VOTE_TABLE, {
      perPage: 1000,
      fields: 'id,value',
      filter: { topic: { _eq: topicId } },
    });
    let up = 0;
    let down = 0;
    for (const r of rows) {
      if (r.value === 'up') up++;
      else if (r.value === 'down') down++;
    }
    return { up, down };
  } catch {
    return { up: 0, down: 0 };
  }
}

/* ------------------------------------------------------------------ */
/*  Categories                                                         */
/* ------------------------------------------------------------------ */

export async function listForumCategoriesService(): Promise<ForumCategoryRecord[]> {
  const rows = await pbList<V2Category>(TABLES.forumCategories, {
    perPage: 100,
    sort: CATEGORY_SORT,
    fields: CATEGORY_FIELDS,
  });
  return v2CategoriesToLegacy(rows);
}

export async function listPublicForumCategories(): Promise<ForumCategoryRecord[]> {
  return listForumCategoriesService();
}

export type { ForumTopicRecord, ForumPostRecord, ForumCommentRecord, ForumCategoryRecord };
