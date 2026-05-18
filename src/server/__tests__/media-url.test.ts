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

  it('trims environment URL values before building Directus asset URLs', () => {
    const previousDirectus = process.env.NEXT_PUBLIC_DIRECTUS_URL;
    process.env.NEXT_PUBLIC_DIRECTUS_URL = ' https://api.habbone.fr ';
    try {
      assert.equal(
        mediaUrl('9fa48287-c18b-4334-9a78-4f21dfbfaa60'),
        'https://api.habbone.fr/assets/9fa48287-c18b-4334-9a78-4f21dfbfaa60',
      );
    } finally {
      process.env.NEXT_PUBLIC_DIRECTUS_URL = previousDirectus;
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
