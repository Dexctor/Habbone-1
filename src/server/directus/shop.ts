import 'server-only';

import { directusService as directus, rItems, rItem, cItem, uItem, dItem, directusUrl, serviceToken, USERS_TABLE } from './client';
import type { ShopItem, ShopOrder, AdminNotification } from '@/types/shop';

export type { ShopItem, ShopOrder, AdminNotification };

const SHOP_ITEMS_TABLE = 'shop_items';
const SHOP_ORDERS_TABLE = 'shop_orders';
const ADMIN_NOTIFICATIONS_TABLE = 'admin_notifications';

/**
 * Fix encoding issues in strings from Directus/MySQL.
 * 1) Double-encoded UTF-8 (latin1 → utf8 mojibake): "Ã´" → "ô"
 * 2) Replacement chars U+FFFD (data lost at insertion): strip them
 */
function fixEncoding(value: string): string {
  // Case 1: double-encoded UTF-8 (e.g. "Ã´" for "ô")
  if (/[\u00c0-\u00c3][\u0080-\u00bf]/.test(value)) {
    try {
      const bytes = new Uint8Array([...value].map((c) => c.charCodeAt(0) & 0xff));
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch { /* fall through */ }
  }
  // Case 2: replacement characters (irrecoverable — just strip them)
  if (value.includes('\ufffd')) {
    return value.replace(/\ufffd/g, '');
  }
  return value;
}

function fixItemStrings<T>(item: T): T {
  const fixed = { ...item } as any;
  for (const key of ['nome', 'descricao', 'item_nome']) {
    if (typeof fixed[key] === 'string') {
      fixed[key] = fixEncoding(fixed[key]);
    }
  }
  return fixed as T;
}

/* ------------------------------------------------------------------ */
/*  Shop Items                                                         */
/* ------------------------------------------------------------------ */

export async function listShopItems(onlyActive = false): Promise<ShopItem[]> {
  try {
    const filter: Record<string, unknown> = onlyActive ? { status: { _eq: 'ativo' } } : {};
    const rows = await directus.request(
      rItems(SHOP_ITEMS_TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-id'],
        limit: 500,
        fields: ['id', 'nome', 'descricao', 'imagem', 'preco', 'estoque', 'status'],
      })
    );
    return ((rows || []) as ShopItem[]).map(fixItemStrings);
  } catch (error: any) {
    console.error('[Shop] Failed to list items:', error?.message || error);
    return [];
  }
}

export async function getShopItem(id: number): Promise<ShopItem | null> {
  try {
    const row = await directus.request(
      rItem(SHOP_ITEMS_TABLE, id, {
        fields: ['id', 'nome', 'descricao', 'imagem', 'preco', 'estoque', 'status'],
      })
    );
    return row ? fixItemStrings(row as ShopItem) : null;
  } catch {
    return null;
  }
}

export async function createShopItem(data: Omit<ShopItem, 'id'>): Promise<ShopItem | null> {
  try {
    const row = await directus.request(cItem(SHOP_ITEMS_TABLE, data));
    return (row || null) as ShopItem | null;
  } catch (error: any) {
    console.error('[Shop] Failed to create item:', error?.message || error);
    throw error;
  }
}

export async function updateShopItem(id: number, data: Partial<ShopItem>): Promise<ShopItem | null> {
  try {
    const row = await directus.request(uItem(SHOP_ITEMS_TABLE, id, data));
    return (row || null) as ShopItem | null;
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

export async function listShopOrders(options?: {
  status?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: ShopOrder[]; total: number }> {
  const { status, limit = 50, page = 1 } = options || {};
  try {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = { _eq: status };

    const rows = await directus.request(
      rItems(SHOP_ORDERS_TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-id'],
        limit,
        offset: (page - 1) * limit,
        fields: ['id', 'user_id', 'user_nick', 'item_id', 'item_nome', 'item_imagem', 'preco', 'status'],
      })
    );

    // Count total
    const countUrl = `${directusUrl}/items/${SHOP_ORDERS_TABLE}?limit=0&meta=total_count${status ? `&filter[status][_eq]=${status}` : ''}`;
    const countRes = await fetch(countUrl, {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    });
    const countJson = await countRes.json().catch(() => ({}));
    const total = Number(countJson?.meta?.total_count ?? (rows as any[])?.length ?? 0);

    return { data: ((rows || []) as ShopOrder[]).map(fixItemStrings), total };
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
    const row = await directus.request(
      cItem(SHOP_ORDERS_TABLE, { ...data, status: 'pendente' })
    );
    return (row || null) as ShopOrder | null;
  } catch (error) {
    console.error('[Shop] Failed to create order:', error);
    return null;
  }
}

export async function updateShopOrder(id: number, data: Partial<ShopOrder>): Promise<ShopOrder | null> {
  try {
    const row = await directus.request(uItem(SHOP_ORDERS_TABLE, id, data));
    return (row || null) as ShopOrder | null;
  } catch (error) {
    console.error('[Shop] Failed to update order:', error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Purchase logic (atomic: check coins → deduct → create order)       */
/* ------------------------------------------------------------------ */

export async function purchaseItem(userId: number, userNick: string, itemId: number): Promise<{
  ok: boolean;
  error?: string;
  order?: ShopOrder;
}> {
  // 1. Get item
  const item = await getShopItem(itemId);
  if (!item) return { ok: false, error: 'Article introuvable' };
  if (item.status !== 'ativo') return { ok: false, error: 'Article indisponible' };
  if (item.estoque <= 0) return { ok: false, error: 'Rupture de stock' };

  // 2. Get user coins
  const userRes = await fetch(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${userId}?fields=id,nick,moedas`, {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  });
  if (!userRes.ok) return { ok: false, error: 'Utilisateur introuvable' };
  const userData = (await userRes.json())?.data;
  if (!userData) return { ok: false, error: 'Utilisateur introuvable' };

  const currentCoins = Number(userData.moedas) || 0;
  if (currentCoins < item.preco) {
    return { ok: false, error: `Coins insuffisants (${currentCoins}/${item.preco})` };
  }

  // 3. Deduct coins
  const newBalance = currentCoins - item.preco;
  const patchRes = await fetch(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ moedas: newBalance }),
  });
  if (!patchRes.ok) return { ok: false, error: 'Erreur lors du paiement' };

  // 4. Decrease stock
  await updateShopItem(item.id, { estoque: Math.max(0, item.estoque - 1) });

  // 5. Create order
  const order = await createShopOrder({
    user_id: userId,
    user_nick: userNick || userData.nick || 'Inconnu',
    item_id: item.id,
    item_nome: item.nome,
    item_imagem: item.imagem,
    preco: item.preco,
  });

  if (!order) return { ok: false, error: 'Erreur lors de la commande' };

  // 6. Create admin notification
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
    if (unreadOnly) filter.read = { _eq: false };

    const rows = await directus.request(
      rItems(ADMIN_NOTIFICATIONS_TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-id'],
        limit,
        fields: ['id', 'type', 'title', 'message', 'link', 'read'],
      })
    );
    return (rows || []) as AdminNotification[];
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
    const row = await directus.request(
      cItem(ADMIN_NOTIFICATIONS_TABLE, { ...data, read: false })
    );
    return (row || null) as AdminNotification | null;
  } catch (error) {
    console.error('[Notifications] Failed to create:', error);
    return null;
  }
}

export async function markNotificationRead(id: number): Promise<boolean> {
  try {
    await directus.request(uItem(ADMIN_NOTIFICATIONS_TABLE, id, { read: true }));
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
