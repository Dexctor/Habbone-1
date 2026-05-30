import 'server-only';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/* ------------------------------------------------------------------ */
/*  Password / hashing helpers — backend-agnostic                      */
/*                                                                     */
/*  These are pure functions, they don't talk to Directus or Supabase. */
/*  Kept here so that auth.ts can import them without pulling in the   */
/*  legacy Directus tree.                                              */
/* ------------------------------------------------------------------ */

function normalizeBcrypt(hash?: string): string | undefined {
  if (!hash) return undefined;
  return hash.startsWith('$2y$') ? `$2a$${hash.slice(4)}` : hash;
}

export function isBcrypt(hash?: string): boolean {
  if (!hash) return false;
  const h = normalizeBcrypt(hash);
  return /^\$2[ab]\$/.test(h || '');
}

export function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

/* ------------------------------------------------------------------ */
/*  Re-exports for legacy `@/server/directus/users` compatibility      */
/*                                                                     */
/*  See src/server/directus/users.ts for the actual re-export. md5 is  */
/*  already exported above; this block is just for documentation.       */
/* ------------------------------------------------------------------ */

export function hashPassword(plain: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plain, salt);
}

export function passwordsMatch(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (isBcrypt(stored)) {
    const fixed = normalizeBcrypt(stored) || stored;
    return bcrypt.compareSync(plain, fixed);
  }
  return md5(plain) === stored;
}

/* ------------------------------------------------------------------ */
/*  Legacy truthy/falsy normalization                                  */
/*                                                                     */
/*  The legacy MySQL schema stored booleans as 's'/'n' strings. We     */
/*  still need to read them for accounts that haven't been migrated.   */
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

/* ------------------------------------------------------------------ */
/*  Habbo hotel code normalization                                     */
/* ------------------------------------------------------------------ */

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
