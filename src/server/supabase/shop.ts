import 'server-only';

import type { AdminNotification, ShopItem, ShopOrder } from '@/types/shop';
import { purchaseItemCore, type PurchaseResult, type PurchaseUserSnapshot } from '@/server/directus/shop-purchase-core';
import { withRedisLock } from '@/server/redis';
import { queryOne, queryRows } from './db';
import { tableName } from './config';
import {
  appStatusToDb,
  mapShopItemToSupabasePatch,
  mapSupabaseAdminNotification,
  mapSupabaseShopItem,
  mapSupabaseShopOrder,
  type SupabaseAdminNotificationRow,
  type SupabaseShopItemRow,
  type SupabaseShopOrderRow,
} from './shop-core';

const SHOP_ITEM_SELECT = 'id, name, description, image, price_coins, stock, active';

function orderSelectSql(): string {
  return `
    select
      o.id,
      o.item,
      o.buyer,
      u.nick as buyer_nick,
      o.price_paid,
      o.status,
      i.name as item_name,
      i.image as item_image
    from ${tableName('shop_orders')} o
    left join ${tableName('users')} u on u.id = o.buyer
    left join ${tableName('shop_items')} i on i.id = o.item
  `;
}

export async function listShopItems(onlyActive = false): Promise<ShopItem[]> {
  const rows = await queryRows<SupabaseShopItemRow>(
    `select ${SHOP_ITEM_SELECT}
     from ${tableName('shop_items')}
     ${onlyActive ? 'where active = true' : ''}
     order by id desc
     limit 500`,
  );
  return rows.map(mapSupabaseShopItem);
}

export async function getShopItem(id: number): Promise<ShopItem | null> {
  const row = await queryOne<SupabaseShopItemRow>(
    `select ${SHOP_ITEM_SELECT}
     from ${tableName('shop_items')}
     where id = $1
     limit 1`,
    [id],
  );
  return row ? mapSupabaseShopItem(row) : null;
}

export async function createShopItem(data: Omit<ShopItem, 'id'>): Promise<ShopItem | null> {
  const patch = mapShopItemToSupabasePatch(data);
  const row = await queryOne<SupabaseShopItemRow>(
    `insert into ${tableName('shop_items')} (name, description, image, price_coins, stock, active, sold_count, free)
     values ($1, $2, $3, $4, $5, $6, 0, false)
     returning ${SHOP_ITEM_SELECT}`,
    [
      patch.name ?? '',
      patch.description ?? null,
      patch.image ?? '',
      patch.price_coins ?? 0,
      patch.stock ?? 0,
      patch.active ?? false,
    ],
  );
  return row ? mapSupabaseShopItem(row) : null;
}

export async function updateShopItem(id: number, data: Partial<ShopItem>): Promise<ShopItem | null> {
  const patch = mapShopItemToSupabasePatch(data);
  const entries = Object.entries(patch);
  if (entries.length === 0) return getShopItem(id);

  const assignments = entries.map(([key], index) => `"${key}" = $${index + 2}`).join(', ');
  const row = await queryOne<SupabaseShopItemRow>(
    `update ${tableName('shop_items')}
     set ${assignments}
     where id = $1
     returning ${SHOP_ITEM_SELECT}`,
    [id, ...entries.map(([, value]) => value)],
  );
  return row ? mapSupabaseShopItem(row) : null;
}

export async function deleteShopItem(id: number): Promise<boolean> {
  const rows = await queryRows<{ id: number }>(
    `delete from ${tableName('shop_items')} where id = $1 returning id`,
    [id],
  );
  return rows.length > 0;
}

