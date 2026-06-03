/**
 * PocketBase migration — Lot 1a: `roles` collection + enrich `users`.
 *
 * These two are the foundation: every other collection's M2O relations point
 * at users (author/buyer/...) and users.role points at roles. So we build them
 * first, verify in the dashboard, then move on to the content collections.
 *
 * Decisions (pocketbase-plan §7):
 *   - roles: dedicated collection with admin_access bool (replaces Directus
 *     policy-based resolution — see plan §8bis.1).
 *   - users: ENRICH the PB-default `users` auth collection (don't recreate),
 *     add business fields, switch login identity from email -> nick.
 *
 * Idempotent: re-running skips creating `roles` if present, and the users PATCH
 * only appends fields that are missing.
 *
 * Usage:  npx tsx scripts/migration-pb/01a-roles-and-users.ts
 * Env (.env.local): POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD
 */

import {
  PB_URL,
  getCollection,
  collectionExists,
  createCollection,
  updateCollection,
  f,
  log,
} from './_pb';

// ── 1. roles ────────────────────────────────────────────────────────────────
async function ensureRoles(): Promise<string> {
  const existing = await getCollection('roles');
  if (existing) {
    log(`  • roles already exists (id ${existing.id}) — skip`);
    return existing.id;
  }
  const created = await createCollection({
    name: 'roles',
    type: 'base',
    fields: [
      f.text('name', { required: true }),
      f.text('description'),
      f.bool('admin_access'),
      f.bool('app_access'),
    ],
    // Roles are reference data: readable by anyone, writable only by superusers.
    listRule: '',
    viewRule: '',
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  log(`  ✓ roles created (id ${created.id})`);
  return created.id;
}

// ── 2. users (enrich the default auth collection) ───────────────────────────
async function enrichUsers(rolesCollectionId: string): Promise<void> {
  const users = await getCollection('users');
  if (!users) {
    throw new Error(
      'Default `users` collection not found. Expected PB to have created it. ' +
        'Aborting rather than guessing.',
    );
  }

  const existingNames = new Set(users.fields.map((fld: any) => fld.name));

  // Business fields from schema-v2 §3.1 (English column names).
  // cover/avatar stored as text URLs (no re-upload) per plan §7.5.
  const businessFields = [
    f.text('nick', { required: true }),
    f.url('avatar_url'),
    f.url('background_url'),
    f.text('mission'),
    f.number('coins'),
    f.number('points'),
    f.bool('active'),
    f.bool('banned'),
    f.text('ban_reason'),
    f.date('ban_expires_at'),
    f.text('ban_admin'),
    f.date('last_login_at'),
    f.text('last_login_ip'),
    f.text('last_login_ua'),
    f.text('habbo_unique_id'),
    f.text('habbo_hotel'),
    f.date('habbo_verified_at'),
    f.relation('role', rolesCollectionId),
  ];

  // Only append fields that don't already exist (idempotent re-run).
  const toAdd = businessFields.filter((fld) => !existingNames.has(fld.name));

  // Keep ALL existing (system) fields untouched, append the new ones.
  // Also: email must become optional (legacy users without email) and the
  // login identity switches to `nick`.
  const mergedFields = [...users.fields].map((fld: any) => {
    if (fld.name === 'email' && fld.required) {
      return { ...fld, required: false };
    }
    return fld;
  });
  mergedFields.push(...toAdd);

  if (toAdd.length === 0 && users.passwordAuth?.identityFields?.includes('nick')) {
    log('  • users already enriched — skip');
    return;
  }

  await updateCollection(users.id, {
    fields: mergedFields,
    // Switch auth identity from email -> nick (keep email as secondary).
    passwordAuth: {
      enabled: true,
      identityFields: ['nick', 'email'],
    },
    // Unique index on nick (login identity must be unique).
    indexes: [
      ...(Array.isArray(users.indexes) ? users.indexes : []),
      'CREATE UNIQUE INDEX `idx_users_nick` ON `users` (`nick`)',
    ],
  });
  log(`  ✓ users enriched (+${toAdd.length} fields, login identity = nick)`);
}

async function main(): Promise<void> {
  log(`[lot1a] target: ${PB_URL}`);
  log('[lot1a] ensuring roles + enriching users …');
  const rolesId = await ensureRoles();
  await enrichUsers(rolesId);

  // sanity read-back
  const roles = await collectionExists('roles');
  const users = await getCollection('users');
  const userFieldCount = users?.fields?.length ?? 0;
  const identity = (users as any)?.passwordAuth?.identityFields?.join(',') ?? '?';
  log('');
  log(`[lot1a] done. roles=${roles ? 'ok' : 'MISSING'} | users fields=${userFieldCount} | login identity=${identity}`);
  log('[lot1a] → vérifie dans le dashboard (Collections), puis on enchaîne le Lot 1b (articles).');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[lot1a] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
