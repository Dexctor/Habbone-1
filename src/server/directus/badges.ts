import 'server-only';

import { USERS_TABLE } from './client';
import { directusFetch } from './fetch';

// Mapping: role name (lowercase) -> badge emblema ID
const ROLE_BADGE_MAP: Record<string, number> = {
  'fondateur': 5,
  'responsable': 6,
  'animateurs': 7,
  'journaliste': 8,
  'correcteur': 9,
  'configurateur wired': 10,
  'constructeur': 11,
  'graphiste': 12,
  'member': 13,
};

async function userHasBadge(userId: number, badgeId: number): Promise<boolean> {
  try {
    const json = await directusFetch<{ data: { id: number }[] }>('/items/emblemas_usuario', {
      params: {
        'filter[id_usuario][_eq]': String(userId),
        'filter[id_emblema][_eq]': String(badgeId),
        limit: '1',
        fields: 'id',
      },
    });
    return Array.isArray(json?.data) && json.data.length > 0;
  } catch {
    return false;
  }
}

async function grantBadge(userId: number, badgeId: number): Promise<void> {
  await directusFetch('/items/emblemas_usuario', {
    method: 'POST',
    body: {
      id_emblema: badgeId,
      id_usuario: userId,
      autor_tipo: 'ganhado',
      autor: 'system',
      data: Math.floor(Date.now() / 1000),
      status: 'ativo',
    },
  });
}

// Mapping: role name (lowercase) -> badge image path
export const ROLE_BADGE_IMAGE: Record<string, string> = {
  'fondateur': '/badges-roles/HOFONDA.gif',
  'responsable': '/badges-roles/HORESP.gif',
  'animateurs': '/badges-roles/HOANIM.gif',
  'journaliste': '/badges-roles/HOJOURNA.gif',
  'correcteur': '/badges-roles/HOCORRE.gif',
  'configurateur wired': '/badges-roles/HOWIRED.gif',
  'constructeur': '/badges-roles/HOCONST.gif',
  'graphiste': '/badges-roles/HOGRAPH.gif',
  'member': '/badges-roles/HOUSER.gif',
};

export type UserBadge = {
  id: number;
  nome: string;
  imagem: string;
};

/** Get all badges owned by a user */
export async function getUserBadges(userId: number): Promise<UserBadge[]> {
  try {
    // Get user's badge IDs
    const json = await directusFetch<{ data: { id_emblema: number }[] }>('/items/emblemas_usuario', {
      params: {
        'filter[id_usuario][_eq]': String(userId),
        'filter[status][_eq]': 'ativo',
        fields: 'id_emblema',
        limit: '50',
      },
    });
    const rows = json?.data ?? [];
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const badgeIds = rows.map((r) => Number(r.id_emblema)).filter((id) => id > 0);
    if (badgeIds.length === 0) return [];

    // Get badge details
    const bJson = await directusFetch<{ data: { id: number; nome: string; imagem: string }[] }>('/items/emblemas', {
      params: {
        'filter[id][_in]': badgeIds.join(','),
        'filter[status][_eq]': 'ativo',
        fields: 'id,nome,imagem',
        limit: '50',
      },
    });
    return (bJson?.data ?? []).map((b) => ({
      id: Number(b.id),
      nome: String(b.nome || ''),
      imagem: String(b.imagem || ''),
    }));
  } catch {
    return [];
  }
}

/** Get badge image for a role name */
export function getRoleBadgeImage(roleName: string): string | null {
  return ROLE_BADGE_IMAGE[roleName.toLowerCase().trim()] ?? null;
}

/** Get role badge images for a list of nicks (batch) */
export async function getRoleBadgesForNicks(nicks: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  if (!nicks.length) return result;

  try {
    const json = await directusFetch<{ data: { nick: string; role: string }[] }>(`/items/${USERS_TABLE}`, {
      params: {
        'filter[nick][_in]': nicks.join(','),
        fields: 'nick,role',
        limit: String(nicks.length),
      },
    });
    for (const u of json?.data ?? []) {
      const nick = String(u?.nick || '');
      const role = String(u?.role || '');
      if (nick) result[nick] = getRoleBadgeImage(role);
    }
  } catch {}

  return result;
}

/**
 * Ensure a user has the badge corresponding to their role.
 * Also ensures they have the "member" badge.
 * Call this on login or role change.
 */
export async function ensureRoleBadge(userId: number, roleName: string): Promise<void> {
  try {
    const key = roleName.toLowerCase().trim();

    // Always grant member badge
    const memberBadgeId = ROLE_BADGE_MAP['member'];
    if (memberBadgeId && !(await userHasBadge(userId, memberBadgeId))) {
      await grantBadge(userId, memberBadgeId);
    }

    // Grant role-specific badge
    const roleBadgeId = ROLE_BADGE_MAP[key];
    if (roleBadgeId && roleBadgeId !== memberBadgeId && !(await userHasBadge(userId, roleBadgeId))) {
      await grantBadge(userId, roleBadgeId);
    }
  } catch {
    // Non-blocking: badge assignment failure should not break login/role change
  }
}
