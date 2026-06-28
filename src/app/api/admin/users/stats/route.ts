import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { pbCount } from '@/server/pocketbase/helpers';
import { TABLES } from '@/server/pocketbase/tables';

/**
 * GET /api/admin/users/stats
 * Returns global counts across the whole users table — not the current page.
 * v2 schema: `banned` / `active` are booleans on the users collection.
 */
export const dynamic = 'force-dynamic';

const USERS_TABLE = TABLES.users;

export const GET = withAdmin(async () => {
  try {
    const [total, bannis, actifs] = await Promise.all([
      pbCount(USERS_TABLE),
      pbCount(USERS_TABLE, { banned: { _eq: true } }),
      pbCount(USERS_TABLE, { banned: { _eq: false }, active: { _eq: true } }),
    ]);

    // Anyone not banned and not active is "inactive".
    const inactifs = Math.max(total - bannis - actifs, 0);

    return NextResponse.json({
      ok: true,
      total,
      actifs,
      bannis,
      inactifs,
    });
  } catch {
    return NextResponse.json({ error: 'STATS_FETCH_FAILED' }, { status: 500 });
  }
}, { key: 'admin:users:stats', limit: 60, windowMs: 60_000 });
