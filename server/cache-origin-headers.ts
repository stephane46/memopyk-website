import { Response } from 'express';

export interface CacheOriginInfo {
  isHit: boolean;
  origin: 'local' | 'supabase' | 'other';
  totalBytes?: number;
}

/**
 * Sets consistent cache and origin headers for all proxy responses
 */
export function setCacheAndOriginHeaders(res: Response, info: CacheOriginInfo) {
  // Cache status
  res.setHeader('X-Cache-Status', info.isHit ? 'HIT' : 'MISS');
  
  // Origin: 'local', 'supabase', or 'other'
  res.setHeader('X-Origin', info.origin);
  
  // Optional: total size for dashboard display
  if (typeof info.totalBytes === 'number') {
    res.setHeader('X-Content-Bytes', info.totalBytes.toString());
  }
}