/**
 * Single source of truth for PocketBase collection names + frequently used
 * column names.
 *
 * Post-migration the app talks ONLY to the clean v2 PocketBase collections
 * (English names). The old legacy/USE_V2 dual mapping is gone.
 */

type TableMap = {
  users: string;
  roles: string;
  articles: string;
  articleComments: string;
  articleCommentLikes: string;
  articleCategories: string;
  forumTopics: string;
  forumComments: string;
  forumCommentLikes: string;
  forumTopicVotes: string;
  forumCategories: string;
  stories: string;
  sponsors: string;
  shopItems: string;
  shopOrders: string;
  badges: string;
  userBadges: string;
  adminNotifications: string;
  adminLogs: string;
  pseudoChanges: string;
};

export const TABLES: TableMap = {
  users: 'users',
  roles: 'roles',
  articles: 'articles',
  articleComments: 'article_comments',
  articleCommentLikes: 'article_comment_likes',
  articleCategories: 'article_categories',
  forumTopics: 'forum_topics',
  forumComments: 'forum_comments',
  forumCommentLikes: 'forum_comment_likes',
  forumTopicVotes: 'forum_topic_votes',
  forumCategories: 'forum_categories',
  stories: 'stories',
  sponsors: 'sponsors',
  shopItems: 'shop_items',
  shopOrders: 'shop_orders',
  badges: 'badges',
  userBadges: 'user_badges',
  adminNotifications: 'admin_notifications',
  adminLogs: 'admin_logs',
  pseudoChanges: 'habbo_nick_history',
};

/**
 * Frequently referenced column names. v2 schema uses English everywhere, so
 * these are now plain constants (kept as a map to avoid touching call sites
 * that read NEWS_COLS.author etc.).
 */
type ColumnMap = {
  author: string;
  title: string;
  content: string;
  createdAt: string;
  status: string;
};

export const NEWS_COLS: ColumnMap = {
  author: 'author',
  title: 'title',
  content: 'body',
  createdAt: 'created',
  status: 'status',
};

export const FORUM_TOPIC_COLS: ColumnMap = {
  author: 'author',
  title: 'title',
  content: 'body',
  createdAt: 'created',
  status: 'status',
};

export const FORUM_COMMENT_COLS: ColumnMap = {
  author: 'author',
  title: '',
  content: 'content',
  createdAt: 'created',
  status: 'status',
};

export const ARTICLE_COMMENT_COLS = FORUM_COMMENT_COLS;
