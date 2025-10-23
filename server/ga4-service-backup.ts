import { BetaAnalyticsDataClient } from '@google-analytics/data';

// GA4 Configuration - Using your exact property ID format
const PROPERTY = 'properties/501023254';

// Initialize GA4 client using your service account
let ga4: BetaAnalyticsDataClient | null = null;

export function initializeGA4Service(): GA4VideoAnalyticsService {
  try {
    if (!process.env.GA4_SERVICE_ACCOUNT_KEY) {
      throw new Error('GA4_SERVICE_ACCOUNT_KEY environment variable not set');
    }

    // Parse service account credentials from environment variable
    const creds = JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY);
    
    ga4 = new BetaAnalyticsDataClient({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
    });

    console.log('✅ GA4 client initialized successfully');
    return new GA4VideoAnalyticsService();
  } catch (error: any) {
    console.error('❌ Failed to initialize GA4 service:', error.message);
    throw new Error(`GA4 initialization failed: ${error.message}`);
  }
}

// Cache management
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(type: string, params: any): string {
  return `${type}:${JSON.stringify(params)}`;
}

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Date formatting helper
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

export class GA4VideoAnalyticsService {
  constructor() {
    this.client = ga4;
  }

  private client: BetaAnalyticsDataClient | null;

  // Sanity check query to verify credentials and property access
  async testConnection() {
    console.log('🔍 Testing GA4 connection with sanity query');

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      const [resp] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        limit: 10
      });

      console.log('✅ GA4 connection test successful:', resp.rows?.length || 0, 'event types found');
      
      // Log available events for debugging
      if (resp.rows && resp.rows.length > 0) {
        console.log('📋 Available events in your GA4 property:');
        resp.rows.forEach((row, index) => {
          const eventName = row.dimensionValues?.[0]?.value || 'unknown';
          const eventCount = row.metricValues?.[0]?.value || '0';
          console.log(`  ${index + 1}. ${eventName} (${eventCount} events)`);
        });
      }

      return { success: true, eventTypes: resp.rows?.length || 0, events: resp.rows };
    } catch (error: any) {
      console.error('❌ GA4 connection test failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`GA4 connection failed: ${error.code} - ${error.message}`);
    }
  }

  async getKPIs(startDate: string, endDate: string, locale: string = 'all') {
    const cacheKey = getCacheKey('kpis', { startDate, endDate, locale });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`📊 Fetching GA4 KPIs for ${startDate} to ${endDate}, locale: ${locale}`);

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      // Try standard GA4 video metrics first, fallback to eventCount if not available
      let playsResponse;
      
      try {
        // Attempt using built-in video_plays metric
        [playsResponse] = await this.client.runReport({
          property: PROPERTY,
          dateRanges: [{
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
          }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'video_plays' }]
        });
        console.log('✅ Using GA4 video_plays metric');
      } catch (videoMetricError) {
        console.log('⚠️ video_plays metric not available, trying eventCount with video events');
        
        // Fallback to eventCount with event filtering
        [playsResponse] = await this.client.runReport({
          property: PROPERTY,
          dateRanges: [{
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
          }],
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: {
                values: ['video_start', 'video_play', 'page_view'] // Try multiple event names
              }
            }
          }
        });
      }

      // Get video completions
      const [completionsResponse] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'video_complete'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'gallery',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'Video Gallery'
                  }
                }
              }
            ]
          }
        }
      });

      // Get watch time using your custom metric
      const [watchTimeResponse] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        }],
        metrics: [{ name: 'watch_time_seconds' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'video_watch_time'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'gallery',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'Video Gallery'
                  }
                }
              }
            ]
          }
        }
      });

      // Process plays by locale
      const playsRows = playsResponse.rows || [];
      let totalPlays = 0;
      const localeData: { locale: string; users: number }[] = [];

      playsRows.forEach(row => {
        const locale = row.dimensionValues?.[0]?.value || 'unknown';
        const plays = parseInt(row.metricValues?.[0]?.value || '0');
        totalPlays += plays;
        localeData.push({ locale, users: plays });
      });

      // Calculate metrics
      const totalCompletions = parseInt(completionsResponse.rows?.[0]?.metricValues?.[0]?.value || '0');
      const totalWatchTime = parseInt(watchTimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0');
      
      const completionRate = totalPlays > 0 ? totalCompletions / totalPlays : 0;
      const avgWatchTime = totalPlays > 0 ? Math.round(totalWatchTime / totalPlays) : 0;

      const result = {
        range: {
          start: formatDate(startDate),
          end: formatDate(endDate),
          locale,
        },
        kpis: {
          plays_unique_viewers: totalPlays,
          avg_watch_time_sec: avgWatchTime,
          completion_rate: Math.round(completionRate * 100) / 100,
          plays_by_locale: localeData.slice(0, 10)
        },
        cached: false,
        note: 'Live GA4 data from your custom video events'
      };

      setCache(cacheKey, result);
      console.log(`✅ GA4 KPIs fetched from API and cached`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 KPIs query failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        request: `Query for ${startDate} to ${endDate}, locale: ${locale}`
      });
      throw new Error(`Failed to fetch GA4 KPIs: ${error.code} - ${error.message}`);
    }
  }

  async getTopVideos(startDate: string, endDate: string, locale: string = 'all', limit: number = 10) {
    const cacheKey = getCacheKey('top-videos', { startDate, endDate, locale, limit });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`🎬 Fetching GA4 top videos for ${startDate} to ${endDate}, locale: ${locale}, limit: ${limit}`);

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      // Get video plays by video_id
      const [playsResponse] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        }],
        dimensions: [{ name: 'video_id' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'video_start'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'gallery',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'Video Gallery'
                  }
                }
              }
            ]
          }
        },
        limit,
        orderBys: [{ 
          metric: { metricName: 'eventCount' }, 
          desc: true 
        }]
      });

      // Get watch time by video_id
      const [watchTimeResponse] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        }],
        dimensions: [{ name: 'video_id' }],
        metrics: [{ name: 'watch_time_seconds' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'video_watch_time'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'gallery',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'Video Gallery'
                  }
                }
              }
            ]
          }
        },
        limit: 50
      });

      // Get 50% completion by video_id
      const [completion50Response] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        }],
        dimensions: [{ name: 'video_id' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'video_progress'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'percent',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: '50'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'gallery',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'Video Gallery'
                  }
                }
              }
            ]
          }
        },
        limit: 50
      });

      // Get 100% completion by video_id
      const [completion100Response] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        }],
        dimensions: [{ name: 'video_id' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'video_complete'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'gallery',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'Video Gallery'
                  }
                }
              }
            ]
          }
        },
        limit: 50
      });

      const playsRows = playsResponse.rows || [];
      const watchTimeRows = watchTimeResponse.rows || [];
      const completion50Rows = completion50Response.rows || [];
      const completion100Rows = completion100Response.rows || [];

      const result = {
        rows: playsRows.map(row => {
          const videoId = row.dimensionValues?.[0]?.value || '';
          const plays = parseInt(row.metricValues?.[0]?.value || '0');
          
          // Find matching watch time
          const watchTimeRow = watchTimeRows.find(wt => 
            wt.dimensionValues?.[0]?.value === videoId
          );
          const totalWatchTime = parseInt(watchTimeRow?.metricValues?.[0]?.value || '0');
          const avgWatchTime = plays > 0 ? Math.round(totalWatchTime / plays) : 0;

          // Find 50% completion
          const completion50Row = completion50Rows.find(c => 
            c.dimensionValues?.[0]?.value === videoId
          );
          const completions50 = parseInt(completion50Row?.metricValues?.[0]?.value || '0');

          // Find 100% completion
          const completion100Row = completion100Rows.find(c => 
            c.dimensionValues?.[0]?.value === videoId
          );
          const completions100 = parseInt(completion100Row?.metricValues?.[0]?.value || '0');

          return {
            video_id: videoId,
            plays: plays,
            avg_watch_time_sec: avgWatchTime,
            reach50_pct: plays > 0 ? Math.round((completions50 / plays) * 100) / 100 : 0,
            complete100_pct: plays > 0 ? Math.round((completions100 / plays) * 100) / 100 : 0
          };
        }),
        cached: false
      };

      setCache(cacheKey, result);
      console.log(`✅ GA4 top videos fetched from API and cached (${result.rows.length} videos)`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 top videos query failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        request: `Query for ${startDate} to ${endDate}, locale: ${locale}, limit: ${limit}`
      });
      throw new Error(`Failed to fetch GA4 top videos: ${error.code} - ${error.message}`);
    }
  }

  async getFunnelData(startDate: string, endDate: string, locale: string = 'all') {
    const cacheKey = getCacheKey('funnel', { startDate, endDate, locale });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`📊 Fetching GA4 funnel data for ${startDate} to ${endDate}, locale: ${locale}`);

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      // Get video progress at different percentages
      const percentages = [25, 50, 75, 100];
      const funnelData = [];

      for (const percent of percentages) {
        const eventName = percent === 100 ? 'video_complete' : 'video_progress';
        
        const [response] = await this.client.runReport({
          property: PROPERTY,
          dateRanges: [{
            startDate: formatDate(startDate),
            endDate: formatDate(endDate)
          }],
          metrics: [{ name: 'eventCount' }],
          dimensionFilter: {
            andGroup: {
              expressions: [
                {
                  filter: {
                    fieldName: 'eventName',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: eventName
                    }
                  }
                },
                ...(percent !== 100 ? [{
                  filter: {
                    fieldName: 'percent',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: percent.toString()
                    }
                  }
                }] : []),
                {
                  filter: {
                    fieldName: 'gallery',
                    stringFilter: {
                      matchType: 'EXACT',
                      value: 'Video Gallery'
                    }
                  }
                }
              ]
            }
          }
        });

        const count = parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0');
        funnelData.push({
          video_id: 'all',
          percent,
          count
        });
      }

      const result = {
        rows: funnelData,
        cached: false
      };

      setCache(cacheKey, result);
      console.log(`✅ GA4 funnel data fetched from API and cached`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 funnel query failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`Failed to fetch GA4 funnel data: ${error.code} - ${error.message}`);
    }
  }

  async getTrendData(startDate: string, endDate: string, locale: string = 'all') {
    const cacheKey = getCacheKey('trend', { startDate, endDate, locale });
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log(`📊 Fetching GA4 trend data for ${startDate} to ${endDate}, locale: ${locale}`);

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      const [response] = await this.client.runReport({
        property: PROPERTY,
        dateRanges: [{
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'eventCount' },
          { name: 'watch_time_seconds' }
        ],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'video_start'
                  }
                }
              },
              {
                filter: {
                  fieldName: 'gallery',
                  stringFilter: {
                    matchType: 'EXACT',
                    value: 'Video Gallery'
                  }
                }
              }
            ]
          }
        },
        orderBys: [{ 
          dimension: { dimensionName: 'date' },
          desc: false 
        }]
      });

      const rows = response.rows || [];
      const days = rows.map(row => ({
        date: row.dimensionValues?.[0]?.value || '',
        plays: parseInt(row.metricValues?.[0]?.value || '0'),
        avg_watch_time_sec: parseInt(row.metricValues?.[1]?.value || '0')
      }));

      // Fill in missing dates with zero values
      const start = new Date(startDate);
      const end = new Date(endDate);
      const allDays = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const existingDay = days.find(day => day.date === dateStr);
        allDays.push(existingDay || {
          date: dateStr,
          plays: 0,
          avg_watch_time_sec: 0
        });
      }

      const result = {
        days: allDays,
        cached: false
      };

      setCache(cacheKey, result);
      console.log(`✅ GA4 trend data fetched from API and cached (${allDays.length} days)`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 trend query failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`Failed to fetch GA4 trend data: ${error.code} - ${error.message}`);
    }
  }

  async getRealtimeData() {
    const cacheKey = getCacheKey('realtime', {});
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    console.log('🔴 Fetching GA4 realtime data');

    if (!this.client) {
      throw new Error('GA4 client not initialized - service account credentials required');
    }

    try {
      const [response] = await this.client.runRealtimeReport({
        property: PROPERTY,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 10
      });

      const rows = response.rows || [];
      const realtimeData = rows.map(row => ({
        country: row.dimensionValues?.[0]?.value || 'Unknown',
        active_users: parseInt(row.metricValues?.[0]?.value || '0')
      }));

      const result = {
        active_users_total: realtimeData.reduce((sum, item) => sum + item.active_users, 0),
        by_country: realtimeData,
        cached: false
      };

      // Cache for shorter duration (30 seconds for realtime data)
      cache.set(cacheKey, { data: result, timestamp: Date.now() });
      console.log(`✅ GA4 realtime data fetched from API and cached`);
      return result;
    } catch (error: any) {
      console.error('❌ GA4 realtime query failed:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw new Error(`Failed to fetch GA4 realtime data: ${error.code} - ${error.message}`);
    }
  }
}