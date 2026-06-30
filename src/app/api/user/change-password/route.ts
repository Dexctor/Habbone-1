import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/auth'
import { checkRateLimit } from '@/server/rate-limit'
import { getUserById, changeUserPassword } from '@/server/pocketbase/users'
import { passwordsMatch } from '@/server/pocketbase/security'

const BodySchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(6, 'Nouveau mot de passe trop court (min 6 caracteres)'),
})

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, { key: 'user:change-password', limit: 5, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de tentatives, reessayez plus tard.' }, { status: 429, headers: rl.headers })
  }

  const session = await getServerSession(authOptions)
  const userId = String((session?.user as any)?.id ?? '')
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
}
