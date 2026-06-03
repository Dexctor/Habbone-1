import 'server-only';

import PocketBase from 'pocketbase';

import type { HabboUserCore } from '@/lib/habbo';

import { pbList, pbOne, pbFirst, pbCreate, pbUpdate } from './pb-helpers';
import { TABLES } from './tables';
import type { HabboVerificationStatus } from './types';

const USERS_TABLE = TABLES.users;
const PB_URL = (process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type LegacyUserRecord = {
  id?: string | null;
  nick?: string | null;
  senha?: string | null;
  email?: string | null;
  avatar?: string | null;
  missao?: string | null;
  ativado?: string | null;
  banido?: string | null;
  status?: string | null;
  role?: string | null;
  directus_role_id?: string | null;
  data_criacao?: string | null;
  habbo_hotel?: string | null;
  habbo_unique_id?: string | null;
  habbo_verification_status?: HabboVerificationStatus | null;
  habbo_verification_code?: string | null;
  habbo_verification_expires_at?: string | null;
  habbo_verified_at?: string | null;
  habbo_name?: string | null;
  habbo_core_snapshot?: unknown;
  habbo_snapshot_at?: string | null;
  moedas?: number | null;
};

// v2 columns we read. `role` is a relation id (string). habbo_* verification
// fields are not in the core schema-v2 but PB ignores unknown fields on read;
// kept here so callers that expect them still type-check.
const USER_FIELDS =
  'id,nick,password,email,avatar_url,background_url,mission,active,banned,role,created,habbo_hotel,habbo_unique_id,habbo_verification_status,habbo_verification_code,habbo_verification_expires_at,habbo_verified_at,habbo_name,coins';

/* ------------------------------------------------------------------ */
/*  v2 row -> legacy shape (for caller compatibility)                  */
/* ------------------------------------------------------------------ */

function v2ToLegacyRow(row: any): LegacyUserRecord & { id: string; moedas?: number } {
  return {
    id: String(row.id),
    nick: row.nick ?? null,
    senha: row.password ?? null,
    email: row.email ?? null,
    avatar: row.avatar_url ?? null,
    missao: row.mission ?? null,
    ativado: row.active ? 's' : 'n',
    banido: row.banned ? 's' : 'n',
    status: row.banned ? 'suspended' : row.active ? 'active' : 'inactive',
    role: null,
    // v2 uses a `role` relation; expose its id under the legacy name callers read.
    directus_role_id: row.role ? String(row.role) : null,
    data_criacao: row.created ?? null,
    habbo_hotel: row.habbo_hotel ?? null,
    habbo_unique_id: row.habbo_unique_id ?? null,
    habbo_verification_status: row.habbo_verification_status ?? null,
    habbo_verification_code: row.habbo_verification_code ?? null,
    habbo_verification_expires_at: row.habbo_verification_expires_at ?? null,
    habbo_verified_at: row.habbo_verified_at ?? null,
    habbo_name: row.habbo_name ?? null,
    moedas: typeof row.coins === 'number' ? row.coins : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Legacy patch -> v2 patch                                           */
/* ------------------------------------------------------------------ */

function legacyPatchToV2(patch: Record<string, unknown>): Record<string, unknown> {
  const v2: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    switch (k) {
      case 'senha': v2.password = v; break;
      case 'avatar': v2.avatar_url = v; break;
      case 'missao': v2.mission = v; break;
      case 'ativado': v2.active = v === 's' || v === true; break;
      case 'banido': v2.banned = v === 's' || v === true; break;
      case 'data_criacao': v2.created = v; break;
      case 'role': /* drop — use the role relation directly */ break;
      case 'directus_role_id': v2.role = v; break;
      case 'moedas': v2.coins = v; break;
      default: v2[k] = v; // most Habbo-related columns share the same name
    }
  }
  return v2;
}

/* ------------------------------------------------------------------ */
/*  Helpers (also used elsewhere in the app)                           */
/* ------------------------------------------------------------------ */

export function asTrue(v: unknown): boolean {
  const normalized = typeof v === 'string' ? v.trim().toLowerCase() : v;
  return (
    normalized === true ||
    normalized === 1 ||
    normalized === '1' ||
    normalized === 's' ||
    normalized === 'y' ||
    normalized === 'sim' ||
    normalized === 'yes' ||
    normalized === 'ativo'
  );
}

export function asFalse(v: unknown): boolean {
  return !asTrue(v);
}

export type HabboHotelCode = 'fr' | 'com' | 'com.br' | 'es' | 'it' | 'de' | 'nl' | 'fi' | 'com.tr';

const HOTEL_ALIASES: Record<string, HabboHotelCode> = {
  fr: 'fr',
  com: 'com',
  'com.br': 'com.br', br: 'com.br', combr: 'com.br',
  es: 'es',
  it: 'it',
  de: 'de',
  nl: 'nl',
  fi: 'fi',
  'com.tr': 'com.tr', tr: 'com.tr', comtr: 'com.tr',
};

export function normalizeHotelCode(hotel?: string | null): HabboHotelCode {
  const value = typeof hotel === 'string' ? hotel.trim().toLowerCase() : '';
  return HOTEL_ALIASES[value] ?? 'fr';
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

export async function listUsersByNick(nick: string) {
  const rows = await pbList<any>(USERS_TABLE, {
    filter: { nick: { _eq: nick } },
    perPage: 50,
    fields: USER_FIELDS,
  }).catch(() => [] as any[]);
  return rows.map(v2ToLegacyRow);
}

export async function getUserByNick(nick: string, hotel?: string | null) {
  const normalized = hotel ? normalizeHotelCode(hotel) : null;
  const filter =
    normalized === null
      ? { nick: { _eq: nick } }
      : normalized === 'fr'
        ? {
            _and: [
              { nick: { _eq: nick } },
              {
                _or: [
                  { habbo_hotel: { _eq: normalized } },
                  { habbo_hotel: { _null: true } },
                  { habbo_hotel: { _empty: true } },
                ],
              },
            ],
          }
        : {
            _and: [{ nick: { _eq: nick } }, { habbo_hotel: { _eq: normalized } }],
          };

  const row = await pbFirst<any>(USERS_TABLE, filter, { fields: USER_FIELDS }).catch(() => null);
  return row ? v2ToLegacyRow(row) : null;
}

export async function getUserById(userId: string) {
  const row = await pbOne<any>(USERS_TABLE, userId, { fields: USER_FIELDS }).catch(() => null);
  if (!row) return null;
  return v2ToLegacyRow(row);
}

/* ------------------------------------------------------------------ */
/*  Create                                                             */
/* ------------------------------------------------------------------ */

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
}) {
  // PocketBase auth collections hash the password themselves: pass the PLAIN
  // password (NOT a pre-hashed value) or it would be double-hashed.
  const payload: Record<string, unknown> = {
    nick: data.nick,
    password: data.senha,
    passwordConfirm: data.senha,
    email: data.email ?? '',
    mission: data.missao ?? 'Mission Habbo: HabboOneRegister-0',
    active: data.ativado === 's',
    banned: false,
    habbo_hotel: data.habboHotel ?? 'fr',
    habbo_unique_id: data.habboUniqueId ?? null,
    habbo_verification_status: data.verificationStatus ?? 'pending',
    habbo_verification_code: data.verificationCode ?? null,
    habbo_verification_expires_at: data.verificationExpiresAt ?? null,
    habbo_verified_at: data.verifiedAt ?? null,
  };
  return pbCreate(USERS_TABLE, payload);
}

/* ------------------------------------------------------------------ */
/*  Password + verification updates                                    */
/* ------------------------------------------------------------------ */

export async function upgradePasswordToBcrypt(userId: string, plain: string) {
  // PB hashes itself (bcrypt). No legacy MD5->bcrypt upgrade needed anymore;
  // just (re)set the plain password and PB stores a bcrypt hash.
  return pbUpdate(USERS_TABLE, userId, { password: plain, passwordConfirm: plain });
}

export async function changeUserPassword(userId: string, newPassword: string) {
  return pbUpdate(USERS_TABLE, userId, { password: newPassword, passwordConfirm: newPassword });
}

export async function updateUserTwitter(userId: string, twitter: string | null) {
  // `twitter` is not part of schema-v2; kept as a no-op-safe update.
  return pbUpdate(USERS_TABLE, userId, { twitter });
}

export async function updateUserVerification(
  userId: string,
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
  const payload = legacyPatchToV2(patch as Record<string, unknown>);
  return pbUpdate(USERS_TABLE, userId, payload);
}

export async function markUserAsVerified(userId: string) {
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
  userId: string,
  core: HabboUserCore,
): Promise<boolean> {
  try {
    const payload = legacyPatchToV2({
      habbo_unique_id: core.uniqueId,
      habbo_name: core.name,
      habbo_core_snapshot: core,
      habbo_snapshot_at: new Date().toISOString(),
    });
    await pbUpdate(USERS_TABLE, userId, payload);
    return true;
  } catch {
    return false;
  }
}

export async function getUserMoedas(userId: string): Promise<number> {
  const row = await pbOne<{ coins?: number }>(USERS_TABLE, userId, { fields: 'coins' }).catch(
    () => null,
  );
  const value = row?.coins;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/* ------------------------------------------------------------------ */
/*  Login verification (PocketBase native auth)                        */
/* ------------------------------------------------------------------ */

/**
 * Verify a nick+password against PocketBase's native auth.
 *
 * Uses a throwaway PocketBase instance (NOT the shared superuser client) so the
 * auth attempt never touches the service-account authStore. Returns the user row
 * (legacy shape) on success, or null on bad credentials.
 *
 * PB's authWithPassword works for both:
 *  - users created through createUser (PB hashed the plain password), and
 *  - legacy users whose bcrypt hash was written straight into the password
 *    column via SQL (proven in Lot 2).
 */
export async function verifyLogin(nick: string, password: string) {
  if (!nick || !password) return null;
  const client = new PocketBase(PB_URL);
  client.autoCancellation(false);
  try {
    const auth = await client.collection(USERS_TABLE).authWithPassword(nick, password);
    const row = auth?.record;
    return row ? v2ToLegacyRow(row) : null;
  } catch {
    return null;
  } finally {
    client.authStore.clear();
  }
}

export { isBcrypt, md5, hashPassword, passwordsMatch } from './security';

export type { HabboVerificationStatus, LegacyUserLite, DirectusUserLite } from './types';
