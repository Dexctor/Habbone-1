import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { directusUrl, serviceToken } from '@/server/directus/client';
import { TABLES } from '@/server/directus/tables';

/**
 * GET /api/admin/roles/counts
 * Returns a map { [roleId]: memberCount } aggregated over the whole users
 * table. Used by the Roles panel to show "N membres" per role without pulling
 * the full user list.
 */
export const dynamic = 'force-dynamic';

type Bucket = {
  directus_role_id: string | null;
  count: { id: number };
};

export const GET = withAdmin(async () => {
  const params = new URLSearchParams();
  params.set('aggregate[count]', 'id');
  params.append('groupBy[]', 'directus_role_id');
  params.set('limit', '-1');

  const res = await fetch(
    `${directusUrl}/items/${encodeURIComponent(TABLES.users)}?${params}`,
    {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'COUNTS_FETCH_FAILED' }, { status: 500 });
  }

  const json = (await res.json()) as { data?: Bucket[] };
  const buckets = json.data ?? [];

  const counts: Record<string, number> = {};
  let withoutRole = 0;

  for (const bucket of buckets) {
    const count = Number(bucket.count?.id ?? 0);
    if (bucket.directus_role_id) {
      counts[bucket.directus_role_id] = count;
    } else {
      withoutRole += count;
    }
  }

  return NextResponse.json({ ok: true, counts, withoutRole });
}, { key: 'admin:roles:counts', limit: 60, windowMs: 60_000 });
