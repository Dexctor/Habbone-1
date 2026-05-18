import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  alternateNickForLegacyFallback,
  cleanLegacyUserId,
  emptyUserHistory,
  hasUserHistoryResults,
  mergeUserHistory,
  normalizeHistoryRow,
} from '@/server/directus/admin-user-history-core';

describe('admin user history core', () => {
  it('cleans legacy-prefixed user ids only when the prefix is exact', () => {
    assert.equal(cleanLegacyUserId('legacy:42'), '42');
    assert.equal(cleanLegacyUserId('42'), '42');
    assert.equal(cleanLegacyUserId('Legacy:42'), 'Legacy:42');
  });

  it('normalizes v2 topics and comments into the legacy admin shape', () => {
    assert.deepEqual(
      normalizeHistoryRow(
        { id: 1, title: 'Sujet', created_at: '1970-01-01T00:00:01.000Z' },
        'topic',
        true,
      ),
      { id: 1, titulo: 'Sujet', data: '1' },
    );

    assert.deepEqual(
      normalizeHistoryRow(
        { id: 2, article: 7, content: 'Commentaire', created_at: '1970-01-01T00:00:02.000Z' },
        'articleComment',
        true,
      ),
      { id: 2, id_noticia: 7, comentario: 'Commentaire', data: '2' },
    );
  });

  it('leaves legacy rows unchanged', () => {
    const row = { id: 3, titulo: 'Ancien', data: '1779000000' };
    assert.equal(normalizeHistoryRow(row, 'article', false), row);
  });

  it('detects empty and non-empty history payloads', () => {
    assert.equal(hasUserHistoryResults(emptyUserHistory()), false);
    assert.equal(hasUserHistoryResults({ ...emptyUserHistory(), topics: [{ id: 1 }] }), true);
  });

  it('builds a case fallback nick and merges fallback history', () => {
    assert.equal(alternateNickForLegacyFallback('Dexctor'), 'dexctor');
    assert.equal(alternateNickForLegacyFallback('dexctor'), 'Dexctor');

    const merged = mergeUserHistory(
      { ...emptyUserHistory(), topics: [{ id: 1 }] },
      { ...emptyUserHistory(), articles: [{ id: 2 }], adminLogs: [{ id: 3 }] },
    );

    assert.deepEqual(merged.topics, [{ id: 1 }]);
    assert.deepEqual(merged.articles, [{ id: 2 }]);
    assert.deepEqual(merged.adminLogs, [{ id: 3 }]);
  });
});
