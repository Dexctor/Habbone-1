import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { getUserEditableProfile } from '@/server/directus/users'

/**
 * Returns the currently authenticated user's editable profile fields
 * (currently: twitter). Kept minimal — only fields the user can self-edit.
 */
export const GET = withAuth(async (_req, { user }) => {
  const userId = Number((user as any)?.id)
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  try {
    const profile = await getUserEditableProfile(userId)
    if (!profile) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }
    return NextResponse.json({
      ok: true,
      profile,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
})
