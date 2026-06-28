/**
 * PocketBase migration — Step 13: re-host the remaining broken content images
 * from the ni-host cPanel backup (local extracted /uploads folder).
 *
 * Wayback only recovered 74/369 content images. The full ni-host backup contains
 * ALL of them. This script:
 *   1. scans article bodies for still-broken <img src="https://habbone.fr/uploads/...">
 *   2. finds the matching file in the local extracted uploads dir
 *   3. uploads it to PB `uploads`
 *   4. rewrites the URL in every article body
 *
 * Also handles cover_image / story image / etc. still pointing at habbone.fr.
 *
 * Idempotent: only touches URLs still on habbone.fr (already-PB URLs untouched).
 *
 * Usage (VPS):
 *   node --env-file=.env.vps --import tsx scripts/migration-pb/13-rehost-from-backup.ts --dry-run
 *   node --env-file=.env.vps --import tsx scripts/migration-pb/13-rehost-from-backup.ts
 *
 * UPLOADS_DIR env points to the extracted folder (default = scratchpad/uploads).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

const DRY_RUN = process.argv.includes('--dry-run');
const UPLOADS_DIR =
  process.env.UPLOADS_DIR ||
  'C:/Users/Dexct/AppData/Local/Temp/claude/D--Coding-project-Keystone-habbonne-habbone-admin-habbonedirectus--claude-worktrees-unruffled-mayer-5456e8/af9215c2-570b-4d0e-b3a9-1609d8a08697/scratchpad/uploads';
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
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
};

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

// Build a filename -> absolute path index of the extracted uploads dir.
function filenameKey(name: string): string {
  try {
    return decodeURIComponent(name).toLowerCase();
  } catch {
    return name.toLowerCase();
  }
}

function indexUploads(dir: string): Map<string, string> {
  const idx = new Map<string, string>();
  if (!existsSync(dir)) { console.error(`  UPLOADS_DIR introuvable: ${dir}`); return idx; }
  function walk(current: string): void {
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(full);
        continue;
      }
      if (stat.isFile()) idx.set(filenameKey(name), full);
    }
  }
  walk(dir);
  return idx;
}

function filenameFromUploadUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(basename(parsed.pathname));
  } catch {
    try {
      return decodeURIComponent((url.split('/').pop() || '').split('?')[0].split('#')[0]);
    } catch {
      return (url.split('/').pop() || '').split('?')[0].split('#')[0] || null;
    }
  }
}

async function main() {
  console.log(`[13] re-host from backup  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  const pb = await getPb();
  const uploads = indexUploads(UPLOADS_DIR);
  console.log(`[13] ${uploads.size} fichiers indexés dans le backup local\n`);
  if (uploads.size === 0) process.exit(1);

  // collect broken URLs across collections
  const targets: Array<{ collection: string; field: string; inBody?: boolean }> = [
    { collection: 'articles', field: 'cover_image' },
    { collection: 'articles', field: 'body', inBody: true },
    { collection: 'forum_topics', field: 'cover_image' },
    { collection: 'forum_topics', field: 'body', inBody: true },
    { collection: 'stories', field: 'image' },
    { collection: 'sponsors', field: 'image' },
    { collection: 'badges', field: 'image' },
  ];

  // cache: original filename -> new PB url (upload once, reuse)
  const uploadedUrl = new Map<string, string>();
  let uploaded = 0, missingFile = 0, rewritten = 0, fieldUpdates = 0;

  async function ensureUploaded(filename: string): Promise<string | null> {
    const key = filenameKey(filename);
    if (uploadedUrl.has(key)) return uploadedUrl.get(key)!;
    const uploadName = FILE_OVERRIDES.get(key) || filename;
    const path = uploads.get(filenameKey(uploadName));
    if (!path) { missingFile++; return null; }
    if (DRY_RUN) { uploaded++; uploadedUrl.set(key, `dry://${uploadName}`); return uploadedUrl.get(key)!; }
    try {
      const buf = readFileSync(path);
      const ext = (uploadName.split('.').pop() || 'png').toLowerCase();
      const form = new FormData();
      form.append('file', new Blob([buf], { type: MIME[ext] || 'application/octet-stream' }), uploadName.replace(/[^a-zA-Z0-9._-]/g, '_'));
      form.append('context', 'backup-restore');
      const rec: any = await pb.collection('uploads').create(form);
      const fname = Array.isArray(rec.file) ? rec.file[0] : rec.file;
      const url = pb.files.getURL(rec, fname);
      uploadedUrl.set(key, url);
      uploaded++;
      return url;
    } catch (e: any) {
      console.log(`  ✗ upload ${filename}: ${e?.response?.data ? JSON.stringify(e.response.data) : e?.message}`);
      return null;
    }
  }

  const urlRe = /(?:https?:\/\/(?:www\.)?(?:habbone\.fr|habbone\.xyz))?\/uploads\/[^"' <>)]+(?:\([^"' <>)]*\)[^"' <>)]*)*\.(?:png|jpe?g|gif|webp)(?:\?[^"' <>]*)?/gi;

  for (const t of targets) {
    const rows = await pb.collection(t.collection).getFullList({ fields: `id,${t.field}`, batch: 500 });
    for (const r of rows as any[]) {
      const val = String(r[t.field] || '');
      if (!val.includes('habbone.fr/uploads/')) continue;

      if (t.inBody) {
        // body: replace every broken url
        let body = val;
        let changed = false;
        const matches = val.match(urlRe) || [];
        for (const m of matches) {
          const filename = filenameFromUploadUrl(m);
          if (!filename) continue;
          const newUrl = await ensureUploaded(filename);
          if (newUrl && !DRY_RUN) { body = body.split(m).join(newUrl); changed = true; rewritten++; }
          else if (newUrl) rewritten++;
        }
        if (changed) { await pb.collection(t.collection).update(r.id, { [t.field]: body }); fieldUpdates++; }
      } else {
        // single url field
        const m = val.match(urlRe)?.[0];
        if (!m) continue;
        const filename = filenameFromUploadUrl(m);
        if (!filename) continue;
        const newUrl = await ensureUploaded(filename);
        if (newUrl) { rewritten++; if (!DRY_RUN) { await pb.collection(t.collection).update(r.id, { [t.field]: newUrl }); fieldUpdates++; } }
      }
    }
    console.log(`  ${t.collection}.${t.field}: traité`);
  }

  console.log(`\n[13] done. uploadées=${uploaded} occurrences-réécrites=${rewritten} champs-MAJ=${fieldUpdates} fichiers-introuvables=${missingFile}`);
}

main().catch((e) => { console.error('[13] fatal:', e?.message || e); process.exit(1); });
