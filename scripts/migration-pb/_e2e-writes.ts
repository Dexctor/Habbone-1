/**
 * E2E write test — exercises every public WRITE path against the live PocketBase,
 * using the REAL service functions the API routes call (src/server/directus/*).
 *
 * Covers: create article, create topic, comment on both, like/unlike both,
 * vote/unvote a topic. Reads back each result to confirm it persisted, then
 * deletes everything it created (idempotent cleanup, even on failure).
 *
 * Usage (VPS):
 *   node --env-file=.env.vps --import tsx scripts/migration-pb/_e2e-writes.ts
 *
 * NOTHING is left behind in the DB on success. The test author/user must exist.
 */

import {
  adminCreateNews,
  adminDeleteNews,
  createNewsComment,
  toggleNewsCommentLike,
  getPublicNewsById,
  getPublicNewsComments,
  adminDeleteNewsComment,
} from '../../src/server/directus/news';
import {
  createForumTopic,
  adminDeleteForumTopic,
  createForumComment,
  toggleForumCommentLike,
  setTopicVote,
  getTopicVoteSummary,
  getPublicTopicById,
  getPublicTopicComments,
  adminDeleteForumComment,
  listForumCategoriesService,
} from '../../src/server/directus/forum';
import { getLikesMapForNewsComments, getLikesMapForTopicComments } from '../../src/server/directus/likes';
import { pbAdmin } from '../../src/server/directus/client';
import { TABLES } from '../../src/server/directus/tables';

