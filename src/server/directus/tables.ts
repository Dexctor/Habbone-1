/**
 * Single source of truth for Directus collection names.
 *
 * During the legacy→v2 migration we route reads/writes to either the legacy
 * HabboneX tables or the new clean v2 collections depending on the USE_V2
 * env var. Flip it on Vercel to bascule the whole app at once.
 *
 *   USE_V2=false (default)  → legacy tables (usuarios, noticias, ...)
 *   USE_V2=true             → v2 tables (users, articles, ...)
 *
 * Both sides keep the same row IDs, so URLs like /articles/97 stay valid.
 */

export const USE_V2 = process.env.USE_V2 === 'true';

type TableMap = {
  users: string;
  articles: string;
  articleComments: string;
  articleCommentLikes: string;
  articleCategories: string;
  forumTopics: string;
  forumPosts: string;
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
  pseudoChanges: string;
};

const LEGACY: TableMap = {
  users: 'usuarios',
  articles: 'noticias',
  articleComments: 'noticias_coment',
  articleCommentLikes: 'noticias_coment_curtidas',
  articleCategories: 'noticias_cat',
  forumTopics: 'forum_topicos',
  forumPosts: 'forum_posts',
  forumComments: 'forum_coment',
  forumCommentLikes: 'forum_coment_curtidas',
  forumTopicVotes: 'forum_topicos_votos',
  forumCategories: 'forum_cat',
  stories: 'usuarios_storie',
  sponsors: 'parceiros',
  shopItems: 'shop_itens',
  shopOrders: 'shop_itens_mobis',
  badges: 'emblemas',
  userBadges: 'emblemas_usuario',
  adminNotifications: 'acp_notificacoes',
  pseudoChanges: 'pseudo_changes',
};

const V2: TableMap = {
  users: 'users',
  articles: 'articles',
  articleComments: 'article_comments',
  articleCommentLikes: 'article_comment_likes',
  articleCategories: 'article_categories',
  forumTopics: 'forum_topics',
  forumPosts: 'forum_posts', // v2 has no posts table (0 rows) — keep legacy name, refactor later if we really use it
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
  pseudoChanges: 'habbo_nick_history',
};

export const TABLES: TableMap = USE_V2 ? V2 : LEGACY;

/**
 * v2 schema uses English column names. Legacy schema uses Portuguese.
 * Each service maps its own columns; this helper centralises the most
 * frequently referenced ones so we can keep mapping out of hot paths.
 */
type ColumnMap = {
  author: string;
  title: string;
  content: string;
  createdAt: string;
  status: string;
};

export const NEWS_COLS: ColumnMap = USE_V2
  ? { author: 'author', title: 'title', content: 'body', createdAt: 'created_at', status: 'status' }
  : { author: 'autor', title: 'titulo', content: 'noticia', createdAt: 'data', status: 'status' };

export const FORUM_TOPIC_COLS: ColumnMap = USE_V2
  ? { author: 'author', title: 'title', content: 'body', createdAt: 'created_at', status: 'status' }
  : { author: 'autor', title: 'titulo', content: 'conteudo', createdAt: 'data', status: 'status' };

export const FORUM_COMMENT_COLS: ColumnMap = USE_V2
  ? { author: 'author', title: '', content: 'content', createdAt: 'created_at', status: 'status' }
  : { author: 'autor', title: '', content: 'comentario', createdAt: 'data', status: 'status' };

export const ARTICLE_COMMENT_COLS = FORUM_COMMENT_COLS;
