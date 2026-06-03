/**
 * PocketBase migration — Step 01: create collections (clean v2 schema).
 *
 * Creates the 19 PocketBase collections that replace the Directus v2 schema.
 * Safe to rerun: each collection is skipped if it already exists.
 *
 * Schema source of truth: .migration/schema-v2.md (§3) + .migration/pocketbase-plan.md.
 * Decisions baked in (pocketbase-plan §7):
 *   - IDs: PocketBase native 15-char string IDs (NO legacy_id, URLs re-sequenced).
 *   - Roles: dedicated `roles` collection with admin_access bool (created BEFORE users).
 *   - users: PocketBase `auth` collection, login by `nick`.
 *
 * Usage:
 *   npx tsx scripts/migration-pb/01-create-collections.ts
 *
 * Env (.env.local):
 *   POCKETBASE_URL          e.g. http://127.0.0.1:8090
 *   POCKETBASE_ADMIN_TOKEN  superuser token (or use POCKETBASE_ADMIN_EMAIL/PASSWORD)
 *
 * STATUS: SKELETON. Collection field definitions are stubbed (TODO per collection).
 * Do not run against a real instance until the field maps are filled from schema-v2.md.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── env loading (same approach as the Directus migration scripts) ──────────
function loadEnvFromFile(path: string): void {
  try {
    const raw = readFileSync(path, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  } catch {
    /* file missing is ok if the vars are already exported */
  }
}
loadEnvFromFile(resolve(process.cwd(), '.env.local'));

const PB_URL = process.env.POCKETBASE_URL;
const PB_TOKEN = process.env.POCKETBASE_ADMIN_TOKEN;

if (!PB_URL) {
  console.error('[pb-setup] POCKETBASE_URL missing (e.g. http://127.0.0.1:8090)');
  process.exit(1);
}
if (!PB_TOKEN) {
  console.error('[pb-setup] POCKETBASE_ADMIN_TOKEN missing (superuser token)');
  process.exit(1);
}

