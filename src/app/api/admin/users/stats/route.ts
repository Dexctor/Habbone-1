import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { getAdminUserStatusStats } from '@/server/directus/users';

/**
 * GET /api/admin/users/stats
 * Returns global counts across the whole users table — not the current page.
 * Handles both legacy (banido='s'/'n') and v2 (banned: boolean) schemas.
 */
export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => {
  try {
    const stats = await getAdminUserStatusStats();
    return NextResponse.json({ ok: true, ...stats });
  } catch {
    return NextResponse.json({ error: 'STATS_FETCH_FAILED' }, { status: 500 });
  }
}, { key: 'admin:users:stats', limit: 60, windowMs: 60_000 });
