/**
 * Auth Middleware
 *
 * Current state: MEMOPYK admin routes use a shared secret token
 * passed via the Authorization header (Bearer <token>).
 * The token is read from the ADMIN_SECRET env var.
 *
 * TODO: Replace with a proper auth strategy (Supabase Auth, JWT, or session)
 *       once the admin dashboard has a login flow.
 *
 * Usage:
 *   import { requireAdmin } from '../middleware/auth.middleware';
 *   router.post('/admin/seo', requireAdmin, handler);
 */

import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthenticatedRequest extends Request {
  /** Set by requireAdmin when the token is valid. */
  adminUser?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Require a valid admin Bearer token.
 *
 * Expects: `Authorization: Bearer <ADMIN_SECRET>`
 *
 * If ADMIN_SECRET is not configured the middleware rejects all requests
 * with 503 so that admin endpoints are never silently open.
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!ADMIN_SECRET) {
    res.status(503).json({ error: "Admin auth not configured" });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.slice(7); // strip "Bearer "
  if (token !== ADMIN_SECRET) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.adminUser = "admin";
  next();
}

/**
 * Validate an API key sent via `x-api-key` header.
 *
 * Reads the expected key from the given env var name.
 * Returns 401 if missing/invalid, or calls next() on match.
 */
export function validateApiKey(envVarName: string) {
  const expected = process.env[envVarName] || "";

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!expected) {
      res.status(503).json({ error: "API key not configured" });
      return;
    }

    const key = req.headers["x-api-key"];
    if (!key || key !== expected) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    next();
  };
}
