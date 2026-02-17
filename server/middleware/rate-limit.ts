/**
 * Rate Limiting Middleware
 *
 * In-memory rate limiter for preventing abuse.
 * Tracks requests per IP with configurable windows and limits.
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per IP in window
  globalMax: number;     // Max total requests across all IPs in window
  message: string;       // Error message for rate-limited requests
}

/**
 * Create a rate limiter middleware
 *
 * @param options - Rate limiter configuration
 * @returns Express middleware function
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests, globalMax, message } = options;

  // In-memory store: Map<IP, RateLimitEntry>
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every 10 minutes to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      if (now >= entry.resetAt) {
        store.delete(ip);
      }
    }
  }, 10 * 60 * 1000); // 10 minutes

  // Clean up interval on process exit
  process.on('SIGTERM', () => clearInterval(cleanupInterval));
  process.on('SIGINT', () => clearInterval(cleanupInterval));

  return (req: Request, res: Response, next: NextFunction) => {
    // Get client IP (handle proxies)
    const ip = req.ip ||
               req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
               req.socket.remoteAddress ||
               'unknown';

    const now = Date.now();

    // Get or create entry for this IP
    let entry = store.get(ip);

    if (!entry || now >= entry.resetAt) {
      // First request or window expired - create new entry
      entry = {
        count: 0,
        resetAt: now + windowMs
      };
      store.set(ip, entry);
    }

    // Increment request count
    entry.count++;

    // Calculate global request count
    const globalCount = Array.from(store.values())
      .filter(e => now < e.resetAt)
      .reduce((sum, e) => sum + e.count, 0);

    // Check per-IP limit
    if (entry.count > maxRequests) {
      console.warn(`[Rate Limit] IP ${ip} exceeded per-IP limit (${entry.count}/${maxRequests})`);
      return res.status(429).json({ error: message });
    }

    // Check global limit
    if (globalCount > globalMax) {
      console.warn(`[Rate Limit] Global limit exceeded (${globalCount}/${globalMax}) by IP ${ip}`);
      return res.status(429).json({ error: message });
    }

    // Request allowed
    next();
  };
}
