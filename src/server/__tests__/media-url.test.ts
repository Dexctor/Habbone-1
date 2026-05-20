import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mediaUrl, normalizeHtmlMediaUrls } from '@/lib/media-url';

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}

describe('mediaUrl', () => {
  it('resolves legacy upload paths against the legacy media base', () => {
    const previous = process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE;
    process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE = 'https://habbone.fr';
    try {
      assert.equal(mediaUrl('/uploads/hm-a22190e3bf.png'), 'https://habbone.fr/uploads/hm-a22190e3bf.png');
    } finally {
      restoreEnv('NEXT_PUBLIC_LEGACY_MEDIA_BASE', previous);
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
      restoreEnv('NEXT_PUBLIC_DIRECTUS_URL', previousDirectus);
    }
  });

  it('can route UUID assets to Supabase Storage when media backend is enabled', () => {
    const previousBackend = process.env.NEXT_PUBLIC_MEDIA_BACKEND;
    const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_MEDIA_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = ' https://llchawllmqntkkwrozcp.supabase.co ';
    try {
      assert.equal(
        mediaUrl('9fa48287-c18b-4334-9a78-4f21dfbfaa60'),
        'https://llchawllmqntkkwrozcp.supabase.co/storage/v1/object/public/directus-uploads/9fa48287-c18b-4334-9a78-4f21dfbfaa60',
      );
    } finally {
      restoreEnv('NEXT_PUBLIC_MEDIA_BACKEND', previousBackend);
      restoreEnv('NEXT_PUBLIC_SUPABASE_URL', previousSupabaseUrl);
    }
  });

  it('routes legacy upload paths to Supabase Storage during cutover', () => {
    const previousBackend = process.env.NEXT_PUBLIC_MEDIA_BACKEND;
    const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousLegacyBase = process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE;
    process.env.NEXT_PUBLIC_MEDIA_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://llchawllmqntkkwrozcp.supabase.co';
    process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE = 'https://legacy.example.com';
    try {
      assert.equal(
        mediaUrl('/uploads/news-f662739698.png'),
        'https://llchawllmqntkkwrozcp.supabase.co/storage/v1/object/public/directus-uploads/uploads/news-f662739698.png',
      );
    } finally {
      restoreEnv('NEXT_PUBLIC_MEDIA_BACKEND', previousBackend);
      restoreEnv('NEXT_PUBLIC_SUPABASE_URL', previousSupabaseUrl);
      restoreEnv('NEXT_PUBLIC_LEGACY_MEDIA_BASE', previousLegacyBase);
    }
  });

  it('does not fall back to Directus for Supabase object paths when the public bucket URL is missing', () => {
    const previousBackend = process.env.NEXT_PUBLIC_MEDIA_BACKEND;
    const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousUploadsBase = process.env.NEXT_PUBLIC_SUPABASE_UPLOADS_BASE;
    const previousDirectusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL;
    process.env.NEXT_PUBLIC_MEDIA_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_UPLOADS_BASE = '';
    process.env.NEXT_PUBLIC_DIRECTUS_URL = 'https://api.habbone.fr';
    try {
      assert.equal(mediaUrl('/uploads/news-f662739698.png'), '');
    } finally {
      restoreEnv('NEXT_PUBLIC_MEDIA_BACKEND', previousBackend);
      restoreEnv('NEXT_PUBLIC_SUPABASE_URL', previousSupabaseUrl);
      restoreEnv('NEXT_PUBLIC_SUPABASE_UPLOADS_BASE', previousUploadsBase);
      restoreEnv('NEXT_PUBLIC_DIRECTUS_URL', previousDirectusUrl);
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
      restoreEnv('NEXT_PUBLIC_LEGACY_MEDIA_BASE', previous);
    }
  });

  it('leaves non-upload images untouched', () => {
    assert.equal(
      normalizeHtmlMediaUrls('<p><img src="/img/thumbnail.png" alt=""></p>'),
      '<p><img src="/img/thumbnail.png" alt=""></p>',
    );
  });
});
