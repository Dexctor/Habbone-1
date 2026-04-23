import 'server-only';

import { directusService as directus, rItems, rItem, cItem, uItem, dItem, directusUrl, serviceToken, USERS_TABLE } from './client';
import { directusFetch } from './fetch';
import { TABLES, USE_V2 } from './tables';
import { resolveUserId, resolveUserNicks, nowIso, unixSecondsToIso } from './user-cache';
import type { ShopItem, ShopOrder, AdminNotification } from '@/types/shop';

export type { ShopItem, ShopOrder, AdminNotification };

const SHOP_ITEMS_TABLE = TABLES.shopItems;
const SHOP_ORDERS_TABLE = TABLES.shopOrders;
const ADMIN_NOTIFICATIONS_TABLE = TABLES.adminNotifications;

const ITEMS_FIELDS = USE_V2
  ? ['id', 'name', 'description', 'image', 'price_coins', 'stock', 'active']
  : ['id', 'nome', 'imagem', 'preco_moedas', 'qtd_disponivel', 'disponivel', 'status'];

const ORDERS_FIELDS = USE_V2
  ? ['id', 'item', 'buyer', 'created_at', 'status']
  : ['id', 'id_item', 'comprador', 'data', 'ip', 'status'];

const NOTIF_FIELDS = USE_V2
  ? ['id', 'message', 'severity', 'read', 'created_at']
  : ['id', 'texto', 'tipo', 'autor', 'data', 'status'];

/* ------------------------------------------------------------------ */
/*  Encoding helper                                                    */
/* ------------------------------------------------------------------ */

function fixEncoding(value: string): string {
  if (/[\u00c0-\u00c3][\u0080-\u00bf]/.test(value)) {
    try {
      const bytes = new Uint8Array([...value].map((c) => c.charCodeAt(0) & 0xff));
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch { /* fall through */ }
  }
  if (value.includes('\ufffd')) {
    return value.replace(/\ufffd/g, '');
  }
  return value;
}

function fixStr(v: unknown): string {
  return typeof v === 'string' ? fixEncoding(v) : String(v ?? '');
}

/* ------------------------------------------------------------------ */
/*  Mappers: DB rows → App types                                       */
/* ------------------------------------------------------------------ */

function mapDbToShopItem(row: any): ShopItem {
  if (USE_V2) {
    return {
      id: Number(row.id),
      nome: fixStr(row.name),
      descricao: row.description ? fixStr(row.description) : undefined,
      imagem: String(row.image || ''),
      preco: Number(row.price_coins || 0),
      estoque: Number(row.stock || 0),
      status: row.active ? 'ativo' : 'inativo',
    };
  }
  return {
    id: Number(row.id),
    nome: fixStr(row.nome),
    descricao: undefined,
    imagem: String(row.imagem || ''),
    preco: Number(row.preco_moedas || 0),
    estoque: Number(row.qtd_disponivel || 0),
    status: row.disponivel === 's' ? 'ativo' : (row.status === 'ativo' && row.disponivel !== 'n' ? 'ativo' : 'inativo'),
  };
}

function mapShopItemToDb(data: Partial<ShopItem>): Record<string, unknown> {
  if (USE_V2) {
    const db: Record<string, unknown> = {};
    if (data.nome !== undefined) db.name = data.nome;
    if (data.descricao !== undefined) db.description = data.descricao ?? null;
    if (data.imagem !== undefined) db.image = data.imagem;
    if (data.preco !== undefined) db.price_coins = data.preco;
    if (data.estoque !== undefined) db.stock = data.estoque;
    if (data.status !== undefined) db.active = data.status === 'ativo';
    return db;
  }
  const db: Record<string, unknown> = {};
  if (data.nome !== undefined) db.nome = data.nome;
  if (data.imagem !== undefined) db.imagem = data.imagem;
  if (data.preco !== undefined) db.preco_moedas = data.preco;
  if (data.estoque !== undefined) db.qtd_disponivel = data.estoque;
  if (data.status !== undefined) db.disponivel = data.status === 'ativo' ? 's' : 'n';
  return db;
}

async function mapDbToShopOrder(row: any, itemsCache?: Map<number, ShopItem>): Promise<ShopOrder> {
  if (USE_V2) {
    const itemId = Number(row.item || 0);
    const item = itemsCache?.get(itemId);
    const buyerId = Number(row.buyer || 0);
    const buyerNick = buyerId ? (await resolveUserNicks([buyerId])).get(buyerId) ?? '' : '';
    return {
      id: Number(row.id),
      user_id: buyerId,
      user_nick: buyerNick,
      item_id: itemId,
      item_nome: item?.nome,
      item_imagem: item?.imagem,
      preco: item?.preco || 0,
      status: (row.status as any) || 'pendente',
    };
  }
  const itemId = Number(row.id_item || 0);
  const item = itemsCache?.get(itemId);
  return {
    id: Number(row.id),
    user_id: 0,
    user_nick: fixStr(row.comprador),
    item_id: itemId,
    item_nome: item?.nome,
    item_imagem: item?.imagem,
    preco: item?.preco || 0,
    status: row.status === 'ativo' ? 'pendente' : (row.status as any) || 'pendente',
  };
}

function mapDbToNotification(row: any): AdminNotification {
  if (USE_V2) {
    return {
      id: Number(row.id),
      type: String(row.severity || 'info'),
      title: fixStr(row.message),
      message: undefined,
      link: undefined,
      read: !!row.read,
    };
  }
  return {
    id: Number(row.id),
    type: String(row.tipo || ''),
    title: fixStr(row.texto),
    message: undefined,
    link: undefined,
    read: row.status !== 'ativo',
  };
}

/* ------------------------------------------------------------------ */
/*  Shop Items                                                         */
/* ------------------------------------------------------------------ */

export async function listShopItems(onlyActive = false): Promise<ShopItem[]> {
  try {
    const filter: Record<string, unknown> = {};
    if (onlyActive) {
      if (USE_V2) {
        filter.active = { _eq: true };
      } else {
        filter.status = { _eq: 'ativo' };
        filter.disponivel = { _eq: 's' };
      }
    }
    const rows = await directus.request(
      rItems(SHOP_ITEMS_TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-id'],
        limit: 500,
        fields: ITEMS_FIELDS,
      })
    );
    return ((rows || []) as any[]).map(mapDbToShopItem);
  } catch (error: any) {
    console.error('[Shop] Failed to list items:', error?.message || error);
    return [];
  }
}

