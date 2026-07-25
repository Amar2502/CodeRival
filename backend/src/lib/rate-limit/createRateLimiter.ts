// createRateLimiter.ts

import { Request, Response, NextFunction } from "express";
import { slidingWindow } from "./slidingWindow";

export interface RateLimiterOptions {
  window: number; // seconds
  limit: number;
  type: string;
  keyGenerator: (req: Request) => string;
  message?: string;
}

export const createRateLimiter = ({
  window,
  limit,
  type,
  keyGenerator,
  message,
}: RateLimiterOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rate-limit:${type}:${keyGenerator(req)}`;

      const result = await slidingWindow({
        key,
        window,
        limit,
      });

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", result.remaining);
      res.setHeader("X-RateLimit-Reset", result.reset);

      if (!result.allowed) {
        res.setHeader("Retry-After", result.reset);
        return res.status(429).json({
          success: false,
          message: message || "Too many requests.",
          retryAfter: result.reset,
        });
      }

      next();
    } catch (error) {
      console.error(`Rate limiter error [${type}]:`, error);
      // Fallback: allow request to proceed if Redis rate limiter fails
      next();
    }
  };
};