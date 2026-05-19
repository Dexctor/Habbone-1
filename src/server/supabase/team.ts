import 'server-only';

import { parseTimestamp } from '@/lib/date-utils';
import type { TeamMember } from '@/server/directus/types';
import { tableName } from './config';
import { queryRows } from './db';

const HIDDEN_ROLES = new Set(['member', 'frontend service']);

const ROLE_ORDER: Record<string, number> = {
  'fondateur': 0,
  'responsable': 1,
  'animateurs': 2,
  'journaliste': 3,
  'correcteur': 4,
  'configurateur wired': 5,
  'constructeur': 6,
  'graphiste': 7,
};

type TeamRow = {
  id: number;
  nick: string | null;
  role_name: string | null;
  created_at: string | Date | null;
  twitter: string | null;
};

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

  const result: Record<string, TeamMember[]> = {};
  for (const row of rows) {
    const roleName = String(row.role_name || '').trim();
    const nick = String(row.nick || '').trim();
    if (!roleName || !nick || HIDDEN_ROLES.has(roleName.toLowerCase())) continue;
    result[roleName] ??= [];
    result[roleName].push({
      id: Number(row.id) || 0,
      nick,
      role: roleName,
      joinedAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      twitter: typeof row.twitter === 'string' ? row.twitter.trim() || null : null,
    });
  }

  const sortedEntries = Object.entries(result)
    .map(([roleName, members]) => ({
      roleName,
      members: members.sort((a, b) => {
        const dateA = a.joinedAt ? parseTimestamp(a.joinedAt, { numeric: 'ms', numericString: 'parse' }) : 0;
        const dateB = b.joinedAt ? parseTimestamp(b.joinedAt, { numeric: 'ms', numericString: 'parse' }) : 0;
        if (dateA && dateB) return dateA - dateB;
        return a.nick.localeCompare(b.nick, 'fr', { sensitivity: 'base' });
      }),
    }))
    .sort((a, b) => {
      const orderA = ROLE_ORDER[a.roleName.toLowerCase()] ?? 99;
      const orderB = ROLE_ORDER[b.roleName.toLowerCase()] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.roleName.localeCompare(b.roleName, 'fr', { sensitivity: 'base' });
    });

  return Object.fromEntries(sortedEntries.map(({ roleName, members }) => [roleName, members]));
}
