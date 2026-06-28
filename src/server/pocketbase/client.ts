import 'server-only';

import PocketBase from 'pocketbase';

/**
 * PocketBase client for server-side data access.
 *
 * Trusted server-side data access uses a PocketBase superuser account. Public
 * requests still go through route handlers, auth checks, and application guards.
 */

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD!;

if (!ADMIN_EMAIL) throw new Error('POCKETBASE_ADMIN_EMAIL manquant');
if (!ADMIN_PASSWORD) throw new Error('POCKETBASE_ADMIN_PASSWORD manquant');

/**
 * Shared PocketBase instance. On the server we disable auto-cancellation so that
 * concurrent requests don't cancel each other (the SDK cancels duplicate keys by
 * default, which is a browser-oriented behaviour).
 */
export const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

/**
 * Ensure the shared instance is authenticated as superuser, refreshing if the
 * stored token is missing/expired. Idempotent and safe to call before any op.
 *
 * Concurrency caveat: a single shared authStore is fine for service-account
 * access (no per-user context here). When we add per-request user auth (Lot 4),
 * those flows must use a *separate* PocketBase instance, not this one.
 */
export async function pbAdmin(): Promise<PocketBase> {
  if (!pb.authStore.isValid) {
    await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  }
  return pb;
}

export const pbUrl = PB_URL;

// Collection name kept for compatibility with imports still referencing it.
// Prefer TABLES.users from ./tables.
export const USERS_TABLE = 'users';
