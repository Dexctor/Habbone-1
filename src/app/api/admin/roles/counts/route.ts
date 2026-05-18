import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { getRoleMemberCounts } from '@/server/directus/roles';

/**
 * GET /api/admin/roles/counts
 * Returns a map { [roleId]: memberCount } aggregated over the whole users
 * table. Used by the Roles panel to show "N membres" per role without pulling
 * the full user list.
 */
export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => {
  try {
    const { counts, withoutRole } = await getRoleMemberCounts();
    return NextResponse.json({ ok: true, counts, withoutRole });
  } catch {
    return NextResponse.json({ error: 'COUNTS_FETCH_FAILED' }, { status: 500 });
  }
}, { key: 'admin:roles:counts', limit: 60, windowMs: 60_000 });
