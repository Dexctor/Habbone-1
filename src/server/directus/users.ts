import 'server-only';

/**
 * Compatibility re-export: this façade now delegates entirely to the Supabase
 * implementation. Pure helpers (asTrue/asFalse/normalizeHotelCode) are
 * re-exported from `@/server/auth-helpers` so callers don't have to be
 * touched.
 */

export {
  listUsersByNick,
  getUserByNick,
  getUserById,
  getUserEditableProfile,
  createUser,
  upgradePasswordToBcrypt,
  changeUserPassword,
  updateUserTwitter,
  updateUserVerification,
  markUserAsVerified,
  tryUpdateHabboSnapshotForUser,
  getUserMoedas,
  getAdminUserCoinsSnapshot,
  updateAdminUserCoinsBalance,
  getAdminUserStatusStats,
} from '@/server/supabase/users';

// Pure helpers — kept here so external consumers don't have to update imports.
export {
  asTrue,
  asFalse,
  normalizeHotelCode,
  passwordsMatch,
  isBcrypt,
  hashPassword,
  md5,
} from '@/server/auth-helpers';
export type { HabboHotelCode } from '@/server/auth-helpers';

export type {
  HabboVerificationStatus,
  LegacyUserLite,
  DirectusUserLite,
} from './types';
