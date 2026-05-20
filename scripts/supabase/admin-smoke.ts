import {
  adminCreateNews,
  adminDeleteNews,
  adminDeleteNewsComment,
  adminListNews,
  adminListNewsComments,
  adminUpdateNews,
  adminUpdateNewsComment,
  createNewsComment,
} from '@/server/directus/news';
import {
  adminDeleteForumComment,
  adminDeleteForumTopic,
  adminListForumComments,
  adminListForumPosts,
  adminListForumTopics,
  adminUpdateForumComment,
  adminUpdateForumPost,
  adminUpdateForumTopic,
  createForumComment,
  createForumTopic,
} from '@/server/directus/forum';
import { adminDeleteStory, adminListStories, adminUpdateStory, createStoryRow } from '@/server/directus/stories';
import { createRole, deleteRole, getRoleMemberCounts, listRoles, updateRole } from '@/server/directus/roles';
import { createSponsor, deleteSponsor, listSponsors, updateSponsor } from '@/server/directus/sponsors';
import {
  countUnreadNotifications,
  createAdminNotification,
  createShopItem,
  deleteShopItem,
  listAdminNotifications,
  listShopItems,
  listShopOrders,
  markNotificationRead,
  purchaseItem,
  updateShopItem,
} from '@/server/directus/shop';
import { getAdminLogs, logAdminAction } from '@/server/directus/admin-logs';
import { adminCount, adminCountUsers } from '@/server/directus/admin';
import { searchAdminUsers } from '@/server/services/admin-users';
import { isDirectusRuntimeDisabled } from '@/server/directus/client';
import { queryOne, queryRows } from '@/server/supabase/db';
import { tableName } from '@/server/supabase/config';

type SmokeResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const results: SmokeResult[] = [];
const cleanups: Array<() => Promise<void>> = [];

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || undefined });
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function cleanup() {
  for (const task of cleanups.reverse()) {
    try {
      await task();
    } catch {
      // Best effort cleanup. The failing test already carries the useful signal.
    }
  }
}

function requireSupabaseMode() {
  if ((process.env.DATA_BACKEND || '').trim().toLowerCase() !== 'supabase') {
    throw new Error('Set DATA_BACKEND=supabase before running this smoke test.');
  }
  if (!isDirectusRuntimeDisabled()) {
    throw new Error('Directus runtime is not disabled. Keep ALLOW_DIRECTUS_FALLBACK=false for cutover validation.');
  }
}

async function getSmokeUser() {
  const row = await queryOne<{ id: number; nick: string }>(
    `select id, nick from ${tableName('users')} where nick is not null order by id asc limit 1`,
  );
  if (!row?.id || !row.nick) throw new Error('No user available for smoke tests.');
  return { id: Number(row.id), nick: String(row.nick) };
}

async function getSmokeCategory() {
  const row = await queryOne<{ id: number }>(
    `select id from ${tableName('forum_categories')} order by id asc limit 1`,
  );
  return Number(row?.id || 1);
}

