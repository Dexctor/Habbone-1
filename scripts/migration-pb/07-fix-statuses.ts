/**
 * PocketBase migration — Step 07: fix article/topic statuses.
 *
 * The initial mapping only treated 'ativo'/'published' as published; everything
 * else (revisao, rascunho, empty) became 'draft'. Per decision: articles with a
 * real legacy status (ativo/revisao/rascunho) should be PUBLISHED; only the
 * empty-status ones (test/reserviert) stay draft.
 *
 * Matches legacy->pb by TITLE (small volume). Updates only when the status
 * differs, so it's safe to re-run.
 *
 * Usage (VPS): node --env-file=.env.vps --import tsx scripts/migration-pb/07-fix-statuses.ts --dry-run
 *              node --env-file=.env.vps --import tsx scripts/migration-pb/07-fix-statuses.ts
 */

import { directusGetAll, getPb } from './_migrate-lib';
import { TABLES } from '../../src/server/directus/tables';

const DRY_RUN = process.argv.includes('--dry-run');

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// legacy article status -> pb status
function articleStatus(legacy: unknown): 'published' | 'draft' {
  const s = String(legacy ?? '').trim().toLowerCase();
  // ativo, revisao, rascunho -> published ; empty/unknown -> draft
  return s === 'ativo' || s === 'revisao' || s === 'rascunho' || s === 'published' ? 'published' : 'draft';
}

// legacy topic status -> pb status
function topicStatus(legacy: unknown): 'active' | 'hidden' {
  const s = String(legacy ?? '').trim().toLowerCase();
  return s === 'inativo' || s === 'hidden' || s === '' ? 'hidden' : 'active';
}

async function fixCollection(opts: {
  label: string;
  legacyTable: string;
  legacyTitleField: string;
  legacyStatusField: string;
  pbCollection: string;
  pbTitleField: string;
  mapStatus: (legacy: unknown) => string;
}) {
  const pb = await getPb();
  const legacy = await directusGetAll<any>(opts.legacyTable, `id,${opts.legacyTitleField},${opts.legacyStatusField}`);
  const pbRows = await pb.collection(opts.pbCollection).getFullList({ fields: `id,${opts.pbTitleField},status`, batch: 500 });

  // title -> pbId (first match)
  const byTitle = new Map<string, { id: string; status: string }>();
  for (const r of pbRows as any[]) {
    const k = norm(r[opts.pbTitleField]);
    if (!byTitle.has(k)) byTitle.set(k, { id: r.id, status: r.status });
  }

  let changed = 0, same = 0, missing = 0;
  for (const l of legacy) {
    const k = norm(l[opts.legacyTitleField]);
    const target = byTitle.get(k);
    if (!target) { missing++; continue; }
    const wanted = opts.mapStatus(l[opts.legacyStatusField]);
    if (target.status === wanted) { same++; continue; }
    if (DRY_RUN) { changed++; console.log(`  [dry] ${opts.label} ${target.id}: ${target.status} -> ${wanted} (${String(l[opts.legacyTitleField]).slice(0,30)})`); continue; }
    try {
      await pb.collection(opts.pbCollection).update(target.id, { status: wanted });
      changed++;
    } catch (e: any) {
      console.log(`  ✗ ${target.id}: ${e?.message}`);
    }
  }
  console.log(`  ${opts.label}: changed=${changed} unchanged=${same} missing=${missing} (of ${legacy.length})`);
}

async function main() {
  console.log(`[07] fix statuses  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);

  console.log('[07] articles');
  await fixCollection({
    label: 'articles',
    legacyTable: 'noticias',
    legacyTitleField: 'titulo',
    legacyStatusField: 'status',
    pbCollection: TABLES.articles,
    pbTitleField: 'title',
    mapStatus: articleStatus,
  });

  console.log('[07] forum_topics');
  await fixCollection({
    label: 'forum_topics',
    legacyTable: 'forum_topicos',
    legacyTitleField: 'titulo',
    legacyStatusField: 'status',
    pbCollection: TABLES.forumTopics,
    pbTitleField: 'title',
    mapStatus: topicStatus,
  });

  console.log('\n[07] done.');
}

main().catch((e) => { console.error('[07] fatal:', e?.message || e); process.exit(1); });
