import 'server-only';

import { directusFetch } from './fetch';
import { TABLES, USE_V2 } from './tables';

const BADGES_TABLE = TABLES.badges;
const USER_BADGES_TABLE = TABLES.userBadges;
const USERS_TABLE = TABLES.users;

// Mapping: role name (lowercase) -> badge id
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

const UB_FIELDS = USE_V2
  ? { badge: 'badge', user: 'user', source: 'source', active: 'active' }
  : { badge: 'id_emblema', user: 'id_usuario', source: 'autor_tipo', active: 'status' };

const BADGE_FIELDS = USE_V2
  ? { id: 'id', name: 'name', image: 'image', active: 'active' }
  : { id: 'id', name: 'nome', image: 'imagem', active: 'status' };

async function userHasBadge(userId: number, badgeId: number): Promise<boolean> {
  try {
    const json = await directusFetch<{ data: { id: number }[] }>(`/items/${USER_BADGES_TABLE}`, {
      params: {
        [`filter[${UB_FIELDS.user}][_eq]`]: String(userId),
        [`filter[${UB_FIELDS.badge}][_eq]`]: String(badgeId),
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
  const body: Record<string, unknown> = USE_V2
    ? {
        [UB_FIELDS.badge]: badgeId,
        [UB_FIELDS.user]: userId,
        [UB_FIELDS.source]: 'earned',
        active: true,
      }
    : {
        [UB_FIELDS.badge]: badgeId,
        [UB_FIELDS.user]: userId,
        [UB_FIELDS.source]: 'ganhado',
        autor: 'system',
        data: Math.floor(Date.now() / 1000),
        status: 'ativo',
      };
  await directusFetch(`/items/${USER_BADGES_TABLE}`, {
    method: 'POST',
    body,
  });
}

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
    const userBadgeFilter: Record<string, string> = {
      [`filter[${UB_FIELDS.user}][_eq]`]: String(userId),
      fields: UB_FIELDS.badge,
      limit: '50',
    };
    if (USE_V2) {
      userBadgeFilter[`filter[${UB_FIELDS.active}][_eq]`] = 'true';
    } else {
      userBadgeFilter[`filter[${UB_FIELDS.active}][_eq]`] = 'ativo';
    }

    const json = await directusFetch<{ data: Record<string, unknown>[] }>(`/items/${USER_BADGES_TABLE}`, {
      params: userBadgeFilter,
    });
    const rows = json?.data ?? [];
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const badgeIds = rows.map((r) => Number(r[UB_FIELDS.badge])).filter((id) => id > 0);
    if (badgeIds.length === 0) return [];

    const badgeFilter: Record<string, string> = {
      [`filter[${BADGE_FIELDS.id}][_in]`]: badgeIds.join(','),
      fields: `${BADGE_FIELDS.id},${BADGE_FIELDS.name},${BADGE_FIELDS.image}`,
      limit: '50',
    };
    if (USE_V2) {
      badgeFilter[`filter[${BADGE_FIELDS.active}][_eq]`] = 'true';
    } else {
      badgeFilter[`filter[${BADGE_FIELDS.active}][_eq]`] = 'ativo';
    }

    const bJson = await directusFetch<{ data: Record<string, unknown>[] }>(`/items/${BADGES_TABLE}`, {
      params: badgeFilter,
    });
    return (bJson?.data ?? []).map((b) => ({
      id: Number(b[BADGE_FIELDS.id]),
      nome: String(b[BADGE_FIELDS.name] || ''),
      imagem: String(b[BADGE_FIELDS.image] || ''),
    }));
  } catch {
    return [];
  }
}

/** Get badge image for a role name */
export function getRoleBadgeImage(roleName: string): string | null {
  return ROLE_BADGE_IMAGE[roleName.toLowerCase().trim()] ?? null;
}

/**
 * Get role badge images for a list of nicks (batch).
 *
 * Legacy: reads the `role` string column directly on usuarios.
 * v2: reads directus_role_id (UUID) then resolves through directus_roles.name.
 */
export async function getRoleBadgesForNicks(nicks: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  if (!nicks.length) return result;

  try {
    if (USE_V2) {
      // v2: fetch users with directus_role_id, then one batch lookup on directus_roles
      const usersJson = await directusFetch<{
        data: { nick: string; directus_role_id: string | null }[];
      }>(`/items/${USERS_TABLE}`, {
        params: {
          'filter[nick][_in]': nicks.join(','),
          fields: 'nick,directus_role_id',
          limit: String(nicks.length),
        },
      });
      const users = usersJson?.data ?? [];
      const roleIds = Array.from(
        new Set(users.map((u) => u.directus_role_id).filter((id): id is string => !!id)),
      );

      let roleNameById = new Map<string, string>();
      if (roleIds.length > 0) {
        const rolesJson = await directusFetch<{ data: { id: string; name: string }[] }>(
          `/roles`,
          {
            params: {
              'filter[id][_in]': roleIds.join(','),
              fields: 'id,name',
              limit: String(roleIds.length),
            },
          },
        );
        for (const r of rolesJson?.data ?? []) {
          roleNameById.set(String(r.id), String(r.name || ''));
        }
      }

      for (const u of users) {
        const nick = String(u?.nick || '');
        const roleName = u.directus_role_id ? roleNameById.get(u.directus_role_id) ?? '' : '';
        if (nick) result[nick] = getRoleBadgeImage(roleName);
      }
      return result;
    }

    // Legacy
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
 */
export async function ensureRoleBadge(userId: number, roleName: string): Promise<void> {
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
