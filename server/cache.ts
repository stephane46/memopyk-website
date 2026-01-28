/**
 * Cache utilities for media routes
 *
 * Provides environment info, database client access, and cache cleanup
 * for the video/media caching system.
 */

import { pool } from "./db";

export function getCacheEnvironmentInfo() {
  return {
    environment: process.env.NODE_ENV || "development",
    cacheEnabled: true,
    databaseUrl: process.env.DATABASE_URL ? "configured" : "missing",
  };
}

export function getPgClient() {
  return pool;
}

export async function manualCacheCleanup(): Promise<{
  error?: string;
  deleted: number;
}> {
  try {
    // Placeholder — implement cache eviction logic as needed
    return { deleted: 0 };
  } catch (err: any) {
    return { error: err.message, deleted: 0 };
  }
}
