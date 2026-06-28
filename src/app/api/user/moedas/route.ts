import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { getUserMoedas } from '@/server/pocketbase/users'
import { buildError } from '@/types/api'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const uid = (session as any)?.user?.id
    if (!uid) return NextResponse.json(buildError('Non authentifié', { code: 'UNAUTHORIZED' }), { status: 401 })

    const moedas = await getUserMoedas(String(uid))
    return NextResponse.json({ ok: true, moedas })
  } catch (e: any) {
    return NextResponse.json(buildError('Erreur serveur', { code: 'SERVER_ERROR' }), { status: 500 })
  }
}
