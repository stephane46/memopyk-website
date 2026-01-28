/**
 * Request Logger Middleware
 *
 * Logs API requests on response finish.
 *
 * Format:
 *   [2026-01-26T22:30:00Z] GET /api/health 200 12ms
 *   [2026-01-26T22:30:01Z] POST /api/partners/intake 400 8ms ?lang=fr
 *
 * Production: method, path, status, duration.
 * Development: adds query string when present.
 *
 * Usage (in app.ts):
 *   import { requestLogger } from './middleware/logger.middleware';
 *   app.use(requestLogger);
 */

import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const isProd = process.env.NODE_ENV === "production";

/** Paths that are never logged (noisy / health-check). */
const SKIP = new Set(["/favicon.ico", "/robots.txt", "/health", "/api/health"]);

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on("finish", () => {
    const p = req.path;
    if (!p.startsWith("/api") || SKIP.has(p)) return;

    const ms = Date.now() - start;
    const ts = new Date().toISOString();
    const status = res.statusCode;

    let line = `[${ts}] ${req.method} ${p} ${status} ${ms}ms`;

    // In dev, append query string for debugging
    if (!isProd) {
      const qs = req.originalUrl.split("?")[1];
      if (qs) line += ` ?${qs}`;
    }

    // Errors to stderr, everything else to stdout
    if (status >= 500) {
      console.error(line);
    } else {
      console.log(line);
    }
  });

  next();
}
