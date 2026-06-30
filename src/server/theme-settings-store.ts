import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type SiteThemeSettings } from '@/lib/theme-settings';
import { pbCreate, pbFirst, pbUpdate } from '@/server/pocketbase/helpers';

const THEME_DATA_DIR = path.join(process.cwd(), 'public', 'data');
const THEME_DATA_FILE = path.join(THEME_DATA_DIR, 'theme-settings.json');
const POCKETBASE_THEME_COLLECTION = (process.env.POCKETBASE_THEME_COLLECTION || 'theme_settings').trim() || 'theme_settings';
const THEME_RECORD_KEY = 'global';

type ThemeStorageMode = 'file' | 'pocketbase';

type PocketBaseThemeRecord = SiteThemeSettings & {
  id: string;
  key?: string;
};

function isPocketBaseConfigured(): boolean {
  return Boolean((process.env.POCKETBASE_URL || '').trim());
}

function getThemeStorageMode(): ThemeStorageMode {
  const raw = (process.env.THEME_STORAGE || '').trim().toLowerCase();
  if (raw === 'file' || raw === 'filesystem' || raw === 'local') return 'file';
  if (raw === 'pocketbase' || raw === 'pb') return 'pocketbase';
  if (isPocketBaseConfigured()) return 'pocketbase';
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

async function findPocketBaseThemeRecord(): Promise<PocketBaseThemeRecord | null> {
  return pbFirst<PocketBaseThemeRecord>(POCKETBASE_THEME_COLLECTION, { key: { _eq: THEME_RECORD_KEY } });
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
    await pbUpdate<PocketBaseThemeRecord>(POCKETBASE_THEME_COLLECTION, currentRecord.id, body);
    return next;
  }

  await pbCreate<PocketBaseThemeRecord>(POCKETBASE_THEME_COLLECTION, body);
  return next;
}

export async function readThemeSettings(): Promise<SiteThemeSettings> {
  if (getThemeStorageMode() === 'pocketbase') return readThemeSettingsFromPocketBase();
  return readThemeSettingsFromFile();
}

export async function writeThemeSettings(patch: Partial<SiteThemeSettings>): Promise<SiteThemeSettings> {
  if (getThemeStorageMode() === 'pocketbase') return writeThemeSettingsToPocketBase(patch);
  return writeThemeSettingsToFile(patch);
}
