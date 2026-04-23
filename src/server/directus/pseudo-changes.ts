import 'server-only';

import { directusService as directus, rItems, cItem, uItem, USERS_TABLE } from './client';
import { directusFetch } from './fetch';

const TABLE = 'pseudo_changes';

export interface PseudoChange {
  id: number;
  habbo_unique_id: string;
  old_nick: string;
  new_nick: string;
  hotel: string;
  user_id: number | null;
  changed_at: number; // unix seconds
}

/* ------------------------------------------------------------------ */
/*  In-memory dedup (avoid spamming DB on repeated syncs)              */
/* ------------------------------------------------------------------ */

type DedupEntry = { lastSeenNick: string; lastSyncAt: number };
const DEDUP_CACHE = new Map<string, DedupEntry>();
const DEDUP_TTL_MS = 5 * 60 * 1000; // 5 minutes: re-check after this window

/* ------------------------------------------------------------------ */
/*  Detect + log a pseudo change                                       */
/* ------------------------------------------------------------------ */

/**
 * Sync the current Habbo nick against the last stored one.
 * If different → log to pseudo_changes and update the stored snapshot.
 *
 * Non-blocking: all errors are silently swallowed.
 *
 * @param uniqueId Habbo uniqueId (immutable), e.g. "hhfr-abc123..."
 * @param currentNick Current nick from Habbo API
 * @param options hotel / userId / previousNick (if known)
 */
export async function syncHabboName(
  uniqueId: string,
  currentNick: string,
  options?: {
    hotel?: string;
    userId?: number;
    previousNick?: string; // if provided, skip the DB lookup
  },
): Promise<{ changed: boolean; oldNick?: string } | null> {
  try {
    const cleanId = String(uniqueId || '').trim();
    const cleanNick = String(currentNick || '').trim();
    if (!cleanId || !cleanNick) return null;

    const hotel = String(options?.hotel || detectHotelFromUniqueId(cleanId)).toLowerCase();

    // In-memory dedup to avoid hitting DB on every page visit
    const cacheKey = cleanId;
    const cached = DEDUP_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.lastSyncAt < DEDUP_TTL_MS) {
      if (cached.lastSeenNick === cleanNick) {
        // Same nick, checked recently → nothing to do
        return { changed: false };
      }
      // Nick changed during the cache window → fall through to log
    }

    // Figure out the "previous nick" — from options, or look it up
    let previousNick = options?.previousNick ?? null;

    if (previousNick === null) {
      // Look up most recent stored nick for this uniqueId
      previousNick = await getLastKnownNick(cleanId);
    }

    // First time we see this user — store baseline, no change logged
    if (previousNick === null) {
      DEDUP_CACHE.set(cacheKey, { lastSeenNick: cleanNick, lastSyncAt: Date.now() });
      return { changed: false };
    }

    if (previousNick === cleanNick) {
      // No change — just update dedup cache
      DEDUP_CACHE.set(cacheKey, { lastSeenNick: cleanNick, lastSyncAt: Date.now() });
      return { changed: false };
    }

    // CHANGE DETECTED — log it
    await directus.request(
      cItem(TABLE, {
        habbo_unique_id: cleanId,
        old_nick: previousNick,
        new_nick: cleanNick,
        hotel,
        user_id: options?.userId ?? null,
        changed_at: Math.floor(Date.now() / 1000),
      } as any),
    );

    // Update the user's habbo_name snapshot if userId is known
    if (options?.userId) {
      try {
        await directus.request(
          uItem(USERS_TABLE, options.userId, { habbo_name: cleanNick } as any),
        );
      } catch { /* silent */ }
    }

    DEDUP_CACHE.set(cacheKey, { lastSeenNick: cleanNick, lastSyncAt: Date.now() });
    return { changed: true, oldNick: previousNick };
  } catch (error: any) {
    console.error('[pseudo-changes] syncHabboName failed:', error?.message || error);
    return null;
  }
}

/**
 * Find the last known nick for a given uniqueId.
 * Checks the most recent pseudo_changes entry, then falls back to usuarios.habbo_name.
 * Returns null if completely unknown.
 */
async function getLastKnownNick(uniqueId: string): Promise<string | null> {
  try {
    // Check recent pseudo_changes for this uniqueId
    const recent = (await directus.request(
      rItems(TABLE, {
        filter: { habbo_unique_id: { _eq: uniqueId } } as any,
        sort: ['-changed_at'] as any,
        limit: 1,
        fields: ['new_nick'] as any,
      } as any),
    )) as any[];

    if (Array.isArray(recent) && recent.length > 0 && recent[0]?.new_nick) {
      return String(recent[0].new_nick);
    }

    // Fallback: check usuarios table for stored habbo_name
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

/**
 * Hotel detection from Habbo uniqueId format:
 *   "hhfr-..."    → "fr"
 *   "hhcom-..."   → "com"
 *   "hhcombr-..." → "com.br" (approximated)
 */
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
/*  Public list (for /pseudohabbo page)                                */
/* ------------------------------------------------------------------ */

export async function listPseudoChanges(options?: {
  hotel?: string;
  limit?: number;
  page?: number;
}): Promise<{ data: PseudoChange[]; total: number }> {
  const { hotel, limit = 50, page = 1 } = options || {};
  try {
    const filter: Record<string, unknown> = {};
    if (hotel && hotel !== 'all') filter.hotel = { _eq: hotel };

    const rows = await directus.request(
      rItems(TABLE, {
        ...(Object.keys(filter).length > 0 ? { filter } : {}),
        sort: ['-changed_at', '-id'],
        limit,
        offset: (page - 1) * limit,
        fields: ['id', 'habbo_unique_id', 'old_nick', 'new_nick', 'hotel', 'user_id', 'changed_at'],
      } as any),
    );

    // Count total
    const params: Record<string, string> = { limit: '0', meta: 'total_count' };
    if (hotel && hotel !== 'all') params['filter[hotel][_eq]'] = hotel;
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

    return { data: (rows || []) as PseudoChange[], total };
  } catch (error) {
    console.error('[pseudo-changes] listPseudoChanges failed:', error);
    return { data: [], total: 0 };
  }
}
