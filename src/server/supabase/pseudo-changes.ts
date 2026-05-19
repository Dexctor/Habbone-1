import 'server-only';

import { tableName } from './config';
import { queryOne, queryRows } from './db';

export interface PseudoChange {
  id: number;
  habbo_unique_id: string;
  old_nick: string;
  new_nick: string;
  hotel: string;
  user_id: number | null;
  changed_at: number;
}

type DedupEntry = { lastSeenNick: string; lastSyncAt: number };
const DEDUP_CACHE = new Map<string, DedupEntry>();
const DEDUP_TTL_MS = 5 * 60 * 1000;

function detectHotelFromUniqueId(uniqueId: string): string {
  const match = uniqueId.match(/^hh([a-z]+)-/i);
  if (!match) return 'fr';
  const code = match[1].toLowerCase();
  const map: Record<string, string> = {
    fr: 'fr', com: 'com', combr: 'com.br', es: 'es', it: 'it',
    de: 'de', nl: 'nl', fi: 'fi', comtr: 'com.tr',
  };
  return map[code] ?? code;
}

async function getLastKnownNick(uniqueId: string): Promise<string | null> {
  const recent = await queryOne<{ new_nick: string | null }>(
    `select new_nick from ${tableName('pseudo_changes')}
     where habbo_unique_id = $1
     order by changed_at desc, id desc
     limit 1`,
    [uniqueId],
  );
  if (recent?.new_nick) return String(recent.new_nick);

  const user = await queryOne<{ habbo_name: string | null }>(
    `select habbo_name from ${tableName('users')} where habbo_unique_id = $1 limit 1`,
    [uniqueId],
  );
  return user?.habbo_name ? String(user.habbo_name) : null;
}

export async function syncHabboName(
  uniqueId: string,
  currentNick: string,
  options?: {
    hotel?: string;
    userId?: number;
    previousNick?: string;
  },
): Promise<{ changed: boolean; oldNick?: string } | null> {
  try {
    const cleanId = String(uniqueId || '').trim();
    const cleanNick = String(currentNick || '').trim();
    if (!cleanId || !cleanNick) return null;
    const hotel = String(options?.hotel || detectHotelFromUniqueId(cleanId)).toLowerCase();

    const cached = DEDUP_CACHE.get(cleanId);
    if (cached && Date.now() - cached.lastSyncAt < DEDUP_TTL_MS && cached.lastSeenNick === cleanNick) {
      return { changed: false };
    }

    const previousNick = options?.previousNick ?? await getLastKnownNick(cleanId);
    if (!previousNick || previousNick === cleanNick) {
      DEDUP_CACHE.set(cleanId, { lastSeenNick: cleanNick, lastSyncAt: Date.now() });
      return { changed: false };
    }

    await queryRows(
      `insert into ${tableName('pseudo_changes')} (habbo_unique_id, old_nick, new_nick, hotel, user_id, changed_at)
       values ($1, $2, $3, $4, $5, extract(epoch from now())::integer)`,
      [cleanId, previousNick, cleanNick, hotel, options?.userId ?? null],
    );

    if (options?.userId) {
      await queryRows(`update ${tableName('users')} set habbo_name = $2 where id = $1`, [options.userId, cleanNick]);
    }

    DEDUP_CACHE.set(cleanId, { lastSeenNick: cleanNick, lastSyncAt: Date.now() });
    return { changed: true, oldNick: previousNick };
  } catch (error: unknown) {
    console.error('[pseudo-changes] supabase sync failed:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function listPseudoChanges(options?: {
  hotel?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: PseudoChange[]; total: number }> {
  const { hotel, limit = 50, page = 1 } = options || {};
  const values: unknown[] = [];
  const where: string[] = [];
  if (hotel && hotel !== 'all') {
    values.push(hotel);
    where.push(`hotel = $${values.length}`);
  }
  values.push(limit, Math.max(0, page - 1) * limit);
  const limitParam = values.length - 1;
  const offsetParam = values.length;
  const whereSql = where.length ? `where ${where.join(' and ')}` : '';

  const rows = await queryRows<PseudoChange>(
    `select id, habbo_unique_id, old_nick, new_nick, hotel, user_id, changed_at
     from ${tableName('pseudo_changes')}
     ${whereSql}
     order by changed_at desc, id desc
     limit $${limitParam}
     offset $${offsetParam}`,
    values,
  );
  const countRow = await queryOne<{ count: string }>(
    `select count(*)::text as count from ${tableName('pseudo_changes')} ${whereSql}`,
    values.slice(0, -2),
  );
  return { data: rows, total: Number(countRow?.count) || rows.length };
}
