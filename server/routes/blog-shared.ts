/**
 * Blog Shared Utilities
 *
 * Common utilities shared across blog route modules.
 */

import { Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client (lazy loaded)
let supabase: SupabaseClient | null = null;

export function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabase;
}

// Color palette for auto-assigning tag colors
export const TAG_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#a855f7', // violet
  '#f97316', // orange
  '#84cc16', // lime
];

// Hash function to deterministically assign colors
export function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// Set no-cache headers helper
export function setNoCacheHeaders(res: Response) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

// =============================================================================
// IN-MEMORY BLOG CACHE (5-minute TTL)
// =============================================================================

const BLOG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

const blogCacheMap = new Map<string, CacheEntry>();

/** Get a cached value if fresh, or null if stale/missing. */
export function blogCacheGet(key: string): any | null {
  const entry = blogCacheMap.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > BLOG_CACHE_TTL) {
    blogCacheMap.delete(key);
    return null;
  }
  return entry.data;
}

/** Store a value in the blog cache. */
export function blogCacheSet(key: string, data: any): void {
  blogCacheMap.set(key, { data, timestamp: Date.now() });
}

/** Clear all entries in the blog cache (call on admin mutations). */
export function blogCacheClear(): void {
  blogCacheMap.clear();
}
