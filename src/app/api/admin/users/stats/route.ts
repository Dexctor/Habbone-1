import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { directusUrl, serviceToken } from '@/server/directus/client';
import { TABLES, USE_V2 } from '@/server/directus/tables';

/**
 * GET /api/admin/users/stats
 * Returns global counts across the whole users table — not the current page.
 * Handles both legacy (banido='s'/'n') and v2 (banned: boolean) schemas.
 */
export const dynamic = 'force-dynamic';

type Bucket = Record<string, unknown> & { count: { id: number } };

function isTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    return ['s', 'sim', 'y', 'yes', 'true', '1'].includes(lowered);
  }
  return false;
}

export const GET = withAdmin(async () => {
  const bannedCol = USE_V2 ? 'banned' : 'banido';
  const activeCol = USE_V2 ? 'active' : 'ativado';

  const params = new URLSearchParams();
  params.set('aggregate[count]', 'id');
  params.append('groupBy[]', bannedCol);
  params.append('groupBy[]', activeCol);
  params.set('limit', '-1');

  const res = await fetch(
    `${directusUrl}/items/${encodeURIComponent(TABLES.users)}?${params}`,
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'STATS_FETCH_FAILED' }, { status: 500 });
  }

  const json = (await res.json()) as { data?: Bucket[] };
  const buckets = json.data ?? [];

  let actifs = 0;
  let bannis = 0;
  let inactifs = 0;
  let total = 0;

  for (const bucket of buckets) {
    const count = Number(bucket.count?.id ?? 0);
    total += count;
    const banned = isTruthyFlag(bucket[bannedCol]);
    const active = isTruthyFlag(bucket[activeCol]);
    if (banned) bannis += count;
    else if (!active) inactifs += count;
    else actifs += count;
  }

  return NextResponse.json({
    ok: true,
    total,
    actifs,
    bannis,
    inactifs,
  });
}, { key: 'admin:users:stats', limit: 60, windowMs: 60_000 });
