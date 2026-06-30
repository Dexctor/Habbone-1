export type Dateish = string | number | Date | null | undefined;

export type HabboVerificationStatus = 'pending' | 'ok' | 'failed' | 'locked';

export type PocketBaseId = string;
export type PocketBaseDate = string | null;

export type UserRow = {
  id: PocketBaseId;
  nick: string | null;
  email: string | null;
  avatar?: string | null;
  missao?: string | null;
  moedas?: number | null;
  coins?: number | null;
  senha?: string | null;
  password?: string | null;
  role?: PocketBaseId | null;
  role_id?: PocketBaseId | null;
  status?: string | null;
  banido?: string | number | boolean | null;
  ativado?: string | number | boolean | null;
  habbo_name?: string | null;
  habbo_unique_id?: string | null;
  habbo_hotel?: string | null;
  habbo_verification_status?: string | null;
  habbo_verification_code?: string | null;
  habbo_verification_expires_at?: string | null;
  created?: PocketBaseDate;
  updated?: PocketBaseDate;
};

export type ArticleRow = {
  id: PocketBaseId;
  title: string | null;
  summary: string | null;
  cover_image: string | null;
  body: string | null;
  author: PocketBaseId | null;
  published_at: PocketBaseDate;
  status: string | null;
  created?: PocketBaseDate;
  updated?: PocketBaseDate;
};

export type ArticleCommentRow = {
  id: PocketBaseId;
  article: PocketBaseId;
  content: string | null;
  author: PocketBaseId | null;
  created: PocketBaseDate;
  status: string | null;
};

export type StoryRow = {
  id: PocketBaseId;
  title: string | null;
  image: string | null;
  author: PocketBaseId | null;
  status: string | null;
  published_at: PocketBaseDate;
};

export type ShopItemRow = {
  id: PocketBaseId;
  name: string | null;
  description: string | null;
  image: string | null;
  price_coins: number | null;
  stock: number | null;
  active: boolean | null;
  created?: PocketBaseDate;
  updated?: PocketBaseDate;
};

export type ShopOrderRow = {
  id: PocketBaseId;
  item: PocketBaseId | null;
  buyer: PocketBaseId | null;
  price_paid: number | null;
  status: string | null;
  created?: PocketBaseDate;
  updated?: PocketBaseDate;
};

export type AdminNotificationRow = {
  id: PocketBaseId;
  message: string | null;
  severity: string | null;
  read: boolean | null;
  created?: PocketBaseDate;
};

export type AdminUserLite = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  role?: { id: string; name?: string; admin_access?: boolean; app_access?: boolean } | string | null;
};

export type RoleLite = {
  id: string;
  name: string;
  description?: string | null;
  admin_access?: boolean;
  app_access?: boolean;
};

export type LegacyUserLite = {
  id: number | string;
  email?: string | null;
  nick?: string | null;
  status?: string | null;
  role?: string | null;
  role_id?: string | null;
  banido?: string | number | boolean | null;
  ativado?: string | number | boolean | null;
};

export type TeamMember = {
  id: number;
  nick: string;
  role: string;
  joinedAt: string | null;
  twitter?: string | null;
};

export type NewsRecord = {
  id: number;
  titulo: string;
  descricao?: string | null;
  imagem?: string | null;
  noticia?: string | null;
  autor?: string | null;
  data?: string | null;
  status?: string | null;
};

export type NewsCommentRecord = {
  id: number;
  id_noticia: number;
  comentario: string;
  autor?: string | null;
  data?: string | null;
  status?: string | null;
};

export type ForumTopicRecord = {
  id: number;
  titulo: string;
  conteudo?: string | null;
  imagem?: string | null;
  autor?: string | null;
  data?: string | null;
  views?: number | null;
  fixo?: boolean | number | string;
  fechado?: boolean | number | string;
  status?: string | null;
  cat_id?: number | null;
};

export type ForumPostRecord = {
  id: number;
  id_topico: number;
  conteudo: string;
  autor?: string | null;
  data?: string | null;
  status?: string | null;
};

export type ForumCommentRecord = {
  id: number;
  id_forum: number;
  comentario: string;
  autor?: string | null;
  data?: string | null;
  status?: string | null;
};

export type ForumCategoryRecord = {
  id: number;
  nome: string;
  descricao?: string | null;
  status?: string | null;
  imagem?: string | null;
  slug?: string | null;
  ordem?: number | null;
};

export type StoryRecord = {
  id: number;
  autor?: string | null;
  image?: string | null;
  imagem?: string | null;
  titulo?: string | null;
  status?: string | null;
  data?: string | null;
  dta?: number | null;
  date_created?: string | null;
};
