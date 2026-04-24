type CacheEntry<T> = {
  value?: T
  expiresAt: number
  inflight?: Promise<T>
}

const store = new Map<string, CacheEntry<any>>()

/** Invalidate a cache entry so the next cachedValue call refetches. */
export function invalidateCache(key: string): void {
  store.delete(key)
}

export async function cachedValue<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const existing = store.get(key) as CacheEntry<T> | undefined
  if (existing?.value !== undefined && existing.expiresAt > now) return existing.value
  if (existing?.inflight) return existing.inflight

  const entry: CacheEntry<T> = existing || { expiresAt: 0 }
  const pending = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      entry.value = value
      entry.expiresAt = now + Math.max(0, ttlMs)
      entry.inflight = undefined
      store.set(key, entry)
      return value
    })
    .catch((err) => {
      entry.inflight = undefined
      store.set(key, entry)
      throw err
    })

  entry.inflight = pending
  store.set(key, entry)
  return pending
}
