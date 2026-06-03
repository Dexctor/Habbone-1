import { unstable_cache } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { listShopItems } from '@/server/directus/shop';
import { pbOne } from '@/server/directus/pb-helpers';
import { TABLES } from '@/server/directus/tables';
import BoutiqueClient from './boutique-client';

const USERS_TABLE = TABLES.users;

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
  const user = session?.user as { id?: string; nick?: string } | undefined;
  if (user?.id) {
    try {
      const row = await pbOne<{ coins?: number }>(USERS_TABLE, String(user.id), { fields: 'coins' });
      coins = Number(row?.coins) || 0;
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
