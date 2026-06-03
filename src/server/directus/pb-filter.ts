import 'server-only';

import PocketBase from 'pocketbase';

/**
 * Translates a Directus-style filter object into a PocketBase filter string.
 *
 * During the Directus -> PocketBase migration, the 20 service files use a small,
 * well-known set of Directus filter operators. Rather than rewrite ~110 call
 * sites by hand, services build the same filter object shape and we translate it
 * here once, safely.
 *
 * Supported operators (the only ones actually used in the codebase):
 *   _eq, _neq, _in, _nin, _gt, _gte, _lt, _lte, _null, _nnull, _empty, _nempty,
 *   _contains, _starts_with, _ends_with
 * Logical groups: _and, _or
 *
 * Values are escaped via `pb.filter(...)` (parameter binding) — NEVER string
 * concatenation — so user input cannot break out of the filter (injection-safe).
 *
 * Example:
 *   directusFilterToPB({ author: { _eq: 'abc' }, status: { _in: ['a','b'] } })
 *   => "author = 'abc' && (status = 'a' || status = 'b')"
 */

// A dedicated PB instance just for its `.filter()` escaping helper (no network).
const _pbEscaper = new PocketBase('http://127.0.0.1');

type Primitive = string | number | boolean | null;

/** Bind a single `field <op> value` clause with safe escaping. */
function clause(field: string, op: string, value: Primitive): string {
  // pb.filter binds {:v} with proper escaping for the value's JS type.
  return _pbEscaper.filter(`${field} ${op} {:v}`, { v: value });
}

/** Translate the operator object for ONE field into a PB sub-expression. */
function fieldExpr(field: string, ops: Record<string, unknown>): string {
  const parts: string[] = [];

  for (const [op, raw] of Object.entries(ops)) {
    switch (op) {
      case '_eq':
        parts.push(clause(field, '=', raw as Primitive));
        break;
      case '_neq':
        parts.push(clause(field, '!=', raw as Primitive));
        break;
      case '_gt':
        parts.push(clause(field, '>', raw as Primitive));
        break;
      case '_gte':
        parts.push(clause(field, '>=', raw as Primitive));
        break;
      case '_lt':
        parts.push(clause(field, '<', raw as Primitive));
        break;
      case '_lte':
        parts.push(clause(field, '<=', raw as Primitive));
        break;
      case '_contains':
        parts.push(clause(field, '~', raw as Primitive));
        break;
      case '_starts_with':
        // PB has no native prefix-only op; ~ does substring. Emulate with pattern.
        parts.push(_pbEscaper.filter(`${field} ~ {:v}`, { v: `${String(raw)}%` }));
        break;
      case '_ends_with':
        parts.push(_pbEscaper.filter(`${field} ~ {:v}`, { v: `%${String(raw)}` }));
        break;
      case '_in': {
        const arr = Array.isArray(raw) ? raw : [raw];
        if (arr.length === 0) {
          parts.push('1 = 2'); // empty IN matches nothing
        } else {
          parts.push('(' + arr.map((v) => clause(field, '=', v as Primitive)).join(' || ') + ')');
        }
        break;
      }
      case '_nin': {
        const arr = Array.isArray(raw) ? raw : [raw];
        if (arr.length === 0) {
          parts.push('1 = 1'); // empty NOT IN matches everything
        } else {
          parts.push('(' + arr.map((v) => clause(field, '!=', v as Primitive)).join(' && ') + ')');
        }
        break;
      }
      case '_null':
        // Directus: _null:true => IS NULL ; _null:false => IS NOT NULL
        parts.push(`${field} ${raw ? '=' : '!='} null`);
        break;
      case '_nnull':
        parts.push(`${field} ${raw ? '!=' : '='} null`);
        break;
      case '_empty':
        // PB treats empty string / null similarly; cover both.
        parts.push(raw ? `(${field} = '' || ${field} = null)` : `(${field} != '' && ${field} != null)`);
        break;
      case '_nempty':
        parts.push(raw ? `(${field} != '' && ${field} != null)` : `(${field} = '' || ${field} = null)`);
        break;
      default:
        throw new Error(`directusFilterToPB: unsupported operator "${op}" on field "${field}"`);
    }
  }

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return '(' + parts.join(' && ') + ')';
}

/**
 * Main entry: translate a Directus filter object to a PocketBase filter string.
 * Returns '' for an empty/undefined filter (meaning "no filter").
 */
export function directusFilterToPB(filter: Record<string, unknown> | undefined | null): string {
  if (!filter || typeof filter !== 'object') return '';

  const parts: string[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === '_and' || key === '_or') {
      const sub = Array.isArray(value) ? value : [value];
      const joined = sub
        .map((f) => directusFilterToPB(f as Record<string, unknown>))
        .filter(Boolean);
      if (joined.length === 0) continue;
      const glue = key === '_and' ? ' && ' : ' || ';
      parts.push('(' + joined.join(glue) + ')');
      continue;
    }

    // Field entry. Value is either an operator object { _eq: ... } or a bare
    // scalar (Directus shorthand for _eq).
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const expr = fieldExpr(key, value as Record<string, unknown>);
      if (expr) parts.push(expr);
    } else {
      // bare scalar shorthand -> equality
      parts.push(clause(key, '=', value as Primitive));
    }
  }

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.join(' && ');
}
