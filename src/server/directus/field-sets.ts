/**
 * Directus Field Sets
 * Centralized field constants to avoid repetition across services
 */

// User table fields
export const USER_FIELDS = [
  'id',
  'nick',
  'senha',
  'email',
  'avatar',
  'missao',
  'ativado',
  'banido',
  'status',
  'role',
  'data_criacao',
  'habbo_hotel',
  'habbo_unique_id',
  'habbo_verification_status',
  'habbo_verification_code',
  'habbo_verification_expires_at',
  'habbo_verified_at',
] as const;

export const USER_FIELDS_LITE = [
  'id',
  'nick',
  'email',
  'ativado',
  'banido',
  'status',
  'data_criacao',
] as const;

// News table fields
export const NEWS_FIELDS = [
  'id',
  'titulo',
  'descricao',
  'imagem',
  'noticia',
  'autor',
  'data',
  'status',
] as const;

export const NEWS_FIELDS_CARD = [
  'id',
  'titulo',
  'descricao',
  'imagem',
  'data',
] as const;

export const NEWS_COMMENT_FIELDS = [
  'id',
  'id_noticia',
  'comentario',
  'autor',
  'data',
  'status',
] as const;

// Forum table fields
export const TOPIC_FIELDS = [
  'id',
  'titulo',
  'conteudo',
  'imagem',
  'autor',
  'data',
  'views',
  'fixo',
  'fechado',
  'status',
  'cat_id',
] as const;

export const POST_FIELDS = [
  'id',
  'id_topico',
  'conteudo',
  'autor',
  'data',
  'status',
] as const;

export const COMMENT_FIELDS = [
  'id',
  'id_forum',
  'comentario',
  'autor',
  'data',
  'status',
] as const;

export const CATEGORY_FIELDS = [
  'id',
  'nome',
  'descricao',
  'status',
  'imagem',
] as const;

// Directus system fields
export const DIRECTUS_ROLE_FIELDS = [
  'id',
  'name',
  'description',
  'admin_access',
  'app_access',
] as const;

export const DIRECTUS_USER_FIELDS = [
  'id',
  'email',
  'first_name',
  'last_name',
  'status',
  'role.id',
  'role.name',
  'role.admin_access',
  'role.app_access',
] as const;
