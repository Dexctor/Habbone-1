import type { AdminNotification, ShopItem, ShopOrder } from '@/types/shop';

export type SupabaseShopItemRow = {
  id: number;
  name: string | null;
  description: string | null;
  image: string | null;
  price_coins: number | null;
  stock: number | null;
  active: boolean | null;
};

export type SupabaseShopOrderRow = {
  id: number;
  item: number | null;
  buyer: number | null;
  buyer_nick: string | null;
  price_paid: number | null;
  status: string | null;
  item_name: string | null;
  item_image: string | null;
};

export type SupabaseAdminNotificationRow = {
  id: number;
  message: string | null;
  severity: string | null;
  read: boolean | null;
};

export function mapSupabaseShopItem(row: SupabaseShopItemRow): ShopItem {
  return {
    id: Number(row.id),
    nome: String(row.name ?? ''),
    descricao: row.description ?? undefined,
    imagem: String(row.image ?? ''),
    preco: Number(row.price_coins ?? 0),
    estoque: Number(row.stock ?? 0),
    status: row.active ? 'ativo' : 'inativo',
  };
}

export function mapShopItemToSupabasePatch(data: Partial<ShopItem>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (data.nome !== undefined) patch.name = data.nome;
  if (data.descricao !== undefined) patch.description = data.descricao ?? null;
  if (data.imagem !== undefined) patch.image = data.imagem;
  if (data.preco !== undefined) patch.price_coins = data.preco;
  if (data.estoque !== undefined) patch.stock = data.estoque;
  if (data.status !== undefined) patch.active = data.status === 'ativo';
  return patch;
}

export function appStatusToDb(status: string): string {
  if (status === 'pendente') return 'pending';
  if (status === 'entregue') return 'delivered';
  if (status === 'cancelado') return 'cancelled';
  return status;
}

export function dbStatusToApp(status: string | null | undefined): ShopOrder['status'] {
  if (status === 'delivered' || status === 'entregue') return 'entregue';
  if (status === 'cancelled' || status === 'cancelado') return 'cancelado';
  return 'pendente';
}

export function mapSupabaseShopOrder(row: SupabaseShopOrderRow): ShopOrder {
  return {
    id: Number(row.id),
    user_id: Number(row.buyer ?? 0),
    user_nick: row.buyer_nick ?? undefined,
    item_id: Number(row.item ?? 0),
    item_nome: row.item_name ?? undefined,
    item_imagem: row.item_image ?? undefined,
    preco: Number(row.price_paid ?? 0),
    status: dbStatusToApp(row.status),
  };
}

export function mapSupabaseAdminNotification(row: SupabaseAdminNotificationRow): AdminNotification {
  return {
    id: Number(row.id),
    type: String(row.severity || 'info'),
    title: String(row.message || ''),
    read: !!row.read,
  };
}
