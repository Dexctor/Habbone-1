import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appendDirectusParams } from '@/server/directus/fetch-core';

describe('directus fetch core', () => {
  it('sets scalar params and appends array params without overwriting duplicate keys', () => {
    const url = appendDirectusParams(new URL('https://cms.example/items/users'), {
      limit: '-1',
      'aggregate[count]': 'id',
      'groupBy[]': ['banned', 'active'],
    });

    assert.equal(url.searchParams.get('limit'), '-1');
    assert.equal(url.searchParams.get('aggregate[count]'), 'id');
    assert.deepEqual(url.searchParams.getAll('groupBy[]'), ['banned', 'active']);
  });
});
