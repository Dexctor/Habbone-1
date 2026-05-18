import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { requestOriginAllowed } from '../request-security-core';

describe('request origin policy', () => {
  it('allows safe methods without origin checks', () => {
    assert.equal(requestOriginAllowed({
      method: 'GET',
      requestUrl: 'https://habbone.fr/api/user/me',
      origin: 'https://evil.test',
    }), true);
  });

  it('allows same-origin mutations', () => {
    assert.equal(requestOriginAllowed({
      method: 'POST',
      requestUrl: 'https://habbone.fr/api/user/change-password',
      origin: 'https://habbone.fr',
      host: 'habbone.fr',
      forwardedProto: 'https',
    }), true);
  });

  it('rejects cross-origin mutations', () => {
    assert.equal(requestOriginAllowed({
      method: 'POST',
      requestUrl: 'https://habbone.fr/api/user/change-password',
      origin: 'https://evil.test',
      host: 'habbone.fr',
      forwardedProto: 'https',
    }), false);
  });

  it('allows the configured canonical app origin behind a proxy', () => {
    assert.equal(requestOriginAllowed({
      method: 'POST',
      requestUrl: 'http://127.0.0.1:3000/api/admin/shop',
      origin: 'https://www.habbone.fr',
      forwardedHost: 'internal.vercel.app',
      forwardedProto: 'https',
      appOrigin: 'https://www.habbone.fr',
    }), true);
  });
});
