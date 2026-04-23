import 'server-only';

import { directusService, rItems, rItem, cItem, uItem, dItem } from './client';
import { directusFetch } from './fetch';
import { TABLES, USE_V2 } from './tables';
import { resolveUserId, resolveUserNicks, unixSecondsToIso, isoToUnixSeconds, nowIso } from './user-cache';
import type { ForumTopicRecord, ForumPostRecord, ForumCommentRecord, ForumCategoryRecord } from './types';

/* ------------------------------------------------------------------ */
/*  Column sets                                                        */
/* ------------------------------------------------------------------ */

const TOPIC_FIELDS = USE_V2
  ? ['id', 'title', 'body', 'cover_image', 'author', 'created_at', 'views', 'pinned', 'locked', 'status', 'category']
  : ['id', 'titulo', 'conteudo', 'imagem', 'autor', 'data', 'views', 'fixo', 'fechado', 'status', 'cat_id'];

const TOPIC_LIST_SORT = USE_V2 ? ['-created_at'] : ['-data'];

const COMMENT_SELECT = USE_V2
  ? 'id,topic,content,author,created_at,status'
  : 'id,id_forum,comentario,autor,data,status';

const COMMENT_SORT = USE_V2 ? '-created_at' : '-data';
const COMMENT_FILTER_FK = USE_V2 ? 'filter[topic][_eq]' : 'filter[id_forum][_eq]';

const CATEGORY_FIELDS = USE_V2
  ? ['id', 'name', 'description', 'active', 'icon', 'slug', 'sort']
  : ['id', 'nome', 'descricao', 'status', 'imagem', 'slug', 'ordem'];
const CATEGORY_SORT = USE_V2 ? ['name'] : ['nome'];

const LIKE_TABLE = TABLES.forumCommentLikes;
const LIKE_FIELDS = USE_V2
  ? { comment: 'comment', user: 'user' }
  : { comment: 'id_comentario', user: 'autor' };

const VOTE_TABLE = TABLES.forumTopicVotes;
const VOTE_FIELDS = USE_V2
  ? { topic: 'topic', user: 'user', value: 'value' }
  : { topic: 'id_topico', user: 'autor', value: 'tipo' };

/* ------------------------------------------------------------------ */
/*  v2 row types + translators                                         */
/* ------------------------------------------------------------------ */

type V2Topic = {
  id: number;
  title: string | null;
  body: string | null;
  cover_image: string | null;
  author: number | null;
  created_at: string | null;
  views: number | null;
  pinned: boolean | null;
  locked: boolean | null;
  status: string | null;
  category: number | null;
};

type V2Comment = {
  id: number;
  topic: number;
  content: string | null;
  author: number | null;
  created_at: string | null;
  status: string | null;
};

type V2Category = {
  id: number;
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
    data: isoToUnixSeconds(r.created_at)?.toString() ?? null,
    views: r.views ?? null,
    fixo: r.pinned ? 's' : 'n',
    fechado: r.locked ? 's' : 'n',
    status: r.status ?? null,
    cat_id: r.category ?? null,
  }));
}

async function v2CommentsToLegacy(rows: V2Comment[]): Promise<ForumCommentRecord[]> {
  const nickMap = await resolveUserNicks(rows.map((r) => r.author));
  return rows.map((r) => ({
    id: r.id,
    id_forum: r.topic,
    comentario: r.content ?? '',
    autor: r.author ? nickMap.get(r.author) ?? null : null,
    data: isoToUnixSeconds(r.created_at)?.toString() ?? null,
    status: r.status ?? null,
  }));
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
  }));
}

function yesNoToBool(v: unknown): boolean {
  return String(v ?? '').toLowerCase() === 's' || v === true;
}

/* ------------------------------------------------------------------ */
/*  Topic: list/read                                                   */
/* ------------------------------------------------------------------ */

export async function adminListForumTopics(limit = 200): Promise<ForumTopicRecord[]> {
  const rows = (await directusService.request(
    rItems(TABLES.forumTopics, { limit, sort: TOPIC_LIST_SORT, fields: TOPIC_FIELDS } as any),
  )) as any[];
  if (!USE_V2) return rows as ForumTopicRecord[];
  return v2TopicsToLegacy(rows as V2Topic[]);
}

