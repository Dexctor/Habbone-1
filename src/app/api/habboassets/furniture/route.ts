import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FURNITURE_API = 'https://www.habboassets.com/api/v1/furniture';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = new URL(FURNITURE_API);

  for (const key of ['limit', 'hotel', 'term']) {
    const value = searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!response.ok) return NextResponse.json({ furniture: [] });

    const json = await response.json();
    return NextResponse.json(json);
  } catch (error) {
    console.error('[api/habboassets/furniture] failed', error);
    return NextResponse.json({ furniture: [] });
  }
}
