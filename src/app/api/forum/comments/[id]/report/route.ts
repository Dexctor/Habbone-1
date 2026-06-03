import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { reportForumComment } from '@/server/directus/forum'
import { buildError } from '@/types/api'

export const POST = withAuth(async (_req, { nick, params }) => {
  const commentId = String(params?.id || '')
  if (!commentId) {
    return NextResponse.json(buildError('Identifiant commentaire invalide', { code: 'INVALID_ID' }), { status: 400 })
  }
  try {
    await reportForumComment(commentId, nick)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(buildError('REPORT_FAILED', { code: 'REPORT_FAILED' }), { status: 500 })
  }
}, { key: 'forum:comment:report', limit: 5, windowMs: 10 * 60 * 1000 })
