import 'server-only';

import { pbList, pbOne, pbCreate, pbUpdate, pbDelete, pbCount } from './helpers';
import { TABLES } from './tables';
import { resolveUserId, resolveUserNicks } from './user-cache';
import { getUserBySessionIdentity } from './users';
import type { ShopItem, ShopOrder, AdminNotification } from '@/types/shop';
import type { AdminNotificationRow, ShopItemRow, ShopOrderRow } from './types';

export type { ShopItem, ShopOrder, AdminNotification };

const SHOP_ITEMS_TABLE = TABLES.shopItems;
const SHOP_ORDERS_TABLE = TABLES.shopOrders;
const ADMIN_NOTIFICATIONS_TABLE = TABLES.adminNotifications;
const USERS_TABLE = TABLES.users;

const ITEMS_FIELDS = 'id,name,description,image,price_coins,stock,active';
const ORDERS_FIELDS = 'id,item,buyer,price_paid,status';
const NOTIF_FIELDS = 'id,message,severity,read,created';

/* ------------------------------------------------------------------ */
/*  Encoding helper (legacy data may carry mojibake)                   */
/* ------------------------------------------------------------------ */

function fixEncoding(value: string): string {
  if (/[À-Ã][-¿]/.test(value)) {
    try {
      const bytes = new Uint8Array([...value].map((c) => c.charCodeAt(0) & 0xff));
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      /* fall through */
    }
  }
  if (value.includes('�')) return value.replace(/�/g, '');
  return value;
}

function fixStr(v: unknown): string {
  return typeof v === 'string' ? fixEncoding(v) : String(v ?? '');
}

/* ------------------------------------------------------------------ */
/*  Mappers: DB rows → App types                                       */
/* ------------------------------------------------------------------ */

function mapDbToShopItem(row: ShopItemRow): ShopItem {
  return {
    id: String(row.id),
    nome: fixStr(row.name),
    descricao: row.description ? fixStr(row.description) : undefined,
    imagem: String(row.image || ''),
    preco: Number(row.price_coins || 0),
    estoque: Number(row.stock || 0),
    status: row.active ? 'ativo' : 'inativo',
  };
}

function mapShopItemToDb(data: Partial<ShopItem>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (data.nome !== undefined) db.name = data.nome;
  if (data.descricao !== undefined) db.description = data.descricao ?? null;
  if (data.imagem !== undefined) db.image = data.imagem;
  if (data.preco !== undefined) db.price_coins = data.preco;
  if (data.estoque !== undefined) db.stock = data.estoque;
  if (data.status !== undefined) db.active = data.status === 'ativo';
  return db;
}

function dbStatusToApp(status: string | null | undefined): 'pendente' | 'entregue' | 'cancelado' {
  if (status === 'delivered') return 'entregue';
  if (status === 'cancelled') return 'cancelado';
  return 'pendente';
}

function appStatusToDb(status: string): string {
  if (status === 'pendente') return 'pending';
  if (status === 'entregue') return 'delivered';
  if (status === 'cancelado') return 'cancelled';
  return status;
}

async function mapDbToShopOrder(row: ShopOrderRow, itemsCache?: Map<string, ShopItem>): Promise<ShopOrder> {
  const itemId = String(row.item || '');
  const item = itemId ? itemsCache?.get(itemId) : undefined;
  const buyerId = String(row.buyer || '');
  const buyerNick = buyerId ? (await resolveUserNicks([buyerId])).get(buyerId) ?? '' : '';
  return {
    id: String(row.id),
    user_id: buyerId,
    user_nick: buyerNick,
    item_id: itemId,
    item_nome: item?.nome,
    item_imagem: item?.imagem,
    preco: item?.preco ?? Number(row.price_paid || 0),
    status: dbStatusToApp(row.status),
  };
}

