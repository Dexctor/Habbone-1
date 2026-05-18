import 'server-only';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';

const REDIS_URL = (process.env.REDIS_URL || '').trim();

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!REDIS_URL) return null;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRedisLock<T>(
  key: string,
  ttlMs: number,
  task: () => Promise<T>,
  options?: { waitMs?: number; retryMs?: number },
): Promise<T> {
  const r = getRedis();
  if (!r) return task();

  const token = randomUUID();
  const lockKey = `lock:${key}`;
  const waitUntil = Date.now() + Math.max(0, options?.waitMs ?? 5000);
  const retryMs = Math.max(10, options?.retryMs ?? 50);

  let locked = false;
  try {
    while (Date.now() <= waitUntil) {
      const result = await r.set(lockKey, token, 'PX', Math.max(1000, ttlMs), 'NX');
      if (result === 'OK') {
        locked = true;
        break;
      }
      await sleep(retryMs);
    }

    if (!locked) {
      throw new Error('REDIS_LOCK_TIMEOUT');
    }

    return await task();
  } catch (error) {
    if (!locked && error instanceof Error && error.message !== 'REDIS_LOCK_TIMEOUT') {
      return task();
    }
    throw error;
  } finally {
    if (locked) {
      try {
        await r.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
          1,
          lockKey,
          token,
        );
      } catch {}
    }
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
