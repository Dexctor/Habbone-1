type HabboAssetsPayload = Record<string, unknown>

type HabboAssetsCacheEntry = {
  payload: HabboAssetsPayload
  expiresAt: number
  updatedAt: number
}

const DEFAULT_TTL_MS = 15 * 60 * 1000

const globalCache = globalThis as typeof globalThis & {
  __habboneHabboAssetsCache?: Map<string, HabboAssetsCacheEntry>
}

function getCache() {
  if (!globalCache.__habboneHabboAssetsCache) {
    globalCache.__habboneHabboAssetsCache = new Map<string, HabboAssetsCacheEntry>()
  }

  return globalCache.__habboneHabboAssetsCache
}

export function readHabboAssetsCache<T extends HabboAssetsPayload>(
  key: string,
  options: { allowStale?: boolean } = {},
): { payload: T; stale: boolean } | null {
  const entry = getCache().get(key)
  if (!entry) return null

  const stale = Date.now() > entry.expiresAt
  if (stale && !options.allowStale) return null

  return {
    payload: entry.payload as T,
    stale,
  }
}

export function writeHabboAssetsCache<T extends HabboAssetsPayload>(
  key: string,
  payload: T,
  ttlMs = DEFAULT_TTL_MS,
) {
  const now = Date.now()

  getCache().set(key, {
    payload,
    expiresAt: now + ttlMs,
    updatedAt: now,
  })
}
