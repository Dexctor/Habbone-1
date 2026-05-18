import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/api-helpers';
import { purchaseItem } from '@/server/directus/shop';
import { invalidateShop } from '@/server/cache-policy';

const BodySchema = z.object({
  itemId: z.number().int().min(1),
});

export const POST = withAuth(async (req, { user, nick }) => {
  const userId = user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Parse body
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  }

  // Execute purchase
  const result = await purchaseItem(Number(userId), nick, parsed.data.itemId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Erreur' }, { status: 400 });
  }

  invalidateShop();

  return NextResponse.json({
    ok: true,
    order: result.order,
    balance: result.balance,
    message: 'Achat effectué ! L\'admin va te livrer le mobi.',
  });
}, { key: 'shop:buy', limit: 10, windowMs: 60_000 })