export async function getShopItem(id: number): Promise<ShopItem | null> {
  try {
    const row = await directus.request(rItem(SHOP_ITEMS_TABLE, id, { fields: ITEMS_FIELDS }));
    return row ? mapDbToShopItem(row) : null;
  } catch {
    return null;
  }
}

export async function createShopItem(data: Omit<ShopItem, 'id'>): Promise<ShopItem | null> {
  try {
    const dbData = USE_V2
      ? { ...mapShopItemToDb(data), sold_count: 0, free: false }
      : {
          ...mapShopItemToDb(data),
          autor: 'admin',
          data: Math.floor(Date.now() / 1000),
          tipo: 1,
          id_util: 1,
          gratis: 'n',
          qtd_comprado: 0,
        };
    const row = await directus.request(cItem(SHOP_ITEMS_TABLE, dbData));
    return row ? mapDbToShopItem(row) : null;
  } catch (error: any) {
    console.error('[Shop] Failed to create item:', error?.message || error);
    throw error;
  }
}

export async function updateShopItem(id: number, data: Partial<ShopItem>): Promise<ShopItem | null> {
  try {
    const dbData = mapShopItemToDb(data);
    const row = await directus.request(uItem(SHOP_ITEMS_TABLE, id, dbData));
    return row ? mapDbToShopItem(row) : null;
  } catch (error) {
    console.error('[Shop] Failed to update item:', error);
    return null;
  }
}

