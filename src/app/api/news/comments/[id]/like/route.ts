import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { toggleNewsCommentLike } from '@/server/directus/news'
import { buildError } from '@/types/api'

export const POST = withAuth(async (_req, { nick, params }) => {
  const commentId = String(params?.id || '')
  if (!commentId) {
    return NextResponse.json(buildError('Identifiant commentaire invalide', { code: 'INVALID_ID' }), { status: 400 })
  }

  try {
    const result = await toggleNewsCommentLike(commentId, nick)
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json(buildError('LIKE_FAILED', { code: 'LIKE_FAILED' }), { status: 500 })
  }
}, { key: 'news:comment:like', limit: 30, windowMs: 60 * 1000 })
