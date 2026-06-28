/**
 * Lot 4 — simulate the NextAuth authorize() login flow against PocketBase.
 * Proves the full login chain works: create user -> listUsersByNick ->
 * passwordsMatch (bcrypt) -> ban/active checks -> role resolution.
 *
 * Run: node --env-file=.env.local --import tsx scripts/migration-pb/_test-login.ts
 */

import { createUser, verifyLogin, asTrue, asFalse, normalizeHotelCode } from '../../src/server/pocketbase/users';
import { invalidateUserCache } from '../../src/server/pocketbase/user-cache';
import { createRole } from '../../src/server/pocketbase/roles';
import { setLegacyUserRoleId } from '../../src/server/pocketbase/legacy-users';
import { getRoleById } from '../../src/server/pocketbase/roles';
import { pbAdmin } from '../../src/server/pocketbase/client';

let pass = 0, fail = 0;
function check(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
}

const NICK = '__login_user__';
const PWD = 'LoginPwd12345';

async function main() {
  console.log('[test-login] simulate NextAuth authorize() against PocketBase\n');
  const pb = await pbAdmin();

  // setup: an admin role + a user with that role
  const role = await createRole({ name: '__login_admin__', adminAccess: true, appAccess: true });
  const created: any = await createUser({ nick: NICK, senha: PWD, email: '', habboHotel: 'fr', ativado: 's' });
  await setLegacyUserRoleId(String(created.id), role.id);
  invalidateUserCache();

  // ── replicate authorize() (native PB auth via verifyLogin) ──
  const user: any = await verifyLogin(NICK, PWD);
  check('verifyLogin validates correct password', !!user);
  const wrong = await verifyLogin(NICK, 'WRONGwrong999');
  check('wrong password rejected', wrong === null);

  if (user) {
    check('ban check (not banned)', !asTrue(user.banido));
    check('active check (activated)', !asFalse(user.ativado));
    check('hotel normalised', normalizeHotelCode(user.habbo_hotel) === 'fr');

    // role resolution (as authorize does via directus_role_id -> getRoleById)
    const roleId = user.directus_role_id;
    check('user has role id (from relation)', !!roleId, `got ${roleId}`);
    const roleRow = await getRoleById(roleId);
    check('role resolves with admin_access', roleRow?.admin_access === true);
  }

  // cleanup
  console.log('\n  cleaning up…');
  await pb.collection('users').delete(created.id).catch(() => {});
  await pb.collection('roles').delete(role.id).catch(() => {});

  console.log(`\n[test-login] ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('[test-login] fatal:', e?.message || e); process.exit(1); });
