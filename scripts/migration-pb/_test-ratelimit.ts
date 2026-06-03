/**
 * Test the login rate-limit (security hardening C1).
 * Run: node --import tsx scripts/migration-pb/_test-ratelimit.ts
 */
import { checkRateLimitByKey } from '../../src/server/rate-limit';

let pass = 0, fail = 0;
function check(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
}

const KEY = 'login:__rltest__';

// 10 allowed, 11th blocked
let lastOk = true;
let blockedAt = -1;
for (let i = 1; i <= 12; i++) {
  const r = checkRateLimitByKey(KEY, { limit: 10, windowMs: 60_000 });
  if (!r.ok && blockedAt === -1) blockedAt = i;
  lastOk = r.ok;
}
check('first 10 attempts allowed, then blocked', blockedAt === 11, `blocked at attempt ${blockedAt}`);
check('still blocked after limit', lastOk === false);
const blocked = checkRateLimitByKey(KEY, { limit: 10, windowMs: 60_000 });
check('retryAfter is positive when blocked', blocked.retryAfter > 0, `retryAfter=${blocked.retryAfter}`);

// a DIFFERENT key is independent
const other = checkRateLimitByKey('login:__other__', { limit: 10, windowMs: 60_000 });
check('different account key is independent', other.ok === true);

console.log(`\n[test-ratelimit] ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
