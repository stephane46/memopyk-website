/**
 * Cache Headers Middleware
 *
 * Sets Cache-Control (and related) response headers.
 * Use the presets on route groups, or the factory for custom values.
 *
 * Presets align with actual usage in routes:
 *   cacheStatic     — images, videos served from disk  (24 h browser, 7 d CDN)
 *   cacheSemiStatic — gallery/hero JSON responses      ( 1 h browser, 4 h CDN)
 *   cacheShort      — admin dashboard / private data   ( 1 min, private)
 *   noCache         — blog, auth, mutations            (no-store)
 */

import type { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface CacheHeaderOptions {
  /** Browser max-age in seconds. */
  maxAge: number;
  /** CDN / shared-cache max-age (s-maxage). */
  sMaxAge?: number;
  /** stale-while-revalidate window in seconds. */
  stale?: number;
  /** Mark response as private (omits s-maxage). */
  private?: boolean;
  /** Completely prevent caching (overrides everything else). */
  noStore?: boolean;
}

/**
 * Returns Express middleware that sets Cache-Control headers.
 *
 * @example
 *   router.use("/api/static", setCacheHeaders({ maxAge: 900, sMaxAge: 3600 }));
 */
export function setCacheHeaders(opts: CacheHeaderOptions) {
  // Pre-compute the header value once at startup.
  const value = buildCacheControl(opts);

  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("Cache-Control", value);
    if (opts.noStore) res.setHeader("Pragma", "no-cache");
    next();
  };
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** Static media assets — 24 h browser, 7 d CDN, 1 h stale grace. */
export const cacheStatic = setCacheHeaders({
  maxAge: 86_400,
  sMaxAge: 604_800,
  stale: 3_600,
});

/** Gallery / hero JSON — 1 h browser, 4 h CDN, 10 min stale grace. */
export const cacheSemiStatic = setCacheHeaders({
  maxAge: 3_600,
  sMaxAge: 14_400,
  stale: 600,
});

/** Dashboard / private data — 1 min, private (no CDN). */
export const cacheShort = setCacheHeaders({
  maxAge: 60,
  private: true,
});

/** Dynamic / authenticated / mutating — never cache. */
export const noCache = setCacheHeaders({
  maxAge: 0,
  noStore: true,
  private: true,
});

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function buildCacheControl(opts: CacheHeaderOptions): string {
  if (opts.noStore) {
    return "no-store, no-cache, must-revalidate, private";
  }

  const parts: string[] = [];
  parts.push(opts.private ? "private" : "public");
  parts.push(`max-age=${opts.maxAge}`);
  if (!opts.private && opts.sMaxAge !== undefined) {
    parts.push(`s-maxage=${opts.sMaxAge}`);
  }
  if (opts.stale !== undefined) {
    parts.push(`stale-while-revalidate=${opts.stale}`);
  }
  return parts.join(", ");
}
