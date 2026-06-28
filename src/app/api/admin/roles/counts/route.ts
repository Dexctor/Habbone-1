import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { pbCount } from '@/server/pocketbase/helpers';
import { listRoles } from '@/server/pocketbase/roles';
import { TABLES } from '@/server/pocketbase/tables';

/**
 * GET /api/admin/roles/counts
 * Returns a map { [roleId]: memberCount } aggregated over the whole users
 * table. Used by the Roles panel to show "N membres" per role without pulling
 * the full user list.
 *
 * v2 schema: the role is a relation column (`role`) on the users collection.
 */
export const dynamic = 'force-dynamic';

const USERS_TABLE = TABLES.users;

export const GET = withAdmin(async () => {
  try {
    const roles = await listRoles();

    const [perRole, withoutRole] = await Promise.all([
      Promise.all(
        roles.map(async (role) => [String(role.id), await pbCount(USERS_TABLE, { role: { _eq: role.id } })] as const),
      ),
      pbCount(USERS_TABLE, { role: { _empty: true } }),
    ]);

    const counts: Record<string, number> = {};
    for (const [roleId, count] of perRole) {
      if (count > 0) counts[roleId] = count;
    }

    return NextResponse.json({ ok: true, counts, withoutRole });
  } catch {
    return NextResponse.json({ error: 'COUNTS_FETCH_FAILED' }, { status: 500 });
  }
}, { key: 'admin:roles:counts', limit: 60, windowMs: 60_000 });
