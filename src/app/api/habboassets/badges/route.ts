import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BADGE_API = 'https://www.habboassets.com/api/v1/badges';
const CHUNK_LIMIT = 500;
const MAX_LIMIT = 2000;
const REQUEST_HEADERS = {
  accept: 'application/json',
  'user-agent': 'Habbone/1.0 (+https://habbone.fr)',
};

function intParam(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

async function fetchJsonWithRetry(url: string) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: REQUEST_HEADERS,
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        lastError = new Error(`HabboAssets badges responded ${response.status}`);
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const requestedLimit = intParam(searchParams.get('limit'), 1000, MAX_LIMIT);
  const startOffset = intParam(searchParams.get('offset'), 0, Number.MAX_SAFE_INTEGER);
  const badges: unknown[] = [];

  const makeUrl = (limit: number, offset: number) => {
    const url = new URL(BADGE_API);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    for (const key of ['hotel', 'term']) {
      const value = searchParams.get(key);
      if (value) url.searchParams.set(key, value);
    }

    return url.toString();
  };

  try {
    for (let offset = startOffset; badges.length < requestedLimit; offset += CHUNK_LIMIT) {
      const limit = Math.min(CHUNK_LIMIT, requestedLimit - badges.length);
      const json = await fetchJsonWithRetry(makeUrl(limit, offset));
      const chunk = Array.isArray(json?.badges) ? json.badges : [];
      badges.push(...chunk);

      if (chunk.length < limit) break;
    }

    return NextResponse.json({
      term: searchParams.get('term') || '',
      hotel: searchParams.get('hotel') || 'all',
      limit: requestedLimit,
      offset: startOffset,
      order: 'desc',
      badges,
    });
  } catch (error) {
    console.error('[api/habboassets/badges] failed', error);
    return NextResponse.json({ badges: [], error: 'HABBOASSETS_BADGES_FETCH_FAILED' });
  }
}
