/**
 * Content Cache Service
 *
 * Simple in-memory cache with TTL support.
 * Replaces JSON file fallbacks from the Replit era.
 *
 * TTL categories:
 *   STATIC      (15 min) — FAQ, legal docs, CTA, SEO, country names
 *   SEMI_STATIC  (5 min) — gallery items, hero videos, partners
 *   SHORT        (1 min) — rare / near-realtime needs
 *
 * Dynamic content (contacts, blog, analytics) should NOT be cached.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class ContentCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /** Pre-defined TTL values in milliseconds */
  static TTL = {
    STATIC: 15 * 60 * 1000,      // 15 minutes
    SEMI_STATIC: 5 * 60 * 1000,  // 5 minutes
    SHORT: 1 * 60 * 1000,        // 1 minute
  } as const;

  /**
   * Retrieve a cached value.
   * Returns null if the key is missing or expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store a value with the given TTL (milliseconds).
   *
   * @example
   *   contentCache.set("faqs:all", rows, ContentCache.TTL.STATIC);
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /** Remove a single cache entry by exact key. */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Remove every entry whose key contains the given substring.
   *
   * @example
   *   contentCache.invalidatePattern("faqs:");  // clears faqs:all, faqs:section:3, etc.
   */
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /** Remove all cached entries. */
  clear(): void {
    this.cache.clear();
  }

  /** Current number of entries (useful for health checks / debugging). */
  get size(): number {
    return this.cache.size;
  }
}

/** Singleton instance — import this in route handlers. */
export const contentCache = new ContentCache();
