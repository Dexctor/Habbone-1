import 'server-only';

import { directusUrl, serviceToken, USERS_TABLE } from './client';
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
  const url = new URL(`${directusUrl}/roles`);
  url.searchParams.set('fields', 'id,name');
  url.searchParams.set('sort', 'name');
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

async function fetchUsersByRoleId(roleId: string): Promise<LegacyTeamRow[]> {
  const url = new URL(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}`);
  url.searchParams.set('fields', 'id,nick,role,directus_role_id,data_criacao,twitter,banido,ativado');
  url.searchParams.set('filter[directus_role_id][_eq]', roleId);
  url.searchParams.set('filter[banido][_neq]', 's');
  url.searchParams.set('filter[ativado][_neq]', 'n');
  url.searchParams.set('limit', '200');
  url.searchParams.set('sort', 'nick');
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json?.data) ? json.data : [];
}

// Hidden roles that shouldn't appear on the team page
const HIDDEN_ROLES = new Set(['member', 'frontend service']);

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

  for (const { roleName, members } of entries) {
    if (members.length > 0) {
      result[roleName] = members;
    }
  }

  return result;
}

export type { TeamMember };
