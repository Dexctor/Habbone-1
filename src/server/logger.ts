import 'server-only'

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

const SENSITIVE_KEYS = new Set([
  'password',
  'senha',
  'token',
  'secret',
  'verificationCode',
  'code',
  'habbo_verification_code',
  'NEXTAUTH_SECRET',
  'POCKETBASE_ADMIN_PASSWORD',
  'REDIS_URL',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) return value
  if (typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redact(v, seen))
  if (seen.has(value as object)) return '[Circular]'
  seen.add(value as object)
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) {
      if (k.toLowerCase().includes('token') || k.toLowerCase().includes('secret') || k.toLowerCase().includes('senha') || k.toLowerCase().includes('password')) {
        out[k] = '[REDACTED]'
      } else if (k.toLowerCase().includes('code')) {
        if (typeof v === 'string') {
          out[k] = v.length ? `[CODE:${v.length}]` : '[CODE]'
        } else {
          out[k] = '[CODE]'
        }
      } else {
        out[k] = '[REDACTED]'
      }
      continue
    }
    out[k] = redact(v, seen)
  }
  return out
}

function sanitize(payload?: Json): unknown {
  try {
    if (payload == null) return undefined
    if (isPlainObject(payload) || Array.isArray(payload)) return redact(payload)
    return payload
  } catch {
    return undefined
  }
}

export function info(message: string, meta?: Json) {
  try {
    // eslint-disable-next-line no-console
    console.info(message, sanitize(meta))
  } catch {}
}

export function warn(message: string, meta?: Json) {
  try {
    // eslint-disable-next-line no-console
    console.warn(message, sanitize(meta))
  } catch {}
}

export function error(message: string, meta?: Json) {
  try {
    // eslint-disable-next-line no-console
    console.error(message, sanitize(meta))
  } catch {}
}

