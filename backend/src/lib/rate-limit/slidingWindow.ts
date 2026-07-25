import { redis } from "../../config/redis";

interface SlidingWindowOptions {
  key: string;
  window: number; // seconds
  limit: number;
}

interface SlidingWindowResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

export const slidingWindow = async ({
  key,
  window,
  limit,
}: SlidingWindowOptions): Promise<SlidingWindowResult> => {
  const now = Date.now();
  const windowStart = now - window * 1000;

  // Remove expired requests
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count requests in current window
  const count = await redis.zcard(key);

  // Limit exceeded
  if (count >= limit) {
    const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");

    let reset = window;

    if (oldest.length >= 2) {
      const oldestTimestamp = Number(oldest[1]);
      const calculatedReset = Math.ceil((oldestTimestamp + window * 1000 - now) / 1000);
      reset = calculatedReset > 0 ? calculatedReset : window;
    }

    return {
      allowed: false,
      remaining: 0,
      reset,
    };
  }

  // Add current request with a unique member to prevent overwrites when timestamp is identical
  const uniqueMember = `${now}-${Math.random().toString(36).substring(2, 9)}`;
  await redis.zadd(key, now, uniqueMember);

  // Auto delete when inactive
  await redis.expire(key, window);

  return {
    allowed: true,
    remaining: Math.max(0, limit - count - 1),
    reset: window,
  };
};