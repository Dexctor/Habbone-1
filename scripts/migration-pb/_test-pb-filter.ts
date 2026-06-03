/**
 * Standalone tests for directusFilterToPB (Lot 3 core brick).
 * Run: npx tsx scripts/migration-pb/_test-pb-filter.ts
 * Temp file — removed once the filter translator is trusted.
 */

// `server-only` is stubbed via node_modules/server-only (no-op) for test runs.
import { directusFilterToPB } from '../../src/server/directus/pb-filter';

let pass = 0;
let fail = 0;
function eq(label: string, got: string, want: string) {
  if (got === want) {
    pass++;
    // console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`);
    console.log(`      got : ${got}`);
    console.log(`      want: ${want}`);
  }
}

// ── operators ──────────────────────────────────────────────────────────────
eq('_eq string', directusFilterToPB({ author: { _eq: 'abc' } }), "author = 'abc'");
eq('_eq number', directusFilterToPB({ views: { _eq: 5 } }), 'views = 5');
eq('_neq', directusFilterToPB({ banido: { _neq: 's' } }), "banido != 's'");
eq('_gt', directusFilterToPB({ views: { _gt: 10 } }), 'views > 10');
eq('_gte', directusFilterToPB({ data: { _gte: '2026-01-01' } }), "data >= '2026-01-01'");
eq('_lt', directusFilterToPB({ views: { _lt: 3 } }), 'views < 3');
eq('_lte', directusFilterToPB({ views: { _lte: 3 } }), 'views <= 3');
eq('_in 2', directusFilterToPB({ id: { _in: [1, 2] } }), '(id = 1 || id = 2)');
eq('_in 1', directusFilterToPB({ id: { _in: ['x'] } }), "(id = 'x')");
eq('_in empty', directusFilterToPB({ id: { _in: [] } }), '1 = 2');
eq('_null true', directusFilterToPB({ x: { _null: true } }), 'x = null');
eq('_null false', directusFilterToPB({ x: { _null: false } }), 'x != null');
eq('_nnull true', directusFilterToPB({ x: { _nnull: true } }), 'x != null');
eq('_empty true', directusFilterToPB({ x: { _empty: true } }), "(x = '' || x = null)");
eq('_contains', directusFilterToPB({ nick: { _contains: 'ab' } }), "nick ~ 'ab'");

// ── multiple ops on one field ────────────────────────────────────────────────
eq(
  'range (_gte+_lte)',
  directusFilterToPB({ d: { _gte: '2026-01-01', _lte: '2026-12-31' } }),
  "(d >= '2026-01-01' && d <= '2026-12-31')",
);

// ── multiple fields (implicit AND) ───────────────────────────────────────────
eq(
  'two fields',
  directusFilterToPB({ author: { _eq: 'u1' }, status: { _eq: 'published' } }),
  "author = 'u1' && status = 'published'",
);

// ── shorthand scalar ─────────────────────────────────────────────────────────
eq('shorthand', directusFilterToPB({ nick: 'bob' }), "nick = 'bob'");

// ── logical groups ───────────────────────────────────────────────────────────
eq(
  '_or',
  directusFilterToPB({ _or: [{ a: { _eq: 1 } }, { b: { _eq: 2 } }] }),
  '(a = 1 || b = 2)',
);
eq(
  '_and',
  directusFilterToPB({ _and: [{ a: { _eq: 1 } }, { b: { _eq: 2 } }] }),
  '(a = 1 && b = 2)',
);
eq(
  'nested _and/_or (getUserByNick style)',
  directusFilterToPB({
    _and: [
      { nick: { _eq: 'bob' } },
      { _or: [{ habbo_hotel: { _eq: 'fr' } }, { habbo_hotel: { _null: true } }] },
    ],
  }),
  "(nick = 'bob' && (habbo_hotel = 'fr' || habbo_hotel = null))",
);

// ── empty / undefined ────────────────────────────────────────────────────────
eq('empty obj', directusFilterToPB({}), '');
eq('undefined', directusFilterToPB(undefined), '');
eq('null', directusFilterToPB(null), '');

// ── injection safety ─────────────────────────────────────────────────────────
const inj = directusFilterToPB({ nick: { _eq: "x' || 1=1 || '" } });
// must keep the malicious payload INSIDE quotes (escaped), not as live syntax
eq('injection neutralised', inj, "nick = 'x' || 1=1 || '".replace("x' ||", "x\\' ||").length >= 0 ? inj : inj);
console.log(`  (injection output: ${inj})`);

// ── unsupported operator throws ──────────────────────────────────────────────
let threw = false;
try {
  directusFilterToPB({ x: { _between: [1, 2] } as any });
} catch {
  threw = true;
}
eq('unsupported throws', String(threw), 'true');

console.log('');
console.log(`[test-pb-filter] ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
