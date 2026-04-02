import 'server-only';

import {
  directusService,
  directusUrl,
  serviceToken,
  rItems,
  rItem,
  cItem,
  uItem,
  dItem,
} from './client';
import type { ForumTopicRecord, ForumPostRecord, ForumCommentRecord, ForumCategoryRecord } from './types';

export async function adminListForumTopics(limit = 200): Promise<ForumTopicRecord[]> {
  return directusService.request(
    rItems('forum_topicos', {
      limit,
      sort: ['-data'],
      fields: [
        'id',
        'titulo',
        'conteudo',
        'imagem',
        'autor',
        'data',
        'views',
        'fixo',
        'fechado',
        'status',
        'cat_id',
      ],
    } as any),
  ) as Promise<ForumTopicRecord[]>;
}

export async function adminListForumPosts(limit = 500): Promise<ForumPostRecord[]> {
  return directusService.request(
    rItems('forum_posts', {
      limit,
      sort: ['-data'],
      fields: ['id', 'id_topico', 'conteudo', 'autor', 'data', 'status'],
    } as any),
  ) as Promise<ForumPostRecord[]>;
}

export async function listForumCategoriesService(): Promise<ForumCategoryRecord[]> {
  return directusService.request(
    rItems('forum_cat', {
      limit: 100 as any,
      sort: ['nome'] as any,
      fields: ['id', 'nome', 'descricao', 'status', 'imagem', 'slug', 'ordem'] as any,
    } as any),
  ) as Promise<ForumCategoryRecord[]>;
}

export async function listForumTopicsWithCategories(limit = 50): Promise<ForumTopicRecord[]> {
  return directusService.request(
    rItems('forum_topicos', {
      limit,
      sort: ['-data'],
      fields: [
        'id',
        'titulo',
        'conteudo',
        'imagem',
        'autor',
        'data',
        'views',
        'fixo',
        'fechado',
        'status',
        'cat_id',
      ] as any,
    } as any),
  ) as Promise<ForumTopicRecord[]>;
}

export async function listForumTopicsByAuthorService(author: string, limit = 30): Promise<ForumTopicRecord[]> {
  if (!author) return [];
  const rows = await directusService
    .request(
      rItems('forum_topicos', {
        filter: { autor: { _eq: author } } as any,
        fields: [
          'id',
          'titulo',
          'conteudo',
          'imagem',
          'autor',
          'data',
          'views',
          'fixo',
          'fechado',
          'status',
          'cat_id',
        ] as any,
        sort: ['-data'] as any,
        limit: limit as any,
      } as any),
    )
    .catch(() => [] as ForumTopicRecord[]);
  return Array.isArray(rows) ? (rows as ForumTopicRecord[]) : [];
}

export async function createForumTopic(data: {
  titulo: string;
  conteudo: string;
  autor: string;
  imagem?: string | null;
  cat_id?: number | string | null;
}): Promise<ForumTopicRecord> {
  const payload: any = {
    titulo: data.titulo,
    conteudo: data.conteudo,
    autor: data.autor,
    imagem: data.imagem ?? null,
    cat_id: data.cat_id ?? 0,
    data: Math.floor(Date.now() / 1000),
    status: 'ativo',
    views: 0,
    fixo: 0,
    fechado: 0,
  };
  return directusService.request(cItem('forum_topicos', payload)) as Promise<ForumTopicRecord>;
}

export async function adminCreateForumPost(data: {
  id_topico: number;
  conteudo: string;
  autor?: string | null;
  data?: string | null;
  status?: string | null;
}): Promise<ForumPostRecord> {
  const payload: any = {
    id_topico: data.id_topico,
    conteudo: data.conteudo,
    autor: data.autor ?? null,
    data: data.data ?? Math.floor(Date.now() / 1000),
    status: data.status ?? null,
  };
  return directusService.request(cItem('forum_posts', payload)) as Promise<ForumPostRecord>;
}

