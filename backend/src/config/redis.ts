import Redis, { RedisOptions } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6380";

export const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Main application client (caching, rate limiting, matchmaking, leaderboards, OTP)
export const redis = new Redis(redisUrl, redisOptions);

// Dedicated connection factory for BullMQ Queues and Workers
export const createBullRedisConnection = (): Redis => {
  return new Redis(redisUrl, {
    ...redisOptions,
    maxRetriesPerRequest: null,
  });
};

