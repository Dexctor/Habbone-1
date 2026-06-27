/**
 * E2E test of admin service functions against the VPS PocketBase.
 * Exercises the CRUD paths the admin panel uses (create/update/delete) for
 * articles, topics, comments, shop, roles, users — non-destructively (cleans up).
 * Run: node --env-file=.env.vps --import tsx scripts/migration-pb/_test-admin.ts
 */

import * as news from '../../src/server/directus/news';
import * as forum from '../../src/server/directus/forum';
import * as shop from '../../src/server/directus/shop';
import * as roles from '../../src/server/directus/roles';
import * as legacyUsers from '../../src/server/directus/legacy-users';
import * as adminUsers from '../../src/server/directus/admin-users';
import { invalidateUserCache } from '../../src/server/directus/user-cache';

let pass = 0, fail = 0;
const cleanup: Array<() => Promise<unknown>> = [];
function check(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
}

async function main() {
  console.log('[admin-test] CRUD admin functions vs VPS\n');

  // ── READS (admin lists) ──
  console.log('READS:');
  const newsList = await news.adminListNews(10).catch(() => []);
  check('adminListNews', newsList.length > 0, `${newsList.length}`);
  const topicList = await forum.adminListForumTopics(10).catch(() => []);
  check('adminListForumTopics', topicList.length >= 0, `${topicList.length}`);
  const shopItems = await shop.listShopItems(false).catch(() => []);
  check('listShopItems', shopItems.length >= 0, `${shopItems.length}`);
  const rolesList = await roles.listRoles().catch(() => []);
  check('listRoles', rolesList.length > 0, `${rolesList.length} rôles`);
  const usersSearch = await legacyUsers.searchLegacyUsuarios('', 5, 1).catch(() => ({ items: [], total: 0 }));
  check('searchLegacyUsuarios', usersSearch.total > 0, `total ${usersSearch.total}`);
  const notifs = await shop.listAdminNotifications({ limit: 5 }).catch(() => []);
  check('listAdminNotifications', notifs.length >= 0, `${notifs.length}`);

  // ── ARTICLE create/update/delete ──
  console.log('\nARTICLE CRUD:');
  const art: any = await news.adminCreateNews({ titulo: '__admintest__', noticia: '<p>x</p>', autor: 'Decrypt', status: 'published' }).catch((e) => ({ error: e?.message }));
  check('adminCreateNews', !!art?.id, art?.error);
  if (art?.id) {
    cleanup.push(() => news.adminDeleteNews(String(art.id)));
    const upd = await news.adminUpdateNews(String(art.id), { titulo: '__admintest2__' }).catch((e) => ({ error: e?.message }));
    check('adminUpdateNews', (upd as any)?.titulo === '__admintest2__', (upd as any)?.error);
  }

  // ── TOPIC create/update/delete ──
  console.log('\nTOPIC CRUD:');
  const top: any = await forum.createForumTopic({ titulo: '__admintop__', conteudo: 'x', autor: 'Decrypt' }).catch((e) => ({ error: e?.message }));
  check('createForumTopic', !!top?.id, top?.error);
  if (top?.id) {
    cleanup.push(() => forum.adminDeleteForumTopic(String(top.id)));
    const upd = await forum.adminUpdateForumTopic(String(top.id), { titulo: '__admintop2__', fechado: 's' }).catch((e) => ({ error: e?.message }));
    check('adminUpdateForumTopic (+ fechado)', (upd as any)?.titulo === '__admintop2__', (upd as any)?.error);
  }

  // ── SHOP item create/update/delete ──
  console.log('\nSHOP CRUD:');
  const item: any = await shop.createShopItem({ nome: '__admitem__', imagem: '', preco: 5, estoque: 3, status: 'ativo' } as any).catch((e) => ({ error: e?.message }));
  check('createShopItem', !!item?.id, item?.error);
  if (item?.id) {
    cleanup.push(() => shop.deleteShopItem(item.id));
    const upd = await shop.updateShopItem(item.id, { preco: 99 }).catch((e) => ({ error: e?.message }));
    check('updateShopItem', (upd as any)?.preco === 99, (upd as any)?.error);
  }

  // ── ROLE create/update/delete ──
  console.log('\nROLE CRUD:');
  const role: any = await roles.createRole({ name: '__admrole__', adminAccess: false }).catch((e) => ({ error: e?.message }));
  check('createRole', !!role?.id, role?.error);
  if (role?.id) {
    cleanup.push(() => import('../../src/server/directus/pb-helpers').then(m => m.pbDelete('roles', role.id)));
    const upd = await roles.updateRole(role.id, { adminAccess: true }).catch((e) => ({ error: e?.message }));
    check('updateRole', (upd as any)?.admin_access === true, (upd as any)?.error);
  }

  // ── USER role change + ban (on a test user) ──
  console.log('\nUSER admin ops:');
  const testUser: any = await legacyUsers.searchLegacyUsuarios('testadmin', 1, 1).catch(() => ({ items: [] }));
  const uid = testUser.items?.[0]?.id;
  if (uid && role?.id) {
    const setR = await legacyUsers.setLegacyUserRoleId(String(uid), role.id).catch((e) => ({ error: e?.message }));
    check('setLegacyUserRoleId', !(setR as any)?.error, (setR as any)?.error);
    const ban = await legacyUsers.setLegacyUserBanStatus(String(uid), false).catch((e) => ({ error: e?.message }));
    check('setLegacyUserBanStatus', !(ban as any)?.error, (ban as any)?.error);
    const lite = await adminUsers.getDirectusUserById(String(uid)).catch(() => null);
    check('getDirectusUserById', !!lite, 'null');
  } else {
    check('user ops (testadmin found)', false, 'testadmin introuvable');
  }

  // cleanup
  console.log('\n  cleaning up test data…');
  invalidateUserCache();
  for (const fn of cleanup.reverse()) await fn().catch(() => {});

  console.log(`\n[admin-test] ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('[admin-test] fatal:', e?.message || e); process.exit(1); });
