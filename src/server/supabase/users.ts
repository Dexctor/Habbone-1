import 'server-only';

import type { HabboUserCore } from '@/lib/habbo';
import { hashPassword } from '@/server/directus/security';
import type { HabboVerificationStatus } from '@/server/directus/types';
import { summarizeUserStatusBuckets, type AdminUserStatusStats } from '@/server/directus/users-core';
import { queryOne, queryRows } from './db';
import { tableName } from './config';
import {
  mapLegacyUserPatchToSupabase,
  mapSupabaseUserToLegacy,
  type LegacyCompatibleUserRow,
  type SupabaseUserRow,
} from './users-core';

const USER_SELECT = `
  id,
  nick,
  password,
  email,
  avatar_url,
  mission,
  active,
  banned,
  directus_role_id,
  created_at,
  habbo_hotel,
  habbo_unique_id,
  habbo_verification_status,
  habbo_verification_code,
  habbo_verification_expires_at,
  habbo_verified_at,
  habbo_name,
  coins,
  twitter
`;

export async function listUsersByNick(nick: string): Promise<LegacyCompatibleUserRow[]> {
  const rows = await queryRows<SupabaseUserRow>(
    `select ${USER_SELECT}
     from ${tableName('users')}
     where lower(nick) = lower($1)
     order by id asc
     limit 50`,
    [nick],
  );
  return rows.map(mapSupabaseUserToLegacy);
}

export async function getUserByNick(nick: string, hotel?: string | null): Promise<LegacyCompatibleUserRow | null> {
  const values: unknown[] = [nick];
  let hotelFilter = '';
  if (hotel) {
    values.push(hotel);
    hotelFilter = hotel === 'fr'
      ? `and (habbo_hotel = $2 or habbo_hotel is null or habbo_hotel = '')`
      : `and habbo_hotel = $2`;
  }

  const row = await queryOne<SupabaseUserRow>(
    `select ${USER_SELECT}
     from ${tableName('users')}
     where lower(nick) = lower($1)
       ${hotelFilter}
     order by id asc
     limit 1`,
    values,
  );
  return row ? mapSupabaseUserToLegacy(row) : null;
}

export async function getUserById(userId: number): Promise<LegacyCompatibleUserRow | null> {
  const row = await queryOne<SupabaseUserRow>(
    `select ${USER_SELECT}
     from ${tableName('users')}
     where id = $1
     limit 1`,
    [userId],
  );
  return row ? mapSupabaseUserToLegacy(row) : null;
}

export async function getUserEditableProfile(userId: number): Promise<{ twitter: string | null } | null> {
  const row = await queryOne<{ twitter: string | null }>(
    `select twitter from ${tableName('users')} where id = $1 limit 1`,
    [userId],
  );
  if (!row) return null;
  return { twitter: typeof row.twitter === 'string' ? row.twitter : null };
}

export async function createUser(data: {
  nick: string;
  senha: string;
  email?: string | null;
  missao?: string | null;
  habboHotel?: string | null;
  habboUniqueId?: string | null;
  verificationStatus?: HabboVerificationStatus;
  verificationCode?: string | null;
  verificationExpiresAt?: string | null;
  verifiedAt?: string | null;
  ativado?: 's' | 'n';
}): Promise<LegacyCompatibleUserRow> {
  const row = await queryOne<SupabaseUserRow>(
    `insert into ${tableName('users')} (
       nick,
       password,
       email,
       mission,
       active,
       banned,
       habbo_hotel,
       habbo_unique_id,
       habbo_verification_status,
       habbo_verification_code,
       habbo_verification_expires_at,
       habbo_verified_at,
       coins,
       points
     )
     values ($1, $2, $3, $4, $5, false, $6, $7, $8, $9, $10, $11, 0, 0)
     returning ${USER_SELECT}`,
    [
      data.nick,
      hashPassword(data.senha),
      data.email ?? null,
      data.missao ?? 'Mission Habbo: HabboOneRegister-0',
      data.ativado === 's',
      data.habboHotel ?? 'fr',
      data.habboUniqueId ?? null,
      data.verificationStatus ?? 'pending',
      data.verificationCode ?? null,
      data.verificationExpiresAt ?? null,
      data.verifiedAt ?? null,
    ],
  );
  if (!row) throw new Error('USER_CREATE_FAILED');
  return mapSupabaseUserToLegacy(row);
}

