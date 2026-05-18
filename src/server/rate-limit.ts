import 'server-only'
import { getRedis } from '@/server/redis'

type Entry = { count: number; resetAt: number }

const DEFAULT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const DEFAULT_LIMIT = 10
const MAX_STORE_SIZE = 10_000
const CLEANUP_INTERVAL_MS = 60 * 1000 // 1 minute

function now() { return Date.now() }

function getStore() {
  const g = globalThis as any
  if (!g.__rateLimitStore) {
    g.__rateLimitStore = new Map<string, Entry>()
    g.__rateLimitCleanup = setInterval(() => {
      const store = g.__rateLimitStore as Map<string, Entry>
      const nowMs = now()
      for (const [key, entry] of store) {
        if (entry.resetAt <= nowMs) store.delete(key)
      }
    }, CLEANUP_INTERVAL_MS)
    if (g.__rateLimitCleanup?.unref) g.__rateLimitCleanup.unref()
  }
  return g.__rateLimitStore as Map<string, Entry>
}

export function getClientIdentifier(req: Request): string {
  try {
    const h = req.headers
    const xff = h.get('x-forwarded-for') || ''
    if (xff) {
      const ip = xff.split(',')[0].trim()
      if (ip) return ip
    }
    const real = h.get('x-real-ip') || h.get('cf-connecting-ip') || ''
    if (real) return real.trim()
  } catch {}
  return 'anon'
}

function buildHeaders(limit: number, remaining: number, resetAt: number, retryAfterSeconds?: number) {
  const headers = new Headers()
  if (retryAfterSeconds != null) headers.set('Retry-After', String(retryAfterSeconds))
  headers.set('X-RateLimit-Limit', String(limit))
  headers.set('X-RateLimit-Remaining', String(Math.max(0, remaining)))
  headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))
  return headers
}

function checkLocalRateLimit(
  req: Request,
  opts: { key: string; limit?: number; windowMs?: number }
) {
  if (String(process.env.RATE_LIMIT_DISABLED || '').toLowerCase() === 'true') {
    const headers = new Headers()
    headers.set('X-RateLimit-Bypass', 'true')
    return { ok: true as const, headers }
  }
  const windowMs = Math.max(1000, opts.windowMs ?? DEFAULT_WINDOW_MS)
  const limit = Math.max(1, opts.limit ?? DEFAULT_LIMIT)
  const id = `${opts.key}:${getClientIdentifier(req)}`

  const store = getStore()

  // Evict oldest entries if store grows too large (memory safety)
  if (store.size > MAX_STORE_SIZE) {
    const nowMs = now()
    for (const [key, entry] of store) {
      if (entry.resetAt <= nowMs) store.delete(key)
      if (store.size <= MAX_STORE_SIZE * 0.8) break
    }
  }

  const nowMs = now()
  let entry = store.get(id)
  if (!entry || entry.resetAt <= nowMs) {
    entry = { count: 0, resetAt: nowMs + windowMs }
    store.set(id, entry)
  }
  const remainingBefore = Math.max(0, limit - entry.count)
  if (remainingBefore <= 0) {
    const headers = buildHeaders(limit, 0, entry.resetAt, Math.ceil((entry.resetAt - nowMs) / 1000))
    return { ok: false as const, headers }
  }

  entry.count += 1
  const headers = buildHeaders(limit, limit - entry.count, entry.resetAt)
  return { ok: true as const, headers }
}

export async function checkRateLimit(
  req: Request,
  opts: { key: string; limit?: number; windowMs?: number }
) {
  if (String(process.env.RATE_LIMIT_DISABLED || '').toLowerCase() === 'true') {
    const headers = new Headers()
    headers.set('X-RateLimit-Bypass', 'true')
    return { ok: true as const, headers }
  }

  const windowMs = Math.max(1000, opts.windowMs ?? DEFAULT_WINDOW_MS)
  const limit = Math.max(1, opts.limit ?? DEFAULT_LIMIT)
  const resetAt = Date.now() + windowMs
  const id = `${opts.key}:${getClientIdentifier(req)}`
  const redisKey = `rl:${id}`
  const r = getRedis()

  if (!r) return checkLocalRateLimit(req, opts)

  try {
    const count = await r.incr(redisKey)
    let ttl = await r.pttl(redisKey)
    if (count === 1 || ttl < 0) {
      await r.pexpire(redisKey, windowMs)
      ttl = windowMs
    }
    const redisResetAt = Date.now() + Math.max(0, ttl)

    if (count > limit) {
      return {
        ok: false as const,
        headers: buildHeaders(limit, 0, redisResetAt, Math.ceil(Math.max(0, ttl) / 1000)),
      }
    }

    return {
      ok: true as const,
      headers: buildHeaders(limit, limit - count, redisResetAt),
    }
  } catch {
    return checkLocalRateLimit(req, opts)
  }
}
