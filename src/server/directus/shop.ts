import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. Kept around so that any consumer still importing from
 * `@/server/directus/shop` keeps compiling.
 */

export {
  listShopItems,
  getShopItem,
  createShopItem,
  updateShopItem,
  deleteShopItem,
  listShopOrders,
  createShopOrder,
  updateShopOrder,
  purchaseItem,
  listAdminNotifications,
  createAdminNotification,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
} from '@/server/supabase/shop';

export type { ShopItem, ShopOrder, AdminNotification } from '@/types/shop';
