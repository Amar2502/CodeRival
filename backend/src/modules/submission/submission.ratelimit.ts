import { createRateLimiter, getUserOrIpKey } from "../../lib/rate-limit";

// Rate limiters for code execution and submission

// 1. Run Code: 10 executions per minute per user/IP
export const runCodeLimiter = createRateLimiter({
  window: 60, // 1 minute
  limit: 10,
  type: "submission:run",
  keyGenerator: getUserOrIpKey,
  message: "Rate limit exceeded for code execution. Please wait a minute before running again.",
});

// 2. Submit Code: 5 submissions per minute per user/IP
export const submitCodeLimiter = createRateLimiter({
  window: 60, // 1 minute
  limit: 5,
  type: "submission:submit",
  keyGenerator: getUserOrIpKey,
  message: "Rate limit exceeded for code submission. Please wait a minute before submitting again.",
});
