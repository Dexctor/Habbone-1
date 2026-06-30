import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit } from '@/server/rate-limit'
import { listUsersByNick, updateUserVerification, changeUserPassword, normalizeHotelCode } from '@/server/pocketbase/users'
import { generateVerificationCode, computeVerificationExpiry, isVerificationExpired } from '@/lib/verification'
import { getHabboUserByNameForHotel } from '@/server/habbo-cache'

const RequestCodeSchema = z.object({
  action: z.literal('request'),
  nick: z.string().min(2).max(30),
})

const ResetSchema = z.object({
  action: z.literal('reset'),
  nick: z.string().min(2).max(30),
  code: z.string().min(4).max(20),
  newPassword: z.string().min(6, 'Mot de passe trop court (min 6 caracteres)'),
})

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, { key: 'user:forgot-password', limit: 10, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de tentatives, reessayez plus tard.' }, { status: 429, headers: rl.headers })
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 })
  }

  const action = body?.action

  // Step 1: Request a reset code
  if (action === 'request') {
    const parsed = RequestCodeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Donnees invalides' }, { status: 400 })
    }

    const { nick } = parsed.data

    try {
      const users = await listUsersByNick(nick)
      if (!users.length) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
      }

      const user = users[0] as any
      const userId = String(user.id)
      const code = generateVerificationCode()
      const expiresAt = computeVerificationExpiry()

      await updateUserVerification(userId, {
        habbo_verification_code: code,
        habbo_verification_expires_at: expiresAt,
        habbo_verification_status: 'pending',
      })

      return NextResponse.json({
        ok: true,
        code,
        expiresAt,
        hotel: normalizeHotelCode(user.habbo_hotel),
      })
    } catch {
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
  }

  // Step 2: Verify code in Habbo motto and reset password
  if (action === 'reset') {
    const parsed = ResetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Donnees invalides' }, { status: 400 })
    }

    const { nick, code, newPassword } = parsed.data

    try {
      const users = await listUsersByNick(nick)
      if (!users.length) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
      }

      const user = users[0] as any
      const userId = String(user.id)
      const storedCode = String(user.habbo_verification_code || '')
      const expiresAt = user.habbo_verification_expires_at
      const hotel = normalizeHotelCode(user.habbo_hotel)

      if (!storedCode || storedCode !== code) {
        return NextResponse.json({ error: 'Code invalide' }, { status: 403 })
      }

      if (isVerificationExpired(expiresAt)) {
        return NextResponse.json({ error: 'Code expire, regenerez un nouveau code' }, { status: 410 })
      }

      // Verify the code is in the Habbo motto
      let profile: any = null
      try {
        profile = await getHabboUserByNameForHotel(nick, hotel, { cache: false })
      } catch {}

      const motto = String(profile?.motto || '')
      if (!motto.toUpperCase().includes(storedCode.toUpperCase())) {
        return NextResponse.json({
          error: 'Le code n\'a pas ete trouve dans ta mission Habbo. Place le code dans ta mission et reessaye.',
        }, { status: 403 })
      }

      // Reset password
      await changeUserPassword(userId, newPassword)

      // Clear verification code
      await updateUserVerification(userId, {
        habbo_verification_code: null,
        habbo_verification_expires_at: null,
        habbo_verification_status: 'ok',
      })

      return NextResponse.json({ ok: true })
    } catch {
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}
