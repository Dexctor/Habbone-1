export type Dateish = string | number | Date | null | undefined;

export type HabboVerificationStatus = 'pending' | 'ok' | 'failed' | 'locked';

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
