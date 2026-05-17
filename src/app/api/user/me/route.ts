import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { directusUrl, serviceToken, USERS_TABLE } from '@/server/directus/client'

/**
 * Returns the currently authenticated user's editable profile fields
 * (currently: twitter). Kept minimal — only fields the user can self-edit.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = Number((session?.user as any)?.id)
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  try {
    const url = new URL(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${userId}`)
    url.searchParams.set('fields', 'id,twitter')
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }
    const json = await res.json()
    const row = json?.data ?? {}
    return NextResponse.json({
      ok: true,
      profile: {
        twitter: typeof row?.twitter === 'string' ? row.twitter : null,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
