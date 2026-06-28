import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { withAuth } from '@/server/api-helpers';
import { purchaseItem } from '@/server/pocketbase/shop';

const BodySchema = z.object({
  itemId: z.coerce.string().trim().min(1),
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
  const result = await purchaseItem(String(userId), nick, parsed.data.itemId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Erreur' }, { status: 400 });
  }

  revalidateTag('shop');

  return NextResponse.json({
    ok: true,
    order: result.order,
    message: 'Achat effectué ! L\'admin va te livrer le mobi.',
  });
}, { key: 'shop:buy', limit: 10, windowMs: 60_000 })
