import PocketBase from 'pocketbase';
import { pbAuth, PB_URL } from './_pb';

type Target = {
  collection: string;
  field: string;
};

const targets: Target[] = [
  { collection: 'articles', field: 'cover_image' },
  { collection: 'articles', field: 'body' },
  { collection: 'forum_topics', field: 'cover_image' },
  { collection: 'forum_topics', field: 'body' },
  { collection: 'stories', field: 'image' },
  { collection: 'sponsors', field: 'image' },
  { collection: 'badges', field: 'image' },
  { collection: 'shop_items', field: 'image' },
  { collection: 'users', field: 'avatar_url' },
  { collection: 'users', field: 'background_url' },
];

const urlRe = /https?:\/\/[^"' <>)]+|\/uploads\/[^"' <>)]+|^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/gi;
const directusAssetRe = /\/assets\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const mediaFileRe = /\.(?:png|jpe?g|gif|webp|svg|mp4|webm)$/i;

const allowedExternalHosts = new Set([
  'images.habbo.com',
  'www.habbo.fr',
  'www.habbo.com',
]);

function normalizeHost(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function classify(raw: string): string {
  const value = raw.trim();
  const host = normalizeHost(value);
  const pbHost = normalizeHost(PB_URL);
  const directusHost = normalizeHost(process.env.NEXT_PUBLIC_DIRECTUS_URL || '');

  if (/^[0-9a-f-]{36}$/i.test(value)) return 'directus-uuid';
  if (directusAssetRe.test(value) || (directusHost && host === directusHost)) return 'directus';
  if (value.startsWith('/uploads/')) return 'local-upload';
  if (pbHost && host === pbHost) return 'pocketbase';
  if (allowedExternalHosts.has(host)) return 'allowed-external';
  if (host === 'cdn.discordapp.com' || host === 'media.discordapp.net') return 'discord-cdn';
  if (host === 'habbone.fr' || host === 'www.habbone.fr' || host === 'habbone.xyz' || host === 'api.habbone.fr') {
    return value.includes('/uploads/') || value.includes('/assets/') ? 'legacy-habbone-media' : 'habbone-url';
  }
  if (host === 'localhost' || host === '127.0.0.1') return 'local-dev';
  return host ? 'other-external' : 'unknown';
}

function isMediaReference(raw: string): boolean {
  const value = raw.trim();
  if (/^[0-9a-f-]{36}$/i.test(value)) return true;
  if (value.startsWith('/uploads/')) return true;
  if (directusAssetRe.test(value)) return true;
  try {
    const parsed = new URL(value);
    return mediaFileRe.test(parsed.pathname);
  } catch {
    return mediaFileRe.test(value.split(/[?#&]/)[0] || value);
  }
}

async function main() {
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  pb.authStore.save(await pbAuth(), null);

  const totals = new Map<string, number>();
  const samples = new Map<string, Set<string>>();

  for (const target of targets) {
    const rows = await pb.collection(target.collection).getFullList({
      fields: `id,${target.field}`,
      batch: 500,
    });

    const byClass = new Map<string, number>();
    for (const row of rows as any[]) {
      const raw = String(row[target.field] || '').trim();
      if (!raw) continue;

      const matches = raw.match(urlRe) || [];
      for (const match of matches) {
        if (!isMediaReference(match)) continue;
        const kind = classify(match);
        byClass.set(kind, (byClass.get(kind) || 0) + 1);
        totals.set(kind, (totals.get(kind) || 0) + 1);
        if (!samples.has(kind)) samples.set(kind, new Set());
        const bucket = samples.get(kind)!;
        if (bucket.size < 8) bucket.add(match);
      }
    }

    if (byClass.size > 0) {
      console.log(`\n${target.collection}.${target.field}`);
      for (const [kind, count] of [...byClass.entries()].sort()) {
        console.log(`  ${kind}: ${count}`);
      }
    }
  }

  console.log('\nTotals');
  if (totals.size === 0) {
    console.log('  no media URLs found');
    return;
  }
  for (const [kind, count] of [...totals.entries()].sort()) {
    console.log(`  ${kind}: ${count}`);
    for (const sample of samples.get(kind) || []) {
      console.log(`    - ${sample}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
