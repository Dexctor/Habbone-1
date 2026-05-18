import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { countLikesByComment, getCommentLikeReadConfig } from '../directus/likes-core';

describe('comment like read config', () => {
  it('uses legacy comment like tables and fields when v2 is disabled', () => {
    assert.deepEqual(getCommentLikeReadConfig('news', false), {
      table: 'noticias_coment_curtidas',
      commentField: 'id_comentario',
    });
    assert.deepEqual(getCommentLikeReadConfig('forum', false), {
      table: 'forum_coment_curtidas',
      commentField: 'id_comentario',
    });
  });

  it('uses v2 comment like tables and fields when v2 is enabled', () => {
    assert.deepEqual(getCommentLikeReadConfig('news', true), {
      table: 'article_comment_likes',
      commentField: 'comment',
    });
    assert.deepEqual(getCommentLikeReadConfig('forum', true), {
      table: 'forum_comment_likes',
      commentField: 'comment',
    });
  });
});

describe('countLikesByComment', () => {
  it('counts rows by the configured comment field', () => {
    assert.deepEqual(
      countLikesByComment([{ comment: 12 }, { comment: '12' }, { comment: 13 }, { comment: null }], 'comment'),
      { 12: 2, 13: 1 },
    );
  });
});
