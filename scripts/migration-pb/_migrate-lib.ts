/**
 * Shared helpers for the content migration scripts (Directus -> PocketBase).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

// ── legacy Directus creds (main repo .env.local or env) ─────────────────────
function readMainEnv(key: string): string | undefined {
  const candidates = [
    resolve(process.cwd(), '../../../.env.local'),
    resolve(process.cwd(), '.env.local'),
  ];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf-8');
      const m = new RegExp(`^${key}=(.*)$`, 'm').exec(raw);
      if (m) return m[1].replace(/^['"]|['"]$/g, '').trim();
    } catch {
      /* next */
    }
  }
  return undefined;
}

export const DIRECTUS_URL = process.env.DIRECTUS_URL || readMainEnv('NEXT_PUBLIC_DIRECTUS_URL');
export const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || readMainEnv('DIRECTUS_SERVICE_TOKEN');

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function directusGetAll<T = any>(table: string, fields: string): Promise<T[]> {
  if (!DIRECTUS_URL || !DIRECTUS_TOKEN) throw new Error('legacy Directus creds missing');
  // Directus sometimes throttles bursts with a transient 403/429. Retry with
  // backoff before giving up, so we don't lose a table to a momentary limit.
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(`${DIRECTUS_URL}/items/${table}?limit=-1&fields=${fields}`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      cache: 'no-store' as RequestCache,
    });
    if (res.ok) {
      const json = (await res.json()) as { data: T[] };
      return json.data || [];
    }
    if ((res.status === 403 || res.status === 429) && attempt < maxAttempts) {
      const delay = 1500 * attempt;
      console.log(`     … ${table}: HTTP ${res.status} (transient?), retry ${attempt}/${maxAttempts - 1} in ${delay}ms`);
      await wait(delay);
      continue;
    }
    // 404 (missing) or persistent failure -> skip gracefully.
    console.log(`     ⚠ ${table}: Directus GET -> ${res.status} (skipped after ${attempt} attempt(s))`);
    return [];
  }
  return [];
}

// ── PocketBase (superuser) ──────────────────────────────────────────────────
let _pb: PocketBase | null = null;
export async function getPb(): Promise<PocketBase> {
  if (_pb) return _pb;
  const token = await pbAuth();
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  pb.authStore.save(token, null);
  _pb = pb;
  return pb;
}

// ── id maps ─────────────────────────────────────────────────────────────────
export type IdMap = Record<string, string>; // legacy key -> pbId

export function loadUserMap(): IdMap {
  const path = resolve(process.cwd(), '.migration/pb-id-map.json');
  const j = JSON.parse(readFileSync(path, 'utf-8')) as { users: IdMap };
  return j.users || {};
}

// ── conversions ─────────────────────────────────────────────────────────────
export function unixToIso(unix: unknown): string | null {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString().replace('T', ' ').slice(0, 23);
}

export function asBool(v: unknown): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 's' || s === 'ativo' || s === 'sim' || v === true || v === 1;
}

export function nickToId(userMap: IdMap, nick: unknown): string | null {
  const key = String(nick ?? '').trim().toLowerCase();
  if (!key) return null;
  return userMap[key] ?? null;
}

/**
 * Generic table migrator. Reads all legacy rows, maps each to a PB payload,
 * creates them, and returns a legacyId -> pbId map for relation resolution.
 * Rows whose map() returns null are skipped.
 */
export async function migrateTable<L extends { id: number | string }>(opts: {
  label: string;
  legacyTable: string;
  legacyFields: string;
  pbCollection: string;
  map: (row: L) => Record<string, unknown> | null;
  dryRun: boolean;
}): Promise<IdMap> {
  const { label, legacyTable, legacyFields, pbCollection, map, dryRun } = opts;
  const rows = await directusGetAll<L>(legacyTable, legacyFields);
  const pb = await getPb();
  const idMap: IdMap = {};
  let ok = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const payload = map(row);
    if (payload === null) {
      skipped++;
      continue;
    }
    if (dryRun) {
      idMap[String(row.id)] = `dry-${row.id}`;
      ok++;
      continue;
    }
    try {
      const rec: any = await pb.collection(pbCollection).create(payload);
      idMap[String(row.id)] = rec.id;
      ok++;
    } catch (e: any) {
      const detail = e?.response?.data ? JSON.stringify(e.response.data) : '';
      errors.push(`${legacyTable}#${row.id}: ${e?.message || e} ${detail}`);
    }
  }

  console.log(
    `  ${label}: created=${ok} skipped=${skipped} errors=${errors.length}` +
      (rows.length ? ` (of ${rows.length})` : ''),
  );
  if (errors.length) errors.slice(0, 5).forEach((e) => console.log('     ✗ ' + e));
  return idMap;
}
