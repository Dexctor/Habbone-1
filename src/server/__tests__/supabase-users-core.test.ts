import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapLegacyUserPatchToSupabase, mapSupabaseUserToLegacy } from '@/server/supabase/users-core';

describe('supabase users core', () => {
  it('maps Supabase user rows to the legacy-compatible auth shape', () => {
    const row = mapSupabaseUserToLegacy({
      id: 20,
      nick: 'Dexct',
      password: '$2b$hash',
      email: 'dexct@example.com',
      avatar_url: 'avatar.png',
      mission: 'Mission',
      active: true,
      banned: false,
      directus_role_id: 'role-id',
      created_at: '2026-04-23T21:08:55.000Z',
      habbo_hotel: 'fr',
      habbo_unique_id: 'hhfr-1',
      habbo_verification_status: 'ok',
      coins: 42,
      twitter: 'Dexctor',
    });

    assert.equal(row.id, 20);
    assert.equal(row.senha, '$2b$hash');
    assert.equal(row.avatar, 'avatar.png');
    assert.equal(row.missao, 'Mission');
    assert.equal(row.ativado, 's');
    assert.equal(row.banido, 'n');
    assert.equal(row.moedas, 42);
    assert.equal(row.twitter, 'Dexctor');
  });

  it('maps legacy-style patches to Supabase columns', () => {
    assert.deepEqual(
      mapLegacyUserPatchToSupabase({
        senha: 'hash',
        avatar: 'avatar.png',
        missao: 'Mission',
        ativado: 's',
        banido: 'n',
        moedas: 10,
        role: 'ignored',
        twitter: 'Dexctor',
      }),
      {
        password: 'hash',
        avatar_url: 'avatar.png',
        mission: 'Mission',
        active: true,
        banned: false,
        coins: 10,
        twitter: 'Dexctor',
      },
    );
  });
});
