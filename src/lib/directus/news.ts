import { readItem, readItems } from '@directus/sdk';

import { directus } from './client';
import { getLikesMapForNewsComments } from './likes';
import type { NewsCommentRecord, NewsRecord } from './types';

export function getNews(query?: string): Promise<NewsRecord[]> {
  const q = typeof query === 'string' ? query.trim() : '';
  return directus.request(
    readItems('noticias', {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'status', 'autor', 'data'],
      sort: ['-data'],
      limit: 24,
      ...(q ? { search: q } : {}),
    })
  ) as Promise<NewsRecord[]>;
}

export function listAllNews(limit = 1000): Promise<NewsRecord[]> {
  return directus.request(
    readItems('noticias', {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'status', 'autor', 'data'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<NewsRecord[]>;
}

export function listNewsByAuthor(author: string, limit = 50): Promise<NewsRecord[]> {
  return directus.request(
    readItems('noticias', {
      filter: { autor: { _eq: author } },
      fields: ['id', 'titulo', 'descricao', 'imagem', 'autor', 'data', 'status'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<NewsRecord[]>;
}

export function getOneNews(id: number): Promise<NewsRecord> {
  return directus.request(
    readItem('noticias', id, {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'noticia', 'autor', 'data', 'status'],
    })
  ) as Promise<NewsRecord>;
}

export function listNewsForCards(limit = 60): Promise<NewsRecord[]> {
  return directus.request(
    readItems('noticias', {
      fields: ['id', 'titulo', 'descricao', 'imagem', 'data'],
      sort: ['-data'],
      limit,
    })
  ) as Promise<NewsRecord[]>;
}

export function getNewsComments(newsId: number): Promise<NewsCommentRecord[]> {
  return directus.request(
    readItems('noticias_coment', {
      filter: { id_noticia: { _eq: newsId } },
      fields: ['id', 'id_noticia', 'comentario', 'autor', 'data', 'status'],
      sort: ['data'],
      limit: 200,
    })
  ) as Promise<NewsCommentRecord[]>;
}

// Re-export from shared likes module
export { getLikesMapForNewsComments };

export type { NewsRecord, NewsCommentRecord } from './types';
