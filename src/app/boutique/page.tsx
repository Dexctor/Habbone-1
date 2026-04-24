import { unstable_cache } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { listShopItems } from '@/server/directus/shop';
import { directusFetch } from '@/server/directus/fetch';
import { TABLES, USE_V2 } from '@/server/directus/tables';
import BoutiqueClient from './boutique-client';

const USERS_TABLE = TABLES.users;
const COINS_COL = USE_V2 ? 'coins' : 'moedas';

export const revalidate = 300;

const getCachedShopItems = unstable_cache(
  () => listShopItems(true).catch(() => []),
  ['shop-items-public'],
  { tags: ['shop'], revalidate: 300 }
);

export default async function BoutiquePage() {
  const [items, session] = await Promise.all([
    getCachedShopItems(),
    getServerSession(authOptions),
  ]);

  // Pre-fetch user coins server-side if logged in
  let coins = 0;
  const user = session?.user as { id?: number | string; nick?: string } | undefined;
  if (user?.id) {
    try {
      const userId = Number(user.id);
      if (userId > 0) {
        const json = await directusFetch<{ data: Record<string, unknown> }>(
          `/items/${encodeURIComponent(USERS_TABLE)}/${userId}`,
          { params: { fields: COINS_COL } }
        );
        coins = Number(json?.data?.[COINS_COL]) || 0;
      }
    } catch { /* silent */ }
  }

  return (
    <BoutiqueClient
      initialItems={items}
      initialCoins={coins}
      loggedIn={!!user?.nick}
    />
  );
}
