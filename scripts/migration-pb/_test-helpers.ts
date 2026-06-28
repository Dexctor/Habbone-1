/**
 * Smoke test for the PocketBase service helpers against the real
 * local PocketBase. Full CRUD cycle on `roles` + count + filter.
 * Run: npx tsx scripts/migration-pb/_test-helpers.ts
 * Temp file — removed once the socle is trusted.
 */

import { pbList, pbOne, pbFirst, pbCreate, pbUpdate, pbDelete, pbCount } from '../../src/server/pocketbase/helpers';

let pass = 0, fail = 0;
function check(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
}

async function main() {
  console.log('[test-helpers] socle PocketBase (client + helpers)\n');

  // CREATE
  const created = await pbCreate<{ id: string; name: string; admin_access: boolean }>('roles', {
    name: '__test_role__',
    description: 'temp',
    admin_access: true,
    app_access: true,
  });
  check('pbCreate returns id', !!created.id, JSON.stringify(created));
  const id = created.id;

  // ONE
  const one = await pbOne<{ id: string; name: string }>('roles', id);
  check('pbOne fetches it', one?.name === '__test_role__');

  // ONE missing -> null
  const missing = await pbOne('roles', 'doesnotexist0001');
  check('pbOne(missing) -> null', missing === null);

  // FIRST by filter
  const first = await pbFirst<{ id: string }>('roles', { name: { _eq: '__test_role__' } });
  check('pbFirst by filter', first?.id === id);

  // LIST with filter
  const listed = await pbList<{ id: string }>('roles', { filter: { admin_access: { _eq: true } }, perPage: 100 });
  check('pbList filter admin_access', listed.some((r) => r.id === id));

  // COUNT
  const countAll = await pbCount('roles');
  const countFiltered = await pbCount('roles', { name: { _eq: '__test_role__' } });
  check('pbCount all >= 1', countAll >= 1, `got ${countAll}`);
  check('pbCount filtered == 1', countFiltered === 1, `got ${countFiltered}`);

  // UPDATE
  const updated = await pbUpdate<{ admin_access: boolean }>('roles', id, { admin_access: false });
  check('pbUpdate applies', updated.admin_access === false);

  // DELETE
  const del = await pbDelete('roles', id);
  check('pbDelete ok', del === true);
  const gone = await pbOne('roles', id);
  check('record gone after delete', gone === null);

  console.log(`\n[test-helpers] ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('[test-helpers] fatal:', e?.message || e); process.exit(1); });
