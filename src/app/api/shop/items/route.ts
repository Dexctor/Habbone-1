import { NextResponse } from 'next/server';
import { directusUrl, serviceToken } from '@/server/directus/client';

// Force dynamic — never cache this route (items change when admin adds/edits)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Bypass SDK entirely — fetch Directus REST API directly
    const url = `${directusUrl}/items/shop_items?filter[status][_eq]=ativo&sort=-id&limit=500&fields=id,nome,descricao,imagem,preco,estoque,status`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Shop Items] Directus error:', res.status, body);
      return NextResponse.json({ error: 'Erreur Directus', status: res.status }, { status: 500 });
    }

    const json = await res.json();
    const items = json?.data ?? [];

    return NextResponse.json({ ok: true, data: items });
  } catch (e: any) {
    console.error('[Shop Items API] Error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
