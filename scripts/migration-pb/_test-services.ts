/**
 * End-to-end smoke test for the ported service layer (Lot 3) against real PB.
 * Exercises roles, users, news, forum, shop through their public service APIs
 * to prove they actually work (not just compile).
 *
 * Run: node --env-file=.env.local --import tsx scripts/migration-pb/_test-services.ts
 * Cleans up everything it creates. Temp file.
 */

import { createRole, getRoleById, updateRole } from '../../src/server/pocketbase/roles';
import { createUser, getUserByNick, getUserById } from '../../src/server/pocketbase/users';
import { invalidateUserCache } from '../../src/server/pocketbase/user-cache';
import { adminCreateNews, getPublicNewsById, adminDeleteNews } from '../../src/server/pocketbase/news';
import { createForumTopic, getPublicTopicById, adminDeleteForumTopic } from '../../src/server/pocketbase/forum';
import { createShopItem, getShopItem, deleteShopItem } from '../../src/server/pocketbase/shop';
import { pbAdmin } from '../../src/server/pocketbase/client';

let pass = 0, fail = 0;
const cleanup: Array<() => Promise<unknown>> = [];
function check(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
}

async function main() {
  console.log('[test-services] service layer e2e against PocketBase\n');
  const pb = await pbAdmin();

  // ── roles ──
  const role = await createRole({ name: '__svc_role__', adminAccess: false, appAccess: true });
  cleanup.push(() => pb.collection('roles').delete(role.id));
  check('roles.createRole', !!role.id);
  const roleBack = await getRoleById(role.id);
  check('roles.getRoleById', roleBack?.name === '__svc_role__');
  const roleUpd = await updateRole(role.id, { adminAccess: true });
  check('roles.updateRole admin_access', roleUpd.admin_access === true);

  // ── users ──
  const created: any = await createUser({
    nick: '__svc_user__',
    senha: 'svcPwd12345',
    email: '',
    habboHotel: 'fr',
    ativado: 's',
  });
  cleanup.push(() => pb.collection('users').delete(created.id));
  check('users.createUser returns id', !!created.id);
  invalidateUserCache();
  const byNick: any = await getUserByNick('__svc_user__', 'fr');
  check('users.getUserByNick (legacy shape)', byNick?.nick === '__svc_user__' && byNick?.ativado === 's');
  const byId: any = await getUserById(String(created.id));
  check('users.getUserById', byId?.id === String(created.id));

  // ── news (author resolves via nick -> id) ──
  invalidateUserCache();
  const news: any = await adminCreateNews({
    titulo: 'Svc Test Article',
    noticia: '<p>body</p>',
    autor: '__svc_user__',
    status: 'published',
  });
  cleanup.push(() => adminDeleteNews(String(news.id)));
  check('news.adminCreateNews (legacy shape)', news?.titulo === 'Svc Test Article');
  check('news author resolved to nick', news?.autor === '__svc_user__', `got ${news?.autor}`);
  const newsBack: any = await getPublicNewsById(String(news.id));
  check('news.getPublicNewsById', newsBack?.titulo === 'Svc Test Article');

  // ── forum ──
  invalidateUserCache();
  const topic: any = await createForumTopic({
    titulo: 'Svc Topic',
    conteudo: 'hello',
    autor: '__svc_user__',
  });
  cleanup.push(() => adminDeleteForumTopic(String(topic.id)));
  check('forum.createForumTopic (legacy shape)', topic?.titulo === 'Svc Topic');
  const topicBack: any = await getPublicTopicById(String(topic.id));
  check('forum.getPublicTopicById', topicBack?.titulo === 'Svc Topic');

  // ── shop ──
  const item: any = await createShopItem({
    nome: 'Svc Item', imagem: 'x.png', preco: 10, estoque: 5, status: 'ativo',
  } as any);
  if (item?.id) cleanup.push(() => deleteShopItem(item.id));
  check('shop.createShopItem', item?.nome === 'Svc Item' && item?.preco === 10);
  const itemBack = await getShopItem(item.id);
  check('shop.getShopItem', itemBack?.nome === 'Svc Item');

  // cleanup
  console.log('\n  cleaning up…');
  for (const fn of cleanup.reverse()) await fn().catch(() => {});

  console.log(`\n[test-services] ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('[test-services] fatal:', e?.message || e); process.exit(1); });
