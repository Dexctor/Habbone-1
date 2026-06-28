import { NextResponse } from 'next/server';
import { listShopItems } from '@/server/pocketbase/shop';

// Force dynamic — never cache this route (items change when admin adds/edits)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Service layer handles DB column mapping + encoding fixes
    const items = await listShopItems(true);
    return NextResponse.json({ ok: true, data: items });
  } catch (e: any) {
    console.error('[Shop Items API] Error:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
