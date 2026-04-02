import { NextResponse } from 'next/server'
import { VerificationRegenerateSchema, formatZodError, buildError } from '@/types/api'
import { getUserByNick, listUsersByNick, normalizeHotelCode, updateUserVerification } from '@/server/directus/users'
import { computeVerificationExpiry, generateVerificationCode } from '@/lib/verification'
import { parseTimestamp } from '@/lib/date-utils'
import * as logger from '@/server/logger'
import { checkRateLimit } from '@/server/rate-limit'

const RETURN_VERIFICATION_CODE =
  process.env.NODE_ENV !== 'production' &&
  String(process.env.RETURN_VERIFICATION_CODE || 'false').toLowerCase() !== 'false';

export async function POST(req: Request) {
  try {
    // Basic rate limit: 10 requests / 10 minutes per IP
    const rl = checkRateLimit(req, { key: 'verify:regenerate', limit: 10, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json(
        buildError('Trop de requêtes, réessayez plus tard.', { code: 'RATE_LIMITED' }),
        { status: 429, headers: rl.headers }
      )
    }

    const raw = await req.json().catch(() => ({}))
    const parsed = VerificationRegenerateSchema.safeParse({
      nick: raw?.nick,
    })
    if (!parsed.success) {
      return NextResponse.json(
        buildError('Erreur de validation', {
          code: 'VALIDATION_ERROR',
          fields: formatZodError(parsed.error).fieldErrors,
        }),
        { status: 400 },
      )
    }

    const { nick, hotel } = parsed.data
    const hotelCode = hotel ? normalizeHotelCode(hotel) : null

    let user: any = null
    if (hotelCode) {
      user = await getUserByNick(nick, hotelCode)
    } else {
      const users = await listUsersByNick(nick)
      if (!users.length) {
        return NextResponse.json(buildError('Utilisateur introuvable', { code: 'NOT_FOUND' }), { status: 404 })
      }
      if (users.length > 1) {
        return NextResponse.json(
          buildError('Plusieurs comptes existent pour ce pseudo, précise un hôtel', { code: 'HOTEL_REQUIRED' }),
          { status: 409 },
        )
      }
      user = users[0]
    }

    if (!user) {
      return NextResponse.json(buildError('Utilisateur introuvable', { code: 'NOT_FOUND' }), { status: 404 })
    }

    const status = String((user as any)?.habbo_verification_status || '')
    if (status === 'locked') {
      return NextResponse.json(buildError('Vérification verrouillée.', { code: 'LOCKED' }), { status: 423 })
    }
    if (status === 'ok') {
      return NextResponse.json({ ok: true, code: null, expiresAt: null, alreadyVerified: true })
    }

    const code = generateVerificationCode()
    const expiresAt = computeVerificationExpiry()
    const expiresAtMs = parseTimestamp(expiresAt, { numeric: 'ms', numericString: 'parse' })
    logger.info('[verify/regenerate] code reissued', {
      nick,
      expiresAt,
      deltaMs: expiresAtMs ? expiresAtMs - Date.now() : null,
      nowIso: new Date().toISOString(),
      code,
    })

    await updateUserVerification(Number((user as any).id), {
      habbo_verification_status: 'pending',
      habbo_verification_code: code,
      habbo_verification_expires_at: expiresAt,
    })

    const payload: any = { ok: true, expiresAt }
    if (RETURN_VERIFICATION_CODE) (payload as any).code = code
    return NextResponse.json(payload)
  } catch (error: any) {
    logger.error('[verify/regenerate] server error', { message: error?.message || String(error) })
    return NextResponse.json(
      buildError(error?.message || 'Erreur serveur', { code: 'SERVER_ERROR' }),
      { status: 500 },
    )
  }
}
