import 'server-only';

import { directusService, rItems } from './client';
import { countLikesByComment, getCommentLikeReadConfig } from './likes-core';
import { TABLES, USE_V2 } from './tables';
import { isSupabaseDataEnabled } from '@/server/supabase/config';
import * as supabaseLikes from '@/server/supabase/likes';

/**
 * Generic function to get likes count for comments
 * Uses the authenticated directusService (replaces the old lib/directus/likes.ts)
 */
export async function getLikesMapForComments(
    table: string,
    commentIds: number[],
    commentField: string,
): Promise<Record<number, number>> {
    if (!commentIds?.length) return {};

    const likes = (await directusService.request(
        rItems(table as any, {
            filter: { [commentField]: { _in: commentIds } },
            fields: [commentField],
            limit: 5000,
        } as any)
    )) as Record<string, number | string | null | undefined>[];

    return countLikesByComment(likes, commentField);
}

/**
 * Get likes map for news comments
 */
export function getLikesMapForNewsComments(commentIds: number[]): Promise<Record<number, number>> {
    if (isSupabaseDataEnabled()) return supabaseLikes.getLikesMapForNewsComments(commentIds);

    const config = getCommentLikeReadConfig('news', USE_V2);
    return getLikesMapForComments(TABLES.articleCommentLikes || config.table, commentIds, config.commentField);
}

/**
 * Get likes map for forum comments
 */
export function getLikesMapForTopicComments(commentIds: number[]): Promise<Record<number, number>> {
    if (isSupabaseDataEnabled()) return supabaseLikes.getLikesMapForTopicComments(commentIds);

    const config = getCommentLikeReadConfig('forum', USE_V2);
    return getLikesMapForComments(TABLES.forumCommentLikes || config.table, commentIds, config.commentField);
}
