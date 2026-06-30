import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseHabboRankings } from '../habbo-rankings-core';

describe('parseHabboRankings', () => {
  it('extracts ranks and scores for all ranking widgets', () => {
    const html = `
      <a href="/badges/achievements/fr">Achievements top 250</a>
      <strong class="label label-success"># 14</strong>
      <span>(1 765)</span>
      <a href="/badges/top/fr">Badges top 250</a>
      <strong># 20</strong>
      <span>(2,499)</span>
      <a href="/badges/unique/fr">Unique badges top 250</a>
      <strong># 35</strong>
      <span>(880)</span>
      <a href="/habbo/stargems/fr">Star gems top 250</a>
      <strong># 7</strong>
      <span>(155150)</span>
    `;

    assert.deepEqual(parseHabboRankings(html), {
      achievements: { rank: 14, score: 1765 },
      badges: { rank: 20, score: 2499 },
      uniqueBadges: { rank: 35, score: 880 },
      starGems: { rank: 7, score: 155150 },
    });
  });

  it('keeps the score when the rank is not available', () => {
    const html = `
      <a href="/habbo/stargems/fr">Star gems top 250</a>
      <strong># N/A</strong>
      <span>(155150)</span>
    `;

    assert.deepEqual(parseHabboRankings(html).starGems, { rank: null, score: 155150 });
  });

  it('returns null for missing ranking links', () => {
    const rankings = parseHabboRankings('<main>Aucun classement</main>');

    assert.equal(rankings.achievements, null);
    assert.equal(rankings.badges, null);
    assert.equal(rankings.uniqueBadges, null);
    assert.equal(rankings.starGems, null);
  });

  it('does not borrow the next widget score when the current widget has no score', () => {
    const html = `
      <a href="/badges/achievements/fr">Achievements top 250</a>
      <strong># 14</strong>
      <a href="/badges/top/fr">Badges top 250</a>
      <strong># 20</strong>
      <span>(2499)</span>
    `;

    const rankings = parseHabboRankings(html);

    assert.equal(rankings.achievements, null);
    assert.deepEqual(rankings.badges, { rank: 20, score: 2499 });
  });
});
