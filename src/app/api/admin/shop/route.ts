import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdmin } from '@/server/authz';
import { directusUrl, serviceToken } from '@/server/directus/client';
import {
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

export async function GET(req: Request) {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') || 'items';

  if (view === 'orders') {
    const status = searchParams.get('status') || undefined;
    const page = Number(searchParams.get('page') || 1);
    const result = await listShopOrders({ status, page, limit: 20 });
    return NextResponse.json({ ok: true, ...result });
  }

  // Bypass SDK — fetch directly from Directus REST API (SDK may silently fail on Vercel)
  try {
    const url = `${directusUrl}/items/shop_items?sort=-id&limit=500&fields=id,nome,descricao,imagem,preco,estoque,status`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Admin Shop GET] Directus error:', res.status, body);
      return NextResponse.json({ ok: true, data: [] });
    }
    const json = await res.json();
    return NextResponse.json({ ok: true, data: json?.data ?? [] });
  } catch (e: any) {
    console.error('[Admin Shop GET] Error:', e?.message);
    return NextResponse.json({ ok: true, data: [] });
  }
}

export async function POST(req: Request) {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.action) {
    return NextResponse.json({ error: 'Action requise' }, { status: 400 });
  }

  const { action } = body;

  // ── Create item ──
  if (action === 'create') {
    const parsed = ItemSchema.safeParse(body);
    if (!parsed.success) {
      console.error('[Shop API] Validation failed:', parsed.error.issues);
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Données invalides' }, { status: 400 });
    }
    try {
      const item = await createShopItem(parsed.data);
      if (!item) return NextResponse.json({ error: 'Création échouée — vérifiez que la table shop_items existe dans Directus' }, { status: 500 });
      return NextResponse.json({ ok: true, data: item });
    } catch (e: any) {
      console.error('[Shop API] Create failed:', e);
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
    return NextResponse.json({ ok: true, data: item });
  }

  // ── Delete item ──
  if (action === 'delete') {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    const ok = await deleteShopItem(id);
    if (!ok) return NextResponse.json({ error: 'Suppression échouée' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Update order status ──
  if (action === 'update_order') {
    const id = Number(body.id);
    const status = body.status;
    if (!id || !['pendente', 'entregue', 'cancelado'].includes(status)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }
    const order = await updateShopOrder(id, { status });
    if (!order) return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 });
    return NextResponse.json({ ok: true, data: order });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
