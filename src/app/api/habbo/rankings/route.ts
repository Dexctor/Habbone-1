import { NextResponse } from 'next/server';
import { cached } from '@/server/redis';
import { parseHabboRankings } from '@/server/habbo-rankings-core';
import type { HabboRankings } from '@/server/habbo-rankings-core';

export const dynamic = 'force-dynamic';

const RANKINGS_TTL = 60 * 30; // 30 minutes (HabboWidgets updates hourly)
const RANKINGS_CACHE_VERSION = 'v2';

async function fetchRankings(nick: string, hotel: string): Promise<HabboRankings> {
  const url = `https://www.habbowidgets.com/habinfo/${encodeURIComponent(hotel)}/${encodeURIComponent(nick)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; HabbOne/1.0)',
      Accept: 'text/html',
    },
    // HabboWidgets is slow; give it plenty of time
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    return { achievements: null, badges: null, uniqueBadges: null, starGems: null };
  }

  const html = await res.text();
  return parseHabboRankings(html);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const nick = (searchParams.get('nick') || '').trim();
  const hotel = (searchParams.get('hotel') || 'fr').trim().toLowerCase();

  if (!nick) {
    return NextResponse.json({ error: 'nick requis' }, { status: 400 });
  }

  // Whitelist hotels to prevent SSRF
  const allowedHotels = ['fr', 'com', 'com.br', 'es', 'it', 'de', 'nl', 'fi', 'com.tr'];
  if (!allowedHotels.includes(hotel)) {
    return NextResponse.json({ error: 'hotel invalide' }, { status: 400 });
  }

  try {
    const key = `habbo:rankings:${RANKINGS_CACHE_VERSION}:${hotel}:${nick.toLowerCase()}`;
    const rankings = await cached<HabboRankings>(
      key,
      RANKINGS_TTL,
      () => fetchRankings(nick, hotel),
    );

    return NextResponse.json(
      { ok: true, rankings, hotel, nick },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
    );
  } catch (e: any) {
    console.error('[Habbo Rankings] Error:', e?.message || e);
    return NextResponse.json(
      { ok: false, rankings: { achievements: null, badges: null, uniqueBadges: null, starGems: null } },
      { status: 200 },
    );
  }
}
