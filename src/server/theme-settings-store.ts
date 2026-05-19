import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { directusUrl, serviceToken } from '@/server/directus/client';
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type SiteThemeSettings } from '@/lib/theme-settings';
import { readSupabaseJson, uploadSupabaseJson } from '@/server/supabase/storage';

const THEME_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const THEME_DATA_FILE = path.join(THEME_DATA_DIR, 'theme-settings.json');
const THEME_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'theme');
const THEME_SETTINGS_FILENAME = (process.env.THEME_SETTINGS_FILENAME || 'theme-settings.json').trim() || 'theme-settings.json';
const THEME_SETTINGS_TITLE = (process.env.THEME_SETTINGS_TITLE || 'Theme Settings').trim() || 'Theme Settings';
const THEME_FILES_FOLDER_ID = (process.env.THEME_FILES_FOLDER_ID || process.env.DIRECTUS_FILES_FOLDER || '').trim() || null;

type ThemeStorageMode = 'file' | 'directus-file' | 'supabase-storage';

function getThemeStorageMode(): ThemeStorageMode {
  const raw = (process.env.THEME_STORAGE || '').trim().toLowerCase();
  if (raw === 'file' || raw === 'filesystem' || raw === 'local') return 'file';
  if (raw === 'directus' || raw === 'directus-file') return 'directus-file';
  if (raw === 'supabase' || raw === 'supabase-storage') return 'supabase-storage';
  if ((process.env.DATA_BACKEND || '').trim().toLowerCase() === 'supabase') return 'supabase-storage';
  return process.env.VERCEL ? 'directus-file' : 'file';
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

type ThemeJsonFileMeta = { id: string } | null;

async function getLatestThemeJsonFileFromQuery(options?: { withFolderFilter?: boolean }): Promise<ThemeJsonFileMeta> {
  const url = new URL(`${directusUrl}/files`);
  url.searchParams.set('fields', 'id');
  url.searchParams.set('filter[title][_eq]', THEME_SETTINGS_TITLE);
  if (options?.withFolderFilter !== false && THEME_FILES_FOLDER_ID) {
    url.searchParams.set('filter[folder][_eq]', THEME_FILES_FOLDER_ID);
  }
  // "date_created" is blocked by current Directus role permissions in production.
  // "uploaded_on" is accessible and matches file creation chronology.
  url.searchParams.set('sort', '-uploaded_on');
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${serviceToken}` },
    cache: 'no-store',
  }).catch(() => null);

  if (!response?.ok) {
    try { console.error(`[theme] directus files list failed (${response?.status || 'network'})`); } catch {}
    return null;
  }
  const json = (await response.json().catch(() => null)) as Record<string, any> | null;
  const row = Array.isArray(json?.data) ? json?.data?.[0] : null;
  const id = row?.id;
  return id ? { id: String(id) } : null;
}

async function getLatestThemeJsonFile(): Promise<ThemeJsonFileMeta> {
  const withFolder = await getLatestThemeJsonFileFromQuery({ withFolderFilter: true });
  if (withFolder?.id) return withFolder;
  // Fallback without folder filter because some uploads may not persist folder metadata.
  return getLatestThemeJsonFileFromQuery({ withFolderFilter: false });
}

async function readThemeSettingsFromDirectusFile(): Promise<SiteThemeSettings> {
  try {
    const latest = await getLatestThemeJsonFile();
    if (!latest?.id) return DEFAULT_THEME_SETTINGS;

    const response = await fetch(`${directusUrl}/assets/${encodeURIComponent(latest.id)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    }).catch(() => null);

    if (!response?.ok) {
      try { console.error(`[theme] directus asset read failed (${response?.status || 'network'})`); } catch {}
      return DEFAULT_THEME_SETTINGS;
    }
    const raw = await response.text().catch(() => '');
    if (!raw) return DEFAULT_THEME_SETTINGS;
    return normalizeThemeSettings(JSON.parse(raw));
  } catch (error: unknown) {
    try {
      console.error(
        `[theme] directus settings parse/read failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } catch {}
    return DEFAULT_THEME_SETTINGS;
  }
}

async function writeThemeSettingsToDirectusFile(patch: Partial<SiteThemeSettings>): Promise<SiteThemeSettings> {
  const current = await readThemeSettingsFromDirectusFile();
  const next = normalizeThemeSettings({
    ...current,
    ...patch,
  });
  const payload = `${JSON.stringify(next, null, 2)}\n`;
  const formData = new FormData();
  formData.set('file', new Blob([payload], { type: 'application/json' }), THEME_SETTINGS_FILENAME);
  formData.set('title', THEME_SETTINGS_TITLE);
  if (THEME_FILES_FOLDER_ID) formData.set('folder', THEME_FILES_FOLDER_ID);

  const response = await fetch(`${directusUrl}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serviceToken}` },
    body: formData,
    cache: 'no-store',
  }).catch((error: unknown) => {
    throw new Error(`THEME_DIRECTUS_UPLOAD_NETWORK_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`THEME_DIRECTUS_UPLOAD_FAILED: ${response.status} ${body}`);
  }

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

export async function readThemeSettings(): Promise<SiteThemeSettings> {
  const storage = getThemeStorageMode();
  if (storage === 'supabase-storage') return readThemeSettingsFromSupabaseStorage();
  if (storage === 'directus-file') return readThemeSettingsFromDirectusFile();
  return readThemeSettingsFromFile();
}

export async function writeThemeSettings(patch: Partial<SiteThemeSettings>): Promise<SiteThemeSettings> {
  const storage = getThemeStorageMode();
  if (storage === 'supabase-storage') return writeThemeSettingsToSupabaseStorage(patch);
  if (storage === 'directus-file') return writeThemeSettingsToDirectusFile(patch);
  return writeThemeSettingsToFile(patch);
}

export function isThemeStoredInDirectus(): boolean {
  return getThemeStorageMode() === 'directus-file';
}

export function isThemeStoredInSupabase(): boolean {
  return getThemeStorageMode() === 'supabase-storage';
}

export const themeUploadDir = THEME_UPLOAD_DIR;
