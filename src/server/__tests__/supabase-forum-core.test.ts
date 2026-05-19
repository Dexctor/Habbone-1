import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapSupabaseForumCategory,
  mapSupabaseForumComment,
  mapSupabaseForumTopic,
} from '@/server/supabase/forum-core';

describe('supabase forum core', () => {
  it('maps Supabase topic rows to the legacy forum topic shape', () => {
    const row = mapSupabaseForumTopic({
      id: 40,
      title: 'Sujet',
      body: '<p>Corps</p>',
      cover_image: null,
      author_nick: 'Dexct',
      created_at: '2026-04-23T21:08:56.000Z',
      views: 12,
      pinned: true,
      locked: false,
      status: 'active',
      category: 3,
    });

    assert.equal(row.id, 40);
    assert.equal(row.titulo, 'Sujet');
    assert.equal(row.autor, 'Dexct');
    assert.equal(row.fixo, 's');
    assert.equal(row.fechado, 'n');
    assert.equal(row.cat_id, 3);
  });

  it('maps Supabase comment rows to the legacy forum comment shape', () => {
    const row = mapSupabaseForumComment({
      id: 27,
      topic: 40,
      content: 'Réponse',
      author_nick: 'Dexct',
      created_at: new Date('2026-04-23T21:08:56.000Z'),
      status: 'active',
    });

    assert.equal(row.id_forum, 40);
    assert.equal(row.comentario, 'Réponse');
    assert.equal(row.autor, 'Dexct');
  });

  it('maps Supabase category rows to active legacy category records', () => {
    const row = mapSupabaseForumCategory({
      id: 3,
      name: 'General',
      description: 'Discussion',
      active: true,
      icon: 'chat',
      slug: 'general',
      sort: 10,
    });

    assert.equal(row.nome, 'General');
    assert.equal(row.status, 'ativo');
    assert.equal(row.ordem, 10);
  });
});