async function main() {
  requireSupabaseMode();
  const user = await getSmokeUser();
  const categoryId = await getSmokeCategory();
  const suffix = `${Date.now()}`;

  await check('directus runtime guard is active', async () => {
    return isDirectusRuntimeDisabled() ? 'blocked' : 'not blocked';
  });

  await check('admin dashboard counts read from Supabase', async () => {
    const [users, articles, topics] = await Promise.all([
      adminCountUsers(),
      adminCount('articles'),
      adminCount('forum_topics'),
    ]);
    if (users <= 0) throw new Error(`users count is ${users}`);
    return `users=${users}, articles=${articles}, topics=${topics}`;
  });

  await check('admin content lists read from Supabase', async () => {
    const [news, topics, comments, stories] = await Promise.all([
      adminListNews(5),
      adminListForumTopics(5),
      adminListNewsComments(5),
      adminListStories(5),
    ]);
    return `news=${news.length}, topics=${topics.length}, comments=${comments.length}, stories=${stories.length}`;
  });

  let articleId = 0;
  await check('admin article create/update/delete', async () => {
    const created = await adminCreateNews({
      titulo: `[codex-smoke] article ${suffix}`,
      descricao: 'smoke',
      imagem: '',
      noticia: '<p>Smoke test article</p>',
      autor: user.nick,
      status: 'draft',
    });
    articleId = Number(created.id);
    cleanups.push(async () => {
      if (articleId) await adminDeleteNews(articleId);
    });
    await adminUpdateNews(articleId, { titulo: `[codex-smoke] article updated ${suffix}` });
    await adminDeleteNews(articleId);
    articleId = 0;
  });

  await check('admin article comment create/update/delete', async () => {
    const base = (await adminListNews(1))[0];
    if (!base?.id) throw new Error('No article available for comment smoke test.');
    const created = await createNewsComment({
      newsId: Number(base.id),
      author: user.nick,
      authorId: user.id,
      content: `[codex-smoke] news comment ${suffix}`,
    });
    const commentId = Number(created.id);
    cleanups.push(async () => {
      await adminDeleteNewsComment(commentId);
    });
    await adminUpdateNewsComment(commentId, { comentario: `[codex-smoke] news comment updated ${suffix}` });
    await adminDeleteNewsComment(commentId);
  });

  let topicId = 0;
  await check('admin forum topic create/update/delete', async () => {
    const created = await createForumTopic({
      titulo: `[codex-smoke] topic ${suffix}`,
      conteudo: 'Smoke test topic',
      autor: user.nick,
      cat_id: categoryId,
    });
    topicId = Number(created.id);
    cleanups.push(async () => {
      if (topicId) await adminDeleteForumTopic(topicId);
    });
    await adminUpdateForumTopic(topicId, { titulo: `[codex-smoke] topic updated ${suffix}` });
    await adminDeleteForumTopic(topicId);
    topicId = 0;
  });

  await check('admin forum comment create/update/delete', async () => {
    const base = (await adminListForumTopics(1))[0];
    if (!base?.id) throw new Error('No forum topic available for comment smoke test.');
    const created = await createForumComment({
      topicId: Number(base.id),
      author: user.nick,
      authorId: user.id,
      content: `[codex-smoke] forum comment ${suffix}`,
    });
    const commentId = Number(created.id);
    cleanups.push(async () => {
      await adminDeleteForumComment(commentId);
    });
    await adminUpdateForumComment(commentId, { comentario: `[codex-smoke] forum comment updated ${suffix}` });
    await adminDeleteForumComment(commentId);
  });

  await check('legacy forum posts admin tab is deprecated', async () => {
    const posts = await adminListForumPosts();
    try {
      await adminUpdateForumPost(0, { conteudo: 'deprecated smoke' });
    } catch (error) {
      return `posts=${posts.length}, update=${error instanceof Error ? error.message : String(error)}`;
    }
    throw new Error('adminUpdateForumPost unexpectedly succeeded.');
  });

  await check('admin stories update/delete service is reachable', async () => {
    const created = await createStoryRow({
      title: `[codex-smoke] story ${suffix}`,
      imageId: 'uploads/codex-smoke.png',
      author: user.nick,
      status: 'draft',
    });
    const storyId = Number(created.id);
    cleanups.push(async () => adminDeleteStory(storyId));
    await adminUpdateStory(storyId, { status: 'public' });
    await adminDeleteStory(storyId);
  });

  await check('admin roles create/update/count/delete', async () => {
    const role = await createRole({
      name: `[codex-smoke] role ${suffix}`,
      description: 'temporary smoke test role',
      adminAccess: false,
      appAccess: true,
    });
    cleanups.push(async () => {
      await deleteRole(String(role.id));
    });
    await updateRole(String(role.id), { description: 'updated smoke role' });
    const counts = await getRoleMemberCounts();
    await deleteRole(String(role.id));
    return `roles=${(await listRoles()).length}, withoutRole=${counts.withoutRole}`;
  });

  await check('admin users search reads Supabase users', async () => {
    const result = await searchAdminUsers({ q: user.nick, page: 1, limit: 5 });
    if (!result.data.length) throw new Error('No users returned by admin search.');
    return `matches=${result.data.length}`;
  });

  await check('admin shop item create/update/delete', async () => {
    const item = await createShopItem({
      nome: `[codex-smoke] item ${suffix}`,
      descricao: 'temporary smoke item',
      imagem: '',
      preco: 1,
      estoque: 1,
      status: 'inativo',
    });
    if (!item?.id) throw new Error('Shop item was not created.');
    cleanups.push(async () => {
      await deleteShopItem(Number(item.id));
    });
    await updateShopItem(Number(item.id), { nome: `[codex-smoke] item updated ${suffix}` });
    await deleteShopItem(Number(item.id));
    return `items=${(await listShopItems(false)).length}`;
  });

  await check('admin shop orders list reads Supabase orders', async () => {
    const orders = await listShopOrders({ limit: 5, page: 1 });
    return `orders=${orders.data.length}/${orders.total}`;
  });

  await check('public shop purchase creates an order and updates stock', async () => {
    const item = await createShopItem({
      nome: `[codex-smoke] purchasable item ${suffix}`,
      descricao: 'temporary purchase smoke item',
      imagem: 'uploads/hm-a22190e3bf.png',
      preco: 0,
      estoque: 1,
      status: 'ativo',
    });
    if (!item?.id) throw new Error('Purchasable shop item was not created.');

    const itemId = Number(item.id);
    cleanups.push(async () => {
      await queryRows(`delete from ${tableName('shop_orders')} where item = $1`, [itemId]);
      await queryRows(`delete from ${tableName('admin_notifications')} where message like $1`, [
        `%[codex-smoke] purchasable item ${suffix}%`,
      ]);
      await deleteShopItem(itemId);
    });

    const purchase = await purchaseItem(user.id, user.nick, itemId);
    if (!purchase.ok) throw new Error(purchase.error || 'Purchase failed.');

    const updated = await listShopItems(false);
    const after = updated.find((row) => Number(row.id) === itemId);
    if (!after || after.estoque !== 0) throw new Error(`Expected stock 0, got ${after?.estoque}`);

    await queryRows(`delete from ${tableName('shop_orders')} where item = $1`, [itemId]);
    await queryRows(`delete from ${tableName('admin_notifications')} where message like $1`, [
      `%[codex-smoke] purchasable item ${suffix}%`,
    ]);
    await deleteShopItem(itemId);
  });

  await check('admin notifications create/read/mark/delete', async () => {
    const notification = await createAdminNotification({
      type: 'info',
      title: `[codex-smoke] notification ${suffix}`,
      message: 'temporary smoke notification',
      link: '/admin',
    });
    if (!notification?.id) throw new Error('Notification was not created.');
    cleanups.push(async () => {
      await queryRows(`delete from ${tableName('admin_notifications')} where id = $1`, [notification.id]);
    });
    await markNotificationRead(Number(notification.id));
    const unread = await countUnreadNotifications();
    const notifications = await listAdminNotifications({ limit: 5 });
    await queryRows(`delete from ${tableName('admin_notifications')} where id = $1`, [notification.id]);
    return `latest=${notifications.length}, unread=${unread}`;
  });

  await check('admin sponsors create/update/delete', async () => {
    const sponsor = await createSponsor({
      nome: `[codex-smoke] sponsor ${suffix}`,
      link: 'https://example.com',
      imagem: '',
      status: 'inativo',
    });
    cleanups.push(async () => {
      await deleteSponsor(Number(sponsor.id));
    });
    await updateSponsor(Number(sponsor.id), { nome: `[codex-smoke] sponsor updated ${suffix}` });
    await deleteSponsor(Number(sponsor.id));
    return `sponsors=${(await listSponsors(10)).length}`;
  });

  await check('admin logs write/read from Supabase', async () => {
    await logAdminAction({
      action: 'content.update',
      admin_id: 'codex-smoke',
      admin_name: 'Codex smoke',
      target_type: 'article',
      target_id: 0,
      details: { title: `[codex-smoke] log ${suffix}` },
    });
    cleanups.push(async () => {
      await queryRows(`delete from ${tableName('admin_logs')} where admin_id = $1`, ['codex-smoke']);
    });
    const logs = await getAdminLogs({ limit: 5 });
    await queryRows(`delete from ${tableName('admin_logs')} where admin_id = $1`, ['codex-smoke']);
    return `logs=${logs.data.length}`;
  });

  await cleanup();

  const failed = results.filter((result) => !result.ok);
  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.detail ? ` - ${result.detail}` : ''}`);
  }
  console.log(`SUMMARY ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch(async (error) => {
  await cleanup();
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
