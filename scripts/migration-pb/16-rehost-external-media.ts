/**
 * Re-host fragile external media references to PocketBase uploads.
 *
 * Keeps official Habbo media external (images.habbo.com / www.habbo.*) and
 * rewrites reachable third-party files (Discord CDN, image hosts, old panel
 * assets) inside article/forum HTML bodies and simple URL fields.
 *
 * Usage:
 *   node --import tsx scripts/migration-pb/16-rehost-external-media.ts --dry-run
 *   node --import tsx scripts/migration-pb/16-rehost-external-media.ts
 *   node --import tsx scripts/migration-pb/16-rehost-external-media.ts --replace-dead=/img/thumbnail.png
 */

import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_BYTES = Number(process.env.REHOST_MAX_BYTES || 25 * 1024 * 1024);
const replaceDeadArg = process.argv.find((arg) => arg.startsWith('--replace-dead='));
const DEAD_FALLBACK = replaceDeadArg ? replaceDeadArg.split('=').slice(1).join('=').trim() : '';

type Target = {
  collection: string;
  field: string;
  html?: boolean;
};

const targets: Target[] = [
  { collection: 'articles', field: 'cover_image' },
  { collection: 'articles', field: 'body', html: true },
  { collection: 'forum_topics', field: 'cover_image' },
  { collection: 'forum_topics', field: 'body', html: true },
  { collection: 'stories', field: 'image' },
  { collection: 'sponsors', field: 'image' },
  { collection: 'badges', field: 'image' },
  { collection: 'shop_items', field: 'image' },
  { collection: 'users', field: 'avatar_url' },
  { collection: 'users', field: 'background_url' },
];

const urlRe = /https?:\/\/[^"' <>)]+|\/uploads\/[^"' <>)]+/gi;
const mediaFileRe = /\.(?:png|jpe?g|gif|webp|svg|mp4|webm)(?:[?#&][^"' <>)]*)?$/i;

const preservedHosts = new Set([
  'images.habbo.com',
  'www.habbo.fr',
  'www.habbo.com',
]);

function decodeHtmlUrl(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#38;/g, '&')
    .replace(/&quot;/g, '"');
}

function normalizeUrl(raw: string): string | null {
  const value = decodeHtmlUrl(raw.trim());
  if (value.startsWith('/uploads/')) return `https://habbone.fr${value}`;
  try {
    const parsed = new URL(value);
    return parsed.toString();
  } catch {
    return null;
  }
}

function isMediaReference(raw: string): boolean {
  const normalized = normalizeUrl(raw);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return mediaFileRe.test(parsed.pathname);
  } catch {
    return false;
  }
}

function shouldPreserve(raw: string): boolean {
  const normalized = normalizeUrl(raw);
  if (!normalized) return true;
  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === new URL(PB_URL).hostname) return true;
    return preservedHosts.has(parsed.hostname.toLowerCase());
  } catch {
    return true;
  }
}

function filenameFromUrl(raw: string): string {
  const normalized = normalizeUrl(raw) || raw;
  try {
    const parsed = new URL(normalized);
    const base = decodeURIComponent(parsed.pathname.split('/').pop() || 'media');
    return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'media';
  } catch {
    return 'media';
  }
}

function mimeFromFilename(filename: string, fallback?: string | null): string {
  const cleanFallback = String(fallback || '').split(';')[0].trim().toLowerCase();
  if (cleanFallback && cleanFallback !== 'application/octet-stream') return cleanFallback;
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  return 'application/octet-stream';
}

async function main() {
  console.log(`[16] re-host external media ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  pb.authStore.save(await pbAuth(), null);

  const uploaded = new Map<string, string>();
  const failures = new Map<string, string>();
  let candidates = 0;
  let fetched = 0;
  let uploads = 0;
  let replacements = 0;
  let recordUpdates = 0;

  async function uploadExternal(raw: string): Promise<string | null> {
    const normalized = normalizeUrl(raw);
    if (!normalized) return null;
    if (uploaded.has(normalized)) return uploaded.get(normalized)!;
    if (failures.has(normalized)) return null;

    candidates++;
    try {
      const response = await fetch(normalized, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HabbOneMediaRehost/1.0)',
          Accept: 'image/*,video/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(20_000),
      });

      if (!response.ok) {
        failures.set(normalized, `HTTP ${response.status}`);
        return DEAD_FALLBACK || null;
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_BYTES) {
        failures.set(normalized, `too large (${contentLength} bytes)`);
        return DEAD_FALLBACK || null;
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_BYTES) {
        failures.set(normalized, `too large (${buffer.byteLength} bytes)`);
        return DEAD_FALLBACK || null;
      }

      fetched++;
      const filename = filenameFromUrl(normalized);
      const mime = mimeFromFilename(filename, response.headers.get('content-type'));

      if (DRY_RUN) {
        const dryUrl = `dry://${filename}`;
        uploaded.set(normalized, dryUrl);
        uploads++;
        return dryUrl;
      }

      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mime }), filename);
      form.append('context', 'external-media-rehost');
      const rec: any = await pb.collection('uploads').create(form);
      const storedName = Array.isArray(rec.file) ? rec.file[0] : rec.file;
      const url = pb.files.getURL(rec, storedName);
      uploaded.set(normalized, url);
      uploads++;
      console.log(`  upload ${filename} -> ${url}`);
      return url;
    } catch (error: any) {
      failures.set(normalized, error?.message || String(error));
      return DEAD_FALLBACK || null;
    }
  }

  for (const target of targets) {
    const rows = await pb.collection(target.collection).getFullList({
      fields: `id,${target.field}`,
      batch: 500,
    });

    let targetReplacements = 0;
    let targetUpdates = 0;

    for (const row of rows as any[]) {
      const value = String(row[target.field] || '');
      if (!value) continue;

      const matches = [...new Set(value.match(urlRe) || [])]
        .filter((match) => isMediaReference(match))
        .filter((match) => !shouldPreserve(match));

      if (matches.length === 0) continue;

      let nextValue = value;
      let changed = false;
      for (const match of matches) {
        const nextUrl = await uploadExternal(match);
        if (!nextUrl) continue;
        nextValue = nextValue.split(match).join(nextUrl);
        targetReplacements++;
        replacements++;
        changed = true;
      }

      if (changed) {
        targetUpdates++;
        recordUpdates++;
        if (!DRY_RUN) await pb.collection(target.collection).update(row.id, { [target.field]: nextValue });
      }
    }

    if (targetReplacements || targetUpdates) {
      console.log(`  ${target.collection}.${target.field}: replacements=${targetReplacements} records=${targetUpdates}`);
    }
  }

  console.log(
    `\n[16] done. candidates=${candidates} fetched=${fetched} uploads=${uploads} replacements=${replacements} records=${recordUpdates} failures=${failures.size}`,
  );
  if (failures.size > 0) {
    console.log('[16] failures:');
    for (const [url, reason] of failures) console.log(`  - ${reason}: ${url}`);
  }
}

main().catch((error) => {
  console.error('[16] fatal:', error?.message || error);
  process.exit(1);
});
