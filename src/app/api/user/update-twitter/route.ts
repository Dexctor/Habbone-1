import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/auth'
import { checkRateLimit } from '@/server/rate-limit'
import { updateUserTwitter } from '@/server/pocketbase/users'

// Twitter/X handles: 1-15 chars, alphanumeric + underscore. We accept empty string
// (to clear) and also tolerate a leading "@" or a full URL — we normalize before saving.
const BodySchema = z.object({
  twitter: z.string().max(120, 'Pseudo Twitter trop long').nullable(),
})

function normalizeHandle(input: string | null): string | null {
  if (input == null) return null
  let value = input.trim()
  if (!value) return null

  // Strip full URL prefixes if the user pasted one.
  value = value.replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i, '')
  // Strip leading @
  value = value.replace(/^@+/, '')
  // Strip trailing slashes / query strings (in case URL was malformed)
  value = value.split(/[/?#]/)[0]

  if (!value) return null
  return value
}

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/

export async function POST(req: Request) {
  const rl = await checkRateLimit(req, { key: 'user:update-twitter', limit: 10, windowMs: 60 * 1000 })
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

  const handle = normalizeHandle(parsed.data.twitter)
  if (handle !== null && !HANDLE_RE.test(handle)) {
    return NextResponse.json(
      { error: 'Pseudo Twitter invalide (1-15 caracteres, lettres/chiffres/underscore uniquement)' },
      { status: 400 },
    )
  }

  try {
    await updateUserTwitter(userId, handle)
    // The /team page reads this field, so invalidate its cache.
    revalidatePath('/team')
    return NextResponse.json({ ok: true, twitter: handle })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
