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

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local uniqueMember = ARGV[4]

local windowStart = now - (window * 1000)

-- 1. Remove expired requests outside the current sliding window
redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

-- 2. Count current active requests
local count = redis.call('ZCARD', key)

if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local reset = window
  if #oldest >= 2 then
    local oldestTimestamp = tonumber(oldest[2])
    local calculatedReset = math.ceil((oldestTimestamp + (window * 1000) - now) / 1000)
    if calculatedReset > 0 then
      reset = calculatedReset
    end
  end
  return { 0, 0, reset }
else
  -- 3. Add current request and set TTL
  redis.call('ZADD', key, now, uniqueMember)
  redis.call('EXPIRE', key, window)
  local remaining = limit - count - 1
  if remaining < 0 then remaining = 0 end
  return { 1, remaining, window }
end
`;

export const slidingWindow = async ({
  key,
  window,
  limit,
}: SlidingWindowOptions): Promise<SlidingWindowResult> => {
  const now = Date.now();
  const uniqueMember = `${now}-${Math.random().toString(36).substring(2, 9)}`;

  // Single network round-trip executing atomic Lua script inside Redis
  const result = (await redis.eval(
    SLIDING_WINDOW_LUA,
    1,
    key,
    now,
    window,
    limit,
    uniqueMember
  )) as [number, number, number];

  const allowed = result[0] === 1;
  const remaining = Number(result[1]);
  const reset = Number(result[2]);

  return {
    allowed,
    remaining,
    reset,
  };
};