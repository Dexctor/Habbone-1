import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapSponsorDbRow,
  normalizeSponsorInput,
  normalizeSponsorLink,
  sponsorAppToDb,
} from '@/server/directus/sponsors-core';

describe('sponsor core mapping', () => {
  it('normalizes bare domains while preserving absolute URLs and relative paths', () => {
    assert.equal(normalizeSponsorLink('discord.gg/habbone'), 'https://discord.gg/habbone');
    assert.equal(normalizeSponsorLink('https://example.com/a'), 'https://example.com/a');
    assert.equal(normalizeSponsorLink('/partenaires/local'), '/partenaires/local');
  });

  it('maps v2 database rows to the legacy response shape', () => {
    assert.deepEqual(
      mapSponsorDbRow(
        {
          id: '12',
          name: 'Discord',
          link: 'https://discord.gg/habbone',
          image: '/img/discord.png',
          active: false,
        },
        true,
      ),
      {
        id: 12,
        nome: 'Discord',
        link: 'https://discord.gg/habbone',
        imagem: '/img/discord.png',
        status: 'inativo',
      },
    );
  });

  it('maps app input to v2 database columns without leaking legacy names', () => {
    assert.deepEqual(
      sponsorAppToDb(
        {
          nome: 'Fan Center',
          link: 'https://fan.example',
          imagem: '/fan.png',
          status: 'ativo',
        },
        true,
      ),
      {
        name: 'Fan Center',
        link: 'https://fan.example',
        image: '/fan.png',
        active: true,
      },
    );
  });

  it('normalizes only the link field in sponsor inputs', () => {
    assert.deepEqual(
      normalizeSponsorInput({ nome: 'A', link: 'example.com', status: 'ativo' }),
      { nome: 'A', link: 'https://example.com', status: 'ativo' },
    );
  });
});
