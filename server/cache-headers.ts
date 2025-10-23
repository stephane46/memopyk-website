import { Response } from 'express';

// Cache header utility for consistent header setting across all endpoints
export function setCacheHeaders(res: Response, {
  hit,
  source,
  origin,
  bytes
}: {
  hit: boolean;
  source?: 'memory' | 'disk' | 'db' | 'upstream';
  origin?: 'supabase' | 'vps-local' | 'other';
  bytes?: number;
}) {
  res.setHeader('X-Cache-Status', hit ? 'HIT' : 'MISS');
  if (source) res.setHeader('X-Data-Source', source);
  if (origin) res.setHeader('X-Origin', origin);
  if (bytes != null) res.setHeader('X-Content-Bytes', String(bytes));
}