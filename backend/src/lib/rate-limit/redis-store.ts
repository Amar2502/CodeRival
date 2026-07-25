import { redis } from "../../config/redis"; // Your Redis instance

export const redisStore = {
  async increment(key: string) {
    return redis.incr(key);
  },

  async expire(key: string, seconds: number) {
    return redis.expire(key, seconds);
  },

  async ttl(key: string) {
    return redis.ttl(key);
  },

  async get(key: string) {
    return redis.get(key);
  },

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      return redis.set(key, value, "EX", ttl);
    }

    return redis.set(key, value);
  },

  async delete(key: string) {
    return redis.del(key);
  },
};