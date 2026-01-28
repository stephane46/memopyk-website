/**
 * Location Service
 *
 * IP extraction and geo-IP lookup with in-memory caching + rate limiting.
 * Uses ipapi.co free tier (1 000 req/day, no key required).
 *
 * Usage:
 *   import { locationService } from '../services/location.service';
 *
 *   const ip   = locationService.extractClientIP(req);
 *   const geo  = await locationService.lookup(ip);
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoData {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  regionCode: string | null;
  ts: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class LocationService {
  private cache = new Map<string, GeoData>();
  private rateLimitRequests = 0;
  private rateLimitWindowStart = Date.now();

  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h
  private readonly RATE_LIMIT = 5; // max new lookups per window
  private readonly RATE_WINDOW = 60 * 1000; // 1 min

  // -------------------------------------------------------------------------
  // IP extraction
  // -------------------------------------------------------------------------

  /** Extract client IP from request headers (x-forwarded-for → cf-connecting-ip → x-real-ip → req.ip). */
  extractClientIP(req: { headers: Record<string, any>; ip?: string }): string | null {
    for (const header of ["x-forwarded-for", "cf-connecting-ip", "x-real-ip"]) {
      const value = req.headers[header];
      if (!value) continue;
      const raw = Array.isArray(value) ? value[0] : String(value);
      const ip = raw.split(",")[0].trim();
      if (ip && this.isValidIPv4(ip)) return ip;
    }
    if (req.ip && this.isValidIPv4(req.ip)) return req.ip;
    return null;
  }

  // -------------------------------------------------------------------------
  // Geo-IP lookup
  // -------------------------------------------------------------------------

  /** Resolve IP to geo data. Returns cached data when available; null on failure. */
  async lookup(ip: string | null): Promise<GeoData | null> {
    if (!ip || !this.isValidIPv4(ip)) return null;

    // Probabilistic cache cleanup
    if (Math.random() < 0.1) this.evictExpired();

    const cached = this.cache.get(ip);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) return cached;

    if (!this.acquireRateSlot()) return cached ?? null;

    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`, {
        signal: AbortSignal.timeout(5_000),
        headers: { "User-Agent": "MEMOPYK/1.0" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const d = (await res.json()) as Record<string, any>;
      if (d.error) throw new Error(d.reason ?? "API error");

      const geo: GeoData = {
        country: d.country_name ?? null,
        countryCode: d.country_code ?? null,
        city: d.city ?? null,
        region: d.region ?? null,
        regionCode: d.region_code ?? null,
        ts: Date.now(),
      };
      this.cache.set(ip, geo);
      return geo;
    } catch {
      return cached ?? null;
    }
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      rateLimitRemaining: Math.max(0, this.RATE_LIMIT - this.rateLimitRequests),
    };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private isValidIPv4(ip: string): boolean {
    const parts = ip.split(".");
    return (
      parts.length === 4 &&
      parts.every((p) => {
        const n = Number(p);
        return Number.isInteger(n) && n >= 0 && n <= 255;
      })
    );
  }

  private acquireRateSlot(): boolean {
    const now = Date.now();
    if (now - this.rateLimitWindowStart > this.RATE_WINDOW) {
      this.rateLimitRequests = 0;
      this.rateLimitWindowStart = now;
    }
    if (this.rateLimitRequests >= this.RATE_LIMIT) return false;
    this.rateLimitRequests++;
    return true;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [ip, data] of this.cache) {
      if (now - data.ts > this.CACHE_TTL) this.cache.delete(ip);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const locationService = new LocationService();
export { LocationService };
