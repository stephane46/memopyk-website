/**
 * Security Middleware
 *
 * Rate limiting, CORS, and CSRF helpers.
 *
 * CSP headers are configured separately in app.ts (deployment-specific).
 * Helmet is available in package.json but not currently used — enable it
 * in app.ts if you want the full set of security headers.
 *
 * Usage:
 *   import { rateLimit, strictRateLimit, corsMiddleware, verifyCsrf }
 *     from '../middleware/security.middleware';
 *
 *   router.post('/contact', strictRateLimit, handler);
 */

import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Rate Limiting (in-memory, per-IP, sliding window)
// ---------------------------------------------------------------------------

const buckets = new Map<string, { count: number; ts: number }>();

function clientIP(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (xff) {
    const raw = Array.isArray(xff) ? xff[0] : xff;
    return raw.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

/**
 * Factory: returns middleware that allows `maxPerMin` requests per IP per minute.
 */
export function rateLimit(maxPerMin = 60) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = clientIP(req);
    const now = Date.now();
    const entry = buckets.get(key) ?? { count: 0, ts: now };

    if (now - entry.ts > 60_000) {
      entry.count = 0;
      entry.ts = now;
    }

    entry.count++;
    buckets.set(key, entry);

    if (entry.count > maxPerMin) {
      res.status(429).json({ ok: false, error: "rate_limited" });
      return;
    }
    next();
  };
}

/** General API rate limit — 60 req/min per IP. */
export const apiRateLimit = rateLimit(60);

/** Strict rate limit for sensitive endpoints — 10 req/min per IP. */
export const strictRateLimit = rateLimit(10);

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set([
  "https://memopyk.com",
  "https://www.memopyk.com",
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:5173", "http://localhost:5000"]
    : []),
]);

/**
 * Simple CORS middleware.
 * Passes requests from allowed origins; blocks others with no CORS headers.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-api-key,x-csrf-token");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// CSRF (double-submit cookie pattern)
// ---------------------------------------------------------------------------

/**
 * Verify CSRF token: the `csrfToken` cookie must match
 * either `req.body.csrfToken` or the `x-csrf-token` header.
 */
export function verifyCsrf(req: Request): boolean {
  const cookie = (req as any).cookies?.csrfToken;
  const token = req.body?.csrfToken ?? req.headers["x-csrf-token"];
  return typeof cookie === "string" && cookie.length > 8 && cookie === token;
}
