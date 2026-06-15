/**
 * PocketBase migration — Step 12: recover lost content images via Wayback Machine.
 *
 * ni-host (habbone.fr/uploads) was suspended; ~369 images embedded INSIDE article
 * bodies (<img src="https://habbone.fr/uploads/up-xxx.png">) are now broken. The
 * Lot-09 re-host only handled cover images, not images inside the HTML body.
 *
 * This script, for each unique content image:
 *   1. checks archive.org for an archived snapshot,
 *   2. downloads it from the Wayback Machine (raw, via the id_ suffix),
 *   3. re-uploads it to PB `uploads`,
 *   4. rewrites every occurrence of the old URL in article bodies to the new PB URL.
 *
 * Only recovered images are rewritten; the rest keep their (broken) URL so they
 * can be recovered later if ni-host comes back. Idempotent: skips URLs already
 * rewritten to pb.habbone.fr.
 *
 * Usage (VPS): node --env-file=.env.vps --import tsx scripts/migration-pb/12-recover-wayback.ts --dry-run
 *              node --env-file=.env.vps --import tsx scripts/migration-pb/12-recover-wayback.ts
 */

import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1]) || 0;

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

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waybackUrl(originalUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`http://archive.org/wayback/available?url=${encodeURIComponent(originalUrl)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as any;
    const snap = j?.archived_snapshots?.closest;
    if (snap?.available && snap?.url) {
      // request the RAW file (id_ suffix) instead of the toolbar-wrapped page
      return String(snap.url).replace(/\/(\d+)\//, '/$1id_/');
    }
    return null;
  } catch {
    return null;
  }
}

async function downloadBlob(url: string): Promise<{ blob: Blob; type: string } | null> {
  try {
    const res = await fetch(url, { redirect: 'follow' as RequestRedirect });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength < 100) return null; // too small to be a real image
    const type = res.headers.get('content-type') || 'image/png';
    if (!/^image\//.test(type)) return null;
    return { blob: new Blob([ab], { type }), type };
  } catch {
    return null;
  }
}

function extFromType(t: string): string {
  return t.includes('gif') ? '.gif' : t.includes('jpeg') || t.includes('jpg') ? '.jpg' : t.includes('webp') ? '.webp' : '.png';
}

async function main() {
  console.log(`[12] recover content images via Wayback  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  const pb = await getPb();

  // load all articles with bodies
  const articles = await pb.collection('articles').getFullList({ fields: 'id,body', batch: 500 });

  // collect unique broken content image URLs
  const urlRe = /https?:\/\/habbone\.fr\/uploads\/(up-[a-zA-Z0-9._-]+\.(?:png|jpe?g|gif|webp))/gi;
  const allUrls = new Set<string>();
  for (const a of articles as any[]) {
    const body = String(a.body || '');
    let m: RegExpExecArray | null;
    urlRe.lastIndex = 0;
    while ((m = urlRe.exec(body)) !== null) allUrls.add(m[0]);
  }
  let urls = [...allUrls];
  if (LIMIT) urls = urls.slice(0, LIMIT);
  console.log(`[12] ${urls.length} unique content image URLs to attempt\n`);

  // url -> new pb url (only for recovered)
  const recovered = new Map<string, string>();
  let archived = 0, notArchived = 0, dlFailed = 0;

  for (const url of urls) {
    const wb = await waybackUrl(url);
    if (!wb) { notArchived++; continue; }
    archived++;
    if (DRY_RUN) {
      if (archived <= 6) console.log(`  [dry] archived: ${url.slice(-30)}`);
      continue;
    }
    const dl = await downloadBlob(wb);
    if (!dl) { dlFailed++; continue; }
    try {
      const form = new FormData();
      const name = (url.split('/').pop() || 'img.png').replace(/[^a-zA-Z0-9._-]/g, '_');
      const finalName = /\.[a-z0-9]+$/i.test(name) ? name : name + extFromType(dl.type);
      form.append('file', dl.blob, finalName);
      form.append('context', 'article-body');
      const rec: any = await pb.collection('uploads').create(form);
      const fname = Array.isArray(rec.file) ? rec.file[0] : rec.file;
      recovered.set(url, pb.files.getURL(rec, fname));
      console.log(`  ✓ ${url.slice(-28)} -> PB`);
    } catch (e: any) {
      dlFailed++;
      console.log(`  ✗ upload ${url.slice(-28)}: ${e?.message}`);
    }
    await wait(300); // be gentle with archive.org
  }

  console.log(`\n[12] archived=${archived} not-archived=${notArchived} dl/upload-failed=${dlFailed}`);

  // rewrite article bodies
  if (!DRY_RUN && recovered.size > 0) {
    let updatedArticles = 0;
    for (const a of articles as any[]) {
      let body = String(a.body || '');
      let changed = false;
      for (const [oldU, newU] of recovered) {
        if (body.includes(oldU)) { body = body.split(oldU).join(newU); changed = true; }
      }
      if (changed) {
        await pb.collection('articles').update(a.id, { body });
        updatedArticles++;
      }
    }
    console.log(`[12] rewrote ${recovered.size} image URLs across ${updatedArticles} articles`);
  }

  console.log(`\n[12] done. recovered ${recovered.size}/${urls.length} content images.`);
}

main().catch((e) => { console.error('[12] fatal:', e?.message || e); process.exit(1); });
