/**
 * CamelCase Response Middleware
 *
 * Automatically converts all snake_case keys in API JSON responses to camelCase.
 * This ensures consistent camelCase naming across all API endpoints, regardless
 * of whether the data comes from Drizzle (already camelCase) or Supabase (snake_case).
 *
 * Applied to /api routes in app.ts.
 */

import type { Request, Response, NextFunction } from 'express';

/** Convert a single snake_case key to camelCase */
function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Recursively convert all object keys from snake_case to camelCase */
function deepMapToCamelCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepMapToCamelCase);
  if (obj instanceof Date) return obj;
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = deepMapToCamelCase(value);
    }
    return result;
  }
  return obj;
}

/**
 * Express middleware that intercepts res.json() to convert all response
 * keys from snake_case to camelCase. Idempotent on already-camelCase keys.
 */
export function camelCaseResponses(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    return originalJson(deepMapToCamelCase(body));
  } as typeof res.json;
  next();
}