export async function listForumTopicsWithCategories(limit = 50): Promise<ForumTopicRecord[]> {
  return adminListForumTopics(limit);
}

export async function listForumTopicsByAuthorService(author: string, limit = 30): Promise<ForumTopicRecord[]> {
  if (!author) return [];

  const filter: Record<string, unknown> = USE_V2
    ? { author: { _eq: await resolveUserId(author) } }
    : { autor: { _eq: author } };

  if (USE_V2 && (filter as any).author._eq == null) return [];

  const rows = (await directusService
    .request(
      rItems(TABLES.forumTopics, {
        filter: filter as any,
        fields: TOPIC_FIELDS as any,
        sort: TOPIC_LIST_SORT as any,
        limit: limit as any,
      } as any),
    )
    .catch(() => [] as any[])) as any[];

  if (!USE_V2) return rows as ForumTopicRecord[];
  return v2TopicsToLegacy(rows as V2Topic[]);
}

export function getPublicTopics(limit = 50): Promise<ForumTopicRecord[]> {
  return adminListForumTopics(limit);
}

export async function getPublicTopicById(id: number): Promise<ForumTopicRecord> {
  const row = (await directusService.request(
    rItem(TABLES.forumTopics, id, { fields: TOPIC_FIELDS } as any),
  )) as any;
  if (!USE_V2) return row as ForumTopicRecord;
  const [legacy] = await v2TopicsToLegacy([row as V2Topic]);
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
  cat_id?: number | string | null;
}): Promise<ForumTopicRecord> {
  if (USE_V2) {
    const authorId = await resolveUserId(data.autor);
    const payload: Record<string, unknown> = {
      title: data.titulo,
      body: data.conteudo,
      author: authorId,
      cover_image: data.imagem ?? null,
      category: data.cat_id ? Number(data.cat_id) : 1,
      status: 'active',
      views: 0,
      pinned: false,
      locked: false,
    };
    const created = (await directusService.request(cItem(TABLES.forumTopics, payload as any))) as V2Topic;
    const [legacy] = await v2TopicsToLegacy([created]);
    return legacy;
  }

  const payload: any = {
    titulo: data.titulo,
    conteudo: data.conteudo,
    autor: data.autor,
    imagem: data.imagem ?? null,
    cat_id: data.cat_id ?? 1,
    data: Math.floor(Date.now() / 1000),
    status: 'ativo',
    views: 0,
    fixo: 'n',
    fechado: 'n',
    editado: 'n',
    moderado: 'n',
  };
  return directusService.request(cItem(TABLES.forumTopics, payload)) as Promise<ForumTopicRecord>;
}

export async function adminUpdateForumTopic(
  id: number,
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
  if (USE_V2) {
    const mapped: Record<string, unknown> = {};
    if ('titulo' in patch) mapped.title = patch.titulo;
    if ('conteudo' in patch) mapped.body = patch.conteudo;
    if ('imagem' in patch) mapped.cover_image = patch.imagem;
    if ('autor' in patch) mapped.author = await resolveUserId(patch.autor);
    if ('data' in patch) mapped.created_at = unixSecondsToIso(patch.data);
    if ('views' in patch) mapped.views = patch.views;
    if ('fixo' in patch) mapped.pinned = yesNoToBool(patch.fixo);
    if ('fechado' in patch) mapped.locked = yesNoToBool(patch.fechado);
    if ('status' in patch) mapped.status = patch.status === 'ativo' ? 'active' : patch.status === 'inativo' ? 'hidden' : patch.status;
    const updated = (await directusService.request(uItem(TABLES.forumTopics, id, mapped as any))) as V2Topic;
    const [legacy] = await v2TopicsToLegacy([updated]);
    return legacy;
  }
  return directusService.request(uItem(TABLES.forumTopics, id, patch as any)) as Promise<ForumTopicRecord>;
}

export async function adminDeleteForumTopic(id: number) {
  return directusService.request(dItem(TABLES.forumTopics, id));
}

