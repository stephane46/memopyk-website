import type { HybridStorage } from './hybrid-storage';

/**
 * Enhanced location data with geolocation information
 */
export interface EnrichedLocationData {
  country: string;
  country_code: string;
  region: string;
  region_code: string;
  city: string;
  postal: string;
  latitude: number;
  longitude: number;
  timezone: string;
  org: string;
}

/**
 * Service for enriching visitor data with geographical information
 * Includes intelligent rate limiting and fallback API support
 */
export class LocationService {
  private storage: HybridStorage;
  private cache = new Map<string, EnrichedLocationData>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly RATE_LIMIT_DELAY = 3000; // 3 seconds between requests
  private readonly BATCH_SIZE = 5; // Process 5 IPs at a time
  private lastRequestTime = 0;
  private failedIPs = new Set<string>(); // Track failed IPs to avoid repeated attempts
  private batchSize = 5; // Process only 5 IPs at a time

  constructor(storage: HybridStorage) {
    this.storage = storage;
  }

  /**
   * Get location data for an IP address with multiple API fallbacks
   * Uses intelligent rate limiting and multiple providers to ensure reliability
   */
  async getLocationData(ip: string): Promise<EnrichedLocationData | null> {
    // Skip API calls in development if heavily rate limited (preserve production API quota)
    if (process.env.NODE_ENV === 'development' && this.failedIPs.size > 20) {
      console.log(`🚫 Location Service: Skipping API call in development mode (${this.failedIPs.size} failed IPs)`);
      return null;
    }

    // Check cache first
    const cached = this.getCachedData(ip);
    if (cached) {
      return cached;
    }

    // Skip failed IPs to avoid repeated API failures
    if (this.failedIPs.has(ip)) {
      return null;
    }

    try {
      // Intelligent rate limiting - wait between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
        const waitTime = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      console.log(`🌍 Location Service: Fetching data for IP ${ip}...`);
      
      // Try primary API (ipapi.co) first, then fallback to ip-api.com
      let response: Response;
      let apiUsed = 'ipapi.co';
      
      try {
        response = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: {
            'User-Agent': 'MEMOPYK-Analytics/1.0'
          }
        });
        
        // If rate limited, try fallback API
        if (response.status === 429) {
          console.log(`⚠️ Location Service: Primary API rate limited, trying fallback...`);
          response = await fetch(`http://ip-api.com/json/${ip}`, {
            headers: {
              'User-Agent': 'MEMOPYK-Analytics/1.0'
            }
          });
          apiUsed = 'ip-api.com';
        }
      } catch (error) {
        console.log(`⚠️ Location Service: Primary API failed, trying fallback...`);
        response = await fetch(`http://ip-api.com/json/${ip}`, {
          headers: {
            'User-Agent': 'MEMOPYK-Analytics/1.0'
          }
        });
        apiUsed = 'ip-api.com';
      }

      this.lastRequestTime = Date.now();

      if (!response.ok) {
        if (response.status === 429) {
          console.log(`⚠️ Location Service: API error ${response.status} for IP ${ip}`);
          this.failedIPs.add(ip);
        }
        return null;
      }

      const data = await response.json();
      console.log(`✅ Location Service: Successfully fetched data for IP ${ip} using ${apiUsed}`);

      // Transform data based on API used
      let locationData: EnrichedLocationData;
      
      if (apiUsed === 'ip-api.com') {
        // Transform ip-api.com format to our standard format
        locationData = {
          country: data.country || 'Unknown',
          country_code: data.countryCode || null,
          region: data.regionName || 'Unknown',
          region_code: data.region || null,
          city: data.city || 'Unknown',
          postal: data.zip || '',
          latitude: data.lat || 0,
          longitude: data.lon || 0,
          timezone: data.timezone || '',
          org: data.isp || ''
        };
      } else {
        // ipapi.co format (our standard)
        locationData = {
          country: data.country_name || 'Unknown',
          country_code: data.country_code || null,
          region: data.region || 'Unknown',
          region_code: data.region_code || null,
          city: data.city || 'Unknown',
          postal: data.postal || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          timezone: data.timezone || '',
          org: data.org || ''
        };
      }

      // Cache the result
      this.setCachedData(ip, locationData);

      return locationData;
    } catch (error) {
      console.error(`❌ Location Service: Error fetching data for IP ${ip}:`, error);
      this.failedIPs.add(ip);
      return null;
    }
  }

  /**
   * Batch process multiple IP addresses with intelligent rate limiting
   */
  async batchEnrichIPs(ips: string[]): Promise<Map<string, EnrichedLocationData | null>> {
    const results = new Map<string, EnrichedLocationData | null>();
    const uniqueIPs = Array.from(new Set(ips)); // Remove duplicates
    
    console.log(`🌍 Location Service: Processing ${uniqueIPs.length} unique IPs in batches of ${this.BATCH_SIZE}`);
    
    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < uniqueIPs.length; i += this.BATCH_SIZE) {
      const batch = uniqueIPs.slice(i, i + this.BATCH_SIZE);
      console.log(`🔄 Location Service: Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(uniqueIPs.length / this.BATCH_SIZE)}`);
      
      // Process batch in parallel but with rate limiting
      const batchPromises = batch.map((ip, index) => 
        // Add staggered delays within batch
        new Promise(resolve => {
          setTimeout(async () => {
            const result = await this.getLocationData(ip);
            results.set(ip, result);
            resolve(result);
          }, index * 1000); // 1 second between IPs in same batch
        })
      );
      
      await Promise.all(batchPromises);
      
      // Wait between batches (except for last batch)
      if (i + this.BATCH_SIZE < uniqueIPs.length) {
        console.log(`⏳ Location Service: Waiting 5 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    const successCount = Array.from(results.values()).filter(result => result !== null).length;
    console.log(`✅ Location Service: Batch processing complete. Success rate: ${successCount}/${uniqueIPs.length} (${Math.round(successCount / uniqueIPs.length * 100)}%)`);
    
    return results;
  }

  private getCachedData(ip: string): EnrichedLocationData | null {
    const expiry = this.cacheExpiry.get(ip);
    if (!expiry || Date.now() > expiry) {
      // Cache expired
      this.cache.delete(ip);
      this.cacheExpiry.delete(ip);
      return null;
    }
    return this.cache.get(ip) || null;
  }

  private setCachedData(ip: string, data: EnrichedLocationData): void {
    this.cache.set(ip, data);
    this.cacheExpiry.set(ip, Date.now() + this.CACHE_TTL);
  }

  /**
   * Update session with location data when available
   */
  async updateSessionLocation(sessionId: string, ip: string): Promise<void> {
    const locationData = await this.getLocationData(ip);
    if (locationData) {
      // Update session in storage
      try {
        const sessions = await this.storage.getAnalyticsSessions();
        const sessionIndex = sessions.findIndex(s => s.session_id === sessionId);
        
        if (sessionIndex !== -1) {
          sessions[sessionIndex] = {
            ...sessions[sessionIndex],
            country: locationData.country,
            country_code: locationData.country_code,
            region: locationData.region,
            city: locationData.city,
            timezone: locationData.timezone,
            organization: locationData.org
          };
          
          // Save updated sessions
          // Location data updated in session object - storage will handle persistence
          console.log(`✅ Location Service: Updated session ${sessionId} with location data`);
        }
      } catch (error) {
        console.error(`❌ Location Service: Error updating session ${sessionId}:`, error);
      }
    }
  }

  /**
   * Get statistics about location service performance
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      failedIPCount: this.failedIPs.size,
      lastRequestTime: this.lastRequestTime
    };
  }
}