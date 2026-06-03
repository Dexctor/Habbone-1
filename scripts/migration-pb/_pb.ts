/**
 * Shared PocketBase admin client for the migration scripts.
 *
 * Loads POCKETBASE_URL / POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD
 * from .env.local (or the environment), authenticates as superuser, and exposes
 * small typed helpers used by the 0x-*.ts lot scripts.
 *
 * No external dependency: plain fetch against the PocketBase REST API.
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
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  } catch {
    /* env may already be exported */
  }
}
loadEnvFromFile(resolve(process.cwd(), '.env.local'));

export const PB_URL = (process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || '';

let _token: string | null = null;

export async function pbAuth(): Promise<string> {
  if (_token) return _token;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      'POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD missing (set them in .env.local)',
    );
  }
  const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`PocketBase auth failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as { token?: string };
  if (!json.token) throw new Error('PocketBase auth: no token in response');
  _token = json.token;
  return _token;
}

async function pbRequest<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await pbAuth();
  const res = await fetch(`${PB_URL}${path}`, {
    method,
    headers: {
      Authorization: token,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PB ${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  }
  return (text ? JSON.parse(text) : undefined) as T;
}

export type PBCollection = {
  id: string;
  name: string;
  type: 'base' | 'auth' | 'view';
  fields: any[];
  [k: string]: unknown;
};

/** Fetch a collection by name or id; returns null if it doesn't exist. */
export async function getCollection(nameOrId: string): Promise<PBCollection | null> {
  try {
    return await pbRequest<PBCollection>('GET', `/api/collections/${encodeURIComponent(nameOrId)}`);
  } catch (err) {
    if (err instanceof Error && / -> 404:/.test(err.message)) return null;
    throw err;
  }
}

export async function collectionExists(nameOrId: string): Promise<boolean> {
  return (await getCollection(nameOrId)) !== null;
}

/** Create a collection from a full body. Throws on failure. */
export async function createCollection(body: Record<string, unknown>): Promise<PBCollection> {
  return pbRequest<PBCollection>('POST', '/api/collections', body);
}

/** Patch an existing collection (by id or name) with a partial body. */
export async function updateCollection(
  idOrName: string,
  body: Record<string, unknown>,
): Promise<PBCollection> {
  return pbRequest<PBCollection>('PATCH', `/api/collections/${encodeURIComponent(idOrName)}`, body);
}

// ── field constructors (match the PB v0.23+ `fields` schema shape) ──────────
// Only the keys we care about; PB fills defaults for the rest.
type Field = Record<string, unknown> & { name: string; type: string };

export const f = {
  text: (name: string, o: Partial<Field> = {}): Field => ({ name, type: 'text', max: 0, min: 0, ...o }),
  editor: (name: string, o: Partial<Field> = {}): Field => ({ name, type: 'editor', ...o }),
  number: (name: string, o: Partial<Field> = {}): Field => ({ name, type: 'number', ...o }),
  bool: (name: string, o: Partial<Field> = {}): Field => ({ name, type: 'bool', ...o }),
  date: (name: string, o: Partial<Field> = {}): Field => ({ name, type: 'date', ...o }),
  url: (name: string, o: Partial<Field> = {}): Field => ({ name, type: 'url', ...o }),
  select: (name: string, values: string[], o: Partial<Field> = {}): Field => ({
    name,
    type: 'select',
    maxSelect: 1,
    values,
    ...o,
  }),
  relation: (name: string, collectionId: string, o: Partial<Field> = {}): Field => ({
    name,
    type: 'relation',
    collectionId,
    maxSelect: 1,
    cascadeDelete: false,
    ...o,
  }),
};

export function log(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(msg);
}
