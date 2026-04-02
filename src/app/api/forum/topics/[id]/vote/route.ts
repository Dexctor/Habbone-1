import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { setTopicVote, getTopicVoteSummary } from '@/server/directus/forum'
import { buildError } from '@/types/api'
import { checkRateLimit } from '@/server/rate-limit'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req, { key: 'forum:vote', limit: 30, windowMs: 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json(buildError('Trop de requêtes', { code: 'RATE_LIMITED' }), { status: 429, headers: rl.headers })
  }
  const { id } = await ctx.params
  const topicId = Number(id || 0)
  if (!Number.isFinite(topicId) || topicId <= 0) {
    return NextResponse.json(buildError('Identifiant sujet invalide', { code: 'INVALID_ID' }), { status: 400 })
  }
  const session = await getServerSession(authOptions)
  const user = session?.user as { nick?: string } | undefined
  if (!user?.nick) {
    return NextResponse.json(buildError('Non authentifié', { code: 'UNAUTHORIZED' }), { status: 401 })
  }
  let body: any
  try { body = await req.json() } catch { return NextResponse.json(buildError('INVALID_JSON', { code: 'INVALID_JSON' }), { status: 400 }) }
  const voteVal = Number((body?.vote ?? 0))
  if (voteVal !== 1 && voteVal !== -1) {
    return NextResponse.json(buildError('VOTE_INVALID', { code: 'VOTE_INVALID' }), { status: 400 })
  }
  try {
    await setTopicVote(topicId, String(user.nick), voteVal as 1 | -1)
    const summary = await getTopicVoteSummary(topicId)
    return NextResponse.json({ ok: true, summary })
  } catch {
    return NextResponse.json(buildError('VOTE_FAILED', { code: 'VOTE_FAILED' }), { status: 500 })
  }
}
