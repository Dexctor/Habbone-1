import { NextResponse } from 'next/server';
import { directusUrl, serviceToken } from '@/server/directus/client';

// Force dynamic — never cache this route (items change when admin adds/edits)
export const dynamic = 'force-dynamic';

/**
 * Fix encoding issues in strings from Directus/MySQL.
 * 1) Double-encoded UTF-8 (latin1 → utf8 mojibake): "Ã´" → "ô"
 * 2) Replacement chars U+FFFD (data lost at insertion): strip them
 */
function fixEncoding(value: string): string {
  if (/[\u00c0-\u00c3][\u0080-\u00bf]/.test(value)) {
    try {
      const bytes = new Uint8Array([...value].map((c) => c.charCodeAt(0) & 0xff));
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch { /* fall through */ }
  }
  if (value.includes('\ufffd')) {
    return value.replace(/\ufffd/g, '');
  }
  return value;
}

function fixItemEncoding<T extends Record<string, unknown>>(item: T): T {
  const fixed = { ...item };
  for (const key of ['nome', 'descricao'] as const) {
    if (typeof fixed[key] === 'string') {
      (fixed as Record<string, unknown>)[key] = fixEncoding(fixed[key] as string);
    }
  }
  return fixed;
}

export async function GET() {
  try {
    // Bypass SDK entirely — fetch Directus REST API directly
    const url = `${directusUrl}/items/shop_items?filter[status][_eq]=ativo&sort=-id&limit=500&fields=id,nome,descricao,imagem,preco,estoque,status`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        Accept: 'application/json; charset=utf-8',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Shop Items] Directus error:', res.status, body);
      return NextResponse.json({ error: 'Erreur Directus', status: res.status }, { status: 500 });
    }

    // Read as ArrayBuffer and decode as UTF-8 to avoid charset issues
    const buf = await res.arrayBuffer();
    const text = new TextDecoder('utf-8').decode(buf);
    const json = JSON.parse(text);
    const items = (json?.data ?? []).map(fixItemEncoding);

    return NextResponse.json({ ok: true, data: items });
  } catch (e: any) {
    console.error('[Shop Items API] Error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