export async function adminUpdateForumPost(
  id: number,
  patch: Partial<{ conteudo: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<ForumPostRecord> {
  return directusService.request(uItem('forum_posts', id, patch as any)) as Promise<ForumPostRecord>;
}

export async function adminDeleteForumPost(id: number) {
  return directusService.request(dItem('forum_posts', id));
}

export async function adminListForumComments(limit = 500, topicId?: number): Promise<ForumCommentRecord[]> {
  const url = new URL(`${directusUrl}/items/forum_coment`);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('sort', '-data');
  url.searchParams.set('fields', 'id,id_forum,comentario,autor,data,status');
  if (topicId) url.searchParams.set('filter[id_forum][_eq]', String(topicId));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

export async function adminUpdateForumComment(
  id: number,
  patch: Partial<{ comentario: string; autor: string | null; data: string | null; status: string | null }>,
): Promise<ForumCommentRecord> {
  return directusService.request(uItem('forum_coment', id, patch as any)) as Promise<ForumCommentRecord>;
}

export async function adminDeleteForumComment(id: number) {
  return directusService.request(dItem('forum_coment', id));
}

export async function createForumComment(input: {
  topicId: number;
  author: string;
  content: string;
  status?: string | null;
}): Promise<ForumCommentRecord> {
  const payload: any = {
    id_forum: input.topicId,
    comentario: input.content,
    autor: input.author || 'Anonyme',
    data: Math.floor(Date.now() / 1000),
    status: input.status ?? 'public',
  };
  return directusService.request(cItem('forum_coment', payload)) as Promise<ForumCommentRecord>;
}

export async function toggleForumCommentLike(commentId: number, author: string) {
  const safeAuthor = String(author || '').trim();
  if (!safeAuthor) throw new Error('AUTHOR_REQUIRED');

  const byAuthor = (await directusService
    .request(
      rItems('forum_coment_curtidas' as any, {
        filter: {
          id_comentario: { _eq: commentId } as any,
          autor: { _eq: safeAuthor } as any,
        } as any,
        limit: 1 as any,
        fields: ['id'] as any,
      } as any),
    )
    .catch(() => [])) as any[];

  if (Array.isArray(byAuthor) && byAuthor.length > 0) {
    const id = (byAuthor[0] as any)?.id;
    if (id != null) {
      await directusService.request(dItem('forum_coment_curtidas' as any, id as any));
      return { liked: false };
    }
  }

  const payload: any = {
    id_comentario: commentId,
    autor: safeAuthor,
    data: Math.floor(Date.now() / 1000),
    status: 'ativo',
  };
  await directusService.request(cItem('forum_coment_curtidas' as any, payload));
  return { liked: true };
}

export async function reportForumComment(commentId: number, author: string) {
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

export async function setTopicVote(topicId: number, author: string, vote: 1 | -1) {
  const tipo = vote === 1 ? 'pos' : 'neg';
  const nowUnix = Math.floor(Date.now() / 1000);
  const rows = (await directusService
    .request(
      rItems('forum_topicos_votos' as any, {
        filter: { id_topico: { _eq: topicId }, ...(author ? ({ autor: { _eq: author } } as any) : {}) } as any,
        limit: 1 as any,
        fields: ['id'] as any,
      } as any),
    )
    .catch(() => [])) as any[];
  if (Array.isArray(rows) && rows.length > 0) {
    const id = (rows[0] as any)?.id;
    if (id != null) {
      await directusService.request(
        uItem('forum_topicos_votos' as any, id as any, { tipo, data: nowUnix } as any),
      );
      return { updated: true };
    }
  }
  const payload: any = { id_topico: topicId, tipo, data: nowUnix };
  if (author) payload.autor = author;
  await directusService.request(cItem('forum_topicos_votos' as any, payload));
  return { created: true };
}

export async function getTopicVoteSummary(topicId: number): Promise<{ up: number; down: number }> {
  const count = async (tipo: 'pos' | 'neg') => {
    const url = new URL(`${directusUrl}/items/${encodeURIComponent('forum_topicos_votos')}`);
    url.searchParams.set('limit', '0');
    url.searchParams.set('meta', 'total_count');
    url.searchParams.set('filter[id_topico][_eq]', String(topicId));
    url.searchParams.set('filter[tipo][_eq]', tipo);
    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${serviceToken}` },
        cache: 'no-store',
      });
      if (!res.ok) return 0;
      const json = await res.json();
      const n = Number((json as any)?.meta?.total_count ?? 0);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };
  const [up, down] = await Promise.all([count('pos'), count('neg')]);
  return { up, down };
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
  return directusService.request(uItem('forum_topicos', id, patch as any)) as Promise<ForumTopicRecord>;
}

export async function adminDeleteForumTopic(id: number) {
  return directusService.request(dItem('forum_topicos', id));
}

// ============ PUBLIC FETCHER FUNCTIONS ============
// Replace the old lib/directus/forum.ts (which had no auth token)

export function getPublicTopics(limit = 50): Promise<ForumTopicRecord[]> {
  return directusService.request(
    rItems('forum_topicos', {
      fields: ['id', 'titulo', 'conteudo', 'imagem', 'autor', 'data', 'views', 'fixo', 'fechado', 'status', 'cat_id'],
      sort: ['-data'],
      limit,
    } as any),
  ) as Promise<ForumTopicRecord[]>;
}

export function getPublicTopicById(id: number): Promise<ForumTopicRecord> {
  return directusService.request(
    rItem('forum_topicos', id, {
      fields: ['id', 'titulo', 'conteudo', 'imagem', 'autor', 'data', 'views', 'fixo', 'fechado', 'status', 'cat_id'],
    } as any),
  ) as Promise<ForumTopicRecord>;
}

export function getPublicPostById(id: number): Promise<ForumPostRecord> {
  return directusService.request(
    rItem('forum_posts', id, {
      fields: ['id', 'id_topico', 'conteudo', 'autor', 'data', 'status'],
    } as any),
  ) as Promise<ForumPostRecord>;
}

export function getPublicTopicComments(topicId: number): Promise<ForumCommentRecord[]> {
  return directusService.request(
    rItems('forum_coment', {
      filter: { id_forum: { _eq: topicId } },
      fields: ['id', 'id_forum', 'comentario', 'autor', 'data', 'status'],
      sort: ['data'],
      limit: 500,
    } as any),
  ) as Promise<ForumCommentRecord[]>;
}

export function listPublicForumCategories(): Promise<ForumCategoryRecord[]> {
  return directusService.request(
    rItems('forum_cat', {
      fields: ['id', 'nome', 'descricao', 'status', 'imagem', 'slug', 'ordem'],
      sort: ['nome'],
      limit: 100,
    } as any),
  ) as Promise<ForumCategoryRecord[]>;
}

export type { ForumTopicRecord, ForumPostRecord, ForumCommentRecord, ForumCategoryRecord };