// ── authenticated fetch to the PocketBase admin API ────────────────────────
async function pbFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${PB_URL}${path}`, {
    ...init,
    headers: {
      Authorization: PB_TOKEN as string,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

/**
 * PocketBase exposes collections at GET/POST /api/collections.
 * A collection is identified by `name`; creation is POST with a schema body.
 */
async function collectionExists(name: string): Promise<boolean> {
  const res = await pbFetch(`/api/collections/${encodeURIComponent(name)}`);
  return res.ok;
}

// ── PocketBase field-type helpers (thin typed wrappers) ─────────────────────
// PB field shape: { name, type, required?, unique?, options? }
type PBField = Record<string, unknown> & { name: string; type: string };

const text = (name: string, opts: Partial<PBField> = {}): PBField => ({ name, type: 'text', ...opts });
const editor = (name: string, opts: Partial<PBField> = {}): PBField => ({ name, type: 'editor', ...opts });
const num = (name: string, opts: Partial<PBField> = {}): PBField => ({ name, type: 'number', ...opts });
const bool = (name: string, opts: Partial<PBField> = {}): PBField => ({ name, type: 'bool', ...opts });
const date = (name: string, opts: Partial<PBField> = {}): PBField => ({ name, type: 'date', ...opts });
const select = (name: string, values: string[], opts: Partial<PBField> = {}): PBField => ({
  name,
  type: 'select',
  options: { maxSelect: 1, values },
  ...opts,
});
const relation = (name: string, collectionId: string, opts: Partial<PBField> = {}): PBField => ({
  name,
  type: 'relation',
  options: { collectionId, maxSelect: 1, cascadeDelete: false },
  ...opts,
});

/* ----------------------------------------------------------------------- */
/*  Collection definitions                                                 */
/*  ORDER MATTERS: roles + users first (relation targets), then the rest.  */
/*  Each `fields` array is a TODO to fill from schema-v2.md §3.x.           */
/* ----------------------------------------------------------------------- */

type CollectionDef = {
  name: string;
  type: 'base' | 'auth';
  fields: PBField[];
  // PB access rules (null = superuser-only). Set per collection at hardening pass.
  listRule?: string | null;
  viewRule?: string | null;
  createRule?: string | null;
  updateRule?: string | null;
  deleteRule?: string | null;
};

// NOTE: relation() needs the TARGET collection's id, which PB assigns at creation.
// In the real run we resolve ids after creating roles/users (two-pass), or use the
// collection NAME if the PB version accepts it. Left as TODO in the field maps below.

const COLLECTIONS: CollectionDef[] = [
  // 1. roles — created first (target of users.role). schema: pocketbase-plan §8bis.1
  {
    name: 'roles',
    type: 'base',
    fields: [
      text('name', { required: true }),
      text('description'),
      bool('admin_access'),
      bool('app_access'),
    ],
  },

  // 2. users — PB auth collection. schema-v2 §3.1 + pocketbase-plan §2.3
  {
    name: 'users',
    type: 'auth',
    fields: [
      // PB auth provides: email, password, verified, emailVisibility, tokenKey.
      // Business fields below (login identity = `nick`):
      text('nick', { required: true, unique: true }),
      text('avatar_url'),
      text('background_url'),
      text('mission'),
      num('coins'),
      num('points'),
      bool('active'),
      bool('banned'),
      text('ban_reason'),
      date('ban_expires_at'),
      text('ban_admin'),
      date('last_login_at'),
      text('last_login_ip'),
      text('last_login_ua'),
      text('habbo_unique_id', { unique: true }),
      text('habbo_hotel', { required: true }),
      date('habbo_verified_at'),
      // relation('role', '<roles collection id>'),  // TODO resolve after roles created
    ],
  },

  // 3. article_categories (target of articles.category) — schema-v2 §3.2 ref
  { name: 'article_categories', type: 'base', fields: [text('name', { required: true }), text('slug', { unique: true })] /* TODO */ },

  // 4. articles — schema-v2 §3.2
  {
    name: 'articles',
    type: 'base',
    fields: [
      text('title', { required: true }),
      text('slug', { unique: true }),
      text('summary'),
      text('cover_image'), // URL/UUID kept as text (no re-upload) — pocketbase-plan §7.5
      editor('body'),
      // relation('category', '<article_categories id>'), // TODO
      // relation('author', '<users id>'),                // TODO
      select('status', ['draft', 'published', 'archived']),
      bool('pinned'),
      bool('comments_enabled'),
      num('views'),
      date('published_at'),
    ],
  },

  // 5..19 — TODO: fill from schema-v2.md §3.3 → §3.17
  { name: 'article_comments', type: 'base', fields: [/* TODO §3.3 */] },
  { name: 'article_comment_likes', type: 'base', fields: [/* TODO §3.4 */] },
  { name: 'forum_categories', type: 'base', fields: [/* TODO §3.5 */] },
  { name: 'forum_topics', type: 'base', fields: [/* TODO §3.6 */] },
  { name: 'forum_comments', type: 'base', fields: [/* TODO §3.7 */] },
  { name: 'forum_comment_likes', type: 'base', fields: [/* TODO §3.8 */] },
  { name: 'forum_topic_votes', type: 'base', fields: [/* TODO §3.8 */] },
  { name: 'stories', type: 'base', fields: [/* TODO §3.9 */] },
  { name: 'sponsors', type: 'base', fields: [/* TODO §3.10 */] },
  { name: 'shop_items', type: 'base', fields: [/* TODO §3.11 */] },
  { name: 'shop_orders', type: 'base', fields: [/* TODO §3.12 */] },
  { name: 'badges', type: 'base', fields: [/* TODO §3.13 */] },
  { name: 'user_badges', type: 'base', fields: [/* TODO §3.14 */] },
  { name: 'admin_notifications', type: 'base', fields: [/* TODO §3.15 */] },
  { name: 'admin_logs', type: 'base', fields: [/* TODO §3.16 — port as-is */] },
  { name: 'habbo_nick_history', type: 'base', fields: [/* TODO §3.17 */] },
];

// ── runner ──────────────────────────────────────────────────────────────
async function createCollection(def: CollectionDef): Promise<void> {
  if (await collectionExists(def.name)) {
    console.log(`[pb-setup] skip "${def.name}" (already exists)`);
    return;
  }
  const body = {
    name: def.name,
    type: def.type,
    fields: def.fields,
    listRule: def.listRule ?? null,
    viewRule: def.viewRule ?? null,
    createRule: def.createRule ?? null,
    updateRule: def.updateRule ?? null,
    deleteRule: def.deleteRule ?? null,
  };
  const res = await pbFetch('/api/collections', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`create "${def.name}" failed: ${res.status} ${detail.slice(0, 300)}`);
  }
  console.log(`[pb-setup] created "${def.name}"`);
}

async function main(): Promise<void> {
  console.log(`[pb-setup] target: ${PB_URL}`);
  console.log(`[pb-setup] ${COLLECTIONS.length} collections to ensure\n`);
  for (const def of COLLECTIONS) {
    await createCollection(def);
  }
  console.log('\n[pb-setup] done.');
  console.log('[pb-setup] NOTE: relation fields (role, author, category, ...) are still TODO —');
  console.log('[pb-setup] resolve target collection ids in a second pass before migrating data.');
}

main().catch((err) => {
  console.error('[pb-setup] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
