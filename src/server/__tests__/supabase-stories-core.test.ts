import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isoToUnixSeconds, mapSupabaseStory } from '@/server/supabase/stories-core';

describe('supabase stories core', () => {
  it('maps Supabase story rows to the legacy story shape used by the UI', () => {
    const row = mapSupabaseStory({
      id: 9,
      title: 'Story',
      image: '9fa48287-c18b-4334-9a78-4f21dfbfaa60.png',
      author_nick: 'Dexct',
      status: 'public',
      published_at: '2026-04-23T21:08:55.000Z',
      created_at: '2026-04-22T12:00:00.000Z',
    });

    assert.deepEqual(row, {
      id: 9,
      autor: 'Dexct',
      image: '9fa48287-c18b-4334-9a78-4f21dfbfaa60.png',
      imagem: '9fa48287-c18b-4334-9a78-4f21dfbfaa60.png',
      titulo: 'Story',
      status: 'public',
      data: '1776978535',
      dta: 1776978535,
      date_created: '2026-04-22T12:00:00.000Z',
    });
  });

  it('falls back to created_at when published_at is missing', () => {
    const row = mapSupabaseStory({
      id: 10,
      title: null,
      image: null,
      author_nick: null,
      status: 'draft',
      published_at: null,
      created_at: new Date('2026-04-22T12:00:00.000Z'),
    });

    assert.equal(row.data, '1776859200');
    assert.equal(row.date_created, '2026-04-22T12:00:00.000Z');
  });

  it('returns null for invalid dates', () => {
    assert.equal(isoToUnixSeconds(null), null);
    assert.equal(isoToUnixSeconds('not-a-date'), null);
  });
});
