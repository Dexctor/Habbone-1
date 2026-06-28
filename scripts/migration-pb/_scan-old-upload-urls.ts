import PocketBase from 'pocketbase';
import { pbAuth } from './_pb';

const PB_URL = (process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');

const targets: Array<[string, string]> = [
  ['articles', 'cover_image'],
  ['articles', 'body'],
  ['forum_topics', 'cover_image'],
  ['forum_topics', 'body'],
  ['stories', 'image'],
  ['sponsors', 'image'],
  ['badges', 'image'],
];

const oldUploadUrlRe =
  /(?:https?:\/\/(?:www\.)?(?:habbone\.fr|habbone\.xyz))?\/uploads\/[^"' <>)]+(?:\([^"' <>)]*\)[^"' <>)]*)*\.(?:png|jpe?g|gif|webp)(?:\?[^"' <>]*)?/gi;

function filenameOf(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || url);
  } catch {
    return url;
  }
}

async function main() {
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  pb.authStore.save(await pbAuth(), null);

  let total = 0;
  for (const [collection, field] of targets) {
    const rows = await pb.collection(collection).getFullList({ fields: `id,${field}`, batch: 500 });
    const names = new Set<string>();
    let count = 0;

    for (const row of rows as any[]) {
      const value = String(row[field] || '');
      for (const match of value.match(oldUploadUrlRe) || []) {
        count++;
        total++;
        names.add(filenameOf(match));
      }
    }

    if (count > 0) {
      console.log(`\n${collection}.${field}: ${count} old URLs`);
      for (const name of names) console.log(`  ${name}`);
    }
  }

  console.log(`\nTotal old upload URLs: ${total}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
