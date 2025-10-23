// Shared geolocation resolver with caching and rate limiting
import fetch from 'node-fetch';

interface GeoData {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  region: string | null;
  regionCode: string | null;
  ts: number;
  source: string;
}

interface RateLimitState {
  requests: number;
  windowStart: number;
}

class GeoResolver {
  private cache = new Map<string, GeoData>();
  private rateLimit: RateLimitState = { requests: 0, windowStart: Date.now() };
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly RATE_LIMIT = 5; // Max 5 new IP lookups per minute
  private readonly RATE_WINDOW = 60 * 1000; // 1 minute

  /**
   * Extract client IP from request headers with robust fallback
   */
  extractClientIP(req: any): string | null {
    // Priority order for IP extraction
    const headers = [
      'x-forwarded-for',
      'cf-connecting-ip', 
      'x-real-ip'
    ];

    for (const header of headers) {
      const value = req.headers[header];
      if (value) {
        // Handle comma-separated IPs (take first one)
        const ip = Array.isArray(value) ? value[0] : value.toString();
        const firstIP = ip.split(',')[0].trim();
        if (firstIP && this.isValidIP(firstIP)) {
          return firstIP;
        }
      }
    }

    // Fallback to req.ip
    if (req.ip && this.isValidIP(req.ip)) {
      return req.ip;
    }

    return null;
  }

  /**
   * Basic IP validation
   */
  private isValidIP(ip: string): boolean {
    // Basic IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
    }
    // Could add IPv6 validation here if needed
    return false;
  }

  /**
   * Check rate limit (max 5 new lookups per minute)
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    
    // Reset window if expired
    if (now - this.rateLimit.windowStart > this.RATE_WINDOW) {
      this.rateLimit = { requests: 0, windowStart: now };
    }

    return this.rateLimit.requests < this.RATE_LIMIT;
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [ip, data] of this.cache.entries()) {
      if (now - data.ts > this.CACHE_TTL) {
        this.cache.delete(ip);
      }
    }
  }

  /**
   * Get geolocation data for IP with caching and rate limiting
   */
  async get(ip: string): Promise<GeoData | null> {
    if (!ip || !this.isValidIP(ip)) {
      return null;
    }

    // Clean expired entries periodically
    if (Math.random() < 0.1) { // 10% chance on each call
      this.cleanCache();
    }

    // Check cache first
    const cached = this.cache.get(ip);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached;
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      console.warn(`🚫 GeoResolver: Rate limit exceeded, returning cached data for ${ip}`);
      return cached || null;
    }

    try {
      // Increment rate limit counter
      this.rateLimit.requests++;

      console.log(`🌍 GeoResolver: Fetching location for ${ip} using ipapi.co`);
      
      const response = await fetch(`http://ipapi.co/${ip}/json/`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'MEMOPYK-Analytics/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as any;

      // Handle API errors
      if (data.error) {
        throw new Error(data.reason || 'API error');
      }

      const geoData: GeoData = {
        country: data.country_name || null,
        countryCode: data.country_code || null,
        city: data.city || null,
        region: data.region || null,
        regionCode: data.region_code || null,
        ts: Date.now(),
        source: 'ipapi'
      };

      // Cache the result
      this.cache.set(ip, geoData);

      console.log(`✅ GeoResolver: ${ip} → ${geoData.city}, ${geoData.country}`);
      
      return geoData;

    } catch (error) {
      console.warn(`⚠️ GeoResolver: Failed to fetch location for ${ip}:`, error instanceof Error ? error.message : error);
      
      // Return cached data if available, otherwise null
      return cached || null;
    }
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      rateLimitRemaining: this.RATE_LIMIT - this.rateLimit.requests,
      windowTimeLeft: Math.max(0, this.RATE_WINDOW - (Date.now() - this.rateLimit.windowStart))
    };
  }
}

// Export singleton instance
export const geoResolver = new GeoResolver();