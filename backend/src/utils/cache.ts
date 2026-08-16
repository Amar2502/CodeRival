import { redis } from "../config/redis";

/**
 * Get cached data from Redis or fetch fresh data and cache it.
 * Gracefully falls back to fetcher if Redis is unavailable.
 */
export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.error(`Cache read error for key "${key}":`, err);
  }

  const fresh = await fetcher();

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(fresh));
  } catch (err) {
    console.error(`Cache write error for key "${key}":`, err);
  }

  return fresh;
}

/**
 * Invalidate cache keys matching given glob patterns.
 * Uses SCAN (cursor-based) instead of KEYS for production safety.
 */
export async function invalidateCache(...patterns: string[]): Promise<void> {
  for (const pattern of patterns) {
    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch (err) {
      console.error(`Cache invalidation error for pattern "${pattern}":`, err);
    }
  }
}
