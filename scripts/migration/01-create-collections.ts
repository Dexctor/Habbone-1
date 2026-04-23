/**
 * Creates the v2 Directus collections (clean English schema) alongside the
 * legacy Habbonex tables. Safe to rerun: each collection is skipped if it
 * already exists.
 *
 * Usage:
 *   npx tsx scripts/migration/01-create-collections.ts
 *
 * Run conservatively: we keep ALL columns that have even a distant use case
 * (ban_reason, last_login_*, article categories, pinned, etc.) to minimise
 * regressions. Columns that are pure HabboneX folklore with zero references
 * in src/ are dropped.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFromFile(path: string): void {
  try {
    const raw = readFileSync(path, 'utf-8');
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  } catch {
    /* file missing is ok if already exported */
  }
}
loadEnvFromFile(resolve(process.cwd(), '.env.local'));

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL;
const SERVICE_TOKEN = process.env.DIRECTUS_SERVICE_TOKEN;

if (!DIRECTUS_URL || !SERVICE_TOKEN) {
  console.error('[setup] NEXT_PUBLIC_DIRECTUS_URL or DIRECTUS_SERVICE_TOKEN missing');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SERVICE_TOKEN}`,
  'Content-Type': 'application/json',
};

async function directusFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${DIRECTUS_URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
}

async function collectionExists(name: string): Promise<boolean> {
  const res = await directusFetch(`/collections/${encodeURIComponent(name)}`);
  return res.ok;
}

/* ---------------------------------------------------------------- */
/*  Schema definitions                                               */
/* ---------------------------------------------------------------- */

type FieldDef = {
  field: string;
  type: string;
  meta?: Record<string, unknown>;
  schema?: Record<string, unknown>;
};

type CollectionDef = {
  collection: string;
  meta: { icon?: string; note?: string; color?: string };
  fields: FieldDef[];
};

const id: FieldDef = {
  field: 'id',
  type: 'integer',
  meta: { hidden: true, interface: 'input', readonly: true },
  schema: { name: 'id', has_auto_increment: true, is_primary_key: true, is_nullable: false },
};

const dateCreated: FieldDef = {
  field: 'created_at',
  type: 'timestamp',
  meta: { interface: 'datetime', display: 'datetime', readonly: true, width: 'half', special: ['date-created'] },
  schema: { name: 'created_at', is_nullable: true },
};

const dateUpdated: FieldDef = {
  field: 'updated_at',
  type: 'timestamp',
  meta: { interface: 'datetime', display: 'datetime', readonly: true, width: 'half', special: ['date-updated'] },
  schema: { name: 'updated_at', is_nullable: true },
};

function text(name: string, opts: { maxLength?: number; nullable?: boolean; width?: string } = {}): FieldDef {
  return {
    field: name,
    type: 'string',
    meta: { interface: 'input', width: opts.width ?? 'half' },
    schema: { name, is_nullable: opts.nullable !== false, max_length: opts.maxLength ?? 255 },
  };
}

function longText(name: string, opts: { nullable?: boolean; width?: string } = {}): FieldDef {
  return {
    field: name,
    type: 'text',
    meta: { interface: 'input-multiline', width: opts.width ?? 'full' },
    schema: { name, is_nullable: opts.nullable !== false },
  };
}

function integer(name: string, opts: { nullable?: boolean; defaultValue?: number; width?: string } = {}): FieldDef {
  return {
    field: name,
    type: 'integer',
    meta: { interface: 'input', width: opts.width ?? 'half' },
    schema: {
      name,
      is_nullable: opts.nullable !== false,
      default_value: opts.defaultValue,
    },
  };
}

function boolean(name: string, opts: { defaultValue?: boolean; width?: string } = {}): FieldDef {
  return {
    field: name,
    type: 'boolean',
    meta: { interface: 'boolean', width: opts.width ?? 'half' },
    schema: { name, is_nullable: false, default_value: opts.defaultValue ?? false },
  };
}

function enumField(
  name: string,
  choices: string[],
  opts: { defaultValue?: string; nullable?: boolean; width?: string } = {},
): FieldDef {
  return {
    field: name,
    type: 'string',
    meta: {
      interface: 'select-dropdown',
      width: opts.width ?? 'half',
      options: { choices: choices.map((c) => ({ text: c, value: c })) },
    },
    schema: {
      name,
      is_nullable: opts.nullable ?? true,
      max_length: 32,
      default_value: opts.defaultValue,
    },
  };
}

function timestamp(name: string, opts: { nullable?: boolean; width?: string } = {}): FieldDef {
  return {
    field: name,
    type: 'timestamp',
    meta: { interface: 'datetime', display: 'datetime', width: opts.width ?? 'half' },
    schema: { name, is_nullable: opts.nullable !== false },
  };
}

function manyToOne(name: string, opts: { width?: string; nullable?: boolean } = {}): FieldDef {
  return {
    field: name,
    type: 'integer',
    meta: { interface: 'select-dropdown-m2o', width: opts.width ?? 'half' },
    schema: { name, is_nullable: opts.nullable !== false },
  };
}

/* ---------------------------------------------------------------- */
/*  Collections                                                      */
/* ---------------------------------------------------------------- */

const collections: CollectionDef[] = [
  // ── users ────────────────────────────────────────────────────────
  {
    collection: 'users',
    meta: { icon: 'person', note: 'App user accounts (v2 replacement for usuarios)', color: '#3B82F6' },
    fields: [
      id,
      { ...text('nick', { maxLength: 80, nullable: false }) },
      { ...text('email', { maxLength: 320 }) },
      { ...text('password', { maxLength: 255, nullable: false }), meta: { interface: 'input-hash', readonly: true, special: ['hash'] } },
      text('avatar_url', { maxLength: 500 }),
      text('background_url', { maxLength: 500 }),
      longText('mission', { nullable: true }),
      integer('coins', { defaultValue: 0 }),
      integer('points', { defaultValue: 0 }),
      boolean('active', { defaultValue: true }),
      boolean('banned', { defaultValue: false }),
      longText('ban_reason', { nullable: true }),
      timestamp('ban_expires_at'),
      text('ban_admin', { maxLength: 80 }),
      timestamp('last_login_at'),
      text('last_login_ip', { maxLength: 100 }),
      text('last_login_ua', { maxLength: 500 }),
      text('last_login_gl', { maxLength: 500 }),
      text('habbo_unique_id', { maxLength: 64 }),
      text('habbo_hotel', { maxLength: 16, nullable: false }),
      text('habbo_verification_status', { maxLength: 16 }),
      text('habbo_verification_code', { maxLength: 64 }),
      timestamp('habbo_verification_expires_at'),
      timestamp('habbo_verified_at'),
      // directus_role_id (UUID) — we keep the raw string for now, hooking M2O
      // to directus_roles is optional but pleasant. Kept simple.
      { field: 'directus_role_id', type: 'uuid', meta: { interface: 'select-dropdown-m2o', width: 'half' }, schema: { name: 'directus_role_id', is_nullable: true } },
      dateCreated,
    ],
  },

  // ── article_categories ──────────────────────────────────────────
  {
    collection: 'article_categories',
    meta: { icon: 'label', note: 'Categories for articles', color: '#10B981' },
    fields: [
      id,
      text('name', { maxLength: 120, nullable: false }),
      text('slug', { maxLength: 120 }),
      longText('description', { nullable: true }),
      text('icon', { maxLength: 60 }),
      integer('sort', { defaultValue: 0 }),
      boolean('active', { defaultValue: true }),
      dateCreated,
    ],
  },

  // ── articles ────────────────────────────────────────────────────
  {
    collection: 'articles',
    meta: { icon: 'article', note: 'News articles (v2 replacement for noticias)', color: '#10B981' },
    fields: [
      id,
      text('title', { maxLength: 300, nullable: false }),
      text('slug', { maxLength: 320 }),
      longText('summary', { nullable: true }),
      text('cover_image', { maxLength: 500 }),
      { ...longText('body', { nullable: true }), type: 'text' },
      manyToOne('category', { nullable: true }),
      manyToOne('author', { nullable: true }),
      enumField('status', ['draft', 'published', 'archived'], { defaultValue: 'draft', nullable: false }),
      boolean('pinned', { defaultValue: false }),
      boolean('comments_enabled', { defaultValue: true }),
      integer('views', { defaultValue: 0 }),
      timestamp('published_at'),
      dateCreated,
      dateUpdated,
    ],
  },

  // ── article_comments ────────────────────────────────────────────
  {
    collection: 'article_comments',
    meta: { icon: 'chat', note: 'Comments on articles', color: '#10B981' },
    fields: [
      id,
      manyToOne('article', { nullable: false }),
      manyToOne('author', { nullable: true }),
      longText('content', { nullable: false }),
      integer('likes_count', { defaultValue: 0 }),
      enumField('status', ['active', 'hidden', 'deleted'], { defaultValue: 'active', nullable: false }),
      dateCreated,
    ],
  },

  // ── article_comment_likes ───────────────────────────────────────
  {
    collection: 'article_comment_likes',
    meta: { icon: 'favorite', note: 'Likes on article comments', color: '#10B981' },
    fields: [
      id,
      manyToOne('comment', { nullable: false }),
      manyToOne('user', { nullable: false }),
      dateCreated,
    ],
  },

  // ── forum_categories ────────────────────────────────────────────
  {
    collection: 'forum_categories',
    meta: { icon: 'forum', note: 'Forum categories', color: '#F59E0B' },
    fields: [
      id,
      text('name', { maxLength: 120, nullable: false }),
      text('slug', { maxLength: 120 }),
      longText('description', { nullable: true }),
      text('icon', { maxLength: 60 }),
      integer('sort', { defaultValue: 0 }),
      boolean('active', { defaultValue: true }),
      dateCreated,
    ],
  },

  // ── forum_topics ────────────────────────────────────────────────
  {
    collection: 'forum_topics',
    meta: { icon: 'forum', note: 'Forum topics (v2 replacement for forum_topicos)', color: '#F59E0B' },
    fields: [
      id,
      text('title', { maxLength: 300, nullable: false }),
      { ...longText('body', { nullable: false }), type: 'text' },
      text('cover_image', { maxLength: 500 }),
      manyToOne('category', { nullable: false }),
      manyToOne('author', { nullable: true }),
      boolean('pinned', { defaultValue: false }),
      boolean('locked', { defaultValue: false }),
      longText('lock_reason', { nullable: true }),
      manyToOne('locked_by', { nullable: true }),
      timestamp('locked_at'),
      integer('views', { defaultValue: 0 }),
      enumField('status', ['active', 'hidden'], { defaultValue: 'active', nullable: false }),
      timestamp('edited_at'),
      dateCreated,
    ],
  },

  // ── forum_comments ──────────────────────────────────────────────
  {
    collection: 'forum_comments',
    meta: { icon: 'chat', note: 'Forum comments', color: '#F59E0B' },
    fields: [
      id,
      manyToOne('topic', { nullable: false }),
      manyToOne('author', { nullable: true }),
      longText('content', { nullable: false }),
      integer('likes_count', { defaultValue: 0 }),
      enumField('status', ['active', 'hidden', 'deleted'], { defaultValue: 'active', nullable: false }),
      dateCreated,
    ],
  },

  // ── forum_comment_likes ─────────────────────────────────────────
  {
    collection: 'forum_comment_likes',
    meta: { icon: 'favorite', note: 'Likes on forum comments', color: '#F59E0B' },
    fields: [
      id,
      manyToOne('comment', { nullable: false }),
      manyToOne('user', { nullable: false }),
      dateCreated,
    ],
  },

  // ── forum_topic_votes ───────────────────────────────────────────
  {
    collection: 'forum_topic_votes',
    meta: { icon: 'thumb_up', note: 'Upvotes on forum topics', color: '#F59E0B' },
    fields: [
      id,
      manyToOne('topic', { nullable: false }),
      manyToOne('user', { nullable: false }),
      integer('value', { defaultValue: 1 }),
      dateCreated,
    ],
  },

  // ── stories ─────────────────────────────────────────────────────
  {
    collection: 'stories',
    meta: { icon: 'camera', note: 'User stories (v2 replacement for usuarios_storie)', color: '#EC4899' },
    fields: [
      id,
      text('title', { maxLength: 255 }),
      text('image', { maxLength: 500, nullable: false }),
      manyToOne('author', { nullable: true }),
      enumField('status', ['public', 'hidden', 'draft'], { defaultValue: 'public', nullable: false }),
      timestamp('published_at'),
      dateCreated,
    ],
  },

  // ── sponsors ────────────────────────────────────────────────────
  {
    collection: 'sponsors',
    meta: { icon: 'handshake', note: 'Homepage sponsors (v2 replacement for parceiros)', color: '#8B5CF6' },
    fields: [
      id,
      text('name', { maxLength: 500, nullable: false }),
      text('link', { maxLength: 500, nullable: false }),
      text('image', { maxLength: 500, nullable: false }),
      boolean('active', { defaultValue: true }),
      integer('sort', { defaultValue: 0 }),
      manyToOne('created_by', { nullable: true }),
      dateCreated,
    ],
  },

  // ── shop_items ──────────────────────────────────────────────────
  {
    collection: 'shop_items',
    meta: { icon: 'shopping_cart', note: 'Shop items (v2 replacement for shop_itens)', color: '#06B6D4' },
    fields: [
      id,
      text('name', { maxLength: 300, nullable: false }),
      longText('description', { nullable: true }),
      text('image', { maxLength: 500 }),
      integer('price_coins', { defaultValue: 0 }),
      integer('stock', { defaultValue: 0 }),
      integer('sold_count', { defaultValue: 0 }),
      boolean('free', { defaultValue: false }),
      boolean('active', { defaultValue: true }),
      dateCreated,
    ],
  },

  // ── shop_orders ─────────────────────────────────────────────────
  {
    collection: 'shop_orders',
    meta: { icon: 'receipt', note: 'Shop orders (v2 replacement for shop_itens_mobis)', color: '#06B6D4' },
    fields: [
      id,
      manyToOne('item', { nullable: false }),
      manyToOne('buyer', { nullable: true }),
      integer('price_paid', { defaultValue: 0 }),
      enumField('status', ['pending', 'delivered', 'cancelled'], { defaultValue: 'pending', nullable: false }),
      timestamp('delivered_at'),
      dateCreated,
    ],
  },

  // ── badges ──────────────────────────────────────────────────────
  {
    collection: 'badges',
    meta: { icon: 'military_tech', note: 'Badges (v2 replacement for emblemas)', color: '#F59E0B' },
    fields: [
      id,
      text('name', { maxLength: 300, nullable: false }),
      text('description', { maxLength: 500 }),
      text('image', { maxLength: 500 }),
      boolean('free', { defaultValue: false }),
      boolean('active', { defaultValue: true }),
      manyToOne('created_by', { nullable: true }),
      dateCreated,
    ],
  },

  // ── user_badges ─────────────────────────────────────────────────
  {
    collection: 'user_badges',
    meta: { icon: 'military_tech', note: 'Badge assignments (v2 replacement for emblemas_usuario)', color: '#F59E0B' },
    fields: [
      id,
      manyToOne('badge', { nullable: false }),
      manyToOne('user', { nullable: false }),
      enumField('source', ['free', 'earned', 'bought', 'generated'], { nullable: false }),
      manyToOne('granted_by', { nullable: true }),
      boolean('active', { defaultValue: true }),
      dateCreated,
    ],
  },

  // ── admin_notifications ─────────────────────────────────────────
  {
    collection: 'admin_notifications',
    meta: { icon: 'notifications', note: 'Admin notifications (v2 replacement for acp_notificacoes)', color: '#EF4444' },
    fields: [
      id,
      longText('message', { nullable: false }),
      enumField('severity', ['success', 'info', 'warning', 'danger'], { defaultValue: 'info', nullable: false }),
      boolean('read', { defaultValue: false }),
      manyToOne('author', { nullable: true }),
      dateCreated,
    ],
  },

  // ── habbo_nick_history ──────────────────────────────────────────
  {
    collection: 'habbo_nick_history',
    meta: { icon: 'history', note: 'Habbo nickname change tracking', color: '#64748B' },
    fields: [
      id,
      manyToOne('user', { nullable: true }),
      text('habbo_unique_id', { maxLength: 64 }),
      text('hotel', { maxLength: 16 }),
      text('old_nick', { maxLength: 80 }),
      text('new_nick', { maxLength: 80 }),
      dateCreated,
    ],
  },
];

/* ---------------------------------------------------------------- */
/*  Apply                                                            */
/* ---------------------------------------------------------------- */

async function createCollection(def: CollectionDef): Promise<void> {
  const payload = {
    collection: def.collection,
    meta: {
      collection: def.collection,
      icon: def.meta.icon ?? 'table',
      note: def.meta.note,
      color: def.meta.color,
      hidden: false,
      singleton: false,
      accountability: 'all',
      collapse: 'open',
    },
    schema: { name: def.collection },
    fields: def.fields,
  };

  const res = await directusFetch('/collections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`create ${def.collection} failed ${res.status}: ${body.slice(0, 500)}`);
  }
}

async function main(): Promise<void> {
  console.log(`[migration] target: ${DIRECTUS_URL}`);
  console.log(`[migration] ${collections.length} collections to ensure\n`);

  let created = 0;
  let skipped = 0;

  for (const def of collections) {
    const exists = await collectionExists(def.collection);
    if (exists) {
      console.log(`  [skip] ${def.collection} already exists`);
      skipped += 1;
      continue;
    }
    console.log(`  [new]  creating ${def.collection}...`);
    await createCollection(def);
    created += 1;
  }

  console.log(`\n[migration] done — created: ${created}, skipped: ${skipped}`);
  if (created > 0) {
    console.log(`
Next steps:
  1. Check permissions in Directus → Access Policies for your service role
  2. Run 02-migrate-data.ts --dry-run to preview the data transfer
  3. Run 02-migrate-data.ts to transfer data for real
`);
  }
}

main().catch((err) => {
  console.error('[migration] failed:', err.message);
  process.exit(1);
});