function mapDbToNotification(row: AdminNotificationRow): AdminNotification {
  return {
    id: String(row.id),
    type: String(row.severity || 'info'),
    title: fixStr(row.message),
    message: undefined,
    link: undefined,
    read: !!row.read,
    created: row.created ? String(row.created) : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Shop Items                                                         */
/* ------------------------------------------------------------------ */

export async function listShopItems(onlyActive = false): Promise<ShopItem[]> {
  try {
    const rows = await pbList<ShopItemRow>(SHOP_ITEMS_TABLE, {
      filter: onlyActive ? { active: { _eq: true } } : undefined,
      sort: '-created',
      perPage: 500,
      fields: ITEMS_FIELDS,
    });
    return rows.map(mapDbToShopItem);
  } catch (error: any) {
    console.error('[Shop] Failed to list items:', error?.message || error);
    return [];
  }
}

export async function getShopItem(id: string): Promise<ShopItem | null> {
  try {
    const row = await pbOne<ShopItemRow>(SHOP_ITEMS_TABLE, id, { fields: ITEMS_FIELDS });
    return row ? mapDbToShopItem(row) : null;
  } catch {
    return null;
  }
}

export async function createShopItem(data: Omit<ShopItem, 'id'>): Promise<ShopItem | null> {
  try {
    const row = await pbCreate<ShopItemRow>(SHOP_ITEMS_TABLE, {
      ...mapShopItemToDb(data),
      sold_count: 0,
      free: false,
    });
    return row ? mapDbToShopItem(row) : null;
  } catch (error: any) {
    console.error('[Shop] Failed to create item:', error?.message || error);
    throw error;
  }
}

export async function updateShopItem(id: string, data: Partial<ShopItem>): Promise<ShopItem | null> {
  try {
    const row = await pbUpdate<ShopItemRow>(SHOP_ITEMS_TABLE, id, mapShopItemToDb(data));
    return row ? mapDbToShopItem(row) : null;
  } catch (error) {
    console.error('[Shop] Failed to update item:', error);
    return null;
  }
}

export async function deleteShopItem(id: string): Promise<boolean> {
  try {
    await pbDelete(SHOP_ITEMS_TABLE, id);
    return true;
  } catch (error) {
    console.error('[Shop] Failed to delete item:', error);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Shop Orders                                                        */
/* ------------------------------------------------------------------ */

export async function listShopOrders(options?: {
  status?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: ShopOrder[]; total: number }> {
  const { status, limit = 50, page = 1 } = options || {};
  try {
    const filter = status ? { status: { _eq: appStatusToDb(status) } } : undefined;

    const [rows, total] = await Promise.all([
      pbList<ShopOrderRow>(SHOP_ORDERS_TABLE, {
        filter,
        sort: '-created',
        perPage: limit,
        page,
        fields: ORDERS_FIELDS,
      }),
      pbCount(SHOP_ORDERS_TABLE, filter),
    ]);

    const items = await listShopItems(false);
    const itemsMap = new Map(items.map((i) => [i.id, i]));

    const data = await Promise.all(rows.map((r) => mapDbToShopOrder(r, itemsMap)));
    return { data, total };
  } catch (error) {
    console.error('[Shop] Failed to list orders:', error);
    return { data: [], total: 0 };
  }
}

export async function createShopOrder(data: {
  user_id: string;
  user_nick: string;
  item_id: string;
  item_nome: string;
  item_imagem?: string;
  preco: number;
}): Promise<ShopOrder | null> {
  try {
    const buyerId = data.user_id || (await resolveUserId(data.user_nick)) || null;
    const row = await pbCreate<ShopOrderRow>(SHOP_ORDERS_TABLE, {
      item: data.item_id,
      buyer: buyerId,
      price_paid: data.preco,
      status: 'pending',
    });
    return row ? await mapDbToShopOrder(row) : null;
  } catch (error) {
    console.error('[Shop] Failed to create order:', error);
    return null;
  }
}

export async function updateShopOrder(id: string, data: Partial<ShopOrder>): Promise<ShopOrder | null> {
  try {
    const dbData: Record<string, unknown> = {};
    if (data.status) dbData.status = appStatusToDb(data.status);
    const row = await pbUpdate<ShopOrderRow>(SHOP_ORDERS_TABLE, id, dbData);
    return row ? await mapDbToShopOrder(row) : null;
  } catch (error) {
    console.error('[Shop] Failed to update order:', error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Purchase logic                                                     */
/* ------------------------------------------------------------------ */

export async function purchaseItem(
  userId: string,
  userNick: string,
  itemId: string,
): Promise<{ ok: boolean; error?: string; order?: ShopOrder }> {
  const item = await getShopItem(itemId);
  if (!item) return { ok: false, error: 'Article introuvable' };
  if (item.status !== 'ativo') return { ok: false, error: 'Article indisponible' };
  if (item.estoque <= 0) return { ok: false, error: 'Rupture de stock' };

  const userData = await getUserBySessionIdentity({ id: userId, nick: userNick });
  if (!userData) return { ok: false, error: 'Utilisateur introuvable' };
  const resolvedUserId = String(userData.id);

  const currentCoins = Number(userData.moedas) || 0;
  if (currentCoins < item.preco) {
    return { ok: false, error: `Coins insuffisants (${currentCoins}/${item.preco})` };
  }

  try {
    await pbUpdate(USERS_TABLE, resolvedUserId, { coins: currentCoins - item.preco });
  } catch {
    return { ok: false, error: 'Erreur lors du paiement' };
  }

  await updateShopItem(item.id, { estoque: Math.max(0, item.estoque - 1) });

  const order = await createShopOrder({
    user_id: resolvedUserId,
    user_nick: userNick || userData.nick || 'Inconnu',
    item_id: item.id,
    item_nome: item.nome,
    item_imagem: item.imagem,
    preco: item.preco,
  });

  if (!order) return { ok: false, error: 'Erreur lors de la commande' };

  await createAdminNotification({
    type: 'shop_order',
    title: `Nouvelle commande : ${item.nome}`,
    message: `${userNick || userData.nick} a acheté "${item.nome}" pour ${item.preco} coins`,
    link: '/admin',
  });

  return { ok: true, order };
}

/* ------------------------------------------------------------------ */
/*  Admin Notifications                                                */
/* ------------------------------------------------------------------ */

export async function listAdminNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<AdminNotification[]> {
  const { unreadOnly = false, limit = 50 } = options || {};
  try {
    const rows = await pbList<AdminNotificationRow>(ADMIN_NOTIFICATIONS_TABLE, {
      filter: unreadOnly ? { read: { _eq: false } } : undefined,
      sort: '-created',
      perPage: limit,
      fields: NOTIF_FIELDS,
    });
    return rows.map(mapDbToNotification);
  } catch (error) {
    console.error('[Notifications] Failed to list:', error);
    return [];
  }
}

export async function createAdminNotification(data: {
  type: string;
  title: string;
  message?: string;
  link?: string;
}): Promise<AdminNotification | null> {
  try {
    const row = await pbCreate<AdminNotificationRow>(ADMIN_NOTIFICATIONS_TABLE, {
      message: data.title + (data.message ? ` — ${data.message}` : ''),
      severity: data.type === 'shop_order' ? 'success' : 'info',
      read: false,
    });
    return row ? mapDbToNotification(row) : null;
  } catch (error) {
    console.error('[Notifications] Failed to create:', error);
    return null;
  }
}

export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    await pbUpdate(ADMIN_NOTIFICATIONS_TABLE, id, { read: true });
    return true;
  } catch {
    return false;
  }
}

export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    const unread = await listAdminNotifications({ unreadOnly: true, limit: 200 });
    await Promise.all(unread.map((n) => markNotificationRead(n.id)));
    return true;
  } catch {
    return false;
  }
}

export async function countUnreadNotifications(): Promise<number> {
  try {
    return await pbCount(ADMIN_NOTIFICATIONS_TABLE, { read: { _eq: false } });
  } catch {
    return 0;
  }
}
