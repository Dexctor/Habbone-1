import type { HabboVerificationStatus } from '@/server/directus/types';

export type SupabaseUserRow = {
  id?: number | string | null;
  nick?: string | null;
  password?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  mission?: string | null;
  active?: boolean | null;
  banned?: boolean | null;
  status?: string | null;
  directus_role_id?: string | null;
  created_at?: string | Date | null;
  habbo_hotel?: string | null;
  habbo_unique_id?: string | null;
  habbo_verification_status?: HabboVerificationStatus | null;
  habbo_verification_code?: string | null;
  habbo_verification_expires_at?: string | Date | null;
  habbo_verified_at?: string | Date | null;
  habbo_name?: string | null;
  coins?: number | string | null;
  twitter?: string | null;
};

export type LegacyCompatibleUserRow = {
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
  moedas?: number | null;
  twitter?: string | null;
};

function dateToIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function mapSupabaseUserToLegacy(row: SupabaseUserRow): LegacyCompatibleUserRow {
  const active = row.active === true;
  const banned = row.banned === true;
  const coins = typeof row.coins === 'number' ? row.coins : Number(row.coins ?? 0);

  return {
    id: row.id ?? null,
    nick: row.nick ?? null,
    senha: row.password ?? null,
    email: row.email ?? null,
    avatar: row.avatar_url ?? null,
    missao: row.mission ?? null,
    ativado: active ? 's' : 'n',
    banido: banned ? 's' : 'n',
    status: row.status ?? (banned ? 'suspended' : active ? 'active' : 'inactive'),
    role: null,
    directus_role_id: row.directus_role_id ?? null,
    data_criacao: dateToIso(row.created_at),
    habbo_hotel: row.habbo_hotel ?? null,
    habbo_unique_id: row.habbo_unique_id ?? null,
    habbo_verification_status: row.habbo_verification_status ?? null,
    habbo_verification_code: row.habbo_verification_code ?? null,
    habbo_verification_expires_at: dateToIso(row.habbo_verification_expires_at),
    habbo_verified_at: dateToIso(row.habbo_verified_at),
    habbo_name: row.habbo_name ?? null,
    moedas: Number.isFinite(coins) ? coins : 0,
    twitter: row.twitter ?? null,
  };
}

export function mapLegacyUserPatchToSupabase(patch: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    switch (key) {
      case 'senha':
        mapped.password = value;
        break;
      case 'avatar':
        mapped.avatar_url = value;
        break;
      case 'missao':
        mapped.mission = value;
        break;
      case 'ativado':
        mapped.active = value === 's' || value === true;
        break;
      case 'banido':
        mapped.banned = value === 's' || value === true;
        break;
      case 'data_criacao':
        mapped.created_at = value;
        break;
      case 'moedas':
        mapped.coins = value;
        break;
      case 'role':
        break;
      default:
        mapped[key] = value;
        break;
    }
  }
  return mapped;
}
