/**
 * PocketBase migration — Lot 1c: forum collections.
 *
 * Creates (in dependency order):
 *   forum_categories
 *   forum_topics         (category -> forum_categories, author -> users, locked_by -> users)
 *   forum_comments       (topic -> forum_topics, author -> users)
 *   forum_comment_likes  (comment -> forum_comments, user -> users)  UNIQUE(comment,user)
 *   forum_topic_votes    (topic -> forum_topics, user -> users)      UNIQUE(topic,user)
 *
 * Schema source: schema-v2.md §3.5–3.8.
 * Usage: npx tsx scripts/migration-pb/01c-forum.ts
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
  log(`[lot1c] target: ${PB_URL}`);
  const usersId = await idOf('users');

  // 1. forum_categories (schema-v2 §3.5)
  const catId = await ensure('forum_categories', () => [
    f.text('name', { required: true }),
    f.text('slug'),
    f.text('description'),
    f.text('icon'),
    f.number('sort'),
    f.bool('active'),
  ]);

  // 2. forum_topics (schema-v2 §3.6)
  await ensure('forum_topics', () => [
    f.text('title', { required: true }),
    f.editor('body'),
    f.url('cover_image'),
    f.relation('category', catId),
    f.relation('author', usersId),
    f.bool('pinned'),
    f.bool('locked'),
    f.text('locked_reason'),
    f.relation('locked_by', usersId),
    f.date('locked_at'),
    f.number('views'),
    f.select('status', ['active', 'hidden']),
  ]);
  const topicsId = await idOf('forum_topics');

  // 3. forum_comments (schema-v2 §3.7)
  await ensure('forum_comments', () => [
    f.relation('topic', topicsId),
    f.relation('author', usersId),
    f.editor('content'),
    f.number('likes_count'),
    f.select('status', ['active', 'hidden', 'deleted']),
  ]);
  const commentsId = await idOf('forum_comments');

  // 4. forum_comment_likes (schema-v2 §3.8) — UNIQUE(comment,user)
  await ensure('forum_comment_likes', () => [f.relation('comment', commentsId), f.relation('user', usersId)]);
  await addUniqueIndex('forum_comment_likes', 'idx_fcl_unique', '`comment`, `user`');

  // 5. forum_topic_votes (schema-v2 §3.8) — UNIQUE(topic,user), value = up/down
  await ensure('forum_topic_votes', () => [
    f.relation('topic', topicsId),
    f.relation('user', usersId),
    f.select('value', ['up', 'down']),
  ]);
  await addUniqueIndex('forum_topic_votes', 'idx_ftv_unique', '`topic`, `user`');

  const names = ['forum_categories', 'forum_topics', 'forum_comments', 'forum_comment_likes', 'forum_topic_votes'];
  const states = await Promise.all(names.map((n) => getCollection(n)));
  log('');
  log('[lot1c] done:');
  names.forEach((n, i) => log(`  ${states[i] ? '✓' : '✗'} ${n}${states[i] ? ` (${states[i]!.fields.length} fields)` : ' MISSING'}`));
  log('[lot1c] → vérifie le dashboard, puis Lot 1d (stories, shop, badges, ...).');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[lot1c] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
