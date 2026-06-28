/**
 * Create a known test admin user for browser login testing. Temp helper.
 * Run: node --env-file=.env.local --import tsx scripts/migration-pb/_make-test-user.ts
 */
import { createUser, getUserByNick } from '../../src/server/pocketbase/users';
import { createRole, listRoles } from '../../src/server/pocketbase/roles';
import { setLegacyUserRoleId } from '../../src/server/pocketbase/legacy-users';
import { invalidateUserCache } from '../../src/server/pocketbase/user-cache';

async function main() {
  // reuse existing test role/user if present
  const existing: any = await getUserByNick('testadmin', 'fr');
  if (existing) {
    console.log('  testadmin already exists ->', existing.id);
    console.log('  >>> nick=testadmin  password=Test1234!  (unchanged)');
    return;
  }

  let role = (await listRoles()).find((r) => r.name === 'Test Admin');
  if (!role) role = await createRole({ name: 'Test Admin', adminAccess: true, appAccess: true });
  console.log('  role:', role.id, role.name);

  const u: any = await createUser({ nick: 'testadmin', senha: 'Test1234!', email: '', habboHotel: 'fr', ativado: 's' });
  await setLegacyUserRoleId(String(u.id), role.id);
  invalidateUserCache();
  console.log('  user created:', u.id);
  console.log('  >>> nick=testadmin  password=Test1234!  (admin)');
}

main().catch((e) => { console.error('fatal:', e?.message || e); process.exit(1); });
