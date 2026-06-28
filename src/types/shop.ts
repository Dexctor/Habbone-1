/* ------------------------------------------------------------------ */
/*  Types partagés pour la Boutique (client + serveur)                  */
/* ------------------------------------------------------------------ */

// NOTE: ids are PocketBase string ids (15-char) post-migration.
// UI consumers that still assume numeric ids are updated in Lot 5.
export interface ShopItem {
  id: string;
  nome: string;
  descricao?: string;
  imagem: string;
  preco: number;
  estoque: number;
  status: 'ativo' | 'inativo';
}

export interface ShopOrder {
  id: string;
  user_id: string;
  user_nick?: string;
  item_id: string;
  item_nome?: string;
  item_imagem?: string;
  preco: number;
  status: 'pendente' | 'entregue' | 'cancelado';
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
  read: boolean;
  /** ISO date string (PocketBase `created` autodate field). */
  created?: string;
}
