import { NextResponse } from 'next/server'
import { VerificationStatusSchema, formatZodError, buildError } from '@/types/api'
import {
  listUsersByNick,
  markUserAsVerified,
  normalizeHotelCode,
  updateUserVerification,
} from '@/server/directus/users'
import { getHabboUserByIdForHotel, getHabboUserByNameForHotel } from '@/server/habbo-cache'
import { isVerificationExpired } from '@/lib/verification'
import { parseTimestamp } from '@/lib/date-utils'
import * as logger from '@/server/logger'
import { checkRateLimit } from '@/server/rate-limit'

export const dynamic = 'force-dynamic';

const ERROR_NOT_FOUND = buildError('Utilisateur introuvable', { code: 'NOT_FOUND' })

export async function POST(req: Request) {
  try {
    // Basic rate limit: 20 checks / 10 minutes per IP
    const rl = await checkRateLimit(req, { key: 'verify:status', limit: 20, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json(
        buildError('Trop de requêtes, réessayez plus tard.', { code: 'RATE_LIMITED' }),
        { status: 429, headers: rl.headers }
      )
    }

    const raw = await req.json().catch(() => ({}))
    const parsed = VerificationStatusSchema.safeParse({
      nick: raw?.nick,
      code: raw?.code,
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
    const { nick, code } = parsed.data
    logger.info('[verify/status] request', { nick, hasCode: Boolean(code) })

    const users = await listUsersByNick(nick)
    if (!users.length) {
      logger.warn('[verify/status] user not found', { nick })
      return NextResponse.json(ERROR_NOT_FOUND, { status: 404 })
    }

    const lowerCode = String(code || '').toLowerCase()
    const user =
      users.length === 1
        ? users[0]
        : users.find((entry: any) => String((entry as any)?.habbo_verification_code || '').toLowerCase() === lowerCode) ??
          users[0]

    const id = Number((user as any)?.id ?? 0)
    const status = String((user as any)?.habbo_verification_status || '')
    const storedCode = String((user as any)?.habbo_verification_code || '')
    const expiresAt = (user as any)?.habbo_verification_expires_at as string | null | undefined
    const hotel = normalizeHotelCode((user as any)?.habbo_hotel)
    let uniqueId = String((user as any)?.habbo_unique_id || '')

    logger.info('[verify/status] user state', {
      nick,
      status,
      hasStoredCode: Boolean(storedCode),
      expiresAt,
      hotel,
      uniqueId,
    })

    if (status === 'locked') {
      logger.warn('[verify/status] locked', { nick });
      return NextResponse.json(buildError('Vérification verrouillée.', { code: 'LOCKED' }), { status: 423 })
    }

    if (status === 'ok') {
      logger.info('[verify/status] already verified', { nick })
      return NextResponse.json({ verified: true, status })
    }

    if (!storedCode) {
      logger.warn('[verify/status] code missing', { nick })
      return NextResponse.json(
        buildError('Code de vérification absent, veuillez en générer un nouveau.', { code: 'CODE_MISSING' }),
        { status: 409 },
      )
    }

    if (storedCode !== code) {
      logger.warn('[verify/status] code mismatch', {
        nick,
        hasStoredCode: Boolean(storedCode),
        receivedLength: code.length,
      })
      return NextResponse.json(buildError('Code invalide.', { code: 'CODE_MISMATCH' }), { status: 403 })
    }

    const normalizedExpiresAt = expiresAt && (expiresAt.endsWith('Z') || /[+-]\d\d:?\d\d$/.test(expiresAt) ? expiresAt : `${expiresAt}Z`)
    const expiresAtMs = normalizedExpiresAt
      ? parseTimestamp(normalizedExpiresAt, { numeric: 'ms', numericString: 'parse' })
      : null
    logger.info('[verify/status] expires delta', {
      nick,
      expiresAt,
      normalizedExpiresAt,
      expiresAtMs,
      deltaMs: expiresAtMs ? expiresAtMs - Date.now() : null,
      nowIso: new Date().toISOString(),
    })

    if (isVerificationExpired(expiresAt)) {
      logger.warn('[verify/status] code expired', { nick, expiresAt })
      void updateUserVerification(id, {
        habbo_verification_status: 'failed',
        habbo_verification_code: null,
        habbo_verification_expires_at: null,
      })
      return NextResponse.json(buildError('Code expiré.', { code: 'CODE_EXPIRED' }), { status: 410 })
    }

    const nickname = String(user?.nick || nick)
    let profile: any = null

    if (uniqueId) {
      try {
        profile = await getHabboUserByIdForHotel(uniqueId, hotel, { cache: false })
      } catch (err: any) {
        const message = err?.message || ''
        if (/404/.test(message)) {
          uniqueId = ''
        } else {
          throw err
        }
      }
    }

    if (!profile) {
      logger.info('[verify/status] fetching profile by name', { nick, nickname, hotel })
      profile = await getHabboUserByNameForHotel(nickname, hotel, { cache: false })
      uniqueId = profile?.uniqueId || uniqueId
      if (uniqueId) {
        logger.info('[verify/status] resolved uniqueId from name', { nick, uniqueId })
        void updateUserVerification(id, { habbo_unique_id: uniqueId })
      }
    }

    const motto = String(profile?.motto || profile?.mission || '')

    const contains = !!motto && motto.toUpperCase().includes(storedCode.toUpperCase())
    logger.info('[verify/status] motto check', {
      nick,
      hotel,
      hasStoredCode: Boolean(storedCode),
      contains,
    })

    if (!contains) {
      return NextResponse.json({ verified: false, status: 'pending' })
    }

    await markUserAsVerified(id)
    logger.info('[verify/status] verification success', { nick, hotel })
    return NextResponse.json({ verified: true, status: 'ok' })
  } catch (error: any) {
    logger.error('[verify/status] server error', { message: error?.message || String(error) })
    return NextResponse.json(
      buildError(error?.message || 'Erreur serveur', { code: 'SERVER_ERROR' }),
      { status: 500 },
    )
  }
}
