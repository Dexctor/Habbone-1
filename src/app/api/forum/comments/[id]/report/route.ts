import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { reportForumComment } from '@/server/directus/forum'
import { buildError } from '@/types/api'
import { checkRateLimit } from '@/server/rate-limit'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req, { key: 'forum:comment:report', limit: 5, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json(buildError('Trop de requêtes', { code: 'RATE_LIMITED' }), { status: 429, headers: rl.headers })
  }
  const { id } = await ctx.params
  const commentId = Number(id || 0)
  if (!Number.isFinite(commentId) || commentId <= 0) {
    return NextResponse.json(buildError('Identifiant commentaire invalide', { code: 'INVALID_ID' }), { status: 400 })
  }
  const session = await getServerSession(authOptions)
  const user = session?.user as { nick?: string } | undefined
  if (!user?.nick) {
    return NextResponse.json(buildError('Non authentifié', { code: 'UNAUTHORIZED' }), { status: 401 })
  }
  try {
    await reportForumComment(commentId, String(user.nick))
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(buildError('REPORT_FAILED', { code: 'REPORT_FAILED' }), { status: 500 })
  }
}