export async function listShopOrders(options?: {
  status?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: ShopOrder[]; total: number }> {
  const { status, limit = 50, page = 1 } = options || {};
  const values: unknown[] = [];
  const where: string[] = [];
  if (status) {
    values.push(appStatusToDb(status));
    where.push(`o.status = $${values.length}`);
  }

  values.push(limit, (page - 1) * limit);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const data = await queryRows<SupabaseShopOrderRow>(
    `${orderSelectSql()}
     ${where.length ? `where ${where.join(' and ')}` : ''}
     order by o.id desc
     limit $${limitParam}
     offset $${offsetParam}`,
    values,
  );

  const countValues = status ? [appStatusToDb(status)] : [];
  const countRows = await queryRows<{ count: string }>(
    `select count(*)::text as count
     from ${tableName('shop_orders')} o
     ${status ? 'where o.status = $1' : ''}`,
    countValues,
  );

  return {
    data: data.map(mapSupabaseShopOrder),
    total: Number(countRows[0]?.count) || 0,
  };
}

export async function createShopOrder(data: {
  user_id: number;
  user_nick: string;
  item_id: number;
  item_nome: string;
  item_imagem?: string;
  preco: number;
}): Promise<ShopOrder | null> {
  const row = await queryOne<SupabaseShopOrderRow>(
    `insert into ${tableName('shop_orders')} (item, buyer, price_paid, status)
     values ($1, $2, $3, 'pending')
     returning
       id,
       item,
       buyer,
       (select nick from ${tableName('users')} where id = buyer) as buyer_nick,
       price_paid,
       status,
       $4::text as item_name,
       $5::text as item_image`,
    [data.item_id, data.user_id || null, data.preco, data.item_nome, data.item_imagem ?? null],
  );
  return row ? mapSupabaseShopOrder(row) : null;
}

export async function updateShopOrder(id: number, data: Partial<ShopOrder>): Promise<ShopOrder | null> {
  const status = data.status ? appStatusToDb(data.status) : null;
  if (!status) {
    const existing = await queryOne<SupabaseShopOrderRow>(
      `${orderSelectSql()} where o.id = $1 limit 1`,
      [id],
    );
    return existing ? mapSupabaseShopOrder(existing) : null;
  }

  const row = await queryOne<SupabaseShopOrderRow>(
    `update ${tableName('shop_orders')} set status = $2 where id = $1
     returning
       id,
       item,
       buyer,
       (select nick from ${tableName('users')} where id = buyer) as buyer_nick,
       price_paid,
       status,
       (select name from ${tableName('shop_items')} where id = item) as item_name,
       (select image from ${tableName('shop_items')} where id = item) as item_image`,
    [id, status],
  );
  return row ? mapSupabaseShopOrder(row) : null;
}

async function patchUserCoins(
  userId: number,
  balance: number,
  options?: { expectedCoins?: number; reason?: 'charge' | 'refund' },
): Promise<boolean> {
  const rows = await queryRows<{ id: number }>(
    `update ${tableName('users')}
     set coins = $2
     where id = $1
       ${typeof options?.expectedCoins === 'number' ? 'and coins = $3' : ''}
     returning id`,
    typeof options?.expectedCoins === 'number' ? [userId, balance, options.expectedCoins] : [userId, balance],
  );
  return rows.length > 0;
}

async function patchItemStock(
  itemId: number,
  stock: number,
  options?: { expectedStock?: number; reason?: 'purchase' | 'restore' },
): Promise<boolean> {
  const rows = await queryRows<{ id: number }>(
    `update ${tableName('shop_items')}
     set stock = $2
     where id = $1
       ${typeof options?.expectedStock === 'number' ? 'and stock = $3' : ''}
     returning id`,
    typeof options?.expectedStock === 'number' ? [itemId, stock, options.expectedStock] : [itemId, stock],
  );
  return rows.length > 0;
}

async function getPurchaseUser(userId: number): Promise<PurchaseUserSnapshot | null> {
  const row = await queryOne<{ id: number; nick: string | null; coins: number | null }>(
    `select id, nick, coins
     from ${tableName('users')}
     where id = $1
     limit 1`,
    [userId],
  );
  if (!row) return null;
  return {
    id: Number(row.id),
    nick: row.nick,
    coins: Number(row.coins || 0),
  };
}

export async function purchaseItem(userId: number, userNick: string, itemId: number): Promise<PurchaseResult<ShopOrder>> {
  const run = () => purchaseItemCore(userId, userNick, itemId, {
    getItem: getShopItem,
    getUser: getPurchaseUser,
    setUserCoins: patchUserCoins,
    updateItemStock: patchItemStock,
    createOrder: createShopOrder,
    notify: ({ item, userNick: buyerNick }) => createAdminNotification({
      type: 'shop_order',
      title: `Nouvelle commande : ${item.nome}`,
      message: `${buyerNick} a acheté "${item.nome}" pour ${item.preco} coins`,
      link: '/admin',
    }).then(() => undefined),
    logCritical: (message, context) => console.error(message, context),
  });

  try {
    return await withRedisLock(`shop:item:${itemId}`, 10_000, run, { waitMs: 5000, retryMs: 50 });
  } catch (error) {
    if (error instanceof Error && error.message === 'REDIS_LOCK_TIMEOUT') {
      return { ok: false, error: 'Achat déjà en cours pour cet article, réessaie dans quelques secondes.' };
    }
    throw error;
  }
}

export async function listAdminNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<AdminNotification[]> {
  const { unreadOnly = false, limit = 50 } = options || {};
  const rows = await queryRows<SupabaseAdminNotificationRow>(
    `select id, message, severity, read
     from ${tableName('admin_notifications')}
     ${unreadOnly ? 'where read = false' : ''}
     order by id desc
     limit $1`,
    [limit],
  );
  return rows.map(mapSupabaseAdminNotification);
}

export async function createAdminNotification(data: {
  type: string;
  title: string;
  message?: string;
  link?: string;
}): Promise<AdminNotification | null> {
  const row = await queryOne<SupabaseAdminNotificationRow>(
    `insert into ${tableName('admin_notifications')} (message, severity, read)
     values ($1, $2, false)
     returning id, message, severity, read`,
    [
      data.title + (data.message ? ` - ${data.message}` : ''),
      data.type === 'shop_order' ? 'success' : 'info',
    ],
  );
  return row ? mapSupabaseAdminNotification(row) : null;
}

export async function markNotificationRead(id: number): Promise<boolean> {
  const rows = await queryRows<{ id: number }>(
    `update ${tableName('admin_notifications')} set read = true where id = $1 returning id`,
    [id],
  );
  return rows.length > 0;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  await queryRows(`update ${tableName('admin_notifications')} set read = true where read = false`);
  return true;
}

export async function countUnreadNotifications(): Promise<number> {
  const rows = await queryRows<{ count: string }>(
    `select count(*)::text as count from ${tableName('admin_notifications')} where read = false`,
  );
  return Number(rows[0]?.count) || 0;
}
