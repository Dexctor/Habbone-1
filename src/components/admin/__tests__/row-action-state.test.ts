/**
 * Unit tests for row-action-state reducer (AdminUsersPanel).
 *
 * Run with:
 *   npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rowActionReducer, type RowActionState } from '../row-action-state';

describe('rowActionReducer', () => {
  it('returns the initial state unchanged for an empty action', () => {
    const initial: RowActionState = {};
    // @ts-expect-error — exercising the default branch
    const next = rowActionReducer(initial, { type: 'noop' });
    assert.deepEqual(next, initial);
  });

  it('marks a row as loading when an action starts', () => {
    const state = rowActionReducer({}, { type: 'start', action: 'ban', userId: 'u-42' });
    assert.equal(state.ban, 'u-42');
    assert.equal(state.delete, undefined);
  });

  it('clears the loading marker on end', () => {
    const started = rowActionReducer({}, { type: 'start', action: 'delete', userId: 'u-1' });
    const ended = rowActionReducer(started, { type: 'end', action: 'delete' });
    assert.equal(ended.delete, null);
  });

  it('supports concurrent actions on different rows', () => {
    let state: RowActionState = {};
    state = rowActionReducer(state, { type: 'start', action: 'saveRole', userId: 'u-1' });
    state = rowActionReducer(state, { type: 'start', action: 'ban', userId: 'u-2' });
    state = rowActionReducer(state, { type: 'start', action: 'coins', userId: 'u-3' });

    assert.equal(state.saveRole, 'u-1');
    assert.equal(state.ban, 'u-2');
    assert.equal(state.coins, 'u-3');
  });

  it('ending one action does not affect the others', () => {
    let state: RowActionState = {};
    state = rowActionReducer(state, { type: 'start', action: 'ban', userId: 'u-1' });
    state = rowActionReducer(state, { type: 'start', action: 'delete', userId: 'u-2' });
    state = rowActionReducer(state, { type: 'end', action: 'ban' });

    assert.equal(state.ban, null);
    assert.equal(state.delete, 'u-2');
  });

  it('restarting the same action on another row overwrites the userId', () => {
    let state: RowActionState = {};
    state = rowActionReducer(state, { type: 'start', action: 'ban', userId: 'u-1' });
    state = rowActionReducer(state, { type: 'start', action: 'ban', userId: 'u-2' });
    assert.equal(state.ban, 'u-2');
  });

  it('is immutable — never mutates the previous state object', () => {
    const before: RowActionState = { ban: 'u-1' };
    const after = rowActionReducer(before, { type: 'start', action: 'delete', userId: 'u-2' });
    assert.notEqual(after, before);
    assert.equal(before.ban, 'u-1');
    assert.equal(before.delete, undefined);
  });
});
