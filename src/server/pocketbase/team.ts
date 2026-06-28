import 'server-only';

import { pbList } from './helpers';
import { TABLES } from './tables';
import { parseTimestamp } from '@/lib/date-utils';
import type { TeamMember } from './types';

type TeamUserRow = {
  id?: string | null;
  nick?: string | null;
  created?: string | null;
  twitter?: string | null;
  active?: boolean | null;
  banned?: boolean | null;
  role?: string | null;
};

type RoleRow = {
  id: string;
  name: string;
};

async function fetchRoles(): Promise<RoleRow[]> {
  return pbList<RoleRow>(TABLES.roles, {
    fields: 'id,name',
    sort: 'name',
    perPage: 200,
  }).catch(() => []);
}

async function fetchUsersByRoleId(roleId: string): Promise<TeamUserRow[]> {
  return pbList<TeamUserRow>(TABLES.users, {
    filter: {
      role: { _eq: roleId },
      active: { _eq: true },
      banned: { _eq: false },
    },
    fields: 'id,nick,created,twitter,active,banned,role',
    perPage: 200,
    sort: 'nick',
  }).catch(() => []);
}

// Hidden roles that shouldn't appear on the team page
const HIDDEN_ROLES = new Set(['member', 'frontend service']);

// Display order: lower number = higher on the page. Unlisted roles go last.
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

export async function listTeamMembersByRoles(_roleNames?: string[]): Promise<Record<string, TeamMember[]>> {
  const roles = await fetchRoles();
  const visibleRoles = roles.filter(r => !HIDDEN_ROLES.has(r.name.toLowerCase()));

  const result: Record<string, TeamMember[]> = {};

  // Fetch users for each role in parallel
  const entries = await Promise.all(
    visibleRoles.map(async (role) => {
      const users = await fetchUsersByRoleId(role.id);
      const members: TeamMember[] = users
        .filter(u => u.nick && String(u.nick).trim())
        .map(u => ({
          id: Number(u.id) || 0,
          nick: String(u.nick).trim(),
          role: role.name,
          joinedAt: typeof u.created === 'string' ? u.created : String(u.created ?? ''),
          twitter: typeof u.twitter === 'string' ? u.twitter.trim() || null : null,
        }))
        .sort((a, b) => {
          const dateA = a.joinedAt ? parseTimestamp(a.joinedAt, { numeric: 'ms', numericString: 'parse' }) : 0;
          const dateB = b.joinedAt ? parseTimestamp(b.joinedAt, { numeric: 'ms', numericString: 'parse' }) : 0;
          if (dateA && dateB) return dateA - dateB;
          return a.nick.localeCompare(b.nick, 'fr', { sensitivity: 'base' });
        });
      return { roleName: role.name, members };
    })
  );

  // Sort by ROLE_ORDER priority, then alphabetically
  const sorted = entries
    .filter(e => e.members.length > 0)
    .sort((a, b) => {
      const orderA = ROLE_ORDER[a.roleName.toLowerCase()] ?? 99;
      const orderB = ROLE_ORDER[b.roleName.toLowerCase()] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.roleName.localeCompare(b.roleName, 'fr', { sensitivity: 'base' });
    });

  for (const { roleName, members } of sorted) {
    result[roleName] = members;
  }

  return result;
}

export type { TeamMember };
