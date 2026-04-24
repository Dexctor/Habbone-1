import { NextResponse } from 'next/server'
import { directusFetch } from '@/server/directus/fetch'
import { TABLES, USE_V2 } from '@/server/directus/tables'
import { resolveUserNick } from '@/server/directus/user-cache'

export const dynamic = 'force-dynamic'

type RankingEntry = { nick: string; score: number }
type RankingCategory = 'comments' | 'articles' | 'topics' | 'coins'
type RankingResponse = Record<RankingCategory, RankingEntry[]>

const MAX_RANKING_ROWS = 10000

/**
 * Fetch the "author" column for every row in the table.
 *
 * Legacy: returns the nick directly (author is a VARCHAR).
 * v2: returns the user id (author is M2O → users). The caller then resolves
 *    the ids to nicks via the shared user cache.
 */
async function fetchAllAuthors(table: string): Promise<Array<string | number>> {
  const field = USE_V2 ? 'author' : 'autor';
  try {
    const json = await directusFetch<{ data: Record<string, unknown>[] }>(`/items/${encodeURIComponent(table)}`, {
      params: { fields: field, limit: String(MAX_RANKING_ROWS) },
    })
    return (json?.data ?? [])
      .map((r: any) => r?.[field])
      .filter((v: any) => v !== null && v !== undefined && v !== '');
  } catch {
    return [];
  }
}

async function fetchTopCoins(limit: number): Promise<RankingEntry[]> {
  const coinsField = USE_V2 ? 'coins' : 'moedas';
  try {
    const json = await directusFetch<{ data: { nick: string; [k: string]: any }[] }>(
      `/items/${encodeURIComponent(TABLES.users)}`,
      {
        params: { fields: `nick,${coinsField}`, sort: `-${coinsField}`, limit: String(limit) },
      },
    );
    return (json?.data ?? [])
      .filter((r) => r?.nick && Number(r?.[coinsField]) > 0)
      .map((r) => ({ nick: String(r.nick), score: Number(r[coinsField]) || 0 }));
  } catch {
    return [];
  }
}

async function countByAuthor(authors: Array<string | number>, limit: number): Promise<RankingEntry[]> {
  // v2: resolve ids → nicks first
  let nicks: string[];
  if (USE_V2) {
    nicks = [];
    for (const id of authors) {
      if (typeof id !== 'number') continue;
      const nick = await resolveUserNick(id);
      if (nick) nicks.push(nick);
    }
  } else {
    nicks = authors.map((v) => String(v).trim()).filter(Boolean);
  }

  const map = new Map<string, number>();
  const displayMap = new Map<string, string>();
  for (const nick of nicks) {
    const key = nick.toLowerCase();
    if (!displayMap.has(key)) displayMap.set(key, nick);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, score]) => ({ nick: displayMap.get(key) || key, score }));
}

export async function GET() {
  try {
    const TOP = 10;
    const [forumComments, newsComments, articles, topics, coins] = await Promise.all([
      fetchAllAuthors(TABLES.forumComments),
      fetchAllAuthors(TABLES.articleComments),
      fetchAllAuthors(TABLES.articles),
      fetchAllAuthors(TABLES.forumTopics),
      fetchTopCoins(TOP),
    ]);

    const allComments = [...forumComments, ...newsComments];

    const result: RankingResponse = {
      comments: await countByAuthor(allComments, TOP),
      articles: await countByAuthor(articles, TOP),
      topics: await countByAuthor(topics, TOP),
      coins: coins.slice(0, TOP),
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { comments: [], articles: [], topics: [], coins: [] },
      { status: 500 },
    );
  }
}
