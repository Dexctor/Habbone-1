import 'server-only';

import { directusUrl, serviceToken, USERS_TABLE } from './client';

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
  const url = new URL(`${directusUrl}/items/emblemas_usuario`);
  url.searchParams.set('filter[id_usuario][_eq]', String(userId));
  url.searchParams.set('filter[id_emblema][_eq]', String(badgeId));
  url.searchParams.set('limit', '1');
  url.searchParams.set('fields', 'id');
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return false;
  const json = await res.json();
  return Array.isArray(json?.data) && json.data.length > 0;
}

async function grantBadge(userId: number, badgeId: number): Promise<void> {
  await fetch(`${directusUrl}/items/emblemas_usuario`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_emblema: badgeId,
      id_usuario: userId,
      autor_tipo: 'ganhado',
      autor: 'system',
      data: Math.floor(Date.now() / 1000),
      status: 'ativo',
    }),
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
    const url = new URL(`${directusUrl}/items/emblemas_usuario`);
    url.searchParams.set('filter[id_usuario][_eq]', String(userId));
    url.searchParams.set('filter[status][_eq]', 'ativo');
    url.searchParams.set('fields', 'id_emblema');
    url.searchParams.set('limit', '50');
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = json?.data ?? [];
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const badgeIds = rows.map((r: any) => Number(r.id_emblema)).filter((id: number) => id > 0);
    if (badgeIds.length === 0) return [];

    // Get badge details
    const bUrl = new URL(`${directusUrl}/items/emblemas`);
    bUrl.searchParams.set('filter[id][_in]', badgeIds.join(','));
    bUrl.searchParams.set('filter[status][_eq]', 'ativo');
    bUrl.searchParams.set('fields', 'id,nome,imagem');
    bUrl.searchParams.set('limit', '50');
    const bRes = await fetch(bUrl.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    });
    if (!bRes.ok) return [];
    const bJson = await bRes.json();
    return (bJson?.data ?? []).map((b: any) => ({
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
    const url = new URL(`${directusUrl}/items/${USERS_TABLE}`);
    url.searchParams.set('filter[nick][_in]', nicks.join(','));
    url.searchParams.set('fields', 'nick,role');
    url.searchParams.set('limit', String(nicks.length));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return result;
    const json = await res.json();
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
