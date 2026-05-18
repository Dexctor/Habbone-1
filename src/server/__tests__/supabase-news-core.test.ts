import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dateToUnixSeconds, mapSupabaseNews, mapSupabaseNewsComment } from '@/server/supabase/news-core';

describe('supabase news core', () => {
  it('maps Supabase article rows to the legacy news shape used by the UI', () => {
    const row = mapSupabaseNews({
      id: 148,
      title: 'Titre',
      summary: 'Resume',
      cover_image: '9fa48287-c18b-4334-9a78-4f21dfbfaa60',
      body: '<p>Contenu</p>',
      author_nick: 'Dexct',
      published_at: '2026-04-23T21:08:55.000Z',
      status: 'published',
    });

    assert.deepEqual(row, {
      id: 148,
      titulo: 'Titre',
      descricao: 'Resume',
      imagem: '9fa48287-c18b-4334-9a78-4f21dfbfaa60',
      noticia: '<p>Contenu</p>',
      autor: 'Dexct',
      data: '1776978535',
      status: 'published',
    });
  });

  it('maps Supabase comment rows to the legacy comment shape', () => {
    const row = mapSupabaseNewsComment({
      id: 38,
      article: 148,
      content: 'Commentaire',
      author_nick: 'Dexct',
      created_at: new Date('2026-04-23T21:08:55.000Z'),
      status: 'active',
    });

    assert.equal(row.id_noticia, 148);
    assert.equal(row.comentario, 'Commentaire');
    assert.equal(row.autor, 'Dexct');
    assert.equal(row.data, '1776978535');
  });

  it('returns null for invalid dates', () => {
    assert.equal(dateToUnixSeconds(null), null);
    assert.equal(dateToUnixSeconds('not-a-date'), null);
  });
});
