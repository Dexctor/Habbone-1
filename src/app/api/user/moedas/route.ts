import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { getUserMoedas } from '@/server/directus/users'
import { buildError } from '@/types/api'

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { user }) => {
  try {
    const uid = (user as any)?.id
    if (!uid) return NextResponse.json(buildError('Non authentifié', { code: 'UNAUTHORIZED' }), { status: 401 })

    const moedas = await getUserMoedas(Number(uid))
    return NextResponse.json({ ok: true, moedas })
  } catch (e: any) {
    return NextResponse.json(buildError('Erreur serveur', { code: 'SERVER_ERROR' }), { status: 500 })
  }
})
