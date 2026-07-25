import { Request } from "express";

/**
 * Extracts client IP address safely considering reverse proxies.
 */
export const getIpKey = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = String(forwarded).split(",");
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown-ip";
};

/**
 * Uses authenticated user ID if present, otherwise falls back to client IP.
 */
export const getUserOrIpKey = (req: Request): string => {
  if (req.user && req.user.userId) {
    return `user:${req.user.userId}`;
  }
  return `ip:${getIpKey(req)}`;
};

/**
 * Uses email from body (or req.user) if present combined with IP, or just IP.
 */
export const getEmailOrIpKey = (req: Request): string => {
  const email = req.body?.email || req.user?.email;
  const ip = getIpKey(req);
  if (email && typeof email === "string") {
    return `email:${email.toLowerCase().trim()}:ip:${ip}`;
  }
  return `ip:${ip}`;
};
