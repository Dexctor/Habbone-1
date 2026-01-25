export { directusService, USERS_TABLE, STORIES_TABLE } from './directus/client';

export type {
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
  adminListUsers,
} from './directus/admin-users';

export {
  getLegacyUserByEmail,
  searchLegacyUsuarios,
  setLegacyUserRole,
  setLegacyUserBanStatus,
  deleteLegacyUser,
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
} from './directus/forum';

export { adminCount, adminCountUsers } from './directus/admin';

export { uploadFileToDirectus, createStoryRow, countStoriesThisMonthByAuthor, listStoriesService } from './directus/stories';
