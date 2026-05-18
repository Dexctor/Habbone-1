import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  forumInvalidation,
  makeInvalidationPlan,
  mergeInvalidationPlans,
  newsInvalidation,
  pubInvalidation,
  shopInvalidation,
  storiesInvalidation,
  teamInvalidation,
  themeInvalidation,
} from '../cache-policy-core';

describe('cache invalidation policy', () => {
  it('deduplicates tags and paths while preserving order', () => {
    const plan = makeInvalidationPlan({
      tags: ['news', 'home', 'news', null, undefined],
      paths: ['/admin', '/admin', '/'],
    });

    assert.deepEqual(plan.tags, ['news', 'home']);
    assert.deepEqual(plan.paths, ['/admin', '/']);
  });

  it('builds shop invalidation from the central shop tag', () => {
    assert.deepEqual(shopInvalidation(), { tags: ['shop'], paths: [] });
  });

  it('builds news detail invalidation with optional home and admin refresh', () => {
    assert.deepEqual(newsInvalidation({ newsId: 42, home: true, admin: true }), {
      tags: ['news', 'news-42', 'home'],
      paths: ['/admin'],
    });
  });

  it('builds forum topic invalidation with optional home and admin refresh', () => {
    assert.deepEqual(forumInvalidation({ topicId: 9, home: true, admin: true }), {
      tags: ['forum', 'forum-topic-9', 'home'],
      paths: ['/admin'],
    });
  });

  it('builds stories, pub, theme and team invalidation plans', () => {
    assert.deepEqual(storiesInvalidation({ home: true, admin: true }), {
      tags: ['stories', 'home'],
      paths: ['/admin'],
    });
    assert.deepEqual(pubInvalidation(), { tags: ['pub', 'home'], paths: ['/'] });
    assert.deepEqual(themeInvalidation(), { tags: ['theme'], paths: [] });
    assert.deepEqual(teamInvalidation(), { tags: [], paths: ['/team'] });
  });

  it('merges plans and removes duplicates', () => {
    const plan = mergeInvalidationPlans(
      newsInvalidation({ newsId: 1, home: true }),
      newsInvalidation({ newsId: 1, admin: true }),
      teamInvalidation(),
    );

    assert.deepEqual(plan.tags, ['news', 'news-1', 'home']);
    assert.deepEqual(plan.paths, ['/admin', '/team']);
  });
});
