export { directusService, USERS_TABLE, STORIES_TABLE } from './directus/client';

export type {
  Dateish,
  HabboVerificationStatus,
  DirectusUserLite,
  DirectusRoleLite,
  LegacyUserLite,
  TeamMember,
  NewsRecord,
  NewsCommentRecord,
  ForumTopicRecord,
  ForumPostRecord,
  ForumCommentRecord,
  ForumCategoryRecord,
  StoryRecord,
} from './directus/types';

export { listRoles, createRole, updateRole, getRoleById, setUserRole } from './directus/roles';
export type { CreateRoleInput, UpdateRoleInput } from './directus/roles';

export {
  listUsersByNick,
  getUserByNick,
  createUser,
  upgradePasswordToBcrypt,
  updateUserVerification,
  markUserAsVerified,
  tryUpdateHabboSnapshotForUser,
  getUserMoedas,
  normalizeHotelCode,
  passwordsMatch,
  isBcrypt,
  asTrue,
  asFalse,
  md5,
  hashPassword,
} from './directus/users';

export {
  searchUsers,
  getDirectusUserById,
  setDirectusUserStatus,
  deleteDirectusUser,
} from './directus/admin-users';

export {
  getLegacyUserByEmail,
  searchLegacyUsuarios,
  setLegacyUserRole,
  setLegacyUserBanStatus,
  deleteLegacyUser,
  adminListUsers,
} from './directus/legacy-users';

export { listTeamMembersByRoles } from './directus/team';

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
  getPublicNews,
  getPublicNewsById,
  listPublicNewsForCards,
  getPublicNewsComments,
} from './directus/news';

export {
  adminListForumTopics,
  adminListForumPosts,
  listForumCategoriesService,
  listForumTopicsWithCategories,
  adminCreateForumPost,
  adminUpdateForumPost,
  adminDeleteForumPost,
  adminListForumComments,
  adminUpdateForumComment,
  adminDeleteForumComment,
  createForumComment,
  toggleForumCommentLike,
  reportForumComment,
  setTopicVote,
  getTopicVoteSummary,
  adminUpdateForumTopic,
  adminDeleteForumTopic,
  getPublicTopics,
  getPublicTopicById,
  getPublicPostById,
  getPublicTopicComments,
  listPublicForumCategories,
} from './directus/forum';

export {
  getLikesMapForComments,
  getLikesMapForNewsComments,
  getLikesMapForTopicComments,
} from './directus/likes';

export { adminCount, adminCountUsers } from './directus/admin';

export { uploadFileToDirectus, createStoryRow, countStoriesThisMonthByAuthor, listStoriesService, adminListStories, adminUpdateStory, adminDeleteStory } from './directus/stories';