export async function deleteShopItem(id: number): Promise<boolean> {
  try {
    await directus.request(dItem(SHOP_ITEMS_TABLE, id));
    return true;
  } catch (error) {
    console.error('[Shop] Failed to delete item:', error);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Shop Orders                                                        */
/* ------------------------------------------------------------------ */

function appStatusToDb(status: string): string {
  if (USE_V2) {
    if (status === 'pendente') return 'pending';
    if (status === 'entregue') return 'delivered';
    if (status === 'cancelado') return 'cancelled';
    return status;
  }
  if (status === 'pendente') return 'ativo';
  return status;
}

function dbStatusToAppFilter(): Record<string, unknown> | null {
  // Not used directly; inlined below for clarity
  return null;
}

export async function listShopOrders(options?: {
  status?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: ShopOrder[]; total: number }> {
  const { status, limit = 50, page = 1 } = options || {};
  try {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = { _eq: appStatusToDb(status) };

    const rows = await directus.request(
      rItems(SHOP_ORDERS_TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-id'],
        limit,
        offset: (page - 1) * limit,
        fields: ORDERS_FIELDS,
      })
    );

    const items = await listShopItems(false);
    const itemsMap = new Map(items.map((i) => [i.id, i]));

    // Count total
    const countParams: Record<string, string> = {};
    if (status) countParams['filter[status][_eq]'] = appStatusToDb(status);

    let total = 0;
    try {
      const countJson = await directusFetch<{ meta?: { total_count?: number } }>(
        `/items/${SHOP_ORDERS_TABLE}`,
        { params: { limit: '0', meta: 'total_count', ...countParams } },
      );
      total = Number(countJson?.meta?.total_count ?? 0);
    } catch {
      total = (rows as any[])?.length ?? 0;
    }

    const data = await Promise.all(((rows || []) as any[]).map((r) => mapDbToShopOrder(r, itemsMap)));
    return { data, total };
  } catch (error) {
    console.error('[Shop] Failed to list orders:', error);
    return { data: [], total: 0 };
  }
}

export async function createShopOrder(data: {
  user_id: number;
  user_nick: string;
  item_id: number;
  item_nome: string;
  item_imagem?: string;
  preco: number;
}): Promise<ShopOrder | null> {
  try {
    let dbData: Record<string, unknown>;
    if (USE_V2) {
      const buyerId = data.user_id || (await resolveUserId(data.user_nick)) || null;
      dbData = {
        item: data.item_id,
        buyer: buyerId,
        price_paid: data.preco,
        status: 'pending',
      };
    } else {
      dbData = {
        id_item: data.item_id,
        comprador: data.user_nick,
        data: Math.floor(Date.now() / 1000),
        ip: '0.0.0.0',
        status: 'ativo',
      };
    }
    const row = await directus.request(cItem(SHOP_ORDERS_TABLE, dbData));
    return (row || null) as ShopOrder | null;
  } catch (error) {
    console.error('[Shop] Failed to create order:', error);
    return null;
  }
}

export async function updateShopOrder(id: number, data: Partial<ShopOrder>): Promise<ShopOrder | null> {
  try {
    const dbData: Record<string, unknown> = {};
    if (data.status) dbData.status = appStatusToDb(data.status);
    const row = await directus.request(uItem(SHOP_ORDERS_TABLE, id, dbData));
    return (row || null) as ShopOrder | null;
  } catch (error) {
    console.error('[Shop] Failed to update order:', error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Purchase logic                                                     */
/* ------------------------------------------------------------------ */

export async function purchaseItem(userId: number, userNick: string, itemId: number): Promise<{
  ok: boolean;
  error?: string;
  order?: ShopOrder;
}> {
  const item = await getShopItem(itemId);
  if (!item) return { ok: false, error: 'Article introuvable' };
  if (item.status !== 'ativo') return { ok: false, error: 'Article indisponible' };
  if (item.estoque <= 0) return { ok: false, error: 'Rupture de stock' };

  // Users stay in legacy table until Session C; here we fetch through USERS_TABLE
  // which points to `usuarios` today and will point to `users` once users.ts
  // migration lands. Column names: id, nick, moedas (legacy) vs id, nick, coins (v2)
  const coinsCol = USE_V2 ? 'coins' : 'moedas';
  const userRes = await fetch(
    `${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${userId}?fields=id,nick,${coinsCol}`,
    { headers: { Authorization: `Bearer ${serviceToken}` }, cache: 'no-store' },
  );
  if (!userRes.ok) return { ok: false, error: 'Utilisateur introuvable' };
  const userData = (await userRes.json())?.data;
  if (!userData) return { ok: false, error: 'Utilisateur introuvable' };

  const currentCoins = Number(userData[coinsCol]) || 0;
  if (currentCoins < item.preco) {
    return { ok: false, error: `Coins insuffisants (${currentCoins}/${item.preco})` };
  }

  const newBalance = currentCoins - item.preco;
  const patchRes = await fetch(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ [coinsCol]: newBalance }),
  });
  if (!patchRes.ok) return { ok: false, error: 'Erreur lors du paiement' };

  await updateShopItem(item.id, { estoque: Math.max(0, item.estoque - 1) });

  const order = await createShopOrder({
    user_id: userId,
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
    const filter: Record<string, unknown> = {};
    if (unreadOnly) {
      if (USE_V2) filter.read = { _eq: false };
      else filter.status = { _eq: 'ativo' };
    }

    const rows = await directus.request(
      rItems(ADMIN_NOTIFICATIONS_TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-id'],
        limit,
        fields: NOTIF_FIELDS,
      })
    );
    return ((rows || []) as any[]).map(mapDbToNotification);
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
    const dbData = USE_V2
      ? {
          message: data.title + (data.message ? ` — ${data.message}` : ''),
          severity: data.type === 'shop_order' ? 'success' : 'info',
          read: false,
        }
      : {
          texto: data.title + (data.message ? ` — ${data.message}` : ''),
          tipo: data.type === 'shop_order' ? 'success' : 'info',
          autor: 'system',
          data: Math.floor(Date.now() / 1000),
          status: 'ativo',
        };
    const row = await directus.request(cItem(ADMIN_NOTIFICATIONS_TABLE, dbData));
    return row ? mapDbToNotification(row) : null;
  } catch (error) {
    console.error('[Notifications] Failed to create:', error);
    return null;
  }
}

export async function markNotificationRead(id: number): Promise<boolean> {
  try {
    const patch = USE_V2 ? { read: true } : { status: 'lido' };
    await directus.request(uItem(ADMIN_NOTIFICATIONS_TABLE, id, patch));
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
    const rows = await listAdminNotifications({ unreadOnly: true, limit: 200 });
    return rows.length;
  } catch {
    return 0;
  }
}
