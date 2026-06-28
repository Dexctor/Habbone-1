import 'server-only';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function normalizeBcrypt(hash?: string): string | undefined {
  if (!hash) return undefined;
  return hash.startsWith('$2y$') ? `$2a$${hash.slice(4)}` : hash;
}

export function isBcrypt(hash?: string) {
  if (!hash) return false;
  const h = normalizeBcrypt(hash);
  return /^\$2[ab]\$/.test(h || '');
}

export function md5(str: string) {
  return crypto.createHash('md5').update(str).digest('hex');
}

export function hashPassword(plain: string) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plain, salt);
}

export function passwordsMatch(plain: string, stored: string) {
  if (!stored) return false;
  if (isBcrypt(stored)) {
    const fixed = normalizeBcrypt(stored) || stored;
    return bcrypt.compareSync(plain, fixed);
  }
  return md5(plain) === stored;
}
