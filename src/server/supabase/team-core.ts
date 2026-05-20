import { parseTimestamp } from '@/lib/date-utils';
import type { TeamMember } from '@/server/directus/types';

const HIDDEN_ROLES = new Set(['member', 'frontend service']);

const ROLE_ORDER: Record<string, number> = {
  fondateur: 0,
  responsable: 1,
  animateurs: 2,
  journaliste: 3,
  correcteur: 4,
  'configurateur wired': 5,
  constructeur: 6,
  graphiste: 7,
};

export type TeamRow = {
  id: number;
  nick: string | null;
  role_name: string | null;
  created_at: string | Date | null;
  twitter: string | null;
};

export function buildTeamMembersByRole(rows: TeamRow[]): Record<string, TeamMember[]> {
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
