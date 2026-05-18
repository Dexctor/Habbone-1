import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/server/api-helpers'
import { getUserById, changeUserPassword } from '@/server/directus/users'
import { passwordsMatch } from '@/server/directus/security'

const BodySchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(6, 'Nouveau mot de passe trop court (min 6 caracteres)'),
})

export const POST = withAuth(async (req, { user }) => {
  const userId = Number((user as any)?.id)
  if (!userId) {
    return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || 'Donnees invalides'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const { currentPassword, newPassword } = parsed.data

  try {
    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const storedPassword = (user as any)?.senha
    if (!storedPassword || !passwordsMatch(currentPassword, storedPassword)) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 403 })
    }

    await changeUserPassword(userId, newPassword)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}, { key: 'user:change-password', limit: 5, windowMs: 10 * 60 * 1000 })
