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
 * Directly delete specific cache keys in a single atomic Redis DEL command.
 */
export async function delCacheKeys(...keys: string[]): Promise<void> {
  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;
  try {
    await redis.del(...validKeys);
  } catch (err) {
    console.error("Cache key deletion error:", err);
  }
}

/**
 * Invalidate cache keys matching given glob patterns.
 * Uses direct DEL for exact keys, and cursor-based SCAN for wildcard patterns.
 */
export async function invalidateCache(...patterns: string[]): Promise<void> {
  for (const pattern of patterns) {
    try {
      // If the pattern has no wildcards, delete directly without SCAN
      if (!pattern.includes("*") && !pattern.includes("?") && !pattern.includes("[")) {
        await redis.del(pattern);
        continue;
      }

      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          250
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
