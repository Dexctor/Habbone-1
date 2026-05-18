import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDirectusConditionalPatchBody,
  hasDirectusUpdatedRows,
} from '@/server/directus/shop-atomic-core';

describe('shop atomic Directus helpers', () => {
  it('builds the documented Directus update-many body with data and query filter', () => {
    assert.deepEqual(
      buildDirectusConditionalPatchBody(
        {
          id: { _eq: 12 },
          stock: { _eq: 1 },
        },
        { stock: 0 },
      ),
      {
        data: { stock: 0 },
        query: {
          filter: {
            id: { _eq: 12 },
            stock: { _eq: 1 },
          },
        },
      },
    );
  });

  it('detects whether Directus updated at least one row', () => {
    assert.equal(hasDirectusUpdatedRows({ data: [{ id: 1 }] }), true);
    assert.equal(hasDirectusUpdatedRows({ data: [] }), false);
    assert.equal(hasDirectusUpdatedRows({ data: { id: 1 } }), true);
    assert.equal(hasDirectusUpdatedRows({}), false);
    assert.equal(hasDirectusUpdatedRows(null), false);
  });
});
