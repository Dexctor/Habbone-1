/**
 * PocketBase migration — Step 08: backfill article (and forum topic) images.
 *
 * Same issue as stories: cover_image was dropped during migration because the
 * legacy values were relative paths (/uploads/...) or Directus file UUIDs, not
 * absolute URLs (and cover_image is a `url`-typed field rejecting non-URLs).
 *
 * Legacy files are reachable:
 *   /uploads/<f>  -> https://habbone.fr/uploads/<f>
 *   <uuid>        -> https://api.habbone.fr/assets/<uuid>
 *   https://...   -> kept as-is
 *
 * Matches legacy->pb by TITLE. Updates only when the pb image is empty (safe to
 * re-run). Covers articles (noticias) and forum topics (forum_topicos).
 *
 * Usage (VPS): node --env-file=.env.vps --import tsx scripts/migration-pb/08-fix-article-images.ts --dry-run
 *              node --env-file=.env.vps --import tsx scripts/migration-pb/08-fix-article-images.ts
 */

import { directusGetAll, getPb, DIRECTUS_URL } from './_migrate-lib';
import { TABLES } from '../../src/server/directus/tables';

const DRY_RUN = process.argv.includes('--dry-run');
const LEGACY_MEDIA_BASE = 'https://habbone.fr';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function toAbsoluteUrl(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (UUID_RE.test(s)) return `${DIRECTUS_URL}/assets/${s}`;
  if (s.startsWith('/')) return `${LEGACY_MEDIA_BASE}${s}`;
  return `${LEGACY_MEDIA_BASE}/${s}`;
}

async function backfill(opts: {
  label: string;
  legacyTable: string;
  legacyTitleField: string;
  legacyImageField: string;
  pbCollection: string;
  pbTitleField: string;
  pbImageField: string;
}) {
  const pb = await getPb();
  const legacy = await directusGetAll<any>(opts.legacyTable, `id,${opts.legacyTitleField},${opts.legacyImageField}`);
  const pbRows = await pb.collection(opts.pbCollection).getFullList({
    fields: `id,${opts.pbTitleField},${opts.pbImageField}`,
    batch: 500,
  });

  // title -> first pb row (id + current image)
  const byTitle = new Map<string, { id: string; img: string }>();
  for (const r of pbRows as any[]) {
    const k = norm(r[opts.pbTitleField]);
    if (!byTitle.has(k)) byTitle.set(k, { id: r.id, img: r[opts.pbImageField] || '' });
  }

  let updated = 0, already = 0, noImage = 0, missing = 0;
  for (const l of legacy) {
    const target = byTitle.get(norm(l[opts.legacyTitleField]));
    if (!target) { missing++; continue; }
    if (target.img) { already++; continue; } // don't overwrite existing
    const url = toAbsoluteUrl(l[opts.legacyImageField]);
    if (!url) { noImage++; continue; }
    if (DRY_RUN) { updated++; if (updated <= 5) console.log(`  [dry] ${opts.label} ${target.id} <- ${url.slice(0,55)}`); continue; }
    try {
      await pb.collection(opts.pbCollection).update(target.id, { [opts.pbImageField]: url });
      updated++;
    } catch (e: any) {
      console.log(`  ✗ ${target.id}: ${e?.response?.data ? JSON.stringify(e.response.data) : e?.message}`);
    }
  }
  console.log(`  ${opts.label}: updated=${updated} already-had=${already} no-image=${noImage} missing=${missing} (of ${legacy.length})`);
}

async function main() {
  console.log(`[08] backfill images  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);

  console.log('[08] articles');
  await backfill({
    label: 'articles',
    legacyTable: 'noticias',
    legacyTitleField: 'titulo',
    legacyImageField: 'imagem',
    pbCollection: TABLES.articles,
    pbTitleField: 'title',
    pbImageField: 'cover_image',
  });

  console.log('[08] forum topics');
  await backfill({
    label: 'forum_topics',
    legacyTable: 'forum_topicos',
    legacyTitleField: 'titulo',
    legacyImageField: 'imagem',
    pbCollection: TABLES.forumTopics,
    pbTitleField: 'title',
    pbImageField: 'cover_image',
  });

  console.log('\n[08] done.');
}

main().catch((e) => { console.error('[08] fatal:', e?.message || e); process.exit(1); });
