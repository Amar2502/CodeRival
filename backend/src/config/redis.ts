import Redis, { RedisOptions } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6380";

export const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redis = new Redis(redisUrl, redisOptions);

