import { Router, Request, Response } from "express";
import { db } from "../../config/db";
import { redis } from "../../config/redis";

const router = Router();

/**
 * GET /health
 * Liveness probe — confirms the process is running.
 * Always returns 200 if the server can handle HTTP requests.
 */
router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ready
 * Readiness probe — verifies that PostgreSQL and Redis are reachable.
 * Returns 200 if all dependencies are healthy, 503 otherwise.
 */
router.get("/ready", async (_req: Request, res: Response) => {
  const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; error?: string }> = {};

  // PostgreSQL check
  const pgStart = Date.now();
  try {
    await db.$queryRawUnsafe("SELECT 1");
    checks.postgres = { status: "ok", latencyMs: Date.now() - pgStart };
  } catch (err) {
    checks.postgres = {
      status: "error",
      latencyMs: Date.now() - pgStart,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Redis check
  const redisStart = Date.now();
  try {
    const pong = await redis.ping();
    checks.redis = {
      status: pong === "PONG" ? "ok" : "error",
      latencyMs: Date.now() - redisStart,
    };
  } catch (err) {
    checks.redis = {
      status: "error",
      latencyMs: Date.now() - redisStart,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === "ok");

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
