/**
 * PocketBase migration — Step 09: re-host images on PocketBase.
 *
 * Currently article/story/etc images are served from the OLD servers
 * (habbone.fr/uploads, api.habbone.fr/assets). If those go down, images break.
 * This script downloads each remote image and re-uploads it into PocketBase's
 * `uploads` collection, then rewrites the record's image field to the new
 * PocketBase URL — removing the dependency on the legacy servers.
 *
 * - Skips images already hosted on PocketBase (pb.habbone.fr) and external CDNs
 *   we want to keep (images.habbo.com).
 * - Idempotent: an image already pointing at pb.habbone.fr is left alone.
 * - Safe: a failed download/upload leaves the original URL untouched.
 *
 * Usage (VPS): node --env-file=.env.vps --import tsx scripts/migration-pb/09-rehost-images.ts --dry-run
 *              node --env-file=.env.vps --import tsx scripts/migration-pb/09-rehost-images.ts
 *
 * Optional: --only=articles  to limit to one collection.
 */

import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';

// collection -> image field
const TARGETS: Array<{ collection: string; field: string }> = [
  { collection: 'articles', field: 'cover_image' },
  { collection: 'forum_topics', field: 'cover_image' },
  { collection: 'stories', field: 'image' },
  { collection: 'sponsors', field: 'image' },
  { collection: 'badges', field: 'image' },
];

// Hosts we DON'T re-host: already on PB, or external CDNs to keep as-is.
const KEEP_HOSTS = ['pb.habbone.fr', 'images.habbo.com', 'www.habbo.com', 'www.habbo.fr'];

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

function shouldRehost(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const host = new URL(url).hostname;
    return !KEEP_HOSTS.includes(host);
  } catch {
    return false;
  }
}

function filenameFromUrl(url: string): string {
  try {
    const p = new URL(url).pathname;
    const base = p.split('/').pop() || 'image';
    // PB-safe filename
    const clean = decodeURIComponent(base).replace(/[^a-zA-Z0-9._-]/g, '_');
    return clean || 'image.png';
  } catch {
    return 'image.png';
  }
}

async function downloadToBlob(url: string): Promise<{ blob: Blob; name: string } | null> {
  try {
    const res = await fetch(url, { redirect: 'follow' as RequestRedirect });
    if (!res.ok) {
      console.log(`     ✗ download ${res.status}: ${url.slice(0, 60)}`);
      return null;
    }
    const ab = await res.arrayBuffer();
    if (ab.byteLength === 0) return null;
    const type = res.headers.get('content-type') || 'application/octet-stream';
    let name = filenameFromUrl(url);
    // ensure an extension
    if (!/\.[a-z0-9]{2,4}$/i.test(name)) {
      const ext = type.includes('png') ? '.png' : type.includes('gif') ? '.gif' : type.includes('webp') ? '.webp' : '.jpg';
      name += ext;
    }
    return { blob: new Blob([ab], { type }), name };
  } catch (e: any) {
    console.log(`     ✗ download error: ${e?.message} (${url.slice(0, 50)})`);
    return null;
  }
}

async function main() {
  console.log(`[09] re-host images  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  const pb = await getPb();

  let totalRehosted = 0, totalKept = 0, totalEmpty = 0, totalFailed = 0;

  for (const { collection, field } of TARGETS) {
    if (ONLY && collection !== ONLY) continue;
    const rows = await pb.collection(collection).getFullList({ fields: `id,${field}`, batch: 500 });
    let rehosted = 0, kept = 0, empty = 0, failed = 0;

    for (const r of rows as any[]) {
      const url = String(r[field] || '').trim();
      if (!url) { empty++; continue; }
      if (!shouldRehost(url)) { kept++; continue; }

      if (DRY_RUN) {
        rehosted++;
        if (rehosted <= 4) console.log(`  [dry] ${collection} ${r.id}: would re-host ${url.slice(0, 55)}`);
        continue;
      }

      const dl = await downloadToBlob(url);
      if (!dl) { failed++; continue; }

      try {
        // upload to `uploads` collection
        const form = new FormData();
        form.append('file', dl.blob, dl.name);
        form.append('context', collection);
        const rec: any = await pb.collection('uploads').create(form);
        const fname = Array.isArray(rec.file) ? rec.file[0] : rec.file;
        const newUrl = pb.files.getURL(rec, fname);
        // rewrite the record's image field
        await pb.collection(collection).update(r.id, { [field]: newUrl });
        rehosted++;
      } catch (e: any) {
        failed++;
        console.log(`     ✗ upload/update ${collection} ${r.id}: ${e?.response?.data ? JSON.stringify(e.response.data) : e?.message}`);
      }
    }

    console.log(`  ${collection}.${field}: rehosted=${rehosted} kept=${kept} empty=${empty} failed=${failed} (of ${rows.length})`);
    totalRehosted += rehosted; totalKept += kept; totalEmpty += empty; totalFailed += failed;
  }

  console.log(`\n[09] done. rehosted=${totalRehosted} kept=${totalKept} empty=${totalEmpty} failed=${totalFailed}`);
}

main().catch((e) => { console.error('[09] fatal:', e?.message || e); process.exit(1); });
