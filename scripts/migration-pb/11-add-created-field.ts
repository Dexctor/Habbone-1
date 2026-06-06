/**
 * PocketBase migration — Step 11: add the system `created` autodate field to
 * every business collection.
 *
 * ROOT CAUSE: when collections were created via the API with an explicit
 * `fields` array (Lot 1), PocketBase did NOT auto-add the `created` system
 * field. So any code sorting/reading by `created` returned HTTP 400 (masked by
 * try/catch -> empty lists). This affected stories, forum, admin_notifications,
 * shop, etc.
 *
 * FIX: add `created` (autodate, onCreate) to all collections. New records get a
 * real timestamp; existing records get the time this field was added (their true
 * legacy date wasn't stored — articles keep published_at for ordering).
 *
 * Idempotent: skips collections that already have `created`.
 *
 * Usage (VPS): node --env-file=.env.vps --import tsx scripts/migration-pb/11-add-created-field.ts
 */

import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

const COLLECTIONS = [
  'articles', 'article_comments', 'article_categories', 'article_comment_likes',
  'forum_topics', 'forum_comments', 'forum_categories', 'forum_comment_likes', 'forum_topic_votes',
  'stories', 'sponsors', 'shop_items', 'shop_orders', 'badges', 'user_badges',
  'admin_notifications', 'admin_logs', 'habbo_nick_history',
];

async function main() {
  const token = await pbAuth();
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  pb.authStore.save(token, null);

  console.log('[11] adding `created` autodate field to all collections\n');
  let added = 0, already = 0, failed = 0;

  for (const name of COLLECTIONS) {
    try {
      const col = await pb.collections.getOne(name);
      if ((col.fields || []).some((f: any) => f.name === 'created')) {
        console.log(`  • ${name} already has created`);
        already++;
        continue;
      }
      const fields = [...col.fields, { name: 'created', type: 'autodate', onCreate: true, onUpdate: false }];
      await pb.collections.update(name, { fields });
      console.log(`  ✓ ${name} + created`);
      added++;
    } catch (e: any) {
      console.log(`  ✗ ${name}: ${e?.response?.data ? JSON.stringify(e.response.data) : e?.message}`);
      failed++;
    }
  }

  console.log(`\n[11] done. added=${added} already=${already} failed=${failed}`);
}

main().catch((e) => { console.error('[11] fatal:', e?.message || e); process.exit(1); });
