import 'server-only';

import { directusService as directus, rItems, cItem, uItem } from './client';
import { directusFetch } from './fetch';
import { TABLES, USE_V2 } from './tables';
import { resolveUserId, isoToUnixSeconds } from './user-cache';

const TABLE = TABLES.pseudoChanges;
const USERS_TABLE = TABLES.users;

/* ------------------------------------------------------------------ */
/*  Field maps                                                         */
/* ------------------------------------------------------------------ */

const FIELDS = USE_V2
  ? {
      id: 'id',
      uniqueId: 'habbo_unique_id',
      oldNick: 'old_nick',
      newNick: 'new_nick',
      hotel: 'hotel',
      user: 'user',
      changedAt: 'created_at',
    }
  : {
      id: 'id',
      uniqueId: 'habbo_unique_id',
      oldNick: 'old_nick',
      newNick: 'new_nick',
      hotel: 'hotel',
      user: 'user_id',
      changedAt: 'changed_at',
    };

const SELECT_FIELDS = [FIELDS.id, FIELDS.uniqueId, FIELDS.oldNick, FIELDS.newNick, FIELDS.hotel, FIELDS.user, FIELDS.changedAt];
const SORT = [`-${FIELDS.changedAt}`, '-id'];

export interface PseudoChange {
  id: number;
  habbo_unique_id: string;
  old_nick: string;
  new_nick: string;
  hotel: string;
  user_id: number | null;
  changed_at: number; // unix seconds
}

function mapRow(row: any): PseudoChange {
  const rawChangedAt = row[FIELDS.changedAt];
  let changedAtUnix = 0;
  if (USE_V2) {
    changedAtUnix = isoToUnixSeconds(rawChangedAt) ?? 0;
  } else {
    changedAtUnix = Number(rawChangedAt) || 0;
  }
  return {
    id: Number(row[FIELDS.id]),
    habbo_unique_id: String(row[FIELDS.uniqueId] || ''),
    old_nick: String(row[FIELDS.oldNick] || ''),
    new_nick: String(row[FIELDS.newNick] || ''),
    hotel: String(row[FIELDS.hotel] || ''),
    user_id: row[FIELDS.user] ? Number(row[FIELDS.user]) : null,
    changed_at: changedAtUnix,
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
    userId?: number;
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

    if (previousNick === null) {
      DEDUP_CACHE.set(cacheKey, { lastSeenNick: cleanNick, lastSyncAt: Date.now() });
      return { changed: false };
    }

    if (previousNick === cleanNick) {
      DEDUP_CACHE.set(cacheKey, { lastSeenNick: cleanNick, lastSyncAt: Date.now() });
      return { changed: false };
    }

    // CHANGE DETECTED — log it
    const payload: Record<string, unknown> = USE_V2
      ? {
          [FIELDS.uniqueId]: cleanId,
          [FIELDS.oldNick]: previousNick,
          [FIELDS.newNick]: cleanNick,
          [FIELDS.hotel]: hotel,
          [FIELDS.user]: options?.userId ?? null,
        }
      : {
          [FIELDS.uniqueId]: cleanId,
          [FIELDS.oldNick]: previousNick,
          [FIELDS.newNick]: cleanNick,
          [FIELDS.hotel]: hotel,
          [FIELDS.user]: options?.userId ?? null,
          [FIELDS.changedAt]: Math.floor(Date.now() / 1000),
        };

    await directus.request(cItem(TABLE, payload as any));

    // Update the user's habbo_name snapshot if userId is known
    if (options?.userId) {
      try {
        const patch = USE_V2 ? { habbo_name: cleanNick } : { habbo_name: cleanNick };
        await directus.request(uItem(USERS_TABLE, options.userId, patch as any));
      } catch { /* silent */ }
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
    const recent = (await directus.request(
      rItems(TABLE, {
        filter: { [FIELDS.uniqueId]: { _eq: uniqueId } } as any,
        sort: [`-${FIELDS.changedAt}`] as any,
        limit: 1,
        fields: [FIELDS.newNick] as any,
      } as any),
    )) as any[];

    if (Array.isArray(recent) && recent.length > 0 && recent[0]?.[FIELDS.newNick]) {
      return String(recent[0][FIELDS.newNick]);
    }

    // Fallback: users table
    const users = await directusFetch<{ data: { habbo_name: string | null }[] }>(
      `/items/${USERS_TABLE}`,
      {
        params: {
          'filter[habbo_unique_id][_eq]': uniqueId,
          fields: 'habbo_name',
          limit: '1',
        },
      },
    );
    const firstUser = users?.data?.[0];
    if (firstUser?.habbo_name) {
      return String(firstUser.habbo_name);
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

    const rows = (await directus.request(
      rItems(TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: SORT,
        limit,
        offset: (page - 1) * limit,
        fields: SELECT_FIELDS,
      } as any),
    )) as any[];

    const params: Record<string, string> = { limit: '0', meta: 'total_count' };
    if (hotel && hotel !== 'all') params[`filter[${FIELDS.hotel}][_eq]`] = hotel;
    let total = 0;
    try {
      const json = await directusFetch<{ meta?: { total_count?: number } }>(
        `/items/${TABLE}`,
        { params },
      );
      total = Number(json?.meta?.total_count ?? 0);
    } catch {
      total = Array.isArray(rows) ? rows.length : 0;
    }

    return { data: (rows || []).map(mapRow), total };
  } catch (error) {
    console.error('[pseudo-changes] listPseudoChanges failed:', error);
    return { data: [], total: 0 };
  }
}
