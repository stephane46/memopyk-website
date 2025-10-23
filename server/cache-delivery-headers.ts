/**
 * Cache Delivery Headers System v1.0.0
 * 
 * This system provides accurate cache hit/miss and upstream origin tracking
 * for the performance dashboard, replacing the misleading cache-origin system.
 * 
 * Headers:
 * - X-Delivery: HIT | MISS (was content served from cache or fetched now?)
 * - X-Upstream: supabase | local | other (where did content originally come from?)
 * - X-Storage: memory | disk | none (optional: where is cache stored?)
 * - X-Cache-Age: <seconds> (optional: how long cached?)
 */

export interface DeliveryHeaders {
  'X-Delivery': 'HIT' | 'MISS';
  'X-Upstream': 'supabase' | 'local' | 'other';
  'X-Storage'?: 'memory' | 'disk' | 'none';
  'X-Cache-Age'?: string;
}

/**
 * Creates headers for content served from cache
 */
export function createCacheHitHeaders(
  upstreamSource: 'supabase' | 'local' | 'other',
  cacheAgeSeconds?: number,
  storageType: 'memory' | 'disk' = 'disk'
): DeliveryHeaders {
  const headers: DeliveryHeaders = {
    'X-Delivery': 'HIT',
    'X-Upstream': upstreamSource,
    'X-Storage': storageType
  };

  if (cacheAgeSeconds !== undefined) {
    headers['X-Cache-Age'] = cacheAgeSeconds.toString();
  }

  return headers;
}

/**
 * Creates headers for content fetched directly (cache miss)
 */
export function createCacheMissHeaders(
  upstreamSource: 'supabase' | 'local' | 'other'
): DeliveryHeaders {
  return {
    'X-Delivery': 'MISS',
    'X-Upstream': upstreamSource,
    'X-Storage': 'none'
  };
}

/**
 * Determines upstream source from URL
 */
export function getUpstreamSource(url: string): 'supabase' | 'local' | 'other' {
  if (url.includes('supabase.memopyk.org') || url.includes('supabase.co')) {
    return 'supabase';
  }
  
  // Local files (relative paths or local server paths)
  if (url.startsWith('/') || url.startsWith('./') || url.includes('localhost')) {
    return 'local';
  }
  
  return 'other';
}

/**
 * Gets cache age in seconds from file stats
 */
export function getCacheAge(cacheFilePath: string): number | undefined {
  try {
    const fs = require('fs');
    const stats = fs.statSync(cacheFilePath);
    const ageMs = Date.now() - stats.mtime.getTime();
    return Math.floor(ageMs / 1000);
  } catch (error) {
    return undefined;
  }
}