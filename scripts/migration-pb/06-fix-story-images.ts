/**
 * PocketBase migration — Step 06: backfill story images.
 *
 * The initial migration dropped story images because they were relative paths
 * (/uploads/...) or Directus file UUIDs, not absolute URLs (and stories.image is
 * a `url`-typed field that rejects non-URLs).
 *
 * The legacy files ARE reachable:
 *   - /uploads/<file>  ->  https://habbone.fr/uploads/<file>   (LEGACY_MEDIA_BASE)
 *   - <uuid>           ->  https://api.habbone.fr/assets/<uuid>
 *
 * So we rebuild each story's image as an ABSOLUTE URL and update the PB record.
 * Matching legacy story -> pb story is done by author + chronological order
 * (small volume, stable).
 *
 * Usage (VPS): node --env-file=.env.vps --import tsx scripts/migration-pb/06-fix-story-images.ts --dry-run
 *              node --env-file=.env.vps --import tsx scripts/migration-pb/06-fix-story-images.ts
 */

import { directusGetAll, getPb, DIRECTUS_URL } from './_migrate-lib';
import { TABLES } from '../../src/server/pocketbase/tables';

const DRY_RUN = process.argv.includes('--dry-run');
const LEGACY_MEDIA_BASE = 'https://habbone.fr';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toAbsoluteImageUrl(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s; // already absolute
  if (UUID_RE.test(s)) return `${DIRECTUS_URL}/assets/${s}`; // Directus file
  if (s.startsWith('/')) return `${LEGACY_MEDIA_BASE}${s}`; // relative path
  return `${LEGACY_MEDIA_BASE}/${s}`;
}

async function main() {
  console.log(`[06] backfill story images  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  const pb = await getPb();

  // legacy stories (with image + author + ordering key)
  const legacy = await directusGetAll<any>('usuarios_storie', 'id,autor,image,data,published_at');
  // pb stories
  const pbStories = await pb.collection(TABLES.stories).getFullList({ fields: 'id,author,image', batch: 500 });

  // Resolve author nick -> pbId via the same map the app uses (users in PB).
  // Build nick(lower) -> pbUserId from PB users.
  const pbUsers = await pb.collection(TABLES.users).getFullList({ fields: 'id,nick', batch: 500 });
  const nickToPbId = new Map<string, string>();
  for (const u of pbUsers as any[]) nickToPbId.set(String(u.nick).toLowerCase(), u.id);

  // Group pb stories by author, in stable order.
  const pbByAuthor = new Map<string, any[]>();
  for (const s of pbStories as any[]) {
    const k = String(s.author || '');
    if (!pbByAuthor.has(k)) pbByAuthor.set(k, []);
    pbByAuthor.get(k)!.push(s);
  }

  // Group legacy by author (resolved to pbId), same order as fetched.
  const legacyByAuthor = new Map<string, any[]>();
  for (const l of legacy) {
    const pbId = nickToPbId.get(String(l.autor || '').toLowerCase()) || '';
    if (!legacyByAuthor.has(pbId)) legacyByAuthor.set(pbId, []);
    legacyByAuthor.get(pbId)!.push(l);
  }

  let updated = 0;
  let skipped = 0;

  for (const [authorPbId, legacyRows] of legacyByAuthor) {
    const pbRows = pbByAuthor.get(authorPbId) || [];
    // pair them positionally (both small, same author)
    for (let i = 0; i < legacyRows.length; i++) {
      const l = legacyRows[i];
      const target = pbRows[i];
      if (!target) { skipped++; continue; }
      const url = toAbsoluteImageUrl(l.image);
      if (!url) { skipped++; continue; }
      if (DRY_RUN) {
        console.log(`  [dry] story ${target.id} <- ${url.slice(0, 60)}`);
        updated++;
        continue;
      }
      try {
        await pb.collection(TABLES.stories).update(target.id, { image: url });
        updated++;
        console.log(`  ✓ ${target.id} -> ${url.slice(0, 55)}`);
      } catch (e: any) {
        skipped++;
        console.log(`  ✗ ${target.id}: ${e?.response?.data ? JSON.stringify(e.response.data) : e?.message}`);
      }
    }
  }

  console.log(`\n[06] done. updated=${updated} skipped=${skipped} (of ${legacy.length} legacy stories)`);
}

main().catch((e) => { console.error('[06] fatal:', e?.message || e); process.exit(1); });
