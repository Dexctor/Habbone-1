/**
 * Creates the Directus `admin_logs` collection used by `logAdminAction()`.
 *
 * Usage:
 *   npx tsx scripts/setup-admin-logs.ts
 *
 * Requires `.env.local` with NEXT_PUBLIC_DIRECTUS_URL + DIRECTUS_SERVICE_TOKEN.
 * Idempotent — skips creation when the collection already exists. Safe to rerun.
 *
 * What it creates:
 *  - Collection: `admin_logs`
 *  - Fields: id (PK), action, admin_id, admin_name, target_type, target_id,
 *            details (json), date_created (auto timestamp).
 *
 * The code in `src/server/directus/admin-logs.ts` calls `logAdminAction()`
 * after every ban / unban / delete / role change / coins_grant / content
 * mutation. Until this collection exists, those calls fail silently (wrapped
 * in try/catch) and the audit trail is empty.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFromFile(path: string): void {
  try {
    const raw = readFileSync(path, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      const value = rawValue.replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  } catch {
    /* file missing is fine if the caller already exported the vars */
  }
}

loadEnvFromFile(resolve(process.cwd(), '.env.local'));

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL;
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN;

if (!DIRECTUS_URL) {
  console.error('[setup] NEXT_PUBLIC_DIRECTUS_URL missing');
  process.exit(1);
}
if (!SERVICE_TOKEN) {
  console.error('[setup] DIRECTUS_SERVICE_TOKEN missing');
  process.exit(1);
}

const COLLECTION = 'admin_logs';
const headers = {
  Authorization: `Bearer ${SERVICE_TOKEN}`,
  'Content-Type': 'application/json',
};

async function directusFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${DIRECTUS_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
}

async function collectionExists(): Promise<boolean> {
  const res = await directusFetch(`/collections/${COLLECTION}`);
  return res.ok;
}

async function createCollection(): Promise<void> {
  const payload = {
    collection: COLLECTION,
    meta: {
      collection: COLLECTION,
      icon: 'security',
      note: 'Audit trail for admin panel actions (writes from src/server/directus/admin-logs.ts).',
      hidden: false,
      singleton: false,
      translations: null,
      archive_app_filter: true,
      sort_field: null,
      accountability: 'all',
      color: '#F59E0B',
      item_duplication_fields: null,
      sort: null,
      group: null,
      collapse: 'open',
    },
    schema: { name: COLLECTION },
    fields: [
      {
        field: 'id',
        type: 'integer',
        meta: {
          hidden: true,
          interface: 'input',
          readonly: true,
          special: null,
        },
        schema: {
          name: 'id',
          has_auto_increment: true,
          is_primary_key: true,
        },
      },
      {
        field: 'action',
        type: 'string',
        meta: {
          interface: 'select-dropdown',
          display: 'labels',
          options: {
            choices: [
              { text: 'User banned', value: 'user.ban' },
              { text: 'User unbanned', value: 'user.unban' },
              { text: 'User deleted', value: 'user.delete' },
              { text: 'User role changed', value: 'user.role_change' },
              { text: 'Coins granted', value: 'user.coins_grant' },
              { text: 'Content updated', value: 'content.update' },
              { text: 'Content deleted', value: 'content.delete' },
            ],
          },
          width: 'half',
          required: true,
        },
        schema: { name: 'action', is_nullable: false, max_length: 64 },
      },
      {
        field: 'admin_id',
        type: 'string',
        meta: {
          interface: 'input',
          width: 'half',
          required: true,
        },
        schema: { name: 'admin_id', is_nullable: false, max_length: 64 },
      },
      {
        field: 'admin_name',
        type: 'string',
        meta: {
          interface: 'input',
          width: 'half',
        },
        schema: { name: 'admin_name', is_nullable: true, max_length: 128 },
      },
      {
        field: 'target_type',
        type: 'string',
        meta: {
          interface: 'select-dropdown',
          options: {
            choices: [
              { text: 'User', value: 'user' },
              { text: 'Topic', value: 'topic' },
              { text: 'Post', value: 'post' },
              { text: 'Article', value: 'article' },
              { text: 'Comment', value: 'comment' },
            ],
          },
          width: 'half',
        },
        schema: { name: 'target_type', is_nullable: true, max_length: 32 },
      },
      {
        field: 'target_id',
        type: 'string',
        meta: { interface: 'input', width: 'half' },
        schema: { name: 'target_id', is_nullable: true, max_length: 64 },
      },
      {
        field: 'details',
        type: 'json',
        meta: {
          interface: 'input-code',
          display: 'formatted-json-value',
          width: 'full',
          options: { language: 'json' },
        },
        schema: { name: 'details', is_nullable: true },
      },
      {
        field: 'date_created',
        type: 'timestamp',
        meta: {
          interface: 'datetime',
          display: 'datetime',
          readonly: true,
          width: 'half',
          special: ['date-created'],
        },
        schema: { name: 'date_created', is_nullable: true },
      },
    ],
  };

  const res = await directusFetch('/collections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Directus /collections POST failed ${res.status}: ${body}`);
  }
}

async function main(): Promise<void> {
  console.log(`[setup] target: ${DIRECTUS_URL}`);
  const exists = await collectionExists();
  if (exists) {
    console.log(`[setup] collection '${COLLECTION}' already exists — nothing to do`);
    return;
  }
  console.log(`[setup] creating collection '${COLLECTION}'...`);
  await createCollection();
  console.log(`[setup] ✓ collection '${COLLECTION}' created`);
  console.log(`
Next steps:
  - Grant read + create permissions to your admin role on '${COLLECTION}'
    (Directus v11: handled via Policies).
  - In Settings → Data model → admin_logs, verify the fields look correct.
  - Trigger any admin action (ban a test user etc.) and check a row appears.
`);
}

main().catch((err) => {
  console.error('[setup] failed:', err);
  process.exit(1);
});
