import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTruthyFlag, summarizeUserStatusBuckets } from '@/server/directus/users-core';

describe('users core status aggregation', () => {
  it('recognizes legacy and v2 truthy flags', () => {
    for (const value of [true, 1, 's', 'sim', 'y', 'yes', 'true', '1']) {
      assert.equal(isTruthyFlag(value), true);
    }
    for (const value of [false, 0, 'n', 'no', 'false', null, undefined]) {
      assert.equal(isTruthyFlag(value), false);
    }
  });

  it('summarizes active, banned and inactive users from aggregate buckets', () => {
    const stats = summarizeUserStatusBuckets(
      [
        { banido: 'n', ativado: 's', count: { id: 10 } },
        { banido: 's', ativado: 's', count: { id: 2 } },
        { banido: 'n', ativado: 'n', count: { id: 3 } },
      ],
      { banned: 'banido', active: 'ativado' },
    );

    assert.deepEqual(stats, {
      total: 15,
      actifs: 10,
      bannis: 2,
      inactifs: 3,
    });
  });
});
