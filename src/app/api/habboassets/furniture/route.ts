import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FURNITURE_API = 'https://www.habboassets.com/api/v1/furniture';
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
        lastError = new Error(`HabboAssets furniture responded ${response.status}`);
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
  const furniture: unknown[] = [];

  const makeUrl = (limit: number, offset: number) => {
    const url = new URL(FURNITURE_API);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    for (const key of ['hotel', 'term']) {
      const value = searchParams.get(key);
      if (value) url.searchParams.set(key, value);
    }

    return url.toString();
  };

  try {
    for (let offset = startOffset; furniture.length < requestedLimit; offset += CHUNK_LIMIT) {
      const limit = Math.min(CHUNK_LIMIT, requestedLimit - furniture.length);
      const json = await fetchJsonWithRetry(makeUrl(limit, offset));
      const chunk = Array.isArray(json?.furniture) ? json.furniture : [];
      furniture.push(...chunk);

      if (chunk.length < limit) break;
    }

    return NextResponse.json({
      term: searchParams.get('term') || '',
      hotel: searchParams.get('hotel') || 'com',
      limit: requestedLimit,
      offset: startOffset,
      order: 'desc',
      furniture,
    });
  } catch (error) {
    console.error('[api/habboassets/furniture] failed', error);
    return NextResponse.json({ furniture: [], error: 'HABBOASSETS_FURNITURE_FETCH_FAILED' });
  }
}
