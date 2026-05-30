import 'server-only';

import { tableName } from '@/server/supabase/config';
import { queryOne } from '@/server/supabase/db';

/**
 * adminCount used to dispatch to Directus or Supabase based on
 * isSupabaseDataEnabled(). It now always queries Supabase — the Directus
 * branch was unreachable under the cutover settings.
 *
 * The function still takes a string `table` argument for source compatibility
 * with callers that used to pass `TABLES.users` etc. We keep a small allowlist
 * to avoid SQL injection through `table`.
 */

const SAFE_TABLES = new Set([
  'users',
  'articles',
  'article_comments',
  'forum_topics',
  'forum_comments',
  'stories',
  'shop_items',
  'shop_orders',
  'admin_logs',
  'sponsors',
]);

export async function adminCount(table: string): Promise<number> {
  // Legacy callers asking for the Directus users collection — no such thing now.
  if (table === 'directus_users') return 0;
  if (!SAFE_TABLES.has(table)) return 0;
  const row = await queryOne<{ count: string }>(
    `select count(*)::text as count from ${tableName(table)}`,
  );
  return Number(row?.count) || 0;
}

export function adminCountUsers(): Promise<number> {
  return adminCount('users');
}
