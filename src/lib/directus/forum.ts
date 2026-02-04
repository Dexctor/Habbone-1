import { readItem, readItems } from '@directus/sdk';

import { directus } from './client';
import { getLikesMapForTopicComments } from './likes';
import type { ForumCategoryRecord, ForumCommentRecord, ForumPostRecord, ForumTopicRecord } from './types';

export function getTopics(): Promise<ForumTopicRecord[]> {
  return directus.request(
    readItems('forum_topicos', {
      fields: ['id', 'titulo', 'conteudo', 'imagem', 'autor', 'data', 'views', 'fixo', 'fechado', 'status'],
      sort: ['-data'],
      limit: 50,
    })
  ) as Promise<ForumTopicRecord[]>;
}

export function listAllTopics(limit = 1000): Promise<ForumTopicRecord[]> {
  return directus.request(
    readItems('forum_topicos', {
      fields: ['id', 'titulo', 'conteudo', 'imagem', 'autor', 'data', 'views', 'fixo', 'fechado', 'status'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<ForumTopicRecord[]>;
}

export function getOneTopic(id: number): Promise<ForumTopicRecord> {
  return directus.request(
    readItem('forum_topicos', id, {
      fields: ['id', 'titulo', 'conteudo', 'imagem', 'autor', 'data', 'views', 'fixo', 'fechado', 'status'],
    })
  ) as Promise<ForumTopicRecord>;
}

export function getOnePost(id: number): Promise<ForumPostRecord> {
  return directus.request(
    readItem('forum_posts', id, {
      fields: ['id', 'id_topico', 'conteudo', 'autor', 'data', 'status'],
    })
  ) as Promise<ForumPostRecord>;
}

export function listAllPosts(limit = 1000): Promise<ForumPostRecord[]> {
  return directus.request(
    readItems('forum_posts', {
      fields: ['id', 'id_topico', 'conteudo', 'autor', 'data', 'status'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<ForumPostRecord[]>;
}

export function listForumCategories(): Promise<ForumCategoryRecord[]> {
  return directus.request(
    readItems('forum_cat', {
      fields: ['id', 'nome', 'descricao', 'slug', 'ordem'],
      sort: ['ordem', 'nome'],
      limit: 50,
    })
  ) as Promise<ForumCategoryRecord[]>;
}

export function getTopicComments(topicId: number): Promise<ForumCommentRecord[]> {
  return directus.request(
    readItems('forum_coment', {
      filter: { id_forum: { _eq: topicId } },
      fields: ['id', 'id_forum', 'comentario', 'autor', 'data', 'status'],
      sort: ['data'],
      limit: 500,
    })
  ) as Promise<ForumCommentRecord[]>;
}

// Re-export from shared likes module
export { getLikesMapForTopicComments };

export type {
  ForumTopicRecord,
  ForumPostRecord,
  ForumCommentRecord,
  ForumCategoryRecord,
} from './types';
