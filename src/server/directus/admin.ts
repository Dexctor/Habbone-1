import 'server-only';

import { TABLES } from './tables';
import { directusCount } from './fetch';
import { isSupabaseDataEnabled, tableName } from '@/server/supabase/config';
import { queryOne } from '@/server/supabase/db';

export async function adminCount(table: string): Promise<number> {
  if (isSupabaseDataEnabled()) {
    if (table === 'directus_users') return 0;
    const safeTables = new Set([
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
    if (!safeTables.has(table)) return 0;
    const row = await queryOne<{ count: string }>(`select count(*)::text as count from ${tableName(table)}`);
    return Number(row?.count) || 0;
  }
  return directusCount(table);
}

export function adminCountUsers(): Promise<number> {
  if (isSupabaseDataEnabled()) return adminCount('users');
  return adminCount(TABLES.users);
}
