import 'server-only';

import { pbList, pbFirst, pbCreate, pbUpdate, pbCount } from './pb-helpers';
import { TABLES } from './tables';
import { isoToUnixSeconds } from './user-cache';

const TABLE = TABLES.pseudoChanges; // habbo_nick_history
const USERS_TABLE = TABLES.users;

/* ------------------------------------------------------------------ */
/*  Field map (v2: habbo_nick_history)                                 */
/* ------------------------------------------------------------------ */

const FIELDS = {
  id: 'id',
  uniqueId: 'habbo_unique_id',
  oldNick: 'old_nick',
  newNick: 'new_nick',
  hotel: 'hotel',
  user: 'user',
  changedAt: 'created', // PB system autodate
};

const SELECT_FIELDS = `${FIELDS.id},${FIELDS.uniqueId},${FIELDS.oldNick},${FIELDS.newNick},${FIELDS.hotel},${FIELDS.user},${FIELDS.changedAt}`;
const SORT = `-${FIELDS.changedAt}`;

export interface PseudoChange {
  id: string;
  habbo_unique_id: string;
  old_nick: string;
  new_nick: string;
  hotel: string;
  user_id: string | null;
  changed_at: number; // unix seconds
}

function mapRow(row: any): PseudoChange {
  return {
    id: String(row[FIELDS.id]),
    habbo_unique_id: String(row[FIELDS.uniqueId] || ''),
    old_nick: String(row[FIELDS.oldNick] || ''),
    new_nick: String(row[FIELDS.newNick] || ''),
    hotel: String(row[FIELDS.hotel] || ''),
    user_id: row[FIELDS.user] ? String(row[FIELDS.user]) : null,
    changed_at: isoToUnixSeconds(row[FIELDS.changedAt]) ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Dedup cache                                                        */
/* ------------------------------------------------------------------ */

type DedupEntry = { lastSeenNick: string; lastSyncAt: number };
const DEDUP_CACHE = new Map<string, DedupEntry>();
const DEDUP_TTL_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  syncHabboName                                                      */
/* ------------------------------------------------------------------ */

export async function syncHabboName(
  uniqueId: string,
  currentNick: string,
  options?: {
    hotel?: string;
    userId?: string;
    previousNick?: string;
  },
): Promise<{ changed: boolean; oldNick?: string } | null> {
  try {
    const cleanId = String(uniqueId || '').trim();
    const cleanNick = String(currentNick || '').trim();
    if (!cleanId || !cleanNick) return null;

    const hotel = String(options?.hotel || detectHotelFromUniqueId(cleanId)).toLowerCase();

    const cacheKey = cleanId;
    const cached = DEDUP_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.lastSyncAt < DEDUP_TTL_MS) {
      if (cached.lastSeenNick === cleanNick) {
        return { changed: false };
      }
    }

    let previousNick = options?.previousNick ?? null;
    if (previousNick === null) {
      previousNick = await getLastKnownNick(cleanId);
    }

    if (previousNick === null || previousNick === cleanNick) {
      DEDUP_CACHE.set(cacheKey, { lastSeenNick: cleanNick, lastSyncAt: Date.now() });
      return { changed: false };
    }

    // CHANGE DETECTED — log it
    await pbCreate(TABLE, {
      [FIELDS.uniqueId]: cleanId,
      [FIELDS.oldNick]: previousNick,
      [FIELDS.newNick]: cleanNick,
      [FIELDS.hotel]: hotel,
      [FIELDS.user]: options?.userId ?? null,
    });

    // Update the user's habbo_name snapshot if userId is known
    if (options?.userId) {
      try {
        await pbUpdate(USERS_TABLE, options.userId, { habbo_name: cleanNick });
      } catch {
        /* silent */
      }
    }

    DEDUP_CACHE.set(cacheKey, { lastSeenNick: cleanNick, lastSyncAt: Date.now() });
    return { changed: true, oldNick: previousNick };
  } catch (error: any) {
    console.error('[pseudo-changes] syncHabboName failed:', error?.message || error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  getLastKnownNick                                                   */
/* ------------------------------------------------------------------ */

async function getLastKnownNick(uniqueId: string): Promise<string | null> {
  try {
    const recent = await pbFirst<any>(
      TABLE,
      { [FIELDS.uniqueId]: { _eq: uniqueId } },
      { sort: `-${FIELDS.changedAt}`, fields: FIELDS.newNick },
    );
    if (recent?.[FIELDS.newNick]) {
      return String(recent[FIELDS.newNick]);
    }

    // Fallback: users table
    const user = await pbFirst<{ habbo_name: string | null }>(
      USERS_TABLE,
      { habbo_unique_id: { _eq: uniqueId } },
      { fields: 'habbo_name' },
    );
    if (user?.habbo_name) {
      return String(user.habbo_name);
    }

    return null;
  } catch {
    return null;
  }
}

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

/* ------------------------------------------------------------------ */
/*  Public list                                                        */
/* ------------------------------------------------------------------ */

export async function listPseudoChanges(options?: {
  hotel?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: PseudoChange[]; total: number }> {
  const { hotel, limit = 50, page = 1 } = options || {};
  try {
    const filter: Record<string, unknown> = {};
    if (hotel && hotel !== 'all') filter[FIELDS.hotel] = { _eq: hotel };
    const hasFilter = Object.keys(filter).length > 0;

    const [rows, total] = await Promise.all([
      pbList<any>(TABLE, {
        filter: hasFilter ? filter : undefined,
        sort: SORT,
        perPage: limit,
        page,
        fields: SELECT_FIELDS,
      }),
      pbCount(TABLE, hasFilter ? filter : undefined),
    ]);

    return { data: (rows || []).map(mapRow), total };
  } catch (error) {
    console.error('[pseudo-changes] listPseudoChanges failed:', error);
    return { data: [], total: 0 };
  }
}
