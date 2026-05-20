import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildTeamMembersByRole, type TeamRow } from '@/server/supabase/team-core';

describe('buildTeamMembersByRole', () => {
  it('hides regular members and exposes any non-member role dynamically', () => {
    const rows: TeamRow[] = [
      {
        id: 1,
        nick: 'Regular',
        role_name: 'Member',
        created_at: '2026-01-01T00:00:00.000Z',
        twitter: null,
      },
      {
        id: 2,
        nick: 'Staff',
        role_name: 'Fondateur',
        created_at: '2026-01-02T00:00:00.000Z',
        twitter: '@staff',
      },
      {
        id: 3,
        nick: 'Custom',
        role_name: 'Event Manager',
        created_at: '2026-01-03T00:00:00.000Z',
        twitter: '',
      },
    ];

    const result = buildTeamMembersByRole(rows);

    assert.deepEqual(Object.keys(result), ['Fondateur', 'Event Manager']);
    assert.equal(result.Fondateur[0].nick, 'Staff');
    assert.equal(result.Fondateur[0].twitter, '@staff');
    assert.equal(result['Event Manager'][0].nick, 'Custom');
    assert.equal(result.Member, undefined);
  });

  it('sorts known roles first and members oldest first inside each role', () => {
    const rows: TeamRow[] = [
      {
        id: 1,
        nick: 'Later',
        role_name: 'Graphiste',
        created_at: '2026-02-02T00:00:00.000Z',
        twitter: null,
      },
      {
        id: 2,
        nick: 'Founder',
        role_name: 'Fondateur',
        created_at: '2026-03-01T00:00:00.000Z',
        twitter: null,
      },
      {
        id: 3,
        nick: 'Earlier',
        role_name: 'Graphiste',
        created_at: '2026-02-01T00:00:00.000Z',
        twitter: null,
      },
    ];

    const result = buildTeamMembersByRole(rows);

    assert.deepEqual(Object.keys(result), ['Fondateur', 'Graphiste']);
    assert.deepEqual(result.Graphiste.map((member) => member.nick), ['Earlier', 'Later']);
  });
});
