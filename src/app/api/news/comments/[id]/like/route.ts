import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { toggleNewsCommentLike } from '@/server/directus/news'
import { buildError } from '@/types/api'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const commentId = Number(id || 0)
  if (!Number.isFinite(commentId) || commentId <= 0) {
    return NextResponse.json(buildError('Identifiant commentaire invalide', { code: 'INVALID_ID' }), { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const user = session?.user as { nick?: string } | undefined
  if (!user?.nick) {
    return NextResponse.json(buildError('Non authentifie', { code: 'UNAUTHORIZED' }), { status: 401 })
  }

  try {
    const result = await toggleNewsCommentLike(commentId, String(user.nick))
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json(buildError('LIKE_FAILED', { code: 'LIKE_FAILED' }), { status: 500 })
  }
}
