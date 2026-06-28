import 'server-only';

import { pbList, pbFirst, pbCreate } from './helpers';
import { TABLES } from './tables';

const BADGES_TABLE = TABLES.badges;
const USER_BADGES_TABLE = TABLES.userBadges;
const USERS_TABLE = TABLES.users;

/**
 * Badges service (PocketBase).
 *
 * v2 model: user_badges has relations `badge` -> badges and `user` -> users,
 * plus `source` enum and `active` bool. A user's role is users.role -> roles.name.
 *
 * NOTE: ROLE_BADGE_MAP below maps a role name to a *badge id*. With the v2
 * re-sequenced schema, badge ids are PocketBase strings, not the old integers.
 * This map must be revisited after the data migration (Lot 6) to point at the
 * real migrated badge ids (or, better, resolve the badge by name). Kept here so
 * the role-badge auto-grant flow compiles and is easy to fix in one place.
 */
const ROLE_BADGE_MAP: Record<string, string> = {
  // roleName(lowercase) -> badge id (PLACEHOLDER ids, fix after Lot 6)
};

export const ROLE_BADGE_IMAGE: Record<string, string> = {
  fondateur: '/badges-roles/HOFONDA.gif',
  responsable: '/badges-roles/HORESP.gif',
  animateurs: '/badges-roles/HOANIM.gif',
  journaliste: '/badges-roles/HOJOURNA.gif',
  correcteur: '/badges-roles/HOCORRE.gif',
  'configurateur wired': '/badges-roles/HOWIRED.gif',
  constructeur: '/badges-roles/HOCONST.gif',
  graphiste: '/badges-roles/HOGRAPH.gif',
  member: '/badges-roles/HOUSER.gif',
};

export type UserBadge = {
  id: string;
  nome: string;
  imagem: string;
};

async function userHasBadge(userId: string, badgeId: string): Promise<boolean> {
  const row = await pbFirst<{ id: string }>(USER_BADGES_TABLE, {
    user: { _eq: userId },
    badge: { _eq: badgeId },
  }).catch(() => null);
  return !!row;
}

async function grantBadge(userId: string, badgeId: string): Promise<void> {
  await pbCreate(USER_BADGES_TABLE, {
    badge: badgeId,
    user: userId,
    source: 'earned',
    active: true,
  });
}

/** Get all badges owned by a user. */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    const links = await pbList<{ badge: string }>(USER_BADGES_TABLE, {
      filter: { user: { _eq: userId }, active: { _eq: true } },
      fields: 'badge',
      perPage: 50,
    });
    const badgeIds = links.map((r) => String(r.badge)).filter(Boolean);
    if (badgeIds.length === 0) return [];

    const badges = await pbList<{ id: string; name: string; image: string }>(BADGES_TABLE, {
      filter: { id: { _in: badgeIds }, active: { _eq: true } },
      fields: 'id,name,image',
      perPage: 50,
    });
    return badges.map((b) => ({
      id: String(b.id),
      nome: String(b.name || ''),
      imagem: String(b.image || ''),
    }));
  } catch {
    return [];
  }
}

/** Get badge image for a role name. */
export function getRoleBadgeImage(roleName: string): string | null {
  return ROLE_BADGE_IMAGE[roleName.toLowerCase().trim()] ?? null;
}

/**
 * Get role badge images for a list of nicks (batch).
 * v2: read each user's role relation, expand to the role name, map to image.
 */
export async function getRoleBadgesForNicks(nicks: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  if (!nicks.length) return result;

  try {
    const users = await pbList<{ nick: string; expand?: { role?: { name?: string } } }>(USERS_TABLE, {
      filter: { nick: { _in: nicks } },
      fields: 'nick,expand.role.name',
      expand: 'role',
      perPage: nicks.length,
    });
    for (const u of users) {
      const nick = String(u?.nick || '');
      const roleName = u.expand?.role?.name ?? '';
      if (nick) result[nick] = getRoleBadgeImage(roleName);
    }
  } catch {}

  return result;
}

/**
 * Ensure a user has the badge for their role, plus the "member" badge.
 * No-op until ROLE_BADGE_MAP is repopulated with real badge ids (post Lot 6).
 */
export async function ensureRoleBadge(userId: string, roleName: string): Promise<void> {
  try {
    const key = roleName.toLowerCase().trim();

    const memberBadgeId = ROLE_BADGE_MAP['member'];
    if (memberBadgeId && !(await userHasBadge(userId, memberBadgeId))) {
      await grantBadge(userId, memberBadgeId);
    }

    const roleBadgeId = ROLE_BADGE_MAP[key];
    if (roleBadgeId && roleBadgeId !== memberBadgeId && !(await userHasBadge(userId, roleBadgeId))) {
      await grantBadge(userId, roleBadgeId);
    }
  } catch {
    // Non-blocking
  }
}
