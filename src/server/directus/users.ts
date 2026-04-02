import 'server-only';

import type { HabboUserCore } from '@/lib/habbo';

import { directusService, USERS_TABLE, rItems, rItem, cItem, uItem } from './client';
import { hashPassword } from './security';
import type { HabboVerificationStatus } from './types';

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
};

const USER_FIELDS = [
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
] as const;

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

export async function listUsersByNick(nick: string) {
  const raw = await directusService
    .request(
      rItems(USERS_TABLE as any, {
        filter: { nick: { _eq: nick } } as any,
        limit: 50 as any,
        fields: USER_FIELDS,
      } as any),
    )
    .catch(() => []);
  return Array.isArray(raw) ? raw : [];
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

  const raw = await directusService
    .request(
      rItems(USERS_TABLE as any, {
        filter: filter as any,
        limit: 1 as any,
        fields: USER_FIELDS,
      } as any),
    )
    .catch(() => []);
  const rows = Array.isArray(raw) ? raw : [];
  return rows.length ? rows[0] : null;
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
}) {
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

export async function upgradePasswordToBcrypt(userId: number, plain: string) {
  return directusService.request(
    uItem(USERS_TABLE as any, userId as any, {
      senha: hashPassword(plain),
    }),
  );
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
  return directusService.request(uItem(USERS_TABLE as any, userId as any, patch as any));
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
    await directusService.request(uItem(USERS_TABLE as any, userId as any, payload as any));
    return true;
  } catch {
    return false;
  }
}

export async function getUserMoedas(userId: number): Promise<number> {
  const row = await directusService
    .request(rItem(USERS_TABLE as any, userId as any, { fields: ['moedas'] as any } as any))
    .catch(() => null as any);
  const value = (row as any)?.moedas;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export { isBcrypt, md5, hashPassword, passwordsMatch } from './security';

export type { HabboVerificationStatus, LegacyUserLite, DirectusUserLite } from './types';
