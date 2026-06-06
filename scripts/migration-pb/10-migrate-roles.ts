/**
 * PocketBase migration — Step 10: migrate roles + reassign users.
 *
 * The user migration (03) never carried over directus_role_id, so every user
 * ended up with no role -> nobody is admin. This script:
 *   1. migrates the 10 Directus roles into the PB `roles` collection,
 *   2. sets admin_access=true only for the roles in ADMIN_ROLE_NAMES,
 *   3. reassigns each PB user to their role (via legacy directus_role_id ->
 *      new PB role id), matching users by nick.
 *
 * Idempotent: roles are matched by name (created if missing); user role is set
 * only if currently empty or different.
 *
 * Usage (VPS): node --env-file=.env.vps --import tsx scripts/migration-pb/10-migrate-roles.ts --dry-run
 *              node --env-file=.env.vps --import tsx scripts/migration-pb/10-migrate-roles.ts
 */

import PocketBase from 'pocketbase';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pbAuth, PB_URL } from './_pb';

const DRY_RUN = process.argv.includes('--dry-run');

// Only these role names get admin panel access.
const ADMIN_ROLE_NAMES = new Set(['Fondateur']);
// App-access roles (can use the site). All real roles are app users.
const NON_APP_ROLES = new Set(['Frontend Service']); // service role, not a person

function readMainEnv(key: string): string | undefined {
  for (const p of [resolve(process.cwd(), '../../../.env.local'), resolve(process.cwd(), '.env.local')]) {
    try {
      const m = new RegExp(`^${key}=(.*)$`, 'm').exec(readFileSync(p, 'utf-8'));
      if (m) return m[1].replace(/^['"]|['"]$/g, '').trim();
    } catch {}
  }
  return undefined;
}
const DIRECTUS_URL = process.env.DIRECTUS_URL || readMainEnv('NEXT_PUBLIC_DIRECTUS_URL');
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || readMainEnv('DIRECTUS_SERVICE_TOKEN');

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

async function main() {
  console.log(`[10] migrate roles + reassign users  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  const pb = await getPb();

  // ── 1. fetch Directus roles ──
  const { data: dRoles } = await directusGet<{ data: { id: string; name: string; description: string }[] }>(
    '/roles?fields=id,name,description&limit=50',
  );
  console.log(`[10] ${dRoles.length} Directus roles`);

  // existing PB roles by name
  const pbRoles = await pb.collection('roles').getFullList({ fields: 'id,name,admin_access', batch: 200 });
  const pbRoleByName = new Map<string, any>();
  for (const r of pbRoles as any[]) pbRoleByName.set(String(r.name).toLowerCase(), r);

  // legacy roleId -> pb roleId
  const roleIdMap = new Map<string, string>();
  for (const dr of dRoles) {
    const wantAdmin = ADMIN_ROLE_NAMES.has(dr.name);
    const wantApp = !NON_APP_ROLES.has(dr.name);
    const existing = pbRoleByName.get(dr.name.toLowerCase());
    if (existing) {
      roleIdMap.set(dr.id, existing.id);
      // fix admin_access if needed
      if (!DRY_RUN && existing.admin_access !== wantAdmin) {
        await pb.collection('roles').update(existing.id, { admin_access: wantAdmin, app_access: wantApp });
        console.log(`  ~ role "${dr.name}" admin_access -> ${wantAdmin}`);
      } else {
        console.log(`  • role "${dr.name}" exists (admin=${existing.admin_access})`);
      }
      continue;
    }
    if (DRY_RUN) {
      console.log(`  [dry] would create role "${dr.name}" (admin=${wantAdmin})`);
      roleIdMap.set(dr.id, `dry-${dr.id}`);
      continue;
    }
    const created: any = await pb.collection('roles').create({
      name: dr.name,
      description: dr.description || null,
      admin_access: wantAdmin,
      app_access: wantApp,
    });
    roleIdMap.set(dr.id, created.id);
    console.log(`  ✓ role "${dr.name}" created (admin=${wantAdmin})`);
  }

  // ── 2. legacy users: nick -> directus_role_id ──
  const { data: legacyUsers } = await directusGet<{ data: { nick: string; directus_role_id: string }[] }>(
    '/items/usuarios?fields=nick,directus_role_id&limit=-1',
  );
  const nickToLegacyRole = new Map<string, string>();
  for (const u of legacyUsers) {
    if (u.directus_role_id) nickToLegacyRole.set(String(u.nick).toLowerCase(), u.directus_role_id);
  }

  // ── 3. reassign PB users ──
  const pbUsers = await pb.collection('users').getFullList({ fields: 'id,nick,role', batch: 500 });
  let assigned = 0, already = 0, noRole = 0, missing = 0;
  for (const u of pbUsers as any[]) {
    const legacyRole = nickToLegacyRole.get(String(u.nick).toLowerCase());
    if (!legacyRole) { noRole++; continue; }
    const pbRoleId = roleIdMap.get(legacyRole);
    if (!pbRoleId) { missing++; continue; }
    if (u.role === pbRoleId) { already++; continue; }
    if (DRY_RUN) {
      assigned++;
      if (assigned <= 6) console.log(`  [dry] ${u.nick} -> role ${legacyRole}`);
      continue;
    }
    try {
      await pb.collection('users').update(u.id, { role: pbRoleId });
      assigned++;
    } catch (e: any) {
      console.log(`  ✗ ${u.nick}: ${e?.message}`);
    }
  }
  console.log(`\n[10] users: assigned=${assigned} already=${already} no-legacy-role=${noRole} role-missing=${missing} (of ${pbUsers.length})`);
}

main().catch((e) => { console.error('[10] fatal:', e?.message || e); process.exit(1); });
