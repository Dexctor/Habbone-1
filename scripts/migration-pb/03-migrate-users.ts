/**
 * PocketBase migration — Step 03: migrate legacy users (usuarios -> users).
 *
 * Source: the legacy Directus API (https://api.habbone.fr) — still online.
 * Target: local PocketBase `users` collection.
 *
 * Password handling (proven in Lot 2):
 *   - PB's records API re-hashes any password it receives, so we CANNOT post the
 *     legacy bcrypt hash directly.
 *   - Strategy: create each user with a random placeholder password (PB sets id,
 *     tokenKey, etc.), THEN overwrite the password column with the legacy $2y$
 *     bcrypt hash via the admin SQL endpoint (/api/sql). Login then works with
 *     the user's original password.
 *
 * Also writes a nick->pbId map to .migration/pb-id-map.json so later steps
 * (articles, forum, ...) can resolve author relations.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/migration-pb/03-migrate-users.ts --dry-run
 *   node --env-file=.env.local --import tsx scripts/migration-pb/03-migrate-users.ts
 *
 * Env (.env.local): POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD
 * Legacy Directus creds are read from the MAIN repo .env.local (one level up the
 * worktrees), or from DIRECTUS_URL / DIRECTUS_TOKEN env if provided.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

// A PocketBase instance authenticated as superuser (token from pbAuth()).
let _pb: PocketBase | null = null;
async function getPb(): Promise<PocketBase> {
  if (_pb) return _pb;
  const token = await pbAuth();
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  pb.authStore.save(token, null);
  _pb = pb;
  return pb;
}

const DRY_RUN = process.argv.includes('--dry-run');

// ── legacy Directus creds (from main repo .env.local or env) ────────────────
function readMainEnv(key: string): string | undefined {
  // worktree cwd is .../.claude/worktrees/<name>; main repo is 3 levels up.
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

const DIRECTUS_URL = process.env.DIRECTUS_URL || readMainEnv('NEXT_PUBLIC_DIRECTUS_URL');
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || readMainEnv('DIRECTUS_SERVICE_TOKEN');

if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
  console.error('[03] legacy Directus URL/token not found (set DIRECTUS_URL / DIRECTUS_TOKEN or main .env.local)');
  process.exit(1);
}

// ── helpers ─────────────────────────────────────────────────────────────────
async function directusGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
    cache: 'no-store' as RequestCache,
  });
  if (!res.ok) throw new Error(`Directus GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

async function pbSql(query: string): Promise<{ affectedRows: number }> {
  const pb = await getPb();
  const res = await fetch(`${PB_URL}/api/sql`, {
    method: 'POST',
    headers: { Authorization: pb.authStore.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PB /api/sql failed: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<{ affectedRows: number }>;
}

function unixToIso(unix: unknown): string | null {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString().replace('T', ' ').slice(0, 23);
}

function asBool(v: unknown): boolean {
  return String(v ?? '').trim().toLowerCase() === 's' || v === true || v === 1;
}

// SQLite string literal escaping (single quotes doubled).
function sqlStr(s: string): string {
  return `'${String(s).replace(/'/g, "''")}'`;
}

type LegacyUser = {
  id: number;
  nick: string;
  senha: string | null;
  email: string | null;
  moedas: number | null;
  pontos: number | null;
  missao: string | null;
  avatar: string | null;
  ativado: string | null;
  banido: string | null;
  habbo_hotel: string | null;
  habbo_unique_id: string | null;
  data_criacao: number | null;
  directus_role_id: string | null;
};

const LEGACY_FIELDS = [
  'id', 'nick', 'senha', 'email', 'moedas', 'pontos', 'missao', 'avatar',
  'ativado', 'banido', 'habbo_hotel', 'habbo_unique_id', 'data_criacao', 'directus_role_id',
].join(',');

async function main() {
  console.log(`[03] migrate users  ${DRY_RUN ? '(DRY RUN — no writes)' : '(LIVE)'}`);
  console.log(`[03] source: ${DIRECTUS_URL}  ->  target: ${PB_URL}`);

  const { data: rawUsers } = await directusGet<{ data: LegacyUser[] }>(
    `/items/usuarios?limit=-1&fields=${LEGACY_FIELDS}`,
  );
  console.log(`[03] fetched ${rawUsers.length} legacy users`);

  // Deduplicate by nick (case-insensitive) — `nick` is uniquely indexed in PB.
  // Keep the active account; if both active or both inactive, keep the newest.
  const byNick = new Map<string, LegacyUser>();
  for (const u of rawUsers) {
    const key = String(u.nick || '').trim().toLowerCase();
    if (!key) continue;
    const prev = byNick.get(key);
    if (!prev) {
      byNick.set(key, u);
      continue;
    }
    const uActive = asBool(u.ativado);
    const prevActive = asBool(prev.ativado);
    const keepU =
      uActive !== prevActive ? uActive : Number(u.data_criacao || 0) >= Number(prev.data_criacao || 0);
    if (keepU) byNick.set(key, u);
    console.log(`  ⚠ duplicate nick "${u.nick}" (ids ${prev.id},${u.id}) -> keeping id ${(keepU ? u : prev).id}`);
  }
  const users = [...byNick.values()];
  console.log(`[03] ${users.length} unique users after dedupe\n`);

  const pb = await getPb();
  const idMap: Record<string, string> = {}; // nick(lower) -> pbId
  let created = 0;
  let pwImported = 0;
  const errors: string[] = [];

  for (const u of users) {
    const nick = String(u.nick || '').trim();
    if (!nick) continue;

    const payload = {
      nick,
      email: u.email || '',
      // placeholder password (>=8 chars) — overwritten by the legacy hash below
      password: 'TempPlaceholder_' + u.id,
      passwordConfirm: 'TempPlaceholder_' + u.id,
      coins: Number(u.moedas) || 0,
      points: Number(u.pontos) || 0,
      mission: u.missao || null,
      // avatar_url is typed `url` in PB but legacy `avatar` holds relative paths
      // (e.g. /uploads/default_avatar.png) which fail URL validation. Only keep
      // values that are already absolute URLs; otherwise drop (default avatar
      // shows anyway). TODO(Lot 7): retype avatar_url to text + backfill paths.
      avatar_url: typeof u.avatar === 'string' && /^https?:\/\//.test(u.avatar) ? u.avatar : null,
      active: asBool(u.ativado),
      banned: asBool(u.banido),
      habbo_hotel: u.habbo_hotel || 'fr',
      habbo_unique_id: u.habbo_unique_id || null,
      created: unixToIso(u.data_criacao) || undefined,
    };

    if (DRY_RUN) {
      console.log(`  [dry] would create user "${nick}" (legacy id ${u.id}, coins ${payload.coins}) + import ${u.senha ? 'bcrypt' : 'NO'} hash`);
      idMap[nick.toLowerCase()] = `dry-${u.id}`;
      created++;
      if (u.senha) pwImported++;
      continue;
    }

    try {
      const rec: any = await pb.collection('users').create(payload);
      idMap[nick.toLowerCase()] = rec.id;
      created++;

      // overwrite password with the legacy bcrypt hash (direct SQL)
      if (u.senha && /^\$2[aby]\$/.test(u.senha)) {
        const r = await pbSql(`UPDATE users SET password = ${sqlStr(u.senha)} WHERE id = ${sqlStr(rec.id)}`);
        if (r.affectedRows >= 1) pwImported++;
        else errors.push(`pw not updated for ${nick}`);
      } else {
        errors.push(`no/invalid bcrypt for ${nick} (left placeholder)`);
      }
      console.log(`  ✓ ${nick} -> ${rec.id}`);
    } catch (e: any) {
      const detail = e?.response?.data ? JSON.stringify(e.response.data) : '';
      errors.push(`create ${nick}: ${e?.message || e} ${detail}`);
      console.log(`  ✗ ${nick}: ${e?.message || e} ${detail}`);
    }
  }

  // persist the nick->id map for later steps
  const mapPath = resolve(process.cwd(), '.migration/pb-id-map.json');
  if (!DRY_RUN) {
    writeFileSync(mapPath, JSON.stringify({ users: idMap }, null, 2));
    console.log(`\n[03] wrote nick->id map: ${mapPath}`);
  }

  console.log(`\n[03] done. created=${created}, passwords imported=${pwImported}, errors=${errors.length}`);
  if (errors.length) {
    console.log('[03] errors:');
    errors.slice(0, 20).forEach((e) => console.log('   - ' + e));
  }
}

main().catch((e) => {
  console.error('[03] fatal:', e?.message || e);
  process.exit(1);
});
