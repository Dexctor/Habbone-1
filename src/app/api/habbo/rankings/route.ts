import { NextResponse } from 'next/server';
import { cached } from '@/server/redis';

export const dynamic = 'force-dynamic';

export type HabboRankings = {
  achievements: { rank: number; score: number } | null;
  badges: { rank: number; score: number } | null;
  uniqueBadges: { rank: number; score: number } | null;
  starGems: { rank: number; score: number } | null;
};

const RANKINGS_TTL = 60 * 30; // 30 minutes (HabboWidgets updates hourly)

/**
 * Parse a HabboWidgets habinfo HTML page and extract the 4 ranking values.
 * The page contains blocks like:
 *   <a href="/badges/achievements/fr">Achievements top 250</a>:
 *   <strong class="label label-success"># 14</strong>
 *   (1765)
 */
function parseRankings(html: string): HabboRankings {
  const rankings: HabboRankings = {
    achievements: null,
    badges: null,
    uniqueBadges: null,
    starGems: null,
  };

  // Generic extractor: find a link href matching path, then the next "# N" label and "(NNNN)" count
  function extract(pathSegment: string): { rank: number; score: number } | null {
    // Look for the block starting with the path, then capture # N and (score)
    const pattern = new RegExp(
      `${pathSegment}[^]*?#\\s*(\\d+)[^]*?\\((\\d+)\\)`,
      'i',
    );
    const match = html.match(pattern);
    if (!match) return null;
    const rank = Number(match[1]);
    const score = Number(match[2]);
    if (!Number.isFinite(rank) || !Number.isFinite(score)) return null;
    return { rank, score };
  }

  rankings.achievements = extract('/badges/achievements/');
  rankings.badges = extract('/badges/top/');
  rankings.uniqueBadges = extract('/badges/unique/');
  rankings.starGems = extract('/habbo/stargems/');

  return rankings;
}

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
  return parseRankings(html);
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
    const key = `habbo:rankings:${hotel}:${nick.toLowerCase()}`;
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
