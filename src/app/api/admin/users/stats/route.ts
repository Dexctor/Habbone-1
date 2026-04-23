import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { directusUrl, serviceToken, USERS_TABLE } from '@/server/directus/client';

/**
 * GET /api/admin/users/stats
 * Returns global counts across the whole usuarios table — not the current
 * page. The admin panel stat cards would otherwise show per-page counts,
 * which is misleading ("0 bans" until you scroll to the page with the ban).
 */
export const dynamic = 'force-dynamic';

type Bucket = {
  banido: string | null;
  ativado: string | null;
  count: { id: number };
};

function normaliseYesNo(value: string | null): 'yes' | 'no' {
  const lowered = String(value ?? '').toLowerCase();
  if (['s', 'sim', 'y', 'yes', 'true', '1'].includes(lowered)) return 'yes';
  return 'no';
}

export const GET = withAdmin(async () => {
  const params = new URLSearchParams();
  params.set('aggregate[count]', 'id');
  params.append('groupBy[]', 'banido');
  params.append('groupBy[]', 'ativado');
  params.set('limit', '-1');

  const res = await fetch(
    `${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}?${params}`,
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
    const banned = normaliseYesNo(bucket.banido) === 'yes';
    const activated = normaliseYesNo(bucket.ativado) === 'yes';
    if (banned) bannis += count;
    else if (!activated) inactifs += count;
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
