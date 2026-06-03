/**
 * PocketBase migration — Lot 2: POC bcrypt import.
 *
 * Question: can we migrate the 23 legacy bcrypt password hashes into PocketBase
 * so users log in transparently with their existing password?
 *
 * This probes the two possible import paths via the REST API:
 *   A) create record with `password` = raw bcrypt hash      (expected: rejected)
 *   B) create record with `password`/`passwordConfirm` in CLEAR (PB re-hashes)
 *      -> proves login works, but means we'd need the cleartext (we DON'T have it)
 *
 * The real migration path (raw hash -> SQLite `password` column) can only be
 * done via direct DB access / SQL console, not REST. This script documents the
 * REST behaviour conclusively so we know which way to go.
 *
 * Cleans up the test user(s) at the end.
 *
 * Usage: npx tsx scripts/migration-pb/02-poc-bcrypt.ts
 */

import bcrypt from 'bcryptjs';
import { PB_URL, pbAuth, getCollection, log } from './_pb';

const TEST_NICK_A = 'pbtest_rawhash';
const TEST_NICK_B = 'pbtest_clear';
const TEST_PWD = 'TestPwd123!';

async function authAdmin(): Promise<string> {
  return pbAuth();
}

async function deleteIfExists(token: string, nick: string): Promise<void> {
  const res = await fetch(
    `${PB_URL}/api/collections/users/records?filter=${encodeURIComponent(`nick="${nick}"`)}`,
    { headers: { Authorization: token } },
  );
  if (!res.ok) return;
  const json = (await res.json()) as { items?: Array<{ id: string }> };
  for (const item of json.items ?? []) {
    await fetch(`${PB_URL}/api/collections/users/records/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: token },
    });
    log(`  · cleaned up ${nick} (${item.id})`);
  }
}

async function tryLogin(nick: string, password: string): Promise<number> {
  const res = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: nick, password }),
  });
  return res.status;
}

async function main(): Promise<void> {
  log(`[lot2] target: ${PB_URL}`);
  const token = await authAdmin();
  const hash = bcrypt.hashSync(TEST_PWD, 10);
  log(`[lot2] generated bcrypt hash: ${hash.slice(0, 10)}… (valid prefix: ${/^\$2[aby]\$/.test(hash)})`);

  // clean slate
  await deleteIfExists(token, TEST_NICK_A);
  await deleteIfExists(token, TEST_NICK_B);

  // ── Path A: inject raw bcrypt hash as `password` ──────────────────────────
  log('');
  log('=== Path A: REST create with password = raw bcrypt hash ===');
  const resA = await fetch(`${PB_URL}/api/collections/users/records`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nick: TEST_NICK_A, habbo_hotel: 'fr', password: hash, verified: true }),
  });
  log(`  create -> HTTP ${resA.status}`);
  if (resA.ok) {
    const code = await tryLogin(TEST_NICK_A, TEST_PWD);
    log(`  login with cleartext "${TEST_PWD}" -> HTTP ${code} ${code === 200 ? '✅ RAW HASH IMPORT WORKS via REST' : '❌'}`);
  } else {
    const body = await resA.text();
    log(`  rejected: ${body.slice(0, 200)}`);
    log('  → REST will not accept a pre-hashed password (expected).');
  }

  // ── Path B: create with cleartext (PB hashes it) ──────────────────────────
  log('');
  log('=== Path B: REST create with cleartext password (PB re-hashes) ===');
  const resB = await fetch(`${PB_URL}/api/collections/users/records`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nick: TEST_NICK_B,
      habbo_hotel: 'fr',
      password: TEST_PWD,
      passwordConfirm: TEST_PWD,
      verified: true,
    }),
  });
  log(`  create -> HTTP ${resB.status}`);
  if (resB.ok) {
    const code = await tryLogin(TEST_NICK_B, TEST_PWD);
    log(`  login with "${TEST_PWD}" -> HTTP ${code} ${code === 200 ? '✅ cleartext path works' : '❌'}`);
  } else {
    log(`  rejected: ${(await resB.text()).slice(0, 200)}`);
  }

  // ── cleanup ───────────────────────────────────────────────────────────────
  log('');
  log('=== cleanup ===');
  await deleteIfExists(token, TEST_NICK_A);
  await deleteIfExists(token, TEST_NICK_B);

  log('');
  log('[lot2] CONCLUSION:');
  log('[lot2]   - If Path A worked  -> import raw hashes via REST (best case).');
  log('[lot2]   - If only Path B    -> REST needs cleartext (we lack it); raw');
  log('[lot2]     hashes must go straight into the SQLite `password` column.');
  log('[lot2]   See next step: test the SQLite/SQL-console route.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[lot2] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
