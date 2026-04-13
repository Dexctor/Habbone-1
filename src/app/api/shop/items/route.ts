import { NextResponse } from 'next/server';
import { directusUrl, serviceToken } from '@/server/directus/client';

// Force dynamic — never cache this route (items change when admin adds/edits)
export const dynamic = 'force-dynamic';

/**
 * Repair mojibake / double-encoded UTF-8 strings.
 * When UTF-8 text is stored in a latin1 column then read as UTF-8,
 * each multi-byte char gets double-encoded:
 *   "ô" (U+00F4) → latin1 bytes C3 B4 → read as UTF-8 → "Ã´"
 *   "é" (U+00E9) → latin1 bytes C3 A9 → read as UTF-8 → "Ã©"
 *   "è" (U+00E8) → latin1 bytes C3 A8 → read as UTF-8 → "Ã¨"
 * Fix: treat each char code as a raw byte and re-decode as UTF-8.
 */
function fixEncoding(value: string): string {
  // Quick check: does it look like double-encoded UTF-8?
  if (!/[\u00c0-\u00c3][\u0080-\u00bf]/.test(value) && !value.includes('\ufffd')) {
    return value;
  }
  try {
    const bytes = new Uint8Array([...value].map((c) => c.charCodeAt(0) & 0xff));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
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
