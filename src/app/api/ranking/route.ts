import { NextResponse } from 'next/server'
import { pbList } from '@/server/directus/pb-helpers'
import { TABLES } from '@/server/directus/tables'
import { resolveUserNick } from '@/server/directus/user-cache'

export const dynamic = 'force-dynamic'

type RankingEntry = { nick: string; score: number }
type RankingCategory = 'comments' | 'articles' | 'topics' | 'coins'
type RankingResponse = Record<RankingCategory, RankingEntry[]>

const MAX_RANKING_ROWS = 10000

/**
 * Fetch the "author" column for every row in the table.
 *
 * v2: author is a relation → users, so this returns user ids (PB strings). The
 * caller resolves the ids to nicks via the shared user cache.
 */
async function fetchAllAuthors(table: string): Promise<string[]> {
  try {
    const rows = await pbList<Record<string, unknown>>(table, {
      fields: 'author',
      perPage: MAX_RANKING_ROWS,
    })
    return rows
      .map((r) => r?.author)
      .filter((v): v is string => v !== null && v !== undefined && v !== '')
      .map((v) => String(v))
  } catch {
    return []
  }
}

async function fetchTopCoins(limit: number): Promise<RankingEntry[]> {
  try {
    const rows = await pbList<{ nick: string; coins?: number }>(TABLES.users, {
      fields: 'nick,coins',
      sort: '-coins',
      perPage: limit,
    })
    return rows
      .filter((r) => r?.nick && Number(r?.coins) > 0)
      .map((r) => ({ nick: String(r.nick), score: Number(r.coins) || 0 }))
  } catch {
    return []
  }
}

async function countByAuthor(authors: string[], limit: number): Promise<RankingEntry[]> {
  // v2: resolve ids → nicks first
  const nicks: string[] = []
  for (const id of authors) {
    if (!id) continue
    const nick = await resolveUserNick(id)
    if (nick) nicks.push(nick)
  }

  const map = new Map<string, number>()
  const displayMap = new Map<string, string>()
  for (const nick of nicks) {
    const key = nick.toLowerCase()
    if (!displayMap.has(key)) displayMap.set(key, nick)
    map.set(key, (map.get(key) || 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, score]) => ({ nick: displayMap.get(key) || key, score }))
}

export async function GET() {
  try {
    const TOP = 10
    const [forumComments, newsComments, articles, topics, coins] = await Promise.all([
      fetchAllAuthors(TABLES.forumComments),
      fetchAllAuthors(TABLES.articleComments),
      fetchAllAuthors(TABLES.articles),
      fetchAllAuthors(TABLES.forumTopics),
      fetchTopCoins(TOP),
    ])

    const allComments = [...forumComments, ...newsComments]

    const result: RankingResponse = {
      comments: await countByAuthor(allComments, TOP),
      articles: await countByAuthor(articles, TOP),
      topics: await countByAuthor(topics, TOP),
      coins: coins.slice(0, TOP),
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { comments: [], articles: [], topics: [], coins: [] },
      { status: 500 },
    )
  }
}
