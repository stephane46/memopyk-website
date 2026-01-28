// Performance thresholds for different test types
export const TIME_THRESHOLDS = {
  hero: { good: 100, fair: 250 },  // ms - 1KB range request
  image: { good: 150, fair: 300 }, // ms - 50KB full image 
  api: { good: 50, fair: 200 },    // ms - JSON metadata
} as const;

export type PerfType = keyof typeof TIME_THRESHOLDS;

export function getTimeStatus(type: PerfType, ms: number) {
  const t = TIME_THRESHOLDS[type];
  if (ms <= t.good) return { label: "Good", pill: "good" };
  if (ms <= t.fair) return { label: "Fair", pill: "fair" };
  return { label: "Poor", pill: "poor" };
}

// Header-based detection utilities
export function detectSourceFromHeaders(res: Response) {
  const cache = res.headers.get('X-Cache-Status');   // HIT / MISS
  const origin = res.headers.get('X-Origin');         // supabase / vps-local / other
  const source = res.headers.get('X-Data-Source');    // memory / db / upstream
  return { cache, origin, source };
}

export function humanBytes(n?: number | null) {
  if (!n) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let u = 0, v = Number(n);
  while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
  return `${v.toFixed(v < 10 && u > 0 ? 1 : 0)} ${units[u]}`;
}

export function getPayloadSize(res: Response): number | null {
  const len = res.headers.get('content-length');
  const xlen = res.headers.get('X-Content-Bytes');
  const bytes = Number(xlen ?? len);
  return Number.isFinite(bytes) ? bytes : null;
}