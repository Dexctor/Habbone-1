import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type SiteThemeSettings } from '@/lib/theme-settings';

const THEME_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const THEME_DATA_FILE = path.join(THEME_DATA_DIR, 'theme-settings.json');
const THEME_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'theme');

// Theme settings are stored as a local JSON file. On ephemeral hosts (Vercel)
// this needs an external store; decide between PocketBase-backed records or
// object storage before making theme uploads a production workflow.

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

export async function readThemeSettings(): Promise<SiteThemeSettings> {
  return readThemeSettingsFromFile();
}

export async function writeThemeSettings(patch: Partial<SiteThemeSettings>): Promise<SiteThemeSettings> {
  return writeThemeSettingsToFile(patch);
}

export const themeUploadDir = THEME_UPLOAD_DIR;
