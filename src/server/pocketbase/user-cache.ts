import 'server-only';

import { pbFullList } from './helpers';
import { TABLES } from './tables';

/**
 * In-memory cache mapping users.id <-> users.nick.
 *
 * Used by services that translate between an "author by nick" value and the v2
 * "author relation (id)" world. Cache lives for the Node process lifetime
 * (server-only), rebuilds on cold start. Invalidate via invalidateUserCache()
 * when a service creates/renames a user.
 *
 * IDs are PocketBase string ids (15-char), NOT integers.
 */

type CacheState = {
  idToNick: Map<string, string>;
  nickToId: Map<string, string>; // lowercased nick -> id
};

let cache: CacheState | null = null;
let inflight: Promise<CacheState> | null = null;

async function buildCache(): Promise<CacheState> {
  const rows = (await pbFullList<{ id: string; nick: string }>(TABLES.users, {
    fields: 'id,nick',
  }).catch(() => [] as { id: string; nick: string }[]));

  const idToNick = new Map<string, string>();
  const nickToId = new Map<string, string>();
  for (const u of rows) {
    const id = String(u.id || '');
    const nick = String(u.nick || '');
    if (!id || !nick) continue;
    idToNick.set(id, nick);
    nickToId.set(nick.toLowerCase(), id);
  }
  return { idToNick, nickToId };
}

async function ensureCache(): Promise<CacheState> {
  if (cache) return cache;
  if (!inflight) inflight = buildCache();
  cache = await inflight;
  inflight = null;
  return cache;
}

export async function resolveUserId(nick: string | null | undefined): Promise<string | null> {
  if (!nick) return null;
  const c = await ensureCache();
  return c.nickToId.get(String(nick).toLowerCase()) ?? null;
}

export async function resolveUserNick(id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const c = await ensureCache();
  return c.idToNick.get(String(id)) ?? null;
}

/** Batch resolver; returns a map id -> nick for the ids that exist. */
export async function resolveUserNicks(
  ids: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const c = await ensureCache();
  const out = new Map<string, string>();
  for (const id of ids) {
    if (id == null) continue;
    const key = String(id);
    const n = c.idToNick.get(key);
    if (n) out.set(key, n);
  }
  return out;
}

export function invalidateUserCache(): void {
  cache = null;
  inflight = null;
}

/* ------------------------------------------------------------------ */
/*  Timestamp helpers (legacy unix seconds <-> ISO)                    */
/* ------------------------------------------------------------------ */

export function isoToUnixSeconds(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

export function unixSecondsToIso(unix: number | string | null | undefined): string | null {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n > 1e11 ? n : n * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

export function nowIso(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
