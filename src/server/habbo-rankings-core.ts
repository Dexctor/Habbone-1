export type HabboRankings = {
  achievements: { rank: number | null; score: number } | null;
  badges: { rank: number | null; score: number } | null;
  uniqueBadges: { rank: number | null; score: number } | null;
  starGems: { rank: number | null; score: number } | null;
};

/**
 * Parse a HabboWidgets habinfo HTML page and extract the 4 ranking values.
 *
 * The ranking blocks can contain "# N/A" when the player is not ranked, but the
 * score in parentheses is still useful. Keep each lookup scoped near its own
 * link so values from later widgets cannot bleed into the current metric.
 */
export function parseHabboRankings(html: string): HabboRankings {
  const rankingPaths = [
    '/badges/achievements/',
    '/badges/top/',
    '/badges/unique/',
    '/habbo/stargems/',
  ];
  const rankings: HabboRankings = {
    achievements: null,
    badges: null,
    uniqueBadges: null,
    starGems: null,
  };

  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function extract(pathSegment: string): { rank: number | null; score: number } | null {
    const linkPattern = new RegExp(`href=["']${escapeRegExp(pathSegment)}[^"']*["']`, 'i');
    const linkMatch = linkPattern.exec(html);
    if (!linkMatch) return null;

    const nextBlockIndex = rankingPaths
      .filter((path) => path !== pathSegment)
      .map((path) => {
        const nextMatch = new RegExp(`href=["']${escapeRegExp(path)}[^"']*["']`, 'i').exec(
          html.slice(linkMatch.index + 1),
        );
        return nextMatch ? linkMatch.index + 1 + nextMatch.index : Number.POSITIVE_INFINITY;
      })
      .reduce((min, index) => Math.min(min, index), Number.POSITIVE_INFINITY);
    const blockEnd = Math.min(linkMatch.index + 700, nextBlockIndex);
    const block = html.slice(linkMatch.index, blockEnd);
    const rankMatch = block.match(/#\s*(\d+|N\/A)/i);
    const scoreMatch = block.match(/\(([\d\s.,]+)\)/);

    if (!scoreMatch) return null;
    const score = Number(scoreMatch[1].replace(/[^\d]/g, ''));
    if (!Number.isFinite(score)) return null;

    let rank: number | null = null;
    if (rankMatch && rankMatch[1].toUpperCase() !== 'N/A') {
      const parsed = Number(rankMatch[1]);
      if (Number.isFinite(parsed)) rank = parsed;
    }

    return { rank, score };
  }

  rankings.achievements = extract('/badges/achievements/');
  rankings.badges = extract('/badges/top/');
  rankings.uniqueBadges = extract('/badges/unique/');
  rankings.starGems = extract('/habbo/stargems/');

  return rankings;
}
