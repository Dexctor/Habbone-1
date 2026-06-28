import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { pbOne } from '@/server/pocketbase/helpers'
import { TABLES } from '@/server/pocketbase/tables'

/**
 * Returns the currently authenticated user's editable profile fields
 * (currently: twitter). Kept minimal — only fields the user can self-edit.
 *
 * Migration note: the v2 PocketBase schema has no `twitter` column, so this
 * always resolves to null. The lookup is kept so the route still validates the
 * user exists and the response shape is unchanged.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = String((session?.user as any)?.id ?? '')
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  try {
    const row = await pbOne<{ id: string; twitter?: unknown }>(TABLES.users, userId, {
      fields: 'id',
    })
    if (!row) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }
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
