/**
 * Migrates data from the legacy HabboneX tables to the v2 collections.
 *
 * Usage:
 *   npx tsx scripts/migration/02-migrate-data.ts --dry-run   # preview
 *   npx tsx scripts/migration/02-migrate-data.ts             # for real
 *
 * Order matters: users first, then everything that links to them by nick.
 * We keep legacy IDs so URLs like /articles/97 stay valid.
 *
 * Side-by-side strategy: legacy tables untouched. Re-runnable: each insert
 * that would collide with an existing PK is skipped.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFromFile(path: string): void {
  try {
    const raw = readFileSync(path, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const [, k, v] = m;
      if (process.env[k]) continue;
      process.env[k] = v.replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}
loadEnvFromFile(resolve(process.cwd(), '.env.local'));

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL;
const TOKEN = process.env.DIRECTUS_SERVICE_TOKEN;
if (!DIRECTUS_URL || !TOKEN) {
  console.error('[migrate] missing env');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function df(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
}

/* ---------------------------------------------------------------- */
/*  Helpers                                                          */
/* ---------------------------------------------------------------- */

function unixToIso(sec: number | string | null | undefined): string | null {
  const n = Number(sec);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e11 ? n : n * 1000; // tolerate ms already
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function yesNoToBool(v: unknown): boolean {
  return String(v ?? '').toLowerCase() === 's';
}

async function fetchAll<T = any>(collection: string, params: Record<string, string> = {}): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  const limit = 500;
  while (true) {
    const q = new URLSearchParams({ ...params, limit: String(limit), offset: String(offset) });
    const res = await df(`/items/${collection}?${q}`);
    if (!res.ok) throw new Error(`list ${collection} ${res.status}`);
    const j = await res.json();
    const rows: T[] = j.data ?? [];
    out.push(...rows);
    if (rows.length < limit) break;
    offset += limit;
  }
  return out;
}

