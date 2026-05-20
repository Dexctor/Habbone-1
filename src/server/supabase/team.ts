import 'server-only';

import type { TeamMember } from '@/server/directus/types';
import { tableName } from './config';
import { queryRows } from './db';
import { buildTeamMembersByRole, type TeamRow } from './team-core';

export async function listTeamMembersByRoles(roleNames?: string[]): Promise<Record<string, TeamMember[]>> {
  const filters: unknown[] = [];
  const roleFilter = roleNames?.length
    ? `and lower(r.name) = any($1::text[])`
    : '';
  if (roleNames?.length) filters.push(roleNames.map((role) => role.toLowerCase()));

  const rows = await queryRows<TeamRow>(
    `select
       u.id,
       u.nick,
       r.name as role_name,
       u.created_at,
       u.twitter
     from ${tableName('users')} u
     join ${tableName('app_roles')} r on r.id::text = u.directus_role_id
     where coalesce(u.banned, false) = false
       and coalesce(u.active, true) = true
       ${roleFilter}
     order by r.sort asc nulls last, r.name asc, u.nick asc`,
    filters,
  );

  return buildTeamMembersByRole(rows);
}
