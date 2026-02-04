import { readItems } from '@directus/sdk';

import { directus } from './client';

type LikeRow = { id_comentario: number | string };

type LikesTable = 'noticias_coment_curtidas' | 'forum_coment_curtidas';

/**
 * Generic function to get likes count for comments
 * Eliminates duplication between news and forum modules
 */
export async function getLikesMapForComments(
    table: LikesTable,
    commentIds: number[]
): Promise<Record<number, number>> {
    if (!commentIds?.length) return {};

    const likes = (await directus.request(
        readItems(table as any, {
            filter: { id_comentario: { _in: commentIds } },
            fields: ['id_comentario'],
            limit: 5000,
        })
    )) as LikeRow[];

    return likes.reduce((acc: Record<number, number>, row: LikeRow) => {
        const cid = Number(row.id_comentario);
        acc[cid] = (acc[cid] ?? 0) + 1;
        return acc;
    }, {});
}

/**
 * Get likes map for news comments
 */
export function getLikesMapForNewsComments(commentIds: number[]): Promise<Record<number, number>> {
    return getLikesMapForComments('noticias_coment_curtidas', commentIds);
}

/**
 * Get likes map for forum comments
 */
export function getLikesMapForTopicComments(commentIds: number[]): Promise<Record<number, number>> {
    return getLikesMapForComments('forum_coment_curtidas', commentIds);
}
