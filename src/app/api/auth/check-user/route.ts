// app/api/auth/check-user/route.ts
import { NextResponse } from 'next/server'
import { getUserByNick, listUsersByNick, normalizeHotelCode } from '@/server/pocketbase/users'
import { CheckUserQuerySchema, searchParamsToObject, formatZodError, buildError } from '@/types/api'
import { checkRateLimit } from '@/server/rate-limit'

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Soften but protect: 60 hits / 10 minutes per IP
    const rl = await checkRateLimit(req, { key: 'auth:check-user', limit: 60, windowMs: 10 * 60 * 1000 })
    if (!rl.ok) {
      return NextResponse.json(buildError('Trop de requêtes', { code: 'RATE_LIMITED' }), { status: 429, headers: rl.headers })
    }

    const { searchParams } = new URL(req.url)
    const parsed = CheckUserQuerySchema.safeParse(searchParamsToObject(searchParams))
    if (!parsed.success) {
      return NextResponse.json(
        buildError('Erreur de validation', { code: 'VALIDATION_ERROR', fields: formatZodError(parsed.error).fieldErrors }),
        { status: 400 }
      )
    }

    const { nick, hotel } = parsed.data
    let exists = false

    try {
      if (hotel) {
        const hotelCode = normalizeHotelCode(hotel)
        const user = await getUserByNick(nick, hotelCode).catch(() => null)
        exists = !!user
      } else {
        const users = await listUsersByNick(nick)
        exists = users.length > 0
      }
    } catch {
      exists = false
    }

    return NextResponse.json({ ok: true, exists })
  } catch {
    return NextResponse.json(buildError('Erreur serveur', { code: 'SERVER_ERROR' }), { status: 500 })
  }
}
