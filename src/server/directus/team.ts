import 'server-only';

import { directusService, USERS_TABLE, rItems } from './client';
import { parseTimestamp } from '@/lib/date-utils';
import type { TeamMember } from './types';

type LegacyTeamRow = {
  id?: number | string | null;
  nick?: string | null;
  role?: string | null;
  data_criacao?: string | null;
  created_at?: string | null;
  joined_at?: string | null;
  banido?: string | null;
  ativado?: string | null;
  status?: string | null;
  twitter?: string | null;
  social_twitter?: string | null;
  socials?: { twitter?: string | null } | null;
};

export async function listTeamMembersByRoles(roleNames: string[]): Promise<Record<string, TeamMember[]>> {
  if (!Array.isArray(roleNames) || roleNames.length === 0) return {};

  const normalized = new Map<string, string>();
  const registerKey = (key: string, canonical: string) => {
    const clean = key.trim().toLowerCase();
    if (!clean || normalized.has(clean)) return;
    normalized.set(clean, canonical);
  };
  const stripDiacritics = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const result: Record<string, TeamMember[]> = {};
  for (const name of roleNames) {
    const trimmed = (name ?? '').toString().trim();
    if (!trimmed) continue;
    registerKey(trimmed, trimmed);
    registerKey(stripDiacritics(trimmed), trimmed);
    registerKey(trimmed.replace(/\s+/g, ''), trimmed);
    registerKey(stripDiacritics(trimmed.replace(/\s+/g, '')), trimmed);
    if (!/\badmin\b/i.test(trimmed) && !trimmed.toLowerCase().endsWith('s')) {
      registerKey(`${trimmed}s`, trimmed);
      registerKey(stripDiacritics(`${trimmed}s`), trimmed);
    }
    result[trimmed] = [];
  }
  if (normalized.size === 0) return result;

  const rows = (await directusService
    .request(
      rItems(USERS_TABLE as any, {
        filter: {
          role: { _in: Array.from(normalized.values()) } as any,
          banido: { _neq: 's' } as any,
          ativado: { _neq: 'n' } as any,
        } as any,
        limit: 200 as any,
        sort: ['role', 'nick'] as any,
      } as any),
    )
    .catch(() => [])) as LegacyTeamRow[];

  const ensureString = (value: unknown): string =>
    typeof value === 'string' ? value : value == null ? '' : String(value);

  for (const raw of rows) {
    const roleValueRaw = ensureString(raw?.role).trim();
    const canonicalRole =
      normalized.get(roleValueRaw.toLowerCase()) ||
      normalized.get(stripDiacritics(roleValueRaw).toLowerCase()) ||
      normalized.get(roleValueRaw.replace(/\s+/g, '').toLowerCase()) ||
      normalized.get(stripDiacritics(roleValueRaw.replace(/\s+/g, '')).toLowerCase());
    if (!canonicalRole) continue;

    const nick = ensureString(raw?.nick).trim();
    if (!nick) continue;

    let joined: string | null = null;
    if (typeof raw?.data_criacao === 'string') joined = raw.data_criacao;
    else if (typeof raw?.created_at === 'string') joined = raw.created_at;
    else if (typeof raw?.joined_at === 'string') joined = raw.joined_at;

    // TODO: Store joined_at dates in the database instead of hardcoding

    const twitterRaw =
      typeof raw?.twitter === 'string'
        ? raw.twitter
        : typeof raw?.social_twitter === 'string'
          ? raw.social_twitter
          : typeof raw?.socials === 'object' && raw?.socials && typeof raw.socials.twitter === 'string'
            ? raw.socials.twitter
            : null;

    const computedId =
      raw?.id != null && !Number.isNaN(Number(raw.id))
        ? Number(raw.id)
        : Math.abs(
          nick
            .toLowerCase()
            .split('')
            .reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0),
        );

    result[canonicalRole].push({
      id: computedId,
      nick,
      role: canonicalRole,
      joinedAt: joined,
      twitter: twitterRaw ? twitterRaw.trim() : null,
    });
  }

  for (const role of Object.keys(result)) {
    result[role] = result[role].sort((a, b) => {
      const dateA = a.joinedAt ? parseTimestamp(a.joinedAt, { numeric: 'ms', numericString: 'parse' }) : 0;
      const dateB = b.joinedAt ? parseTimestamp(b.joinedAt, { numeric: 'ms', numericString: 'parse' }) : 0;
      if (dateA && dateB) return dateA - dateB;
      if (dateA) return -1;
      if (dateB) return 1;
      return a.nick.localeCompare(b.nick, 'fr', { sensitivity: 'base' });
    });
  }

  return result;
}

export type { TeamMember };
