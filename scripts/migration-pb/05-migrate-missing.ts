/**
 * PocketBase migration — Step 05: migrate the tables 04 missed/skipped.
 *
 * Fills the gaps found after 03/04:
 *   - article_comments (noticias_coment) — was NOT migrated by 04 at all (7 rows)
 *   - stories (usuarios_storie) — 04 hit a transient Directus 403; now reachable (9 rows)
 *   - forum_comments retry (some legacy comments are genuinely orphaned -> skipped)
 *
 * Article/topic relations are resolved by matching on TITLE (legacy id -> pb id),
 * since 04 only persisted the nick->id user map. Volumes are tiny so this is safe;
 * ambiguous/multiple matches are logged and skipped.
 *
 * Idempotent-ish: re-running creates duplicates for already-migrated rows, so run
 * only against collections still missing the data (article_comments=0, stories=0).
 *
 * Usage (VPS): node --env-file=.env.vps --import tsx scripts/migration-pb/05-migrate-missing.ts --dry-run
 *              node --env-file=.env.vps --import tsx scripts/migration-pb/05-migrate-missing.ts
 */

import { directusGetAll, getPb, loadUserMap, unixToIso, nickToId, type IdMap } from './_migrate-lib';
import { TABLES } from '../../src/server/pocketbase/tables';

const DRY_RUN = process.argv.includes('--dry-run');

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Build legacyId -> pbId by matching a legacy table to a PB collection on a title field. */
async function buildTitleMap(
  legacyTable: string,
  legacyTitleField: string,
  pbCollection: string,
  pbTitleField: string,
): Promise<IdMap> {
  const pb = await getPb();
  const legacy = await directusGetAll<any>(legacyTable, `id,${legacyTitleField}`);
  const pbRows = await pb.collection(pbCollection).getFullList({ fields: `id,${pbTitleField}`, batch: 500 });

  // pb title -> [pbId] (detect ambiguity)
  const byTitle = new Map<string, string[]>();
  for (const r of pbRows as any[]) {
    const k = norm(r[pbTitleField]);
    if (!byTitle.has(k)) byTitle.set(k, []);
    byTitle.get(k)!.push(r.id);
  }

  const map: IdMap = {};
  let ambiguous = 0;
  let missing = 0;
  for (const l of legacy) {
    const k = norm(l[legacyTitleField]);
    const hits = byTitle.get(k) || [];
    if (hits.length === 1) map[String(l.id)] = hits[0];
    else if (hits.length > 1) { ambiguous++; map[String(l.id)] = hits[0]; }
    else missing++;
  }
  console.log(`  [map ${legacyTable}->${pbCollection}] resolved=${Object.keys(map).length} ambiguous=${ambiguous} missing=${missing}`);
  return map;
}

async function main() {
  console.log(`[05] migrate missing  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  const users = loadUserMap();
  console.log(`[05] ${Object.keys(users).length} user mappings\n`);

  const pb = await getPb();

  // resolve legacy->pb maps by title
  console.log('[05] building relation maps (by title)');
  const articleMap = await buildTitleMap('noticias', 'titulo', TABLES.articles, 'title');
  const topicMap = await buildTitleMap('forum_topicos', 'titulo', TABLES.forumTopics, 'title');

  // ── 1. article_comments (noticias_coment) — skip if already populated ──
  console.log('\n[05] article_comments');
  const acExisting = await pb.collection(TABLES.articleComments).getList(1, 1).then((r) => r.totalItems).catch(() => 0);
  if (acExisting > 0) {
    console.log(`  article_comments: already has ${acExisting} rows — skip`);
  } else {
    const rows = await directusGetAll<any>('noticias_coment', 'id,id_noticia,comentario,autor,data,status');
    let ok = 0, skip = 0;
    for (const r of rows) {
      const article = articleMap[String(r.id_noticia)];
      if (!article) { skip++; continue; }
      if (DRY_RUN) { ok++; continue; }
      try {
        await pb.collection(TABLES.articleComments).create({
          article,
          author: nickToId(users, r.autor),
          content: r.comentario || '',
          status: r.status === 'ativo' ? 'active' : 'hidden',
          created: unixToIso(r.data) || undefined,
        });
        ok++;
      } catch (e: any) { skip++; console.log('     ✗', r.id, e?.response?.data ? JSON.stringify(e.response.data) : e?.message); }
    }
    console.log(`  article_comments: created=${ok} skipped=${skip} (of ${rows.length})`);
  }

  // ── 2. stories (usuarios_storie) — skip if already populated ──
  console.log('\n[05] stories');
  const stExisting = await pb.collection(TABLES.stories).getList(1, 1).then((r) => r.totalItems).catch(() => 0);
  if (stExisting > 0) {
    console.log(`  stories: already has ${stExisting} rows — skip`);
  } else {
    // NB: usuarios_storie has `image` (not `imagem`). Listing a non-existent
    // field makes Directus return 403, so request only real columns.
    const rows = await directusGetAll<any>('usuarios_storie', 'id,autor,image,data,status,published_at');
    let ok = 0, skip = 0;
    for (const r of rows) {
      const img = r.image || '';
      if (DRY_RUN) { ok++; continue; }
      try {
        await pb.collection(TABLES.stories).create({
          author: nickToId(users, r.autor),
          image: typeof img === 'string' && /^https?:\/\//.test(img) ? img : null,
          status: r.status === 'ativo' || r.status === 'public' ? 'public' : 'hidden',
          published_at: unixToIso(r.published_at ?? r.data),
        });
        ok++;
      } catch (e: any) { skip++; console.log('     ✗', r.id, e?.response?.data ? JSON.stringify(e.response.data) : e?.message); }
    }
    console.log(`  stories: created=${ok} skipped=${skip} (of ${rows.length})`);
  }

  console.log(`\n[05] done. (forum_comments: 9 legacy comments are orphaned — their topics were deleted in Directus — nothing to recover)`);
  void topicMap;
}

main().catch((e) => { console.error('[05] fatal:', e?.message || e); process.exit(1); });
