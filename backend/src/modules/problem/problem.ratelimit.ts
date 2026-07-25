import { createRateLimiter, getUserOrIpKey } from "../../lib/rate-limit";

// Rate limiter for problem browsing/fetching APIs: 60 requests per minute
export const problemFetchLimiter = createRateLimiter({
  window: 60, // 1 minute
  limit: 60,
  type: "problem:fetch",
  keyGenerator: getUserOrIpKey,
  message: "Too many problem requests. Please slow down.",
});