async function updateUser(userId: number, patch: Record<string, unknown>): Promise<LegacyCompatibleUserRow | null> {
  const entries = Object.entries(mapLegacyUserPatchToSupabase(patch));
  if (entries.length === 0) return getUserById(userId);

  const assignments = entries.map(([key], index) => `"${key.replace(/"/g, '""')}" = $${index + 2}`).join(', ');
  const row = await queryOne<SupabaseUserRow>(
    `update ${tableName('users')}
     set ${assignments}
     where id = $1
     returning ${USER_SELECT}`,
    [userId, ...entries.map(([, value]) => value)],
  );
  return row ? mapSupabaseUserToLegacy(row) : null;
}

export function upgradePasswordToBcrypt(userId: number, plain: string) {
  return updateUser(userId, { senha: hashPassword(plain) });
}

export function changeUserPassword(userId: number, newPassword: string) {
  return updateUser(userId, { senha: hashPassword(newPassword) });
}

export function updateUserTwitter(userId: number, twitter: string | null) {
  return updateUser(userId, { twitter });
}

export function updateUserVerification(
  userId: number,
  patch: Partial<{
    habbo_hotel: string | null;
    habbo_unique_id: string | null;
    habbo_verification_status: HabboVerificationStatus | null;
    habbo_verification_code: string | null;
    habbo_verification_expires_at: string | null;
    habbo_verified_at: string | null;
    ativado: 's' | 'n';
  }>,
) {
  return updateUser(userId, patch as Record<string, unknown>);
}

export async function markUserAsVerified(userId: number) {
  const nowIso = new Date().toISOString();
  return updateUserVerification(userId, {
    habbo_verification_status: 'ok',
    habbo_verification_code: null,
    habbo_verification_expires_at: null,
    habbo_verified_at: nowIso,
    ativado: 's',
  });
}

export async function tryUpdateHabboSnapshotForUser(
  userId: number,
  core: HabboUserCore,
): Promise<boolean> {
  try {
    await updateUser(userId, {
      habbo_unique_id: core.uniqueId,
      habbo_name: core.name,
      habbo_core_snapshot: core,
      habbo_snapshot_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function getUserMoedas(userId: number): Promise<number> {
  const row = await queryOne<{ coins: number | string | null }>(
    `select coins from ${tableName('users')} where id = $1 limit 1`,
    [userId],
  );
  const coins = typeof row?.coins === 'number' ? row.coins : Number(row?.coins ?? 0);
  return Number.isFinite(coins) ? coins : 0;
}

function cleanLegacyUserId(id: string) {
  return id.startsWith('legacy:') ? id.split(':')[1] : id;
}

export async function getAdminUserCoinsSnapshot(userId: string): Promise<{
  id: string | number;
  nick: string | null;
  balance: number;
} | null> {
  const cleanId = cleanLegacyUserId(userId);
  const row = await queryOne<{ id: number; nick: string | null; coins: number | string | null }>(
    `select id, nick, coins from ${tableName('users')} where id = $1 limit 1`,
    [cleanId],
  );
  if (!row) return null;
  const balance = typeof row.coins === 'number' ? row.coins : Number(row.coins ?? 0);
  return {
    id: row.id,
    nick: row.nick,
    balance: Number.isFinite(balance) ? balance : 0,
  };
}

export function updateAdminUserCoinsBalance(userId: string, balance: number) {
  const cleanId = cleanLegacyUserId(userId);
  return updateUser(Number(cleanId), { moedas: balance });
}

export async function getAdminUserStatusStats(): Promise<AdminUserStatusStats> {
  const rows = await queryRows<{ banned: boolean | null; active: boolean | null; count: string }>(
    `select banned, active, count(*)::text as count
     from ${tableName('users')}
     group by banned, active`,
  );
  return summarizeUserStatusBuckets(rows.map((row) => ({
    banned: row.banned,
    active: row.active,
    count: { id: Number(row.count) || 0 },
  })), { banned: 'banned', active: 'active' });
}
