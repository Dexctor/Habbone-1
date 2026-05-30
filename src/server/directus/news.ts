import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. Kept around so that any consumer still importing from
 * `@/server/directus/news` keeps compiling.
 */

export {
  adminListNews,
  adminCreateNews,
  adminUpdateNews,
  adminDeleteNews,
  listNewsByAuthorService,
  adminListNewsComments,
  adminUpdateNewsComment,
  adminDeleteNewsComment,
  createNewsComment,
  toggleNewsCommentLike,
  getPublicNews,
  getPublicNewsById,
  listPublicNewsForCards,
  getPublicNewsComments,
  listPublicNewsBadges,
} from '@/server/supabase/news';

export type { NewsRecord, NewsCommentRecord } from './types';

export type NewsBadgeItem = {
  newsId: number;
  title: string;
  badgeCode: string;
  badgeAlbum: string;
  badgeImageUrl: string;
  articleUrl: string;
  publishedAt: string | null;
};
