import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
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

export const GET = withAdmin(async (req) => {
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
    // Read as ArrayBuffer and decode as UTF-8 to avoid charset issues
    const buf = await res.arrayBuffer();
    const text = new TextDecoder('utf-8').decode(buf);
    const json = JSON.parse(text);
    const items = (json?.data ?? []).map((item: Record<string, unknown>) => {
      const fixed = { ...item };
      for (const key of ['nome', 'descricao']) {
        if (typeof fixed[key] === 'string') {
          let val = fixed[key] as string;
          // Fix double-encoded UTF-8 (e.g. "Ã´" → "ô")
          if (/[\u00c0-\u00c3][\u0080-\u00bf]/.test(val)) {
            try {
              const bytes = new Uint8Array([...val].map((c) => c.charCodeAt(0) & 0xff));
              val = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            } catch { /* keep original */ }
          }
          // Strip irrecoverable U+FFFD replacement chars
          if (val.includes('\ufffd')) val = val.replace(/\ufffd/g, '');
          fixed[key] = val;
        }
      }
      return fixed;
    });
    return NextResponse.json({ ok: true, data: items });
  } catch (e: any) {
    console.error('[Admin Shop GET] Error:', e?.message);
    return NextResponse.json({ ok: true, data: [] });
  }
});

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
      console.error('[Shop API] Validation failed:', parsed.error.issues);
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Données invalides' }, { status: 400 });
    }
    try {
      const item = await createShopItem(parsed.data);
      if (!item) return NextResponse.json({ error: 'Création échouée — vérifiez que la table shop_items existe dans Directus' }, { status: 500 });
      revalidateTag('shop');
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
    if (!id || !['pendente', 'entregue', 'cancelado'].includes(status)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }
    const order = await updateShopOrder(id, { status });
    if (!order) return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 });
    revalidateTag('shop');
    return NextResponse.json({ ok: true, data: order });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
});
