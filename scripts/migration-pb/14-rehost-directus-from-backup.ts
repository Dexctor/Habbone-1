/**
 * Re-host legacy Directus URLs that still point to habbone.fr/uploads.
 *
 * This is for the current Vercel production app while it still reads Directus.
 * It mirrors step 13, but patches Directus collections instead of PocketBase
 * collections. Files are uploaded to PocketBase `uploads`, then Directus fields
 * are rewritten to the new PB file URLs.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import PocketBase from 'pocketbase';
import { pbAuth } from './_pb';

const DRY_RUN = process.argv.includes('--dry-run');
const UPLOADS_DIR = process.env.UPLOADS_DIR || '';
const DIRECTUS_ENV_FILE =
  process.env.DIRECTUS_ENV_FILE ||
  resolve(process.cwd(), '..', '..', '..', '.env.local');
const FILE_OVERRIDES = new Map(
  (process.env.UPLOAD_FILE_OVERRIDES || '')
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [from, to] = pair.split('=');
      return [filenameKey(from || ''), to || from || ''];
    }),
);

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

const targets: Array<{ collection: string; field: string; inBody?: boolean }> = [
  { collection: 'noticias', field: 'imagem' },
  { collection: 'noticias', field: 'noticia', inBody: true },
  { collection: 'forum_topicos', field: 'imagem' },
  { collection: 'forum_topicos', field: 'conteudo', inBody: true },
  { collection: 'usuarios_storie', field: 'image' },
  { collection: 'parceiros', field: 'imagem' },
  { collection: 'emblemas', field: 'imagem' },
  { collection: 'articles', field: 'cover_image' },
  { collection: 'articles', field: 'body', inBody: true },
  { collection: 'forum_topics', field: 'cover_image' },
  { collection: 'forum_topics', field: 'body', inBody: true },
  { collection: 'stories', field: 'image' },
  { collection: 'sponsors', field: 'image' },
  { collection: 'badges', field: 'image' },
];

const oldUploadUrlRe =
  /(?:https?:\/\/(?:www\.)?(?:habbone\.fr|habbone\.xyz))?\/uploads\/[^"' <>)]+(?:\([^"' <>)]*\)[^"' <>)]*)*\.(?:png|jpe?g|gif|webp)(?:\?[^"' <>]*)?/gi;

function loadEnvFile(path: string): void {
  try {
    const raw = readFileSync(path, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (!process.env[key]) process.env[key] = value.replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // env can already be present
  }
}

function filenameKey(name: string): string {
  try {
    return decodeURIComponent(name).toLowerCase();
  } catch {
    return name.toLowerCase();
  }
}

function safeUploadName(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function filenameFromUploadUrl(url: string): string | null {
  try {
    return decodeURIComponent(basename(new URL(url).pathname));
  } catch {
    try {
      return decodeURIComponent((url.split('/').pop() || '').split('?')[0].split('#')[0]);
    } catch {
      return (url.split('/').pop() || '').split('?')[0].split('#')[0] || null;
    }
  }
}

function indexUploads(dir: string): Map<string, string> {
  const idx = new Map<string, string>();
  if (!dir || !existsSync(dir)) return idx;

  function walk(current: string): void {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) idx.set(filenameKey(name), full);
    }
  }

  walk(dir);
  return idx;
}

async function directusRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: true; data: T } | { ok: false; status: number; text: string }> {
  const base = (process.env.NEXT_PUBLIC_DIRECTUS_URL || '').replace(/\/$/, '');
  const token = process.env.DIRECTUS_SERVICE_TOKEN || '';
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, text };
  return { ok: true, data: text ? JSON.parse(text) : undefined };
}

async function main() {
  loadEnvFile(DIRECTUS_ENV_FILE);

  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL;
  const directusToken = process.env.DIRECTUS_SERVICE_TOKEN;
  const pbUrl = (process.env.POCKETBASE_URL || '').replace(/\/$/, '');
  if (!directusUrl || !directusToken) throw new Error(`Directus env missing; checked ${DIRECTUS_ENV_FILE}`);
  if (!pbUrl) throw new Error('POCKETBASE_URL missing');

  console.log(`[14] re-host Directus from backup ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  console.log(`[14] Directus: ${directusUrl}`);

  const uploads = indexUploads(UPLOADS_DIR);
  console.log(`[14] ${uploads.size} fichiers indexés dans ${UPLOADS_DIR}\n`);
  if (!uploads.size) process.exit(1);

  const pb = new PocketBase(pbUrl);
  pb.autoCancellation(false);
  pb.authStore.save(await pbAuth(), null);

  const uploadedUrl = new Map<string, string>();
  let uploaded = 0;
  let rewritten = 0;
  let updated = 0;
  let missingFile = 0;
  let uploadFailed = 0;

  async function ensureUploaded(filename: string): Promise<string | null> {
    const key = filenameKey(filename);
    if (uploadedUrl.has(key)) return uploadedUrl.get(key)!;
    const uploadName = FILE_OVERRIDES.get(key) || filename;
    const filePath = uploads.get(filenameKey(uploadName));
    if (!filePath) {
      missingFile++;
      return null;
    }

    if (DRY_RUN) {
      uploaded++;
      const dryUrl = `dry://${uploadName}`;
      uploadedUrl.set(key, dryUrl);
      return dryUrl;
    }

    try {
      const ext = (uploadName.split('.').pop() || '').toLowerCase();
      const form = new FormData();
      form.append(
        'file',
        new Blob([readFileSync(filePath)], { type: MIME[ext] || 'application/octet-stream' }),
        safeUploadName(uploadName),
      );
      form.append('context', 'directus-backup-restore');
      const record: any = await pb.collection('uploads').create(form);
      const stored = Array.isArray(record.file) ? record.file[0] : record.file;
      const url = pb.files.getURL(record, stored);
      uploadedUrl.set(key, url);
      uploaded++;
      return url;
    } catch (error: any) {
      uploadFailed++;
      console.log(`  x upload ${filename}: ${error?.status || ''} ${error?.message || error}`);
      return null;
    }
  }

  for (const target of targets) {
    const query = `/items/${target.collection}?limit=-1&fields=id,${target.field}`;
    const list = await directusRequest<{ data: any[] }>('GET', query);
    if (!list.ok) {
      if (list.status === 403 || list.status === 404) {
        console.log(`  ${target.collection}.${target.field}: ignoré (${list.status})`);
        continue;
      }
      throw new Error(`${target.collection}.${target.field}: ${list.status} ${list.text.slice(0, 200)}`);
    }

    let touched = 0;
    for (const row of list.data.data || []) {
      const value = String(row[target.field] || '');
      if (!value.includes('/uploads/')) continue;

      if (target.inBody) {
        let next = value;
        let changed = false;
        for (const oldUrl of value.match(oldUploadUrlRe) || []) {
          const filename = filenameFromUploadUrl(oldUrl);
          if (!filename) continue;
          const newUrl = await ensureUploaded(filename);
          if (!newUrl) continue;
          rewritten++;
          if (!DRY_RUN) {
            next = next.split(oldUrl).join(newUrl);
            changed = true;
          }
        }
        if (changed) {
          await directusRequest('PATCH', `/items/${target.collection}/${encodeURIComponent(row.id)}`, {
            [target.field]: next,
          });
          touched++;
          updated++;
        }
      } else {
        const oldUrl = value.match(oldUploadUrlRe)?.[0];
        if (!oldUrl) continue;
        const filename = filenameFromUploadUrl(oldUrl);
        if (!filename) continue;
        const newUrl = await ensureUploaded(filename);
        if (!newUrl) continue;
        rewritten++;
        if (!DRY_RUN) {
          await directusRequest('PATCH', `/items/${target.collection}/${encodeURIComponent(row.id)}`, {
            [target.field]: newUrl,
          });
          touched++;
          updated++;
        }
      }
    }
    console.log(`  ${target.collection}.${target.field}: ${touched} champs MAJ`);
  }

  console.log(
    `\n[14] done. uploadées=${uploaded} occurrences-réécrites=${rewritten} champs-MAJ=${updated} fichiers-introuvables=${missingFile} uploads-échec=${uploadFailed}`,
  );
}

main().catch((error) => {
  console.error('[14] fatal:', error?.message || error);
  process.exit(1);
});
