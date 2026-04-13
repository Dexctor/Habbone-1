/* ------------------------------------------------------------------ */
/*  Types partagés pour la Boutique (client + serveur)                  */
/* ------------------------------------------------------------------ */

export interface ShopItem {
  id: number;
  nome: string;
  descricao?: string;
  imagem: string;
  preco: number;
  estoque: number;
  status: 'ativo' | 'inativo';
}

export interface ShopOrder {
  id: number;
  user_id: number;
  user_nick?: string;
  item_id: number;
  item_nome?: string;
  item_imagem?: string;
  preco: number;
  status: 'pendente' | 'entregue' | 'cancelado';
}

export interface AdminNotification {
  id: number;
  type: string;
  title: string;
  message?: string;
  link?: string;
  read: boolean;
}
