import { unstable_cache } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { listShopItems } from '@/server/pocketbase/shop';
import { getUserMoedas } from '@/server/pocketbase/users';
import BoutiqueClient from './boutique-client';

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
  const user = session?.user as { id?: string; nick?: string; hotel?: string | null } | undefined;
  if (user?.id || user?.nick) {
    try {
      coins = await getUserMoedas(String(user.id || ''), { nick: user.nick, hotel: user.hotel });
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