/* ------------------------------------------------------------------ */
/*  Posts (forum_posts is a 0-row legacy table kept for API compat)    */
/* ------------------------------------------------------------------ */

export async function adminListForumPosts(limit = 500): Promise<ForumPostRecord[]> {
  if (USE_V2) return [];
  return directusService.request(
    rItems(TABLES.forumPosts, {
      limit,
      sort: ['-data'],
      fields: ['id', 'id_topico', 'conteudo', 'autor', 'data', 'status'],
    } as any),
  ) as Promise<ForumPostRecord[]>;
}

export async function adminCreateForumPost(data: {
  id_topico: number;
  conteudo: string;
  autor?: string | null;
  data?: string | null;
  status?: string | null;
}): Promise<ForumPostRecord> {
  if (USE_V2) {
    throw new Error('forum_posts is deprecated in v2 — use forum comments instead');
  }
  const payload: any = {
    id_topico: data.id_topico,
    conteudo: data.conteudo,
    autor: data.autor ?? null,
    data: data.data ?? Math.floor(Date.now() / 1000),
    status: data.status ?? null,
  };
  return directusService.request(cItem(TABLES.forumPosts, payload)) as Promise<ForumPostRecord>;
}

export async function adminUpdateForumPost(
  id: number,
  patch: Partial<{ conteudo: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<ForumPostRecord> {
  if (USE_V2) {
    throw new Error('forum_posts is deprecated in v2');
  }
  return directusService.request(uItem(TABLES.forumPosts, id, patch as any)) as Promise<ForumPostRecord>;
}

export async function adminDeleteForumPost(id: number) {
  if (USE_V2) return { id };
  return directusService.request(dItem(TABLES.forumPosts, id));
}

export function getPublicPostById(id: number): Promise<ForumPostRecord> {
  if (USE_V2) {
    return Promise.reject(new Error('forum_posts deprecated in v2'));
  }
  return directusService.request(
    rItem(TABLES.forumPosts, id, {
      fields: ['id', 'id_topico', 'conteudo', 'autor', 'data', 'status'],
    } as any),
  ) as Promise<ForumPostRecord>;
}

/* ------------------------------------------------------------------ */
/*  Comments                                                           */
/* ------------------------------------------------------------------ */

export async function adminListForumComments(limit = 500, topicId?: number): Promise<ForumCommentRecord[]> {
  try {
    const params: Record<string, string> = {
      limit: String(limit),
      sort: COMMENT_SORT,
      fields: COMMENT_SELECT,
    };
    if (topicId) params[COMMENT_FILTER_FK] = String(topicId);
    const json = await directusFetch<{ data: any[] }>(`/items/${TABLES.forumComments}`, { params });
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (!USE_V2) return rows as ForumCommentRecord[];
    return v2CommentsToLegacy(rows as V2Comment[]);
  } catch {
    return [];
  }
}

export async function adminUpdateForumComment(
  id: number,
  patch: Partial<{ comentario: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<ForumCommentRecord> {
  if (USE_V2) {
    const mapped: Record<string, unknown> = {};
    if ('comentario' in patch) mapped.content = patch.comentario;
    if ('autor' in patch) mapped.author = await resolveUserId(patch.autor);
    if ('data' in patch) mapped.created_at = unixSecondsToIso(patch.data);
    if ('status' in patch) mapped.status = patch.status === 'ativo' ? 'active' : patch.status === 'inativo' ? 'hidden' : patch.status;
    const updated = (await directusService.request(uItem(TABLES.forumComments, id, mapped as any))) as V2Comment;
    const [legacy] = await v2CommentsToLegacy([updated]);
    return legacy;
  }
  return directusService.request(uItem(TABLES.forumComments, id, patch as any)) as Promise<ForumCommentRecord>;
}

export async function adminDeleteForumComment(id: number) {
  return directusService.request(dItem(TABLES.forumComments, id));
}

export async function createForumComment(input: {
  topicId: number;
  author: string;
  content: string;
  status?: string | null;
}): Promise<ForumCommentRecord> {
  if (USE_V2) {
    const authorId = await resolveUserId(input.author);
    const payload: Record<string, unknown> = {
      topic: input.topicId,
      content: input.content,
      author: authorId,
      status: input.status ?? 'active',
    };
    const created = (await directusService.request(cItem(TABLES.forumComments, payload as any))) as V2Comment;
    const [legacy] = await v2CommentsToLegacy([created]);
    return legacy;
  }

  const payload: any = {
    id_forum: input.topicId,
    comentario: input.content,
    autor: input.author || 'Anonyme',
    data: Math.floor(Date.now() / 1000),
    status: input.status ?? 'ativo',
  };
  return directusService.request(cItem(TABLES.forumComments, payload)) as Promise<ForumCommentRecord>;
}

export async function getPublicTopicComments(topicId: number): Promise<ForumCommentRecord[]> {
  try {
    const params: Record<string, string> = {
      fields: COMMENT_SELECT,
      sort: USE_V2 ? 'created_at' : 'data',
      limit: '500',
    };
    params[COMMENT_FILTER_FK] = String(topicId);
    const json = await directusFetch<{ data: any[] }>(`/items/${TABLES.forumComments}`, { params });
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (!USE_V2) return rows as ForumCommentRecord[];
    return v2CommentsToLegacy(rows as V2Comment[]);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Likes on comments                                                  */
/* ------------------------------------------------------------------ */

export async function toggleForumCommentLike(commentId: number, author: string) {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) throw new Error('AUTHOR_REQUIRED');

  const userValue: number | string | null = USE_V2 ? await resolveUserId(safeAuthor) : safeAuthor;
  if (userValue == null) throw new Error('AUTHOR_NOT_FOUND');

  const existing = (await directusService
    .request(
      rItems(LIKE_TABLE as any, {
        filter: {
          [LIKE_FIELDS.comment]: { _eq: commentId } as any,
          [LIKE_FIELDS.user]: { _eq: userValue } as any,
        } as any,
        limit: 1 as any,
        fields: ['id'] as any,
      } as any),
    )
    .catch(() => [])) as any[];

  if (Array.isArray(existing) && existing.length > 0) {
    const id = (existing[0] as any)?.id;
    if (id != null) {
      await directusService.request(dItem(LIKE_TABLE as any, id as any));
      return { liked: false };
    }
  }

  const payload: Record<string, unknown> = USE_V2
    ? { [LIKE_FIELDS.comment]: commentId, [LIKE_FIELDS.user]: userValue }
    : { [LIKE_FIELDS.comment]: commentId, [LIKE_FIELDS.user]: userValue, data: Math.floor(Date.now() / 1000), status: 'ativo' };
  await directusService.request(cItem(LIKE_TABLE as any, payload));
  return { liked: true };
}

/* ------------------------------------------------------------------ */
/*  Reports (legacy-only — forum_interacoes has no v2 equivalent yet)  */
/* ------------------------------------------------------------------ */

export async function reportForumComment(commentId: number, author: string) {
  if (USE_V2) return null; // no v2 report table designed yet
  const payload: any = {
    tipo: 'report',
    alvo_tipo: 'comment',
    alvo_id: commentId,
    autor: author || null,
    data: Math.floor(Date.now() / 1000),
  };
  try {
    return await directusService.request(cItem('forum_interacoes' as any, payload));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Topic votes                                                        */
/* ------------------------------------------------------------------ */

export async function setTopicVote(topicId: number, author: string, vote: 1 | -1) {
  const nowUnix = Math.floor(Date.now() / 1000);

  if (USE_V2) {
    const userId = await resolveUserId(author);
    if (!userId) throw new Error('AUTHOR_NOT_FOUND');

    // v2 stores `value` as integer (1 / -1), one row per (topic, user).
    const rows = (await directusService
      .request(
        rItems(VOTE_TABLE as any, {
          filter: {
            [VOTE_FIELDS.topic]: { _eq: topicId } as any,
            [VOTE_FIELDS.user]: { _eq: userId } as any,
          } as any,
          limit: 1 as any,
          fields: ['id', VOTE_FIELDS.value] as any,
        } as any),
      )
      .catch(() => [])) as any[];

    if (rows.length > 0) {
      const existing = rows[0] as any;
      const existingId = existing?.id;
      const existingValue = Number(existing?.[VOTE_FIELDS.value]);
      if (existingId != null) {
        if (existingValue === vote) {
          await directusService.request(dItem(VOTE_TABLE as any, existingId));
          return { removed: true };
        }
        await directusService.request(
          uItem(VOTE_TABLE as any, existingId as any, { [VOTE_FIELDS.value]: vote } as any),
        );
        return { updated: true };
      }
    }

    await directusService.request(
      cItem(VOTE_TABLE as any, {
        [VOTE_FIELDS.topic]: topicId,
        [VOTE_FIELDS.user]: userId,
        [VOTE_FIELDS.value]: vote,
      } as any),
    );
    return { created: true };
  }

  // Legacy: value is a string ('pos' / 'neg') and author is the nick
  const tipo = vote === 1 ? 'pos' : 'neg';
  const rows = (await directusService
    .request(
      rItems(VOTE_TABLE as any, {
        filter: {
          [VOTE_FIELDS.topic]: { _eq: topicId },
          ...(author ? ({ [VOTE_FIELDS.user]: { _eq: author } } as any) : {}),
        } as any,
        limit: 1 as any,
        fields: ['id', 'tipo'] as any,
      } as any),
    )
    .catch(() => [])) as any[];

  if (rows.length > 0) {
    const existing = rows[0] as any;
    const existingId = existing?.id;
    const existingTipo = existing?.tipo;
    if (existingId != null) {
      if (existingTipo === tipo) {
        await directusService.request(dItem(VOTE_TABLE as any, existingId));
        return { removed: true };
      }
      await directusService.request(
        uItem(VOTE_TABLE as any, existingId as any, { tipo, data: nowUnix } as any),
      );
      return { updated: true };
    }
  }

  const payload: any = { [VOTE_FIELDS.topic]: topicId, tipo, data: nowUnix };
  if (author) payload[VOTE_FIELDS.user] = author;
  await directusService.request(cItem(VOTE_TABLE as any, payload));
  return { created: true };
}

export async function getTopicVoteSummary(topicId: number): Promise<{ up: number; down: number }> {
  try {
    if (USE_V2) {
      const json = await directusFetch<{ data: { id: number; value: number }[] }>(`/items/${VOTE_TABLE}`, {
        params: {
          limit: '1000',
          fields: `id,${VOTE_FIELDS.value}`,
          [`filter[${VOTE_FIELDS.topic}][_eq]`]: String(topicId),
        },
      });
      const rows = Array.isArray(json?.data) ? json.data : [];
      let up = 0;
      let down = 0;
      for (const r of rows) {
        if (Number(r.value) > 0) up++;
        else if (Number(r.value) < 0) down++;
      }
      return { up, down };
    }

    const json = await directusFetch<{ data: { id: number; tipo: string }[] }>(`/items/${VOTE_TABLE}`, {
      params: {
        limit: '1000',
        fields: 'id,tipo',
        [`filter[${VOTE_FIELDS.topic}][_eq]`]: String(topicId),
      },
    });
    const rows = Array.isArray(json?.data) ? json.data : [];
    let up = 0;
    let down = 0;
    for (const r of rows) {
      if (r.tipo === 'pos') up++;
      else if (r.tipo === 'neg') down++;
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
  const rows = (await directusService.request(
    rItems(TABLES.forumCategories, {
      limit: 100 as any,
      sort: CATEGORY_SORT as any,
      fields: CATEGORY_FIELDS as any,
    } as any),
  )) as any[];
  if (!USE_V2) return rows as ForumCategoryRecord[];
  return v2CategoriesToLegacy(rows as V2Category[]);
}

export async function listPublicForumCategories(): Promise<ForumCategoryRecord[]> {
  return listForumCategoriesService();
}

export type { ForumTopicRecord, ForumPostRecord, ForumCommentRecord, ForumCategoryRecord };
