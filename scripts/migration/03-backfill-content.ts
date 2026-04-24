/**
 * Re-copy the body/content columns from the legacy tables into the v2
 * collections, for rows where the v2 column came out null (happened on the
 * first migration pass because Directus created the columns as TEXT 65KB and
 * silently dropped larger values).
 *
 * Safe to rerun. Skips rows that already have non-null content.
 *
 * Usage:
 *   npx tsx scripts/migration/03-backfill-content.ts
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
  console.error('[backfill] missing env');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

async function df(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${DIRECTUS_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
}

type BackfillSpec = {
  legacyTable: string;
  legacyField: string;
  v2Table: string;
  v2Field: string;
};

async function backfill(spec: BackfillSpec): Promise<void> {
  console.log(`\n=== ${spec.legacyTable} -> ${spec.v2Table} ===`);

  // Fetch all legacy rows (id + source field)
  const legacyRes = await df(`/items/${spec.legacyTable}?fields=id,${spec.legacyField}&limit=5000`);
  if (!legacyRes.ok) {
    console.error(`  failed to list ${spec.legacyTable}: ${legacyRes.status}`);
    return;
  }
  const legacy = (await legacyRes.json())?.data ?? [];

  let fixed = 0;
  let skipped = 0;
  let missing = 0;
  let errored = 0;

  for (const row of legacy) {
    const v2Res = await df(`/items/${spec.v2Table}/${row.id}?fields=id,${spec.v2Field}`);
    if (!v2Res.ok) {
      missing += 1;
      continue;
    }
    const v2 = (await v2Res.json())?.data;
    if (v2?.[spec.v2Field]) {
      skipped += 1;
      continue;
    }
    const value = row[spec.legacyField];
    if (value == null) {
      skipped += 1;
      continue;
    }
    const patch = await df(`/items/${spec.v2Table}/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [spec.v2Field]: value }),
    });
    if (patch.ok) {
      fixed += 1;
    } else {
      errored += 1;
      const errText = (await patch.text()).slice(0, 150);
      console.log(`  fail id=${row.id} status=${patch.status}: ${errText}`);
    }
  }

  console.log(`  fixed: ${fixed}, skipped (already ok): ${skipped}, missing v2 row: ${missing}, errors: ${errored}`);
}

async function main(): Promise<void> {
  console.log(`[backfill] target: ${DIRECTUS_URL}`);
  await backfill({ legacyTable: 'forum_coment', legacyField: 'comentario', v2Table: 'forum_comments', v2Field: 'content' });
  await backfill({ legacyTable: 'noticias_coment', legacyField: 'comentario', v2Table: 'article_comments', v2Field: 'content' });
  await backfill({ legacyTable: 'forum_topicos', legacyField: 'conteudo', v2Table: 'forum_topics', v2Field: 'body' });
  await backfill({ legacyTable: 'noticias', legacyField: 'noticia', v2Table: 'articles', v2Field: 'body' });
  console.log('\n[backfill] done');
}

main().catch((e) => {
  console.error('[backfill] failed:', e);
  process.exit(1);
});
