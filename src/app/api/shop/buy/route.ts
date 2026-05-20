import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/server/api-helpers';
import { purchaseItem } from '@/server/directus/shop';
import { invalidateShop } from '@/server/cache-policy';

const BodySchema = z.object({
  itemId: z.number().int().min(1),
});

function parseSessionUserId(value: unknown): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const clean = raw.startsWith('legacy:') ? raw.slice('legacy:'.length) : raw;
  const id = Number(clean);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const POST = withAuth(async (req, { user, nick }) => {
  const userId = parseSessionUserId(user?.id);
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Parse body
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof purchaseItem>>;
  try {
    result = await purchaseItem(userId, nick, parsed.data.itemId);
  } catch (error) {
    console.error('[shop:buy] purchase failed', error);
    return NextResponse.json(
      { error: "Impossible de finaliser l'achat pour le moment", code: 'SHOP_PURCHASE_FAILED' },
      { status: 500 },
    );
  }

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