async function insertMany(collection: string, items: any[]): Promise<{ created: number; skipped: number; errors: any[] }> {
  let created = 0;
  let skipped = 0;
  const errors: any[] = [];

  for (const item of items) {
    if (DRY_RUN) {
      created += 1;
      if (VERBOSE) console.log(`  [dry] would insert into ${collection}:`, JSON.stringify(item).slice(0, 200));
      continue;
    }
    const res = await df(`/items/${collection}`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
    if (res.ok) {
      created += 1;
    } else {
      const text = await res.text();
      // 400 with duplicate key -> rerun: treat as skip
      if (text.includes('Duplicate') || text.includes('already exists') || text.includes('RECORD_NOT_UNIQUE')) {
        skipped += 1;
      } else if (text.includes('VALUE_TOO_LONG')) {
        // Specific case: inline base64 image in article body overflows TEXT column.
        // We skip loudly so the user can clean up source data and re-run.
        errors.push({
          id: item.id,
          status: res.status,
          reason: 'VALUE_TOO_LONG — legacy body contains inline base64 image. Clean up the source or enlarge the column manually.',
        });
      } else {
        errors.push({ item: { id: item.id, title: item.title ?? item.name }, status: res.status, body: text.slice(0, 300) });
      }
    }
  }

  return { created, skipped, errors };
}

/* ---------------------------------------------------------------- */
/*  Per-table migration                                              */
/* ---------------------------------------------------------------- */

type UserMap = Map<string, number>; // nick.toLowerCase() -> user.id (preserved from legacy)

async function migrateUsers(): Promise<UserMap> {
  console.log('\n── users ─────────────────────────────────────────');
  const legacy = await fetchAll<any>('usuarios', {
    fields: [
      'id', 'nick', 'email', 'senha', 'avatar', 'background', 'missao',
      'moedas', 'pontos', 'ativado', 'banido', 'ban_motivo', 'ban_termino', 'ban_autor',
      'acesso_data', 'acesso_ip', 'acesso_ua', 'acesso_gl',
      'data_criacao',
      'habbo_unique_id', 'habbo_hotel',
      'habbo_verification_status', 'habbo_verification_code',
      'habbo_verification_expires_at', 'habbo_verified_at',
      'directus_role_id',
    ].join(','),
  });
  console.log(`  fetched ${legacy.length} rows from usuarios`);

  const mapped = legacy.map((u) => ({
    id: Number(u.id),
    nick: u.nick,
    email: u.email || null,
    password: u.senha,
    avatar_url: u.avatar || null,
    background_url: u.background || null,
    mission: u.missao || null,
    coins: Number(u.moedas) || 0,
    points: Number(u.pontos) || 0,
    active: yesNoToBool(u.ativado),
    banned: yesNoToBool(u.banido),
    ban_reason: u.ban_motivo || null,
    ban_expires_at: unixToIso(u.ban_termino),
    ban_admin: u.ban_autor || null,
    last_login_at: unixToIso(u.acesso_data),
    last_login_ip: u.acesso_ip || null,
    last_login_ua: u.acesso_ua || null,
    last_login_gl: u.acesso_gl || null,
    habbo_unique_id: u.habbo_unique_id || null,
    habbo_hotel: u.habbo_hotel || 'fr',
    habbo_verification_status: u.habbo_verification_status || null,
    habbo_verification_code: u.habbo_verification_code || null,
    habbo_verification_expires_at: u.habbo_verification_expires_at || null,
    habbo_verified_at: u.habbo_verified_at || null,
    directus_role_id: u.directus_role_id || null,
    created_at: unixToIso(u.data_criacao),
  }));

  const result = await insertMany('users', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
  if (result.errors.length > 0) console.log('    errors:', result.errors.slice(0, 3));

  const map: UserMap = new Map();
  for (const m of mapped) map.set(String(m.nick).toLowerCase(), m.id);
  return map;
}

async function migrateForumCategories(): Promise<void> {
  console.log('\n── forum_categories ──────────────────────────────');
  const legacy = await fetchAll<any>('forum_cat');
  console.log(`  fetched ${legacy.length} rows from forum_cat`);

  const mapped = legacy.map((c) => ({
    id: Number(c.id),
    name: c.nome || c.name || `Category ${c.id}`,
    slug: c.slug || null,
    description: c.descricao || null,
    icon: c.icone || c.icon || null,
    sort: Number(c.sort ?? c.ordem ?? 0),
    active: c.status ? c.status === 'ativo' : yesNoToBool(c.ativo),
  }));
  const result = await insertMany('forum_categories', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
  if (result.errors.length > 0) console.log('    errors:', result.errors.slice(0, 3));
}

async function migrateForumTopics(userMap: UserMap): Promise<void> {
  console.log('\n── forum_topics ──────────────────────────────────');
  const legacy = await fetchAll<any>('forum_topicos');
  console.log(`  fetched ${legacy.length} rows from forum_topicos`);

  let unresolved = 0;
  const mapped = legacy.map((t) => {
    const authorId = userMap.get(String(t.autor || '').toLowerCase()) ?? null;
    if (!authorId) unresolved += 1;
    return {
      id: Number(t.id),
      title: t.titulo,
      body: t.conteudo,
      cover_image: t.imagem || null,
      category: Number(t.cat_id) || null,
      author: authorId,
      pinned: yesNoToBool(t.fixo),
      locked: yesNoToBool(t.fechado),
      lock_reason: t.fechado_motivo || null,
      locked_by: userMap.get(String(t.fechado_autor || '').toLowerCase()) ?? null,
      locked_at: unixToIso(t.fechado_data),
      views: Number(t.views) || 0,
      status: t.status === 'ativo' ? 'active' : 'hidden',
      edited_at: unixToIso(t.editado_data),
      created_at: unixToIso(t.data),
    };
  });

  if (unresolved > 0) console.log(`  WARN: ${unresolved} topics with unresolved author`);
  const result = await insertMany('forum_topics', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
  if (result.errors.length > 0) console.log('    errors:', result.errors.slice(0, 3));
}

async function migrateForumComments(userMap: UserMap): Promise<void> {
  console.log('\n── forum_comments ────────────────────────────────');
  const legacy = await fetchAll<any>('forum_coment');
  console.log(`  fetched ${legacy.length} rows from forum_coment`);

  let unresolved = 0;
  const mapped = legacy.map((c) => {
    const authorId = userMap.get(String(c.autor || '').toLowerCase()) ?? null;
    if (!authorId) unresolved += 1;
    return {
      id: Number(c.id),
      topic: Number(c.id_forum),
      author: authorId,
      content: c.comentario,
      likes_count: Number(c.curtida) || 0,
      status: c.status === 'ativo' ? 'active' : 'hidden',
      created_at: unixToIso(c.data),
    };
  });
  if (unresolved > 0) console.log(`  WARN: ${unresolved} comments with unresolved author`);
  const result = await insertMany('forum_comments', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
  if (result.errors.length > 0) console.log('    errors:', result.errors.slice(0, 3));
}

async function migrateForumCommentLikes(userMap: UserMap): Promise<void> {
  console.log('\n── forum_comment_likes ───────────────────────────');
  const legacy = await fetchAll<any>('forum_coment_curtidas');
  console.log(`  fetched ${legacy.length} rows`);
  if (legacy.length === 0) return;

  const mapped = legacy.map((r) => ({
    id: Number(r.id),
    comment: Number(r.id_coment ?? r.id_comentario ?? r.comment_id),
    user: userMap.get(String(r.autor || r.usuario || '').toLowerCase()) ?? null,
    created_at: unixToIso(r.data),
  })).filter((m) => m.comment && m.user);

  const result = await insertMany('forum_comment_likes', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateForumTopicVotes(userMap: UserMap): Promise<void> {
  console.log('\n── forum_topic_votes ─────────────────────────────');
  const legacy = await fetchAll<any>('forum_topicos_votos');
  console.log(`  fetched ${legacy.length} rows`);
  if (legacy.length === 0) return;

  const mapped = legacy.map((r) => ({
    id: Number(r.id),
    topic: Number(r.id_topico ?? r.id_forum ?? r.topico),
    user: userMap.get(String(r.autor || r.usuario || '').toLowerCase()) ?? null,
    value: Number(r.voto ?? r.value ?? 1),
    created_at: unixToIso(r.data),
  })).filter((m) => m.topic && m.user);

  const result = await insertMany('forum_topic_votes', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateArticles(userMap: UserMap): Promise<void> {
  console.log('\n── articles ──────────────────────────────────────');
  const legacy = await fetchAll<any>('noticias');
  console.log(`  fetched ${legacy.length} rows from noticias`);

  let unresolved = 0;
  const mapped = legacy.map((n) => {
    const authorId = userMap.get(String(n.autor || '').toLowerCase()) ?? null;
    if (!authorId) unresolved += 1;
    const legacyStatus = String(n.status || '').toLowerCase();
    const v2Status =
      legacyStatus === 'rascunho' ? 'draft'
      : legacyStatus === 'revisao' ? 'draft'
      : 'published';
    return {
      id: Number(n.id),
      title: n.titulo,
      slug: null,
      summary: n.descricao || null,
      cover_image: n.imagem || null,
      body: n.noticia || null,
      category: Number(n.cat_id) || null,
      author: authorId,
      status: v2Status,
      pinned: yesNoToBool(n.fixo),
      comments_enabled: n.comentarios ? yesNoToBool(n.comentarios) : true,
      views: Number(n.views) || 0,
      published_at: unixToIso(n.data),
      created_at: unixToIso(n.data),
    };
  });

  if (unresolved > 0) console.log(`  WARN: ${unresolved} articles with unresolved author`);
  const result = await insertMany('articles', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
  if (result.errors.length > 0) console.log('    errors:', result.errors.slice(0, 3));
}

async function migrateArticleCategories(): Promise<void> {
  console.log('\n── article_categories ────────────────────────────');
  const legacy = await fetchAll<any>('noticias_cat');
  console.log(`  fetched ${legacy.length} rows from noticias_cat`);

  const mapped = legacy.map((c) => ({
    id: Number(c.id),
    name: c.nome || `Category ${c.id}`,
    slug: c.slug || null,
    description: c.descricao || null,
    icon: c.icone || null,
    sort: Number(c.sort ?? c.ordem ?? 0),
    active: c.status === 'ativo',
  }));
  const result = await insertMany('article_categories', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateArticleComments(userMap: UserMap): Promise<void> {
  console.log('\n── article_comments ──────────────────────────────');
  const legacy = await fetchAll<any>('noticias_coment');
  console.log(`  fetched ${legacy.length} rows from noticias_coment`);

  let unresolved = 0;
  const mapped = legacy.map((c) => {
    const authorId = userMap.get(String(c.autor || '').toLowerCase()) ?? null;
    if (!authorId) unresolved += 1;
    return {
      id: Number(c.id),
      article: Number(c.id_noticia),
      author: authorId,
      content: c.comentario,
      likes_count: 0,
      status: c.status === 'ativo' ? 'active' : 'hidden',
      created_at: unixToIso(c.data),
    };
  });
  if (unresolved > 0) console.log(`  WARN: ${unresolved} comments with unresolved author`);
  const result = await insertMany('article_comments', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateArticleCommentLikes(userMap: UserMap): Promise<void> {
  console.log('\n── article_comment_likes ─────────────────────────');
  const legacy = await fetchAll<any>('noticias_coment_curtidas');
  console.log(`  fetched ${legacy.length} rows`);
  if (legacy.length === 0) return;

  const mapped = legacy.map((r) => ({
    id: Number(r.id),
    comment: Number(r.id_coment ?? r.id_comentario ?? r.comment_id),
    user: userMap.get(String(r.autor || r.usuario || '').toLowerCase()) ?? null,
    created_at: unixToIso(r.data),
  })).filter((m) => m.comment && m.user);

  const result = await insertMany('article_comment_likes', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateStories(userMap: UserMap): Promise<void> {
  console.log('\n── stories ───────────────────────────────────────');
  const legacy = await fetchAll<any>('usuarios_storie');
  console.log(`  fetched ${legacy.length} rows`);

  let unresolved = 0;
  const mapped = legacy.map((s) => {
    const authorId = userMap.get(String(s.autor || '').toLowerCase()) ?? null;
    if (!authorId) unresolved += 1;
    return {
      id: Number(s.id),
      title: s.titulo || null,
      image: s.image || '',
      author: authorId,
      status: s.status === 'ativo' || s.status === 'public' ? 'public' : (s.status as string) || 'public',
      published_at: s.published_at || unixToIso(s.data),
      created_at: unixToIso(s.data),
    };
  });
  if (unresolved > 0) console.log(`  WARN: ${unresolved} stories with unresolved author`);
  const result = await insertMany('stories', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateSponsors(userMap: UserMap): Promise<void> {
  console.log('\n── sponsors ──────────────────────────────────────');
  const legacy = await fetchAll<any>('parceiros');
  console.log(`  fetched ${legacy.length} rows`);

  const mapped = legacy.map((p) => ({
    id: Number(p.id),
    name: p.nome,
    link: p.link,
    image: p.imagem,
    active: p.status === 'ativo',
    sort: 0,
    created_by: userMap.get(String(p.autor || '').toLowerCase()) ?? null,
    created_at: unixToIso(p.data),
  }));
  const result = await insertMany('sponsors', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateShopItems(): Promise<void> {
  console.log('\n── shop_items ────────────────────────────────────');
  const legacy = await fetchAll<any>('shop_itens');
  console.log(`  fetched ${legacy.length} rows`);

  const mapped = legacy.map((i) => ({
    id: Number(i.id),
    name: i.nome,
    description: null,
    image: i.imagem || null,
    price_coins: Number(i.preco_moedas) || 0,
    stock: Number(i.qtd_disponivel) || 0,
    sold_count: Number(i.qtd_comprado) || 0,
    free: yesNoToBool(i.gratis),
    active: yesNoToBool(i.disponivel),
    created_at: unixToIso(i.data),
  }));
  const result = await insertMany('shop_items', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateShopOrders(userMap: UserMap): Promise<void> {
  console.log('\n── shop_orders ───────────────────────────────────');
  const legacy = await fetchAll<any>('shop_itens_mobis');
  console.log(`  fetched ${legacy.length} rows`);

  let unresolved = 0;
  const mapped = legacy.map((o) => {
    const buyerId = userMap.get(String(o.comprador || '').toLowerCase()) ?? null;
    if (!buyerId) unresolved += 1;
    const legacyStatus = String(o.status || '').toLowerCase();
    const v2Status =
      legacyStatus === 'entregue' ? 'delivered'
      : legacyStatus === 'cancelado' ? 'cancelled'
      : 'pending';
    return {
      id: Number(o.id),
      item: Number(o.id_item),
      buyer: buyerId,
      price_paid: 0,
      status: v2Status,
      created_at: unixToIso(o.data),
    };
  });
  if (unresolved > 0) console.log(`  WARN: ${unresolved} orders with unresolved buyer`);
  const result = await insertMany('shop_orders', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateBadges(userMap: UserMap): Promise<void> {
  console.log('\n── badges ────────────────────────────────────────');
  const legacy = await fetchAll<any>('emblemas');
  console.log(`  fetched ${legacy.length} rows`);

  const mapped = legacy.map((b) => ({
    id: Number(b.id),
    name: b.nome,
    description: b.descricao,
    image: b.imagem,
    free: yesNoToBool(b.gratis),
    active: b.status === 'ativo',
    created_by: userMap.get(String(b.autor || '').toLowerCase()) ?? null,
    created_at: unixToIso(b.data),
  }));
  const result = await insertMany('badges', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateUserBadges(userMap: UserMap): Promise<void> {
  console.log('\n── user_badges ───────────────────────────────────');
  const legacy = await fetchAll<any>('emblemas_usuario');
  console.log(`  fetched ${legacy.length} rows`);

  const mapped = legacy.map((ub) => ({
    id: Number(ub.id),
    badge: Number(ub.id_emblema),
    user: Number(ub.id_usuario),
    source: ub.autor_tipo || 'free',
    granted_by: userMap.get(String(ub.autor || '').toLowerCase()) ?? null,
    active: ub.status === 'ativo',
    created_at: unixToIso(ub.data),
  }));
  const result = await insertMany('user_badges', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

async function migrateAdminNotifications(userMap: UserMap): Promise<void> {
  console.log('\n── admin_notifications ───────────────────────────');
  const legacy = await fetchAll<any>('acp_notificacoes');
  console.log(`  fetched ${legacy.length} rows`);

  const mapped = legacy.map((n) => ({
    id: Number(n.id),
    message: n.texto,
    severity: n.tipo || 'info',
    read: false,
    author: userMap.get(String(n.autor || '').toLowerCase()) ?? null,
    created_at: unixToIso(n.data),
  }));
  const result = await insertMany('admin_notifications', mapped);
  console.log(`  inserted: ${result.created}, skipped: ${result.skipped}, errors: ${result.errors.length}`);
}

/* ---------------------------------------------------------------- */
/*  Main                                                             */
/* ---------------------------------------------------------------- */

async function main(): Promise<void> {
  console.log(`[migrate] target: ${DIRECTUS_URL}`);
  console.log(`[migrate] mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'REAL WRITE'}`);

  const userMap = await migrateUsers();
  console.log(`[migrate] user map size: ${userMap.size}`);

  await migrateArticleCategories();
  await migrateForumCategories();

  await migrateArticles(userMap);
  await migrateArticleComments(userMap);
  await migrateArticleCommentLikes(userMap);

  await migrateForumTopics(userMap);
  await migrateForumComments(userMap);
  await migrateForumCommentLikes(userMap);
  await migrateForumTopicVotes(userMap);

  await migrateStories(userMap);
  await migrateSponsors(userMap);
  await migrateShopItems();
  await migrateShopOrders(userMap);
  await migrateBadges(userMap);
  await migrateUserBadges(userMap);
  await migrateAdminNotifications(userMap);

  console.log(`\n[migrate] ${DRY_RUN ? 'dry run complete' : 'migration complete'}`);
}

main().catch((e) => {
  console.error('[migrate] failed:', e);
  process.exit(1);
});
