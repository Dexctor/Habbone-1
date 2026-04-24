/**
 * Unit tests for admin guard decision rules.
 *
 * Run with:
 *   npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { cleanUserId, decideGuard, isFounderRoleName } from '../admin-guards-core';

describe('cleanUserId', () => {
  it('strips the legacy: prefix', () => {
    assert.equal(cleanUserId('legacy:42'), '42');
  });

  it('leaves a plain id untouched', () => {
    assert.equal(cleanUserId('42'), '42');
  });

  it('only strips the exact legacy: prefix', () => {
    assert.equal(cleanUserId('legacyX:42'), 'legacyX:42');
  });
});

describe('isFounderRoleName', () => {
  it('matches French variant', () => {
    assert.equal(isFounderRoleName('Fondateur'), true);
    assert.equal(isFounderRoleName('fondateur en chef'), true);
  });

  it('matches English variant', () => {
    assert.equal(isFounderRoleName('Founder'), true);
  });

  it('is case-insensitive', () => {
    assert.equal(isFounderRoleName('FONDATEUR'), true);
    assert.equal(isFounderRoleName('FoUnDeR'), true);
  });

  it('does not match other admin titles', () => {
    assert.equal(isFounderRoleName('Admin'), false);
    assert.equal(isFounderRoleName('Moderateur'), false);
    assert.equal(isFounderRoleName(''), false);
    assert.equal(isFounderRoleName(null), false);
    assert.equal(isFounderRoleName(undefined), false);
  });
});

describe('decideGuard — self action', () => {
  it('blocks ban on own account', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: false,
      targetUserId: '1',
      target: { id: '1', isAdmin: false },
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.code, 'SELF_ACTION_FORBIDDEN');
      assert.equal(decision.status, 400);
    }
  });

  it('recognises legacy: prefix as same account', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: false,
      targetUserId: 'legacy:1',
      target: { id: '1', isAdmin: false },
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.code, 'SELF_ACTION_FORBIDDEN');
  });

  it('blocks self-action even for a founder', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: true,
      targetUserId: '1',
      target: { id: '1', isAdmin: true },
      action: 'ban',
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.code, 'SELF_ACTION_FORBIDDEN');
  });

  it('allows a founder to give themselves coins', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: true,
      targetUserId: '1',
      target: { id: '1', isAdmin: true },
      action: 'coins',
    });
    assert.equal(decision.ok, true);
  });

  it('blocks self-coins for a non-founder admin', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: false,
      targetUserId: '1',
      target: { id: '1', isAdmin: true },
      action: 'coins',
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.code, 'SELF_ACTION_FORBIDDEN');
  });
});

describe('decideGuard — missing target', () => {
  it('returns TARGET_NOT_FOUND when target is null', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: false,
      targetUserId: '42',
      target: null,
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.code, 'TARGET_NOT_FOUND');
      assert.equal(decision.status, 404);
    }
  });

  it('self-check takes priority over missing target', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: false,
      targetUserId: '1',
      target: null,
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) assert.equal(decision.code, 'SELF_ACTION_FORBIDDEN');
  });
});

describe('decideGuard — admin target protection', () => {
  it('blocks a regular admin from banning another admin', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: false,
      targetUserId: '2',
      target: { id: '2', isAdmin: true },
    });
    assert.equal(decision.ok, false);
    if (!decision.ok) {
      assert.equal(decision.code, 'ADMIN_TARGET_FORBIDDEN');
      assert.equal(decision.status, 403);
    }
  });

  it('allows a founder to act on another admin', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: true,
      targetUserId: '2',
      target: { id: '2', isAdmin: true },
    });
    assert.equal(decision.ok, true);
  });

  it('allows any admin to act on a regular user', () => {
    const decision = decideGuard({
      callerId: '1',
      callerIsFounder: false,
      targetUserId: '2',
      target: { id: '2', isAdmin: false },
    });
    assert.equal(decision.ok, true);
  });
});

describe('decideGuard — anonymous caller', () => {
  it('does not treat null caller as matching a null target', () => {
    const decision = decideGuard({
      callerId: null,
      callerIsFounder: false,
      targetUserId: '42',
      target: { id: '42', isAdmin: false },
    });
    // callerId null → self-check skipped → falls through to regular checks
    assert.equal(decision.ok, true);
  });
});
