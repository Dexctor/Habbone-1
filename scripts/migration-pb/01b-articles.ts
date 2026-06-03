/**
 * PocketBase migration — Lot 1b: article collections.
 *
 * Creates (in dependency order):
 *   article_categories
 *   articles               (category -> article_categories, author -> users)
 *   article_comments       (article -> articles, author -> users)
 *   article_comment_likes  (comment -> article_comments, user -> users)
 *
 * Schema source: schema-v2.md §3.2–3.4.
 * Relations need the TARGET collection id, resolved at runtime via getCollection().
 * Idempotent: existing collections are skipped.
 *
 * Usage: npx tsx scripts/migration-pb/01b-articles.ts
 */

import {
  PB_URL,
  getCollection,
  createCollection,
  f,
  log,
  type PBCollection,
} from './_pb';

/** Create a base collection if missing; return its id either way. */
async function ensure(
  name: string,
  buildFields: () => Promise<any[]> | any[],
  rules?: Partial<Record<'listRule' | 'viewRule' | 'createRule' | 'updateRule' | 'deleteRule', string | null>>,
): Promise<string> {
  const existing = await getCollection(name);
  if (existing) {
    log(`  • ${name} exists (id ${existing.id}) — skip`);
    return existing.id;
  }
  const fields = await buildFields();
  const created: PBCollection = await createCollection({
    name,
    type: 'base',
    fields,
    // Public content: world-readable, superuser-writable by default.
    listRule: rules?.listRule ?? '',
    viewRule: rules?.viewRule ?? '',
    createRule: rules?.createRule ?? null,
    updateRule: rules?.updateRule ?? null,
    deleteRule: rules?.deleteRule ?? null,
  });
  log(`  ✓ ${name} created (id ${created.id})`);
  return created.id;
}

/** Resolve a collection id, throwing a clear error if a dependency is missing. */
async function idOf(name: string): Promise<string> {
  const c = await getCollection(name);
  if (!c) throw new Error(`dependency "${name}" not found — run its lot first`);
  return c.id;
}

async function main(): Promise<void> {
  log(`[lot1b] target: ${PB_URL}`);
  const usersId = await idOf('users');

  // 1. article_categories (schema-v2 §3.2 ref — articles.category points here)
  const categoriesId = await ensure('article_categories', () => [
    f.text('name', { required: true }),
    f.text('slug'),
    f.text('description'),
    f.number('sort'),
    f.bool('active'),
  ]);

  // 2. articles (schema-v2 §3.2)
  await ensure('articles', () => [
    f.text('title', { required: true }),
    f.text('slug'),
    f.text('summary'),
    f.url('cover_image'), // URL/UUID kept as text — plan §7.5
    f.editor('body'),
    f.relation('category', categoriesId),
    f.relation('author', usersId),
    f.select('status', ['draft', 'published', 'archived']),
    f.bool('pinned'),
    f.bool('comments_enabled'),
    f.number('views'),
    f.date('published_at'),
  ]);
  const articlesId = await idOf('articles');

  // 3. article_comments (schema-v2 §3.3)
  await ensure('article_comments', () => [
    f.relation('article', articlesId),
    f.relation('author', usersId),
    f.editor('content'),
    f.number('likes_count'),
    f.select('status', ['active', 'hidden', 'deleted']),
  ]);
  const commentsId = await idOf('article_comments');

  // 4. article_comment_likes (schema-v2 §3.4) — unique on (comment, user)
  await ensure(
    'article_comment_likes',
    () => [f.relation('comment', commentsId), f.relation('user', usersId)],
    {},
  );
  // add the uniqueness index post-create (kept simple: separate concern)
  const likes = await getCollection('article_comment_likes');
  if (likes && !(likes.indexes as string[] | undefined)?.some((i) => i.includes('idx_acl_unique'))) {
    const { updateCollection } = await import('./_pb');
    await updateCollection(likes.id, {
      indexes: [
        ...(Array.isArray(likes.indexes) ? likes.indexes : []),
        'CREATE UNIQUE INDEX `idx_acl_unique` ON `article_comment_likes` (`comment`, `user`)',
      ],
    });
    log('  ✓ article_comment_likes unique index (comment,user)');
  }

  // read-back
  const names = ['article_categories', 'articles', 'article_comments', 'article_comment_likes'];
  const states = await Promise.all(names.map((n) => getCollection(n)));
  log('');
  log('[lot1b] done:');
  names.forEach((n, i) =>
    log(`  ${states[i] ? '✓' : '✗'} ${n}${states[i] ? ` (${states[i]!.fields.length} fields)` : ' MISSING'}`),
  );
  log('[lot1b] → vérifie le dashboard, puis Lot 1c (forum).');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[lot1b] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
