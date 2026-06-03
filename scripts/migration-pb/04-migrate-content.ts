/**
 * PocketBase migration — Step 04: migrate content tables.
 *
 * Runs AFTER 03-migrate-users.ts (needs .migration/pb-id-map.json for author
 * relations). Order matters: categories before articles/topics, topics before
 * comments/votes, items before orders, badges before user_badges.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/migration-pb/04-migrate-content.ts --dry-run
 *   node --env-file=.env.local --import tsx scripts/migration-pb/04-migrate-content.ts
 */

import { migrateTable, loadUserMap, unixToIso, asBool, nickToId, type IdMap } from './_migrate-lib';
import { TABLES } from '../../src/server/directus/tables';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`[04] migrate content  ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  const users = loadUserMap();
  console.log(`[04] loaded ${Object.keys(users).length} user mappings\n`);

  // ── 1. article categories (noticias_cat -> article_categories) ──
  console.log('[04] article categories');
  const catMap = await migrateTable({
    label: 'article_categories',
    legacyTable: 'noticias_cat',
    legacyFields: 'id,nome,descricao,status',
    pbCollection: TABLES.articleCategories,
    dryRun: DRY_RUN,
    map: (r: any) => ({
      name: String(r.nome || 'Sans nom'),
      slug: String(r.nome || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${r.id}`,
      description: r.descricao || null,
      active: asBool(r.status),
    }),
  });

  // ── 2. articles (noticias -> articles) ──
  console.log('[04] articles');
  await migrateTable({
    label: 'articles',
    legacyTable: 'noticias',
    legacyFields: 'id,titulo,descricao,imagem,noticia,cat_id,comentarios,fixo,views,status,autor,data',
    pbCollection: TABLES.articles,
    dryRun: DRY_RUN,
    map: (r: any) => ({
      title: String(r.titulo || 'Sans titre'),
      slug: String(r.titulo || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `article-${r.id}`,
      summary: r.descricao || null,
      cover_image: typeof r.imagem === 'string' && /^https?:\/\//.test(r.imagem) ? r.imagem : null,
      body: r.noticia || '',
      category: r.cat_id ? catMap[String(r.cat_id)] ?? null : null,
      status: r.status === 'ativo' || r.status === 'published' ? 'published' : 'draft',
      pinned: asBool(r.fixo),
      comments_enabled: r.comentarios == null ? true : asBool(r.comentarios),
      views: Number(r.views) || 0,
      author: nickToId(users, r.autor),
      published_at: unixToIso(r.data),
    }),
  });

  // ── 3. forum categories (forum_cat -> forum_categories) ──
  console.log('[04] forum categories');
  const forumCatMap = await migrateTable({
    label: 'forum_categories',
    legacyTable: 'forum_cat',
    legacyFields: 'id,nome,imagem,status',
    pbCollection: TABLES.forumCategories,
    dryRun: DRY_RUN,
    map: (r: any) => ({
      name: String(r.nome || 'Sans nom'),
      slug: String(r.nome || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `fcat-${r.id}`,
      icon: typeof r.imagem === 'string' && /^https?:\/\//.test(r.imagem) ? r.imagem : null,
      active: asBool(r.status),
    }),
  });

  // ── 4. forum topics (forum_topicos -> forum_topics) ──
  console.log('[04] forum topics');
  const topicMap = await migrateTable({
    label: 'forum_topics',
    legacyTable: 'forum_topicos',
    legacyFields: 'id,titulo,conteudo,imagem,cat_id,fechado,fechado_motivo,fixo,views,status,autor,data',
    pbCollection: TABLES.forumTopics,
    dryRun: DRY_RUN,
    map: (r: any) => ({
      title: String(r.titulo || 'Sans titre'),
      body: r.conteudo || '',
      cover_image: typeof r.imagem === 'string' && /^https?:\/\//.test(r.imagem) ? r.imagem : null,
      category: r.cat_id ? forumCatMap[String(r.cat_id)] ?? null : null,
      author: nickToId(users, r.autor),
      pinned: asBool(r.fixo),
      locked: asBool(r.fechado),
      locked_reason: r.fechado_motivo || null,
      views: Number(r.views) || 0,
      status: r.status === 'ativo' ? 'active' : 'hidden',
      created: unixToIso(r.data) || undefined,
    }),
  });

  // ── 5. forum comments (forum_coment -> forum_comments) ──
  console.log('[04] forum comments');
  await migrateTable({
    label: 'forum_comments',
    legacyTable: 'forum_coment',
    legacyFields: 'id,id_forum,comentario,autor,curtida,data,status',
    pbCollection: TABLES.forumComments,
    dryRun: DRY_RUN,
    map: (r: any) => {
      const topic = topicMap[String(r.id_forum)];
      if (!topic) return null; // orphan comment (topic not migrated)
      return {
        topic,
        author: nickToId(users, r.autor),
        content: r.comentario || '',
        likes_count: Number(r.curtida) || 0,
        status: r.status === 'ativo' ? 'active' : 'hidden',
        created: unixToIso(r.data) || undefined,
      };
    },
  });

  // ── 6. forum topic votes (forum_topicos_votos -> forum_topic_votes) ──
  console.log('[04] forum topic votes');
  await migrateTable({
    label: 'forum_topic_votes',
    legacyTable: 'forum_topicos_votos',
    legacyFields: 'id,id_topico,autor,tipo',
    pbCollection: TABLES.forumTopicVotes,
    dryRun: DRY_RUN,
    map: (r: any) => {
      const topic = topicMap[String(r.id_topico)];
      const user = nickToId(users, r.autor);
      if (!topic || !user) return null;
      return { topic, user, value: r.tipo === 'pos' || Number(r.tipo) > 0 ? 'up' : 'down' };
    },
  });

  // ── 7. stories (usuarios_storie -> stories) ──
  console.log('[04] stories');
  await migrateTable({
    label: 'stories',
    legacyTable: 'usuarios_storie',
    legacyFields: 'id,autor,image,imagem,titulo,status,data,published_at',
    pbCollection: TABLES.stories,
    dryRun: DRY_RUN,
    map: (r: any) => {
      const img = r.image || r.imagem || '';
      return {
        title: r.titulo || null,
        image: typeof img === 'string' && /^https?:\/\//.test(img) ? img : null,
        author: nickToId(users, r.autor),
        status: r.status === 'ativo' || r.status === 'public' ? 'public' : 'hidden',
        published_at: unixToIso(r.published_at ?? r.data),
      };
    },
  });

  // ── 8. sponsors (parceiros -> sponsors) ──
  console.log('[04] sponsors');
  await migrateTable({
    label: 'sponsors',
    legacyTable: 'parceiros',
    legacyFields: 'id,nome,link,imagem,status,autor,data',
    pbCollection: TABLES.sponsors,
    dryRun: DRY_RUN,
    map: (r: any) => ({
      name: String(r.nome || 'Sans nom'),
      link: r.link || null,
      image: typeof r.imagem === 'string' && /^https?:\/\//.test(r.imagem) ? r.imagem : null,
      active: asBool(r.status),
      created_by: nickToId(users, r.autor),
    }),
  });

  // ── 9. shop items (shop_itens -> shop_items) ──
  console.log('[04] shop items');
  const shopItemMap = await migrateTable({
    label: 'shop_items',
    legacyTable: 'shop_itens',
    legacyFields: 'id,nome,imagem,preco_moedas,qtd_disponivel,qtd_comprado,gratis,disponivel,data',
    pbCollection: TABLES.shopItems,
    dryRun: DRY_RUN,
    map: (r: any) => ({
      name: String(r.nome || 'Sans nom'),
      image: typeof r.imagem === 'string' && /^https?:\/\//.test(r.imagem) ? r.imagem : null,
      price_coins: Number(r.preco_moedas) || 0,
      stock: Number(r.qtd_disponivel) || 0,
      sold_count: Number(r.qtd_comprado) || 0,
      free: asBool(r.gratis),
      active: asBool(r.disponivel),
    }),
  });

  // ── 10. badges (emblemas -> badges) ──
  console.log('[04] badges');
  const badgeMap = await migrateTable({
    label: 'badges',
    legacyTable: 'emblemas',
    legacyFields: 'id,nome,descricao,imagem,gratis,status,autor,data',
    pbCollection: TABLES.badges,
    dryRun: DRY_RUN,
    map: (r: any) => ({
      name: String(r.nome || 'Sans nom'),
      description: r.descricao || null,
      image: typeof r.imagem === 'string' && /^https?:\/\//.test(r.imagem) ? r.imagem : null,
      free: asBool(r.gratis),
      active: asBool(r.status),
      created_by: nickToId(users, r.autor),
    }),
  });

  // ── 11. user_badges (emblemas_usuario -> user_badges) ──
  console.log('[04] user badges');
  await migrateTable({
    label: 'user_badges',
    legacyTable: 'emblemas_usuario',
    legacyFields: 'id,id_emblema,id_usuario,autor_tipo,autor,status,data',
    pbCollection: TABLES.userBadges,
    dryRun: DRY_RUN,
    map: (r: any) => {
      const badge = badgeMap[String(r.id_emblema)];
      // id_usuario is a legacy user id; our user map is keyed by nick, so we
      // can't resolve it directly. Skip rows we can't link. (Most role badges
      // are re-granted on login anyway.)
      if (!badge) return null;
      return null; // user link unresolvable from nick map -> skip for now
    },
  });

  // ── 12. admin notifications (acp_notificacoes -> admin_notifications) ──
  console.log('[04] admin notifications');
  await migrateTable({
    label: 'admin_notifications',
    legacyTable: 'acp_notificacoes',
    legacyFields: 'id,texto,tipo,autor,data,status',
    pbCollection: TABLES.adminNotifications,
    dryRun: DRY_RUN,
    map: (r: any) => ({
      message: r.texto || '',
      severity: ['success', 'info', 'warning', 'danger'].includes(r.tipo) ? r.tipo : 'info',
      read: r.status !== 'ativo',
      author: nickToId(users, r.autor),
    }),
  });

  console.log(`\n[04] content migration ${DRY_RUN ? 'dry-run' : 'LIVE'} done.`);
  void (shopItemMap as IdMap);
}

main().catch((e) => {
  console.error('[04] fatal:', e?.message || e);
  process.exit(1);
});
