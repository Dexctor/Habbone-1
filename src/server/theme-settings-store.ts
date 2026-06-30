import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type SiteThemeSettings } from '@/lib/theme-settings';
import { isPocketBaseConfigured, pocketBaseRequest } from '@/server/pocketbase';
import { readSupabaseJson, uploadSupabaseJson } from '@/server/supabase/storage';

const THEME_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const THEME_DATA_FILE = path.join(THEME_DATA_DIR, 'theme-settings.json');
const THEME_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'theme');
const THEME_SETTINGS_FILENAME = (process.env.THEME_SETTINGS_FILENAME || 'theme-settings.json').trim() || 'theme-settings.json';

const POCKETBASE_THEME_COLLECTION = (process.env.POCKETBASE_THEME_COLLECTION || 'theme_settings').trim() || 'theme_settings';
const THEME_RECORD_KEY = 'global';

type ThemeStorageMode = 'file' | 'supabase-storage' | 'pocketbase';

type PocketBaseListResponse<T> = {
  items?: T[];
};

type PocketBaseThemeRecord = SiteThemeSettings & {
  id: string;
  key?: string;
};

function getThemeStorageMode(): ThemeStorageMode {
  const raw = (process.env.THEME_STORAGE || '').trim().toLowerCase();
  if (raw === 'file' || raw === 'filesystem' || raw === 'local') return 'file';
  if (raw === 'supabase' || raw === 'supabase-storage') return 'supabase-storage';
  if (raw === 'pocketbase' || raw === 'pb') return 'pocketbase';
  if (isPocketBaseConfigured()) return 'pocketbase';
  // Cutover-mode default: when DATA_BACKEND=supabase we want theme on Supabase too.
  if ((process.env.DATA_BACKEND || '').trim().toLowerCase() === 'supabase') return 'supabase-storage';
  // Vercel/serverless fallback used to be Directus; with Directus removed we
  // serve the bundled default rather than crashing.
  return 'file';
}

async function readThemeSettingsFromFile(): Promise<SiteThemeSettings> {
  try {
    const raw = await readFile(THEME_DATA_FILE, 'utf-8');
    return normalizeThemeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME_SETTINGS;
  }
}

async function writeThemeSettingsToFile(patch: Partial<SiteThemeSettings>): Promise<SiteThemeSettings> {
  const current = await readThemeSettingsFromFile();
  const next = normalizeThemeSettings({
    ...current,
    ...patch,
  });
  await mkdir(THEME_DATA_DIR, { recursive: true });
  await writeFile(THEME_DATA_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf-8');
  return next;
}

async function readThemeSettingsFromSupabaseStorage(): Promise<SiteThemeSettings> {
  const raw = await readSupabaseJson<SiteThemeSettings>(
    `theme/${THEME_SETTINGS_FILENAME}`,
    DEFAULT_THEME_SETTINGS,
  );
  return normalizeThemeSettings(raw);
}

async function writeThemeSettingsToSupabaseStorage(patch: Partial<SiteThemeSettings>): Promise<SiteThemeSettings> {
  const current = await readThemeSettingsFromSupabaseStorage();
  const next = normalizeThemeSettings({
    ...current,
    ...patch,
  });
  await uploadSupabaseJson({
    path: `theme/${THEME_SETTINGS_FILENAME}`,
    data: next,
  });
  return next;
}

async function findPocketBaseThemeRecord(): Promise<PocketBaseThemeRecord | null> {
  const params = new URLSearchParams({
    filter: `key = "${THEME_RECORD_KEY}"`,
    perPage: '1',
  });
  const result = await pocketBaseRequest<PocketBaseListResponse<PocketBaseThemeRecord>>(
    `/api/collections/${encodeURIComponent(POCKETBASE_THEME_COLLECTION)}/records?${params.toString()}`,
  );
  return result.items?.[0] || null;
}

async function readThemeSettingsFromPocketBase(): Promise<SiteThemeSettings> {
  const record = await findPocketBaseThemeRecord().catch(() => null);
  return record ? normalizeThemeSettings(record) : DEFAULT_THEME_SETTINGS;
}

async function writeThemeSettingsToPocketBase(patch: Partial<SiteThemeSettings>): Promise<SiteThemeSettings> {
  const currentRecord = await findPocketBaseThemeRecord();
  const current = currentRecord ? normalizeThemeSettings(currentRecord) : DEFAULT_THEME_SETTINGS;
  const next = normalizeThemeSettings({
    ...current,
    ...patch,
  });
  const body = {
    key: THEME_RECORD_KEY,
    headerLogoUrl: next.headerLogoUrl,
    headerBackgroundColor: next.headerBackgroundColor,
    headerBackgroundImageUrl: next.headerBackgroundImageUrl || '',
    showLogo: next.showLogo,
  };

  if (currentRecord?.id) {
    await pocketBaseRequest<PocketBaseThemeRecord>(
      `/api/collections/${encodeURIComponent(POCKETBASE_THEME_COLLECTION)}/records/${encodeURIComponent(currentRecord.id)}`,
      {
        method: 'PATCH',
        body,
      },
    );
    return next;
  }

  await pocketBaseRequest<PocketBaseThemeRecord>(
    `/api/collections/${encodeURIComponent(POCKETBASE_THEME_COLLECTION)}/records`,
    {
      method: 'POST',
      body,
    },
  );
  return next;
}

export async function readThemeSettings(): Promise<SiteThemeSettings> {
  const storage = getThemeStorageMode();
  if (storage === 'pocketbase') return readThemeSettingsFromPocketBase();
  if (storage === 'supabase-storage') return readThemeSettingsFromSupabaseStorage();
  return readThemeSettingsFromFile();
}

export async function writeThemeSettings(patch: Partial<SiteThemeSettings>): Promise<SiteThemeSettings> {
  const storage = getThemeStorageMode();
  if (storage === 'pocketbase') return writeThemeSettingsToPocketBase(patch);
  if (storage === 'supabase-storage') return writeThemeSettingsToSupabaseStorage(patch);
  return writeThemeSettingsToFile(patch);
}

export function isThemeStoredInPocketBase(): boolean {
  return getThemeStorageMode() === 'pocketbase';
}

export function isThemeStoredInSupabase(): boolean {
  return getThemeStorageMode() === 'supabase-storage';
}

export const themeUploadDir = THEME_UPLOAD_DIR;
