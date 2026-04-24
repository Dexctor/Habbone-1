import 'server-only';

import type { HabboUserCore } from '@/lib/habbo';

import { directusService, rItems, rItem, cItem, uItem } from './client';
import { TABLES, USE_V2 } from './tables';
import { hashPassword } from './security';
import type { HabboVerificationStatus } from './types';

const USERS_TABLE = TABLES.users;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type LegacyUserRecord = {
  id?: number | string | null;
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

const LEGACY_USER_FIELDS = [
  'id',
  'nick',
  'senha',
  'email',
  'avatar',
  'missao',
  'ativado',
  'banido',
  'status',
  'role',
  'directus_role_id',
  'data_criacao',
  'habbo_hotel',
  'habbo_unique_id',
  'habbo_verification_status',
  'habbo_verification_code',
  'habbo_verification_expires_at',
  'habbo_verified_at',
  'habbo_name',
] as const;

const V2_USER_FIELDS = [
  'id',
  'nick',
  'password',
  'email',
  'avatar_url',
  'background_url',
  'mission',
  'active',
  'banned',
  'directus_role_id',
  'created_at',
  'habbo_hotel',
  'habbo_unique_id',
  'habbo_verification_status',
  'habbo_verification_code',
  'habbo_verification_expires_at',
  'habbo_verified_at',
  'habbo_name',
  'coins',
] as const;

const USER_FIELDS = USE_V2 ? V2_USER_FIELDS : LEGACY_USER_FIELDS;

/* ------------------------------------------------------------------ */
/*  v2 row -> legacy shape (for caller compatibility)                  */
/* ------------------------------------------------------------------ */

function v2ToLegacyRow(row: any): LegacyUserRecord & { id: number; moedas?: number } {
  return {
    id: Number(row.id),
    nick: row.nick ?? null,
    senha: row.password ?? null,
    email: row.email ?? null,
    avatar: row.avatar_url ?? null,
    missao: row.mission ?? null,
    ativado: row.active ? 's' : 'n',
    banido: row.banned ? 's' : 'n',
    status: row.banned ? 'suspended' : row.active ? 'active' : 'inactive',
    role: null,
    directus_role_id: row.directus_role_id ?? null,
    data_criacao: row.created_at ?? null,
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

function mapRow(row: any) {
  return USE_V2 ? v2ToLegacyRow(row) : row;
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
      case 'data_criacao': v2.created_at = v; break;
      case 'role': /* drop — rely on directus_role_id */ break;
      case 'moedas': v2.coins = v; break;
      case 'habbo_core_snapshot': v2.habbo_core_snapshot = v; break;
      case 'habbo_snapshot_at': v2.habbo_snapshot_at = v; break;
      default: v2[k] = v; // most Habbo-related columns have the same name
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
  const raw = (await directusService
    .request(
      rItems(USERS_TABLE as any, {
        filter: { nick: { _eq: nick } } as any,
        limit: 50 as any,
        fields: USER_FIELDS,
      } as any),
    )
    .catch(() => [])) as any[];
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map(mapRow);
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

  const raw = (await directusService
    .request(
      rItems(USERS_TABLE as any, {
        filter: filter as any,
        limit: 1 as any,
        fields: USER_FIELDS,
      } as any),
    )
    .catch(() => [])) as any[];
  const rows = Array.isArray(raw) ? raw : [];
  return rows.length ? mapRow(rows[0]) : null;
}

export async function getUserById(userId: number) {
  const raw = await directusService
    .request(rItem(USERS_TABLE as any, userId as any, { fields: USER_FIELDS as any } as any))
    .catch(() => null);
  if (!raw) return null;
  return mapRow(raw);
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
  if (USE_V2) {
    const payload: Record<string, unknown> = {
      nick: data.nick,
      password: hashPassword(data.senha),
      email: data.email ?? null,
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
    return directusService.request(cItem(USERS_TABLE as any, payload as any));
  }

  const payload: LegacyUserRecord = {
    nick: data.nick,
    senha: hashPassword(data.senha),
    email: data.email ?? null,
    missao: data.missao ?? 'Mission Habbo: HabboOneRegister-0',
    ativado: data.ativado ?? 'n',
    banido: 'n',
    data_criacao: new Date().toISOString(),
    habbo_hotel: data.habboHotel ?? null,
    habbo_unique_id: data.habboUniqueId ?? null,
    habbo_verification_status: data.verificationStatus ?? ('pending' as HabboVerificationStatus),
    habbo_verification_code: data.verificationCode ?? null,
    habbo_verification_expires_at: data.verificationExpiresAt ?? null,
    habbo_verified_at: data.verifiedAt ?? null,
  };
  return directusService.request(cItem(USERS_TABLE as any, payload as any));
}

/* ------------------------------------------------------------------ */
/*  Password + verification updates                                    */
/* ------------------------------------------------------------------ */

export async function upgradePasswordToBcrypt(userId: number, plain: string) {
  const payload = USE_V2 ? { password: hashPassword(plain) } : { senha: hashPassword(plain) };
  return directusService.request(uItem(USERS_TABLE as any, userId as any, payload as any));
}

export async function changeUserPassword(userId: number, newPassword: string) {
  const payload = USE_V2 ? { password: hashPassword(newPassword) } : { senha: hashPassword(newPassword) };
  return directusService.request(uItem(USERS_TABLE as any, userId as any, payload as any));
}

export async function updateUserVerification(
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
  const payload = USE_V2 ? legacyPatchToV2(patch as Record<string, unknown>) : patch;
  return directusService.request(uItem(USERS_TABLE as any, userId as any, payload as any));
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
    const payload: Partial<LegacyUserRecord> = {
      habbo_unique_id: core.uniqueId,
      habbo_name: core.name,
      habbo_core_snapshot: core,
      habbo_snapshot_at: new Date().toISOString(),
    };
    const mapped = USE_V2 ? legacyPatchToV2(payload as Record<string, unknown>) : payload;
    await directusService.request(uItem(USERS_TABLE as any, userId as any, mapped as any));
    return true;
  } catch {
    return false;
  }
}

export async function getUserMoedas(userId: number): Promise<number> {
  const fields = USE_V2 ? ['coins'] : ['moedas'];
  const row = await directusService
    .request(rItem(USERS_TABLE as any, userId as any, { fields: fields as any } as any))
    .catch(() => null as any);
  const value = USE_V2 ? (row as any)?.coins : (row as any)?.moedas;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export { isBcrypt, md5, hashPassword, passwordsMatch } from './security';

export type { HabboVerificationStatus, LegacyUserLite, DirectusUserLite } from './types';
