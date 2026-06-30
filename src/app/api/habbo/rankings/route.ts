import { NextResponse } from 'next/server';
import { cached } from '@/server/redis';

export const dynamic = 'force-dynamic';

export type HabboRankings = {
  achievements: { rank: number | null; score: number } | null;
  badges: { rank: number | null; score: number } | null;
  uniqueBadges: { rank: number | null; score: number } | null;
  starGems: { rank: number | null; score: number } | null;
};

const RANKINGS_TTL = 60 * 30; // 30 minutes (HabboWidgets updates hourly)
const RANKINGS_CACHE_VERSION = 'v2';

/**
 * Parse a HabboWidgets habinfo HTML page and extract the 4 ranking values.
 * The page contains blocks like:
 *   <a href="/badges/achievements/fr">Achievements top 250</a>:
 *   <strong class="label label-success"># 14</strong>
 *   (1765)
 *
 * When the player is not ranked, the rank shows "# N/A" but the score in
 * parentheses is still the player's actual count. We must scope the regex
 * tightly so it only reads inside the column block (otherwise it bleeds into
 * other "# N" / "(NNNN)" matches further down the page — badges, ratings, etc.
 * — which is what caused the wrong values previously).
 */
function parseRankings(html: string): HabboRankings {
  const rankings: HabboRankings = {
    achievements: null,
    badges: null,
    uniqueBadges: null,
    starGems: null,
  };

  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function extract(pathSegment: string): { rank: number | null; score: number } | null {
    const linkPattern = new RegExp(`href=["']${escapeRegExp(pathSegment)}[^"']*["']`, 'i');
    const linkMatch = linkPattern.exec(html);
    if (!linkMatch) return null;

    // Read only the small widget column after the matching ranking link.
    // HabboWidgets has changed surrounding markup a few times, so avoid relying
    // on an exact Bootstrap structure while still preventing cross-block bleed.
    const block = html.slice(linkMatch.index, linkMatch.index + 700);

    // Rank: either "# 123" (ranked) or "# N/A" (not ranked).
    const rankMatch = block.match(/#\s*(\d+|N\/A)/i);
    // Score: the "(NNNN)" right after the label.
    const scoreMatch = block.match(/\(([\d\s.,]+)\)/);

    if (!scoreMatch) return null;
    const score = Number(scoreMatch[1].replace(/[^\d]/g, ''));
    if (!Number.isFinite(score)) return null;

    let rank: number | null = null;
    if (rankMatch && rankMatch[1].toUpperCase() !== 'N/A') {
      const parsed = Number(rankMatch[1]);
      if (Number.isFinite(parsed)) rank = parsed;
    }

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