// --- tiny test harness ---------------------------------------------------
let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ❌ ${label}${extra !== undefined ? `  →  ${JSON.stringify(extra)}` : ''}`);
  }
}

const TEST_AUTHOR = process.env.E2E_AUTHOR || 'testadmin';
const STAMP = process.env.E2E_STAMP || 'e2e-test';

async function pickUserNick(): Promise<string> {
  // Prefer the configured author; fall back to the first user in the DB.
  const pb = await pbAdmin();
  try {
    const u = await pb.collection(TABLES.users).getFirstListItem(`nick="${TEST_AUTHOR}"`).catch(() => null);
    if (u) return TEST_AUTHOR;
  } catch { /* ignore */ }
  const list = await pb.collection(TABLES.users).getList(1, 1, { sort: 'created' });
  const nick = (list.items[0] as any)?.nick;
  if (!nick) throw new Error('Aucun utilisateur en base pour servir d’auteur de test');
  console.log(`  (auteur de test = "${nick}" — ${TEST_AUTHOR} introuvable)`);
  return nick;
}

async function main() {
  console.log(`\n=== E2E WRITES contre ${process.env.POCKETBASE_URL} ===\n`);
  const author = await pickUserNick();

  // track ids for cleanup
  let articleId: string | null = null;
  let articleCommentId: string | null = null;
  let topicId: string | null = null;
  let topicCommentId: string | null = null;

  try {
    // ───────────────────────── ARTICLE ─────────────────────────
    console.log('▶ ARTICLE');
    const article = await adminCreateNews({
      titulo: `[${STAMP}] Article de test`,
      descricao: 'Résumé de test e2e',
      noticia: '<p>Contenu de <strong>test</strong> e2e.</p>',
      autor: author,
      status: 'published',
    });
    articleId = String((article as any).id);
    check('création article', !!articleId && articleId !== '0', { articleId });

    const fetchedArticle = await getPublicNewsById(articleId);
    check('relecture article (visible public)', !!fetchedArticle && String(fetchedArticle.id) === articleId);
    check('article: corps HTML persisté', !!fetchedArticle && /test/i.test(String(fetchedArticle.noticia || '')));

    // comment on the article
    const aComment = await createNewsComment({
      newsId: articleId,
      author,
      content: `Commentaire e2e ${STAMP}`,
    });
    articleCommentId = String((aComment as any).id);
    check('commentaire article créé', !!articleCommentId && articleCommentId !== '0', { articleCommentId });

    const aComments = await getPublicNewsComments(articleId);
    check(
      'relecture commentaire article',
      aComments.some((c) => String(c.id) === articleCommentId),
      { count: aComments.length },
    );

    // like the article comment
    const like1 = await toggleNewsCommentLike(articleCommentId, author);
    check('like commentaire article (liked=true)', like1?.liked === true, like1);
    let likeMap = await getLikesMapForNewsComments([articleCommentId]);
    check('compteur like article = 1', likeMap[articleCommentId] === 1, likeMap);

    // unlike
    const like2 = await toggleNewsCommentLike(articleCommentId, author);
    check('unlike commentaire article (liked=false)', like2?.liked === false, like2);
    likeMap = await getLikesMapForNewsComments([articleCommentId]);
    check('compteur like article = 0', (likeMap[articleCommentId] || 0) === 0, likeMap);

    // ───────────────────────── TOPIC ─────────────────────────
    console.log('\n▶ TOPIC FORUM');
    // pick a real category if any (cat is optional/nullable)
    const cats = await listForumCategoriesService().catch(() => []);
    const catId = cats[0] ? String((cats[0] as any).id) : null;

    const topic = await createForumTopic({
      titulo: `[${STAMP}] Topic de test`,
      conteudo: '<p>Sujet de <em>test</em> e2e.</p>',
      autor: author,
      cat_id: catId,
    });
    topicId = String((topic as any).id);
    check('création topic', !!topicId && topicId !== '0', { topicId, catId });

    const fetchedTopic = await getPublicTopicById(topicId);
    check('relecture topic', !!fetchedTopic && String(fetchedTopic.id) === topicId);

    // comment on the topic
    const tComment = await createForumComment({
      topicId,
      author,
      content: `Réponse e2e ${STAMP}`,
    });
    topicCommentId = String((tComment as any).id);
    check('commentaire topic créé', !!topicCommentId && topicCommentId !== '0', { topicCommentId });

    const tComments = await getPublicTopicComments(topicId);
    check(
      'relecture commentaire topic',
      tComments.some((c) => String(c.id) === topicCommentId),
      { count: tComments.length },
    );

    // like the topic comment
    const tlike1 = await toggleForumCommentLike(topicCommentId, author);
    check('like commentaire topic (liked=true)', tlike1?.liked === true, tlike1);
    let tLikeMap = await getLikesMapForTopicComments([topicCommentId]);
    check('compteur like topic = 1', tLikeMap[topicCommentId] === 1, tLikeMap);

    const tlike2 = await toggleForumCommentLike(topicCommentId, author);
    check('unlike commentaire topic (liked=false)', tlike2?.liked === false, tlike2);
    tLikeMap = await getLikesMapForTopicComments([topicCommentId]);
    check('compteur like topic = 0', (tLikeMap[topicCommentId] || 0) === 0, tLikeMap);

    // ───────────────────────── VOTES ─────────────────────────
    console.log('\n▶ VOTES TOPIC');
    const vUp = await setTopicVote(topicId, author, 1);
    check('vote up (created)', (vUp as any)?.created === true, vUp);
    let summary = await getTopicVoteSummary(topicId);
    check('résumé vote: up=1 down=0', summary.up === 1 && summary.down === 0, summary);

    // switch up → down (should update, not duplicate)
    const vDown = await setTopicVote(topicId, author, -1);
    check('vote down (updated)', (vDown as any)?.updated === true, vDown);
    summary = await getTopicVoteSummary(topicId);
    check('résumé vote: up=0 down=1', summary.up === 0 && summary.down === 1, summary);

    // re-cast same down → removes (toggle off)
    const vOff = await setTopicVote(topicId, author, -1);
    check('re-vote down (removed/toggle off)', (vOff as any)?.removed === true, vOff);
    summary = await getTopicVoteSummary(topicId);
    check('résumé vote: up=0 down=0', summary.up === 0 && summary.down === 0, summary);
  } finally {
    // ───────────────────────── CLEANUP ─────────────────────────
    console.log('\n▶ NETTOYAGE');
    const pb = await pbAdmin();
    // delete comments first (FK to article/topic), then likes/votes auto-gone, then parents
    if (articleCommentId) await adminDeleteNewsComment(articleCommentId).then(() => console.log('  🗑️  commentaire article supprimé')).catch((e) => console.log('  ⚠️ del comment article:', e?.message));
    if (topicCommentId) await adminDeleteForumComment(topicCommentId).then(() => console.log('  🗑️  commentaire topic supprimé')).catch((e) => console.log('  ⚠️ del comment topic:', e?.message));
    if (articleId) await adminDeleteNews(articleId).then(() => console.log('  🗑️  article supprimé')).catch((e) => console.log('  ⚠️ del article:', e?.message));
    if (topicId) await adminDeleteForumTopic(topicId).then(() => console.log('  🗑️  topic supprimé')).catch((e) => console.log('  ⚠️ del topic:', e?.message));
    // belt-and-suspenders: purge any leftover vote/like rows for the test comment/topic
    try {
      if (topicId) {
        const votes = await pb.collection(TABLES.forumTopicVotes).getFullList({ filter: `topic="${topicId}"` });
        for (const v of votes) await pb.collection(TABLES.forumTopicVotes).delete((v as any).id);
      }
    } catch { /* ignore */ }
  }

  console.log(`\n=== RÉSULTAT : ${passed} ✅ / ${failed} ❌ ===`);
  if (failed) {
    console.log('Échecs:\n  - ' + failures.join('\n  - '));
    process.exit(1);
  }
  console.log('🎉 Tous les tests d’écriture passent.\n');
}

main().catch((e) => {
  console.error('\n[e2e] FATAL:', e?.message || e);
  process.exit(1);
});
