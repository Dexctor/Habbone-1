/**
 * PocketBase migration — Step 14: re-host the remaining HEAVY animated GIFs as WebM.
 *
 * The last 29 broken content images are huge animated GIFs (10–45 MB each). Serving
 * them as-is would cripple page load + VPS bandwidth. Step 13 (`13-rehost-from-backup`)
 * deliberately left them: instead we convert each GIF → WebM (VP9) — a ~×40-100 size
 * cut with identical visuals — and embed a looping <video> in place of the <img>.
 *
 * Pipeline (GIFs already converted to scratchpad/converted/up-xxx.webm by the
 * ffmpeg pass — see the conversion step in the session):
 *   1. scan article/forum bodies for <img ... src="https://habbone.fr/uploads/up-xxx.gif" ...>
 *   2. upload the matching up-xxx.webm to PB `uploads`
 *   3. replace the WHOLE <img> tag with a <video autoplay loop muted playsinline>
 *      that keeps the original width/height so the layout doesn't shift
 *
 * Idempotent: only rewrites <img> tags still pointing at habbone.fr/uploads/*.gif.
 * Any GIF without a matching .webm is left untouched (logged).
 *
 * Usage (VPS):
 *   node --env-file=.env.vps --import tsx scripts/migration-pb/14-rehost-gifs-as-webm.ts --dry-run
 *   node --env-file=.env.vps --import tsx scripts/migration-pb/14-rehost-gifs-as-webm.ts
 *
 * WEBM_DIR env points to the converted folder (default = scratchpad/converted).
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

const DRY_RUN = process.argv.includes('--dry-run');
const WEBM_DIR =
  process.env.WEBM_DIR ||
  'C:/Users/Dexct/AppData/Local/Temp/claude/D--Coding-project-Keystone-habbonne-habbone-admin-habbonedirectus--claude-worktrees-unruffled-mayer-5456e8/af9215c2-570b-4d0e-b3a9-1609d8a08697/scratchpad/converted';

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

// Index of basename(no ext) -> absolute .webm path
function indexWebm(dir: string): Map<string, string> {
  const idx = new Map<string, string>();
  if (!existsSync(dir)) { console.error(`  WEBM_DIR introuvable: ${dir}`); return idx; }
  for (const name of readdirSync(dir)) {
    if (name.toLowerCase().endsWith('.webm')) {
      idx.set(name.slice(0, -'.webm'.length).toLowerCase(), join(dir, name));
    }
  }
  return idx;
}

// Match a whole <img ...> tag whose src is a habbone.fr/uploads/<file>.gif
const IMG_GIF_RE =
  /<img\b[^>]*\bsrc\s*=\s*["']https?:\/\/(?:www\.)?habbone\.(?:fr|xyz)\/uploads\/([^"'?]+\.gif)(?:\?[^"']*)?["'][^>]*>/gi;

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
}

function videoTag(webmUrl: string, width: string | null, height: string | null): string {
  const wh = `${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''}`;
  // autoplay+loop+muted+playsinline = behaves like an animated GIF; controls off.
  return `<video src="${webmUrl}" autoplay loop muted playsinline${wh} style="max-width:100%;height:auto"></video>`;
}

async function main() {
  console.log(`[14] re-host heavy GIFs as WebM  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  const pb = await getPb();
  const webm = indexWebm(WEBM_DIR);
  console.log(`[14] ${webm.size} fichiers .webm indexés dans ${WEBM_DIR}\n`);
  if (webm.size === 0) process.exit(1);

  const targets: Array<{ collection: string; field: string }> = [
    { collection: 'articles', field: 'body' },
    { collection: 'forum_topics', field: 'body' },
  ];

  // cache: gif basename -> uploaded webm URL (upload once, reuse everywhere)
  const uploadedUrl = new Map<string, string>();
  let uploaded = 0, missingWebm = 0, tagsReplaced = 0, fieldUpdates = 0;
  const missing = new Set<string>();

  async function ensureUploaded(gifFile: string): Promise<string | null> {
    const base = gifFile.replace(/\.gif$/i, '').toLowerCase();
    if (uploadedUrl.has(base)) return uploadedUrl.get(base)!;
    const path = webm.get(base);
    if (!path) { missingWebm++; missing.add(gifFile); return null; }
    if (DRY_RUN) { uploaded++; uploadedUrl.set(base, `dry://${base}.webm`); return uploadedUrl.get(base)!; }
    try {
      const buf = readFileSync(path);
      const form = new FormData();
      form.append('file', new Blob([buf], { type: 'video/webm' }), `${base}.webm`);
      form.append('context', 'gif-to-webm');
      const rec: any = await pb.collection('uploads').create(form);
      const fname = Array.isArray(rec.file) ? rec.file[0] : rec.file;
      const url = pb.files.getURL(rec, fname);
      uploadedUrl.set(base, url);
      uploaded++;
      console.log(`  ✓ upload ${base}.webm`);
      return url;
    } catch (e: any) {
      console.log(`  ✗ upload ${base}.webm: ${e?.response?.data ? JSON.stringify(e.response.data) : e?.message}`);
      return null;
    }
  }

  for (const t of targets) {
    const rows = await pb.collection(t.collection).getFullList({ fields: `id,${t.field}`, batch: 500 });
    for (const r of rows as any[]) {
      const body = String(r[t.field] || '');
      if (!/habbone\.(?:fr|xyz)\/uploads\/[^"']+\.gif/i.test(body)) continue;

      // collect all <img gif> tags first (regex is stateful), then process
      const tags: Array<{ tag: string; gif: string }> = [];
      let m: RegExpExecArray | null;
      IMG_GIF_RE.lastIndex = 0;
      while ((m = IMG_GIF_RE.exec(body)) !== null) tags.push({ tag: m[0], gif: m[1] });
      if (tags.length === 0) continue;

      let newBody = body;
      let changed = false;
      for (const { tag, gif } of tags) {
        const url = await ensureUploaded(gif);
        if (!url) continue;
        tagsReplaced++;
        if (DRY_RUN) continue;
        const vid = videoTag(url, attr(tag, 'width'), attr(tag, 'height'));
        newBody = newBody.split(tag).join(vid);
        changed = true;
      }
      if (changed && !DRY_RUN) {
        await pb.collection(t.collection).update(r.id, { [t.field]: newBody });
        fieldUpdates++;
        console.log(`  → ${t.collection}/${r.id}: ${tags.length} GIF(s) remplacé(s) par <video>`);
      }
    }
    console.log(`  ${t.collection}.${t.field}: traité`);
  }

  console.log(`\n[14] done. webm-uploadés=${uploaded} balises-remplacées=${tagsReplaced} champs-MAJ=${fieldUpdates} webm-manquants=${missingWebm}`);
  if (missing.size) console.log(`[14] GIFs sans .webm correspondant: ${[...missing].join(', ')}`);
}

main().catch((e) => { console.error('[14] fatal:', e?.message || e); process.exit(1); });
