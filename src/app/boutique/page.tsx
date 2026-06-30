import { unstable_cache } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { listShopItems } from '@/server/directus/shop';
import { getUserMoedas } from '@/server/directus/users';
import BoutiqueClient from './boutique-client';
import SectionReveal from '@/components/motion/section-reveal';

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
        coins = await getUserMoedas(userId);
      }
    } catch { /* silent */ }
  }

  return (
    <SectionReveal>
      <BoutiqueClient
        initialItems={items}
        initialCoins={coins}
        loggedIn={!!user?.nick}
      />
    </SectionReveal>
  );
}
