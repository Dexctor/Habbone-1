import 'server-only';

import {
  createDirectus,
  rest,
  readItems,
  readItem,
  createItem,
  updateItem,
  deleteItem,
  staticToken,
} from '@directus/sdk';

import type { DirectusRoleLite, DirectusUserLite } from './types';

const DIRECTUS_URL = (process.env.NEXT_PUBLIC_DIRECTUS_URL || '').trim();
const SERVICE_TOKEN = (process.env.DIRECTUS_SERVICE_TOKEN || '').trim();
const FALLBACK_DIRECTUS_URL = 'http://localhost:8055';
export const USERS_TABLE = process.env.USERS_TABLE || 'usuarios';
export const STORIES_TABLE = process.env.STORIES_TABLE || 'usuarios_storie';
export const STORIES_FOLDER_ID = (process.env.DIRECTUS_FILES_FOLDER || '').trim() || null;

export type DirectusCmsSchema = {
  directus_roles: DirectusRoleLite;
  directus_users: DirectusUserLite;
} & Record<string, unknown>;

export function assertDirectusConfigured(): void {
  if (!DIRECTUS_URL) throw new Error('NEXT_PUBLIC_DIRECTUS_URL manquant');
  if (!SERVICE_TOKEN) throw new Error('DIRECTUS_SERVICE_TOKEN manquant');
}

export const directusUrl = DIRECTUS_URL || FALLBACK_DIRECTUS_URL;
export const serviceToken = SERVICE_TOKEN;

export const directusService = createDirectus<DirectusCmsSchema>(directusUrl)
  .with(staticToken(SERVICE_TOKEN))
  .with(rest());

export const rItems = readItems as any;
export const rItem = readItem as any;
export const cItem = createItem as any;
export const uItem = updateItem as any;
export const dItem = deleteItem as any;
