import 'server-only';

import type { UserBadge } from '@/server/directus/badges';
import { tableName } from './config';
import { queryOne, queryRows } from './db';

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

function getRoleBadgeImage(roleName: string): string | null {
  return ROLE_BADGE_IMAGE[roleName.toLowerCase().trim()] ?? null;
}

async function userHasBadge(userId: number, badgeId: number): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `select id from ${tableName('user_badges')} where "user" = $1 and badge = $2 limit 1`,
    [userId, badgeId],
  );
  return !!row;
}

async function grantBadge(userId: number, badgeId: number): Promise<void> {
  await queryRows(
    `insert into ${tableName('user_badges')} (badge, "user", source, active)
     values ($1, $2, 'earned', true)
     on conflict do nothing`,
    [badgeId, userId],
  );
}

export async function getUserBadges(userId: number): Promise<UserBadge[]> {
  const rows = await queryRows<{ id: number; name: string | null; image: string | null }>(
    `select b.id, b.name, b.image
     from ${tableName('user_badges')} ub
     join ${tableName('badges')} b on b.id = ub.badge
     where ub."user" = $1
       and coalesce(ub.active, true) = true
       and coalesce(b.active, true) = true
     order by b.id asc
     limit 50`,
    [userId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    nome: String(row.name || ''),
    imagem: String(row.image || ''),
  }));
}

export async function getRoleBadgesForNicks(nicks: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  if (!nicks.length) return result;
  const rows = await queryRows<{ nick: string | null; role_name: string | null }>(
    `select u.nick, r.name as role_name
     from ${tableName('users')} u
     left join ${tableName('app_roles')} r on r.id::text = u.directus_role_id
     where lower(u.nick) = any($1::text[])
     limit $2`,
    [nicks.map((nick) => nick.toLowerCase()), nicks.length],
  );
  for (const row of rows) {
    const nick = String(row.nick || '');
    if (nick) result[nick] = getRoleBadgeImage(String(row.role_name || ''));
  }
  return result;
}

export async function ensureRoleBadge(userId: number, roleName: string): Promise<void> {
  try {
    const key = roleName.toLowerCase().trim();
    const memberBadgeId = ROLE_BADGE_MAP.member;
    if (memberBadgeId && !(await userHasBadge(userId, memberBadgeId))) {
      await grantBadge(userId, memberBadgeId);
    }
    const roleBadgeId = ROLE_BADGE_MAP[key];
    if (roleBadgeId && roleBadgeId !== memberBadgeId && !(await userHasBadge(userId, roleBadgeId))) {
      await grantBadge(userId, roleBadgeId);
    }
  } catch {
    /* non-blocking */
  }
}
