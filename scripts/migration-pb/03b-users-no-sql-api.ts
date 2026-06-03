/**
 * PocketBase migration — Step 03b: migrate users WITHOUT the /api/sql endpoint.
 *
 * On a production PocketBase, /api/sql is disabled (404). This variant:
 *   1. reads legacy users from Directus,
 *   2. creates each user via the records API (placeholder password),
 *   3. writes the nick->pbId map AND a hashes.sql file with UPDATE statements
 *      that set the real legacy bcrypt hash on each user's password column.
 *
 * The hashes.sql must then be applied directly on the SQLite file on the host
 * (PocketBase stopped), e.g.:
 *   systemctl stop pocketbase
 *   sqlite3 /opt/pocketbase/pb_data/data.db < hashes.sql
 *   systemctl start pocketbase
 *
 * Usage (targets the VPS via .env.vps):
 *   node --env-file=.env.vps --import tsx scripts/migration-pb/03b-users-no-sql-api.ts --dry-run
 *   node --env-file=.env.vps --import tsx scripts/migration-pb/03b-users-no-sql-api.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

const DRY_RUN = process.argv.includes('--dry-run');

function readMainEnv(key: string): string | undefined {
  const candidates = [resolve(process.cwd(), '../../../.env.local'), resolve(process.cwd(), '.env.local')];
  for (const path of candidates) {
    try {
      const raw = readFileSync(path, 'utf-8');
      const m = new RegExp(`^${key}=(.*)$`, 'm').exec(raw);
      if (m) return m[1].replace(/^['"]|['"]$/g, '').trim();
    } catch {}
  }
  return undefined;
}

const DIRECTUS_URL = process.env.DIRECTUS_URL || readMainEnv('NEXT_PUBLIC_DIRECTUS_URL');
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || readMainEnv('DIRECTUS_SERVICE_TOKEN');
if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
  console.error('[03b] legacy Directus URL/token not found');
  process.exit(1);
}

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

async function directusGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
    cache: 'no-store' as RequestCache,
  });
  if (!res.ok) throw new Error(`Directus GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

function unixToIso(unix: unknown): string | null {
  const n = Number(unix);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString().replace('T', ' ').slice(0, 23);
}
function asBool(v: unknown): boolean {
  return String(v ?? '').trim().toLowerCase() === 's' || v === true || v === 1;
}
function sqlStr(s: string): string {
  return `'${String(s).replace(/'/g, "''")}'`;
}

type LegacyUser = {
  id: number; nick: string; senha: string | null; email: string | null;
  moedas: number | null; pontos: number | null; missao: string | null; avatar: string | null;
  ativado: string | null; banido: string | null; habbo_hotel: string | null;
  habbo_unique_id: string | null; data_criacao: number | null; directus_role_id: string | null;
};

const LEGACY_FIELDS = [
  'id','nick','senha','email','moedas','pontos','missao','avatar',
  'ativado','banido','habbo_hotel','habbo_unique_id','data_criacao','directus_role_id',
].join(',');

async function main() {
  console.log(`[03b] migrate users (no /api/sql)  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  console.log(`[03b] source: ${DIRECTUS_URL} -> target: ${PB_URL}`);

  const { data: rawUsers } = await directusGet<{ data: LegacyUser[] }>(
    `/items/usuarios?limit=-1&fields=${LEGACY_FIELDS}`,
  );

  // dedupe by nick (keep active, else newest)
  const byNick = new Map<string, LegacyUser>();
  for (const u of rawUsers) {
    const key = String(u.nick || '').trim().toLowerCase();
    if (!key) continue;
    const prev = byNick.get(key);
    if (!prev) { byNick.set(key, u); continue; }
    const keepU = asBool(u.ativado) !== asBool(prev.ativado)
      ? asBool(u.ativado)
      : Number(u.data_criacao || 0) >= Number(prev.data_criacao || 0);
    if (keepU) byNick.set(key, u);
  }
  const users = [...byNick.values()];
  console.log(`[03b] ${users.length} unique users (of ${rawUsers.length})\n`);

  const pb = await getPb();
  const idMap: Record<string, string> = {};
  const sqlLines: string[] = ['-- Legacy bcrypt password hashes for migrated users.', '-- Apply with PocketBase stopped: sqlite3 data.db < hashes.sql', 'BEGIN;'];
  let created = 0;
  const errors: string[] = [];

  for (const u of users) {
    const nick = String(u.nick || '').trim();
    if (!nick) continue;
    const payload = {
      nick,
      email: u.email || '',
      password: 'TempPlaceholder_' + u.id,
      passwordConfirm: 'TempPlaceholder_' + u.id,
      coins: Number(u.moedas) || 0,
      points: Number(u.pontos) || 0,
      mission: u.missao || null,
      avatar_url: typeof u.avatar === 'string' && /^https?:\/\//.test(u.avatar) ? u.avatar : null,
      active: asBool(u.ativado),
      banned: asBool(u.banido),
      habbo_hotel: u.habbo_hotel || 'fr',
      habbo_unique_id: u.habbo_unique_id || null,
      created: unixToIso(u.data_criacao) || undefined,
    };
    if (DRY_RUN) {
      idMap[nick.toLowerCase()] = `dry-${u.id}`;
      created++;
      continue;
    }
    try {
      const rec: any = await pb.collection('users').create(payload);
      idMap[nick.toLowerCase()] = rec.id;
      created++;
      if (u.senha && /^\$2[aby]\$/.test(u.senha)) {
        sqlLines.push(`UPDATE users SET password = ${sqlStr(u.senha)} WHERE id = ${sqlStr(rec.id)};`);
      } else {
        errors.push(`no/invalid bcrypt for ${nick}`);
      }
      console.log(`  ✓ ${nick} -> ${rec.id}`);
    } catch (e: any) {
      const d = e?.response?.data ? JSON.stringify(e.response.data) : '';
      errors.push(`create ${nick}: ${e?.message || e} ${d}`);
      console.log(`  ✗ ${nick}: ${e?.message || e} ${d}`);
    }
  }

  sqlLines.push('COMMIT;');

  if (!DRY_RUN) {
    writeFileSync(resolve(process.cwd(), '.migration/pb-id-map.json'), JSON.stringify({ users: idMap }, null, 2));
    writeFileSync(resolve(process.cwd(), '.migration/hashes.sql'), sqlLines.join('\n') + '\n');
    console.log(`\n[03b] wrote .migration/pb-id-map.json and .migration/hashes.sql`);
  }

  console.log(`\n[03b] done. created=${created}, hash UPDATEs=${Math.max(0, sqlLines.length - 4)}, errors=${errors.length}`);
  if (errors.length) errors.slice(0, 10).forEach((e) => console.log('   - ' + e));
}

main().catch((e) => { console.error('[03b] fatal:', e?.message || e); process.exit(1); });
