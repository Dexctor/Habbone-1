import 'server-only';

import { directusService, rItems } from './client';
import { TABLES, USE_V2 } from './tables';

/**
 * In-memory cache mapping users.id <-> users.nick.
 *
 * Used by every service that has to translate between the legacy "author by
 * nick" world and the v2 "author M2O" world. Cache lives for the duration of
 * the Node process (server-only), rebuilds on cold start. Invalidate via
 * invalidateUserCache() if a service creates/renames a user.
 */

type CacheState = {
  idToNick: Map<number, string>;
  nickToId: Map<string, number>; // lowercased key
};

let cache: CacheState | null = null;
let inflight: Promise<CacheState> | null = null;

async function buildCache(): Promise<CacheState> {
  if (!USE_V2) {
    return { idToNick: new Map(), nickToId: new Map() };
  }
  const rows = (await directusService
    .request(
      rItems(TABLES.users, {
        limit: 5000,
        fields: ['id', 'nick'],
      } as any),
    )
    .catch(() => [] as { id: number; nick: string }[])) as { id: number; nick: string }[];

  const idToNick = new Map<number, string>();
  const nickToId = new Map<string, number>();
  for (const u of rows) {
    const id = Number(u.id);
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

export async function resolveUserId(nick: string | null | undefined): Promise<number | null> {
  if (!USE_V2 || !nick) return null;
  const c = await ensureCache();
  return c.nickToId.get(String(nick).toLowerCase()) ?? null;
}

export async function resolveUserNick(id: number | null | undefined): Promise<string | null> {
  if (!USE_V2 || !id) return null;
  const c = await ensureCache();
  return c.idToNick.get(Number(id)) ?? null;
}

/** Batch resolver; returns a map id -> nick for the ids that exist. */
export async function resolveUserNicks(ids: Array<number | null | undefined>): Promise<Map<number, string>> {
  if (!USE_V2) return new Map();
  const c = await ensureCache();
  const out = new Map<number, string>();
  for (const id of ids) {
    if (id == null) continue;
    const n = c.idToNick.get(Number(id));
    if (n) out.set(Number(id), n);
  }
  return out;
}

export function invalidateUserCache(): void {
  cache = null;
  inflight = null;
}

/* ------------------------------------------------------------------ */
/*  Timestamp helpers (legacy unix seconds <-> v2 ISO)                 */
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
