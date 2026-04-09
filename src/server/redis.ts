import 'server-only';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://37.59.101.4:6379';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 2000,
      lazyConnect: true,
      retryStrategy: (times) => (times > 2 ? null : Math.min(times * 500, 2000)),
    });
    redis.on('error', () => {}); // Suppress connection errors in logs
    void redis.connect().catch(() => {});
    return redis;
  } catch {
    return null;
  }
}

/**
 * Cache-aside pattern: try cache first, fallback to fetcher, store result.
 * Non-blocking: if Redis is down, fetcher runs directly (no cache).
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const r = getRedis();

  // Try cache
  if (r) {
    try {
      const raw = await r.get(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
  }

  // Cache miss or Redis down: run fetcher
  const result = await fetcher();

  // Store in cache (non-blocking, fire-and-forget)
  if (r) {
    try {
      void r.set(key, JSON.stringify(result), 'EX', ttlSeconds).catch(() => {});
    } catch {}
  }

  return result;
}

/**
 * Invalidate a cache key
 */
export async function invalidate(key: string): Promise<void> {
  const r = getRedis();
  if (r) {
    try { await r.del(key); } catch {}
  }
}

/**
 * Invalidate all keys matching a pattern (e.g., "habbo:*")
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    const keys = await r.keys(pattern);
    if (keys.length > 0) await r.del(...keys);
  } catch {}
}
