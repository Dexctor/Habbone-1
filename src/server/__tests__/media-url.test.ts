import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mediaUrl, normalizeHtmlMediaUrls } from '@/lib/media-url';

describe('mediaUrl', () => {
  it('resolves legacy upload paths against the legacy media base', () => {
    const previous = process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE;
    process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE = 'https://habbone.fr';
    try {
      assert.equal(mediaUrl('/uploads/hm-a22190e3bf.png'), 'https://habbone.fr/uploads/hm-a22190e3bf.png');
    } finally {
      process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE = previous;
    }
  });
});

describe('normalizeHtmlMediaUrls', () => {
  it('rewrites legacy upload img src values before the browser loads them', () => {
    const previous = process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE;
    process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE = 'https://habbone.fr';
    try {
      assert.equal(
        normalizeHtmlMediaUrls('<p><img src="/uploads/hm-a22190e3bf.png" alt=""></p>'),
        '<p><img src="https://habbone.fr/uploads/hm-a22190e3bf.png" alt=""></p>',
      );
    } finally {
      process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE = previous;
    }
  });

  it('leaves non-upload images untouched', () => {
    assert.equal(
      normalizeHtmlMediaUrls('<p><img src="/img/thumbnail.png" alt=""></p>'),
      '<p><img src="/img/thumbnail.png" alt=""></p>',
    );
  });
});
