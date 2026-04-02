import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { toggleForumCommentLike } from '@/server/directus/forum'
import { buildError } from '@/types/api'
import { checkRateLimit } from '@/server/rate-limit'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(req, { key: 'forum:comment:like', limit: 30, windowMs: 60 * 1000 })
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
    const result = await toggleForumCommentLike(commentId, String(user.nick))
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json(buildError('LIKE_FAILED', { code: 'LIKE_FAILED' }), { status: 500 })
  }
}
