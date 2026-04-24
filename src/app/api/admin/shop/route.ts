import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import {
  listShopItems,
  createShopItem,
  updateShopItem,
  deleteShopItem,
  listShopOrders,
  updateShopOrder,
} from '@/server/directus/shop';

// Force dynamic — never cache admin API routes
export const dynamic = 'force-dynamic';

const ItemSchema = z.object({
  nome: z.string().min(1).max(200),
  descricao: z.string().max(500).optional(),
  imagem: z.string().min(1),
  preco: z.number().int().min(0),
  estoque: z.number().int().min(0),
  status: z.enum(['ativo', 'inativo']),
});

export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') || 'items';

  if (view === 'orders') {
    const status = searchParams.get('status') || undefined;
    const page = Number(searchParams.get('page') || 1);
    const result = await listShopOrders({ status, page, limit: 20 });
    return NextResponse.json({ ok: true, ...result });
  }

  // Use the service layer which handles DB column mapping + encoding fixes
  const items = await listShopItems(false);
  return NextResponse.json({ ok: true, data: items });
}, { key: 'admin:shop:read', limit: 120, windowMs: 60_000 });

export const POST = withAdmin(async (req) => {
  const body = await req.json().catch(() => null);
  if (!body?.action) {
    return NextResponse.json({ error: 'Action requise' }, { status: 400 });
  }

  const { action } = body;

  // ── Create item ──
  if (action === 'create') {
    const parsed = ItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Données invalides' }, { status: 400 });
    }
    try {
      const item = await createShopItem(parsed.data);
      if (!item) return NextResponse.json({ error: 'Création échouée' }, { status: 500 });
      revalidateTag('shop');
      return NextResponse.json({ ok: true, data: item });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Erreur de création' }, { status: 500 });
    }
  }

  // ── Update item ──
  if (action === 'update') {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    const { action: _, id: __, ...patch } = body;
    const item = await updateShopItem(id, patch);
    if (!item) return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 });
    revalidateTag('shop');
    return NextResponse.json({ ok: true, data: item });
  }

  // ── Delete item ──
  if (action === 'delete') {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    const ok = await deleteShopItem(id);
    if (!ok) return NextResponse.json({ error: 'Suppression échouée' }, { status: 500 });
    revalidateTag('shop');
    return NextResponse.json({ ok: true });
  }

  // ── Update order status ──
  if (action === 'update_order') {
    const id = Number(body.id);
    const status = body.status;
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }
    if (!['pendente', 'entregue', 'cancelado'].includes(status)) {
      return NextResponse.json({ error: `Statut invalide: ${status}` }, { status: 400 });
    }
    try {
      const order = await updateShopOrder(id, { status });
      if (!order) {
        return NextResponse.json({ error: 'Commande non trouvée ou Directus a rejeté la MAJ' }, { status: 500 });
      }
      revalidateTag('shop');
      return NextResponse.json({ ok: true, data: order });
    } catch (e: unknown) {
      console.error('[admin:shop] update_order failed:', e);
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}, { key: 'admin:shop:mutate', limit: 30, windowMs: 60_000 });
