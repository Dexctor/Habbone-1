/**
 * PocketBase migration — Lot 1d: remaining collections.
 *
 *   stories              (author -> users)
 *   sponsors             (created_by -> users)
 *   shop_items
 *   shop_orders          (item -> shop_items, buyer -> users)
 *   badges               (created_by -> users)
 *   user_badges          (badge -> badges, user -> users, granted_by -> users)  UNIQUE(badge,user)
 *   admin_notifications  (author -> users)
 *   admin_logs           (actor -> users)   — kept clean per §3.16
 *   habbo_nick_history   (user -> users, nullable)
 *
 * Schema source: schema-v2.md §3.9–3.17.
 * Usage: npx tsx scripts/migration-pb/01d-misc.ts
 */

import { PB_URL, getCollection, createCollection, updateCollection, f, log, type PBCollection } from './_pb';

async function ensure(name: string, buildFields: () => any[]): Promise<string> {
  const existing = await getCollection(name);
  if (existing) {
    log(`  • ${name} exists (id ${existing.id}) — skip`);
    return existing.id;
  }
  const created: PBCollection = await createCollection({
    name,
    type: 'base',
    fields: buildFields(),
    listRule: '',
    viewRule: '',
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  log(`  ✓ ${name} created (id ${created.id})`);
  return created.id;
}

async function idOf(name: string): Promise<string> {
  const c = await getCollection(name);
  if (!c) throw new Error(`dependency "${name}" not found — run its lot first`);
  return c.id;
}

async function addUniqueIndex(collection: string, indexName: string, cols: string): Promise<void> {
  const c = await getCollection(collection);
  if (!c) return;
  if ((c.indexes as string[] | undefined)?.some((i) => i.includes(indexName))) return;
  await updateCollection(c.id, {
    indexes: [
      ...(Array.isArray(c.indexes) ? c.indexes : []),
      `CREATE UNIQUE INDEX \`${indexName}\` ON \`${collection}\` (${cols})`,
    ],
  });
  log(`  ✓ ${collection} unique index (${cols})`);
}

async function main(): Promise<void> {
  log(`[lot1d] target: ${PB_URL}`);
  const usersId = await idOf('users');

  // stories (§3.9)
  await ensure('stories', () => [
    f.text('title'),
    f.url('image'),
    f.relation('author', usersId),
    f.select('status', ['public', 'hidden', 'draft']),
    f.date('published_at'),
  ]);

  // sponsors (§3.10)
  await ensure('sponsors', () => [
    f.text('name', { required: true }),
    f.url('link'),
    f.url('image'),
    f.bool('active'),
    f.number('sort'),
    f.relation('created_by', usersId),
  ]);

  // shop_items (§3.11)
  await ensure('shop_items', () => [
    f.text('name', { required: true }),
    f.editor('description'),
    f.url('image'),
    f.number('price_coins'),
    f.number('stock'),
    f.number('sold_count'),
    f.bool('free'),
    f.bool('active'),
  ]);
  const shopItemsId = await idOf('shop_items');

  // shop_orders (§3.12)
  await ensure('shop_orders', () => [
    f.relation('item', shopItemsId),
    f.relation('buyer', usersId),
    f.number('price_paid'),
    f.select('status', ['pending', 'delivered', 'cancelled']),
    f.date('delivered_at'),
  ]);

  // badges (§3.13)
  await ensure('badges', () => [
    f.text('name', { required: true }),
    f.text('description'),
    f.url('image'),
    f.bool('free'),
    f.bool('active'),
    f.relation('created_by', usersId),
  ]);
  const badgesId = await idOf('badges');

  // user_badges (§3.14) — UNIQUE(badge,user)
  await ensure('user_badges', () => [
    f.relation('badge', badgesId),
    f.relation('user', usersId),
    f.select('source', ['free', 'earned', 'bought', 'generated']),
    f.relation('granted_by', usersId),
    f.bool('active'),
  ]);
  await addUniqueIndex('user_badges', 'idx_ub_unique', '`badge`, `user`');

  // admin_notifications (§3.15)
  await ensure('admin_notifications', () => [
    f.editor('message'),
    f.select('severity', ['success', 'info', 'warning', 'danger']),
    f.bool('read'),
    f.relation('author', usersId),
  ]);

  // admin_logs (§3.16) — kept clean; actor + action enum + free-form detail
  await ensure('admin_logs', () => [
    f.relation('actor', usersId),
    f.select('action', ['create', 'update', 'delete', 'login', 'ban', 'unban', 'other']),
    f.text('target'),
    f.editor('detail'),
  ]);

  // habbo_nick_history (§3.17) — user nullable
  await ensure('habbo_nick_history', () => [
    f.relation('user', usersId),
    f.text('habbo_unique_id'),
    f.text('hotel'),
    f.text('old_nick'),
    f.text('new_nick'),
  ]);

  const names = [
    'stories', 'sponsors', 'shop_items', 'shop_orders', 'badges',
    'user_badges', 'admin_notifications', 'admin_logs', 'habbo_nick_history',
  ];
  const states = await Promise.all(names.map((n) => getCollection(n)));
  log('');
  log('[lot1d] done:');
  names.forEach((n, i) => log(`  ${states[i] ? '✓' : '✗'} ${n}${states[i] ? ` (${states[i]!.fields.length} fields)` : ' MISSING'}`));
  log('[lot1d] → Lot 1 complet. Vérif globale conseillée ensuite.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[lot1d] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
