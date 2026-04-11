import 'server-only';

import { USERS_TABLE } from './client';
import { directusFetch } from './fetch';
import { parseTimestamp } from '@/lib/date-utils';
import type { TeamMember } from './types';

type LegacyTeamRow = {
  id?: number | string | null;
  nick?: string | null;
  role?: string | null;
  directus_role_id?: string | null;
  data_criacao?: string | null;
  twitter?: string | null;
  banido?: string | null;
  ativado?: string | null;
};

type DirectusRole = {
  id: string;
  name: string;
};

async function fetchRoles(): Promise<DirectusRole[]> {
  try {
    const json = await directusFetch<{ data: DirectusRole[] }>('/roles', {
      params: { fields: 'id,name', sort: 'name' },
    });
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

async function fetchUsersByRoleId(roleId: string): Promise<LegacyTeamRow[]> {
  try {
    const json = await directusFetch<{ data: LegacyTeamRow[] }>(`/items/${encodeURIComponent(USERS_TABLE)}`, {
      params: {
        fields: 'id,nick,role,directus_role_id,data_criacao,twitter,banido,ativado',
        'filter[directus_role_id][_eq]': roleId,
        'filter[banido][_neq]': 's',
        'filter[ativado][_neq]': 'n',
        limit: '200',
        sort: 'nick',
      },
    });
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
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
  // Fetch all Directus roles dynamically
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
          joinedAt: typeof u.data_criacao === 'string' ? u.data_criacao : String(u.data_criacao ?? ''),
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
