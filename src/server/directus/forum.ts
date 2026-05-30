import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. Kept around so that any consumer still importing from
 * `@/server/directus/forum` keeps compiling.
 */

export {
  adminListForumTopics,
  listForumTopicsWithCategories,
  listForumTopicsByAuthorService,
  getPublicTopics,
  getPublicTopicById,
  createForumTopic,
  adminUpdateForumTopic,
  adminDeleteForumTopic,
  adminListForumPosts,
  adminCreateForumPost,
  adminUpdateForumPost,
  adminDeleteForumPost,
  getPublicPostById,
  adminListForumComments,
  adminUpdateForumComment,
  adminDeleteForumComment,
  createForumComment,
  getPublicTopicComments,
  toggleForumCommentLike,
  reportForumComment,
  setTopicVote,
  getTopicVoteSummary,
  listPublicForumCategories,
  listForumCategoriesService,
} from '@/server/supabase/forum';

export type {
  ForumTopicRecord,
  ForumPostRecord,
  ForumCommentRecord,
  ForumCategoryRecord,
} from './types';
