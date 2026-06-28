import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { setTopicVote, getTopicVoteSummary } from '@/server/pocketbase/forum'
import { buildError } from '@/types/api'

export const POST = withAuth(async (req, { nick, params }) => {
  const topicId = String(params?.id || '')
  if (!topicId) {
    return NextResponse.json(buildError('Identifiant sujet invalide', { code: 'INVALID_ID' }), { status: 400 })
  }
  let body: any
  try { body = await req.json() } catch { return NextResponse.json(buildError('INVALID_JSON', { code: 'INVALID_JSON' }), { status: 400 }) }
  const voteVal = Number((body?.vote ?? 0))
  if (voteVal !== 1 && voteVal !== -1) {
    return NextResponse.json(buildError('VOTE_INVALID', { code: 'VOTE_INVALID' }), { status: 400 })
  }
  try {
    await setTopicVote(topicId, nick, voteVal as 1 | -1)
    const summary = await getTopicVoteSummary(topicId)
    return NextResponse.json({ ok: true, summary })
  } catch {
    return NextResponse.json(buildError('VOTE_FAILED', { code: 'VOTE_FAILED' }), { status: 500 })
  }
}, { key: 'forum:vote', limit: 30, windowMs: 60 * 1000 })
