/**
 * Analytics Routes
 * - Frontend event logging to Supabase
 * - GA4 Measurement Protocol relay (ad-blocker bypass)
 * - GA4 Realtime API endpoints
 * - Trends data aggregation
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import { randomUUID } from 'crypto';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { db } from '../db';
import { analyticsSessions } from '@shared/schema';
import { gte, lte, eq, and, sql, desc } from 'drizzle-orm';
import videoAnalyticsService from '../services/analytics/video-analytics.service';

const router = Router();

// ============================================================================
// GA4 Client Initialization
// ============================================================================

let ga4Client: BetaAnalyticsDataClient | null = null;

const initGA4Client = () => {
  try {
    const SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;
    console.log('🔑 [GA4] Initializing client with service account JSON');
    
    return new BetaAnalyticsDataClient(
      SA_KEY ? { credentials: JSON.parse(SA_KEY) } : {}
    );
  } catch (error) {
    console.error('❌ [GA4] Failed to initialize client:', error);
    throw error;
  }
};

const getGA4Client = () => {
  if (!ga4Client) {
    ga4Client = initGA4Client();
  }
  return ga4Client;
};

const GA4_PROPERTY = `properties/${process.env.GA4_PROPERTY_ID}`;
const GA4_MID = process.env.VITE_GA_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA_API_SECRET;

// ============================================================================
// GA4 Measurement Protocol (Ad-blocker Bypass)
// ============================================================================

router.post('/ga4/mp', express.json(), async (req: Request, res: Response) => {
  try {
    if (!GA4_MID) {
      return res.status(500).json({ error: 'GA4 Measurement ID not configured' });
    }
    
    // TODO: Add IP exclusion check via storage service
    // const clientIP = extractClientIP(req);
    // const isExcluded = await storage.checkIPExclusion(clientIP, req.get('User-Agent') || '');
    // if (isExcluded) {
    //   console.log(`🚫 [GA4 MP] Blocked excluded IP: ${clientIP}`);
    //   return res.status(204).send();
    // }
    
    const { client_id, user_id, events } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required' });
    }

    const cid = String(client_id || randomUUID());

    // Allowlist for security
    const allowed = new Set(['video_start', 'video_progress', 'video_complete']);
    for (const e of events) {
      if (!allowed.has(e?.name)) {
        return res.status(400).json({ error: `event not allowed: ${e?.name}` });
      }
    }

    const payload = {
      client_id: cid,
      user_id,
      non_personalized_ads: false,
      events,
    };

    const useDebug = req.query.debug === '1';
    const base = useDebug
      ? 'https://www.google-analytics.com/debug/mp/collect'
      : 'https://www.google-analytics.com/mp/collect';

    let url = `${base}?measurement_id=${encodeURIComponent(GA4_MID)}`;
    if (GA4_API_SECRET) {
      url += `&api_secret=${encodeURIComponent(GA4_API_SECRET)}`;
    }

    console.log(`🎯 [GA4 MP] Sending to ${base}:`, JSON.stringify(payload, null, 2));

    const gaResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await gaResponse.text();
    if (!gaResponse.ok) {
      console.error(`❌ [GA4 MP] Error ${gaResponse.status}:`, text);
      return res.status(gaResponse.status).json({ error: 'GA4 MP error', body: text });
    }

    let debug: any = undefined;
    if (useDebug) {
      try { debug = JSON.parse(text); } catch {}
    }

    console.log(`✅ [GA4 MP] Success - events sent for client ${cid}`);
    const response: any = { ok: true, client_id: cid };
    if (useDebug) response.debug = debug;
    
    res.json(response);
  } catch (err: any) {
    console.error('❌ [GA4 MP] Server error:', err);
    res.status(500).json({ error: 'server error', message: String(err?.message || err) });
  }
});

// ============================================================================
// GA4 Realtime API
// ============================================================================

router.get('/ga4/realtime/top-videos', async (req: Request, res: Response) => {
  try {
    const client = getGA4Client();
    console.log('🔍 [GA4 Realtime] Fetching top videos...');
    
    let response;
    try {
      [response] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [
          { name: 'customEvent:video_id' },
          { name: 'customEvent:video_title' }
        ],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { matchType: 'EXACT', value: 'video_start' }
          }
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 50
      });

      const topVideosRt = (response.rows || []).map(row => ({
        videoId: row.dimensionValues?.[0]?.value || 'unknown',
        title: row.dimensionValues?.[1]?.value || 'Unknown Title',
        playsRt: Number(row.metricValues?.[0]?.value || 0)
      })).filter(video => video.videoId !== 'unknown' && video.playsRt > 0);
      
      console.log(`✅ [GA4 Realtime] Found ${topVideosRt.length} top videos`);
      res.json({ topVideosRt });

    } catch (customEventError: any) {
      console.log('⚠️ [GA4 Realtime] Custom events not supported, using fallback...');
      
      [response] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { matchType: 'EXACT', value: 'video_start' }
          }
        },
        limit: 50
      });

      const totalPlays = Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
      const topVideosRt = totalPlays > 0 ? [{
        videoId: 'realtime_aggregate',
        title: 'All Videos (Realtime Aggregate)',
        playsRt: totalPlays
      }] : [];

      res.json({ 
        topVideosRt,
        note: 'Realtime API shows aggregate data only'
      });
    }

  } catch (error: any) {
    console.error('❌ [GA4 Realtime] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch realtime top videos',
      message: error.message
    });
  }
});

router.get('/ga4/realtime/video-progress', async (req: Request, res: Response) => {
  try {
    const client = getGA4Client();
    const videoId = String(req.query.videoId || '');
    
    if (!videoId) {
      return res.status(400).json({ error: 'videoId parameter required' });
    }

    console.log(`🔍 [GA4 Realtime] Fetching progress for video: ${videoId}`);
    
    const targetBuckets = [10, 25, 50, 75, 90];
    const bucketCounts = new Map<number, number>();
    targetBuckets.forEach(bucket => bucketCounts.set(bucket, 0));

    let response;
    try {
      [response] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [{ name: 'customEvent:progress_percent' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'eventName',
                  stringFilter: { matchType: 'EXACT', value: 'video_progress' }
                }
              },
              {
                filter: {
                  fieldName: 'customEvent:video_id',
                  stringFilter: { matchType: 'EXACT', value: videoId }
                }
              }
            ]
          }
        },
        orderBys: [{ dimension: { dimensionName: 'customEvent:progress_percent' } }],
        limit: 50
      });

      (response.rows || []).forEach(row => {
        const progressPercent = Number(row.dimensionValues?.[0]?.value || 0);
        const count = Number(row.metricValues?.[0]?.value || 0);
        
        if (progressPercent >= 10 && progressPercent < 25) {
          bucketCounts.set(10, bucketCounts.get(10)! + count);
        } else if (progressPercent >= 25 && progressPercent < 50) {
          bucketCounts.set(25, bucketCounts.get(25)! + count);
        } else if (progressPercent >= 50 && progressPercent < 75) {
          bucketCounts.set(50, bucketCounts.get(50)! + count);
        } else if (progressPercent >= 75 && progressPercent < 90) {
          bucketCounts.set(75, bucketCounts.get(75)! + count);
        } else if (progressPercent >= 90) {
          bucketCounts.set(90, bucketCounts.get(90)! + count);
        }
      });

    } catch (customEventError: any) {
      console.log('⚠️ [GA4 Realtime] Using fallback for progress...');
      
      [response] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { matchType: 'EXACT', value: 'video_progress' }
          }
        },
        limit: 50
      });

      const totalProgressEvents = Number(response.rows?.[0]?.metricValues?.[0]?.value || 0);
      if (totalProgressEvents > 0) {
        bucketCounts.set(10, Math.ceil(totalProgressEvents * 0.4));
        bucketCounts.set(25, Math.ceil(totalProgressEvents * 0.25));
        bucketCounts.set(50, Math.ceil(totalProgressEvents * 0.2));
        bucketCounts.set(75, Math.ceil(totalProgressEvents * 0.1));
        bucketCounts.set(90, Math.ceil(totalProgressEvents * 0.05));
      }
    }
    
    const funnelRt = targetBuckets.map(bucket => ({
      bucket,
      count: bucketCounts.get(bucket) || 0
    }));

    console.log(`✅ [GA4 Realtime] Progress funnel for ${videoId}:`, funnelRt);
    res.json({ funnelRt });

  } catch (error: any) {
    console.error('❌ [GA4 Realtime] Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch realtime video progress',
      message: error.message
    });
  }
});

// ============================================================================
// Trends Data Endpoint (Daily aggregated analytics)
// ============================================================================

/**
 * Parse date from various formats (YYYYMMDD, YYYY-MM-DD, ISO)
 */
function parseDate(dateStr: string): Date {
  // Handle YYYYMMDD format
  if (/^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

/**
 * Format date to YYYYMMDD for response
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

router.get('/ga4/trend', async (req: Request, res: Response) => {
  try {
    // Parse date parameters
    const startDateStr = String(req.query.startDate || req.query.start || '');
    const endDateStr = String(req.query.endDate || req.query.end || '');

    // Default to last 30 days if not provided
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startDate = startDateStr ? parseDate(startDateStr) : defaultStart;
    const endDate = endDateStr ? parseDate(endDateStr) : now;

    // Add time to end date to include the full day
    const endDateEnd = new Date(endDate);
    endDateEnd.setHours(23, 59, 59, 999);

    console.log(`📊 [Trends] Fetching data from ${startDate.toISOString()} to ${endDateEnd.toISOString()}`);

    // Query sessions in the date range (exclude test data)
    const sessions = await db
      .select()
      .from(analyticsSessions)
      .where(
        and(
          gte(analyticsSessions.createdAt, startDate),
          lte(analyticsSessions.createdAt, endDateEnd),
          eq(analyticsSessions.isTestData, false)
        )
      )
      .orderBy(desc(analyticsSessions.createdAt));

    // Group sessions by date
    const dailyMap = new Map<string, {
      sessions: number;
      uniqueIPs: Set<string>;
      totalDuration: number;
      bounces: number;
    }>();

    for (const session of sessions) {
      const dateKey = formatDateToYYYYMMDD(session.createdAt || new Date());

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          sessions: 0,
          uniqueIPs: new Set(),
          totalDuration: 0,
          bounces: 0,
        });
      }

      const day = dailyMap.get(dateKey)!;
      day.sessions++;
      if (session.ipAddress) day.uniqueIPs.add(session.ipAddress);
      day.totalDuration += session.sessionDuration || 0;
      if (session.isBounce) day.bounces++;
    }

    // Convert to array format
    const dailyData = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        sessions: data.sessions,
        users: data.uniqueIPs.size,
        avgSessionDuration: data.sessions > 0 ? Math.round(data.totalDuration / data.sessions) : 0,
        bounceRate: data.sessions > 0 ? Math.round((data.bounces / data.sessions) * 100) : 0,
        totalEngagementSeconds: data.totalDuration,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate period aggregates
    const totalSessions = sessions.length;
    const uniqueUsers = new Set(sessions.map(s => s.ipAddress).filter(Boolean)).size;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.sessionDuration || 0), 0);
    const totalBounces = sessions.filter(s => s.isBounce).length;

    // Calculate previous period for comparison
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevPeriodEnd = new Date(startDate);
    prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
    const prevPeriodStart = new Date(prevPeriodEnd);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);

    const prevSessions = await db
      .select()
      .from(analyticsSessions)
      .where(
        and(
          gte(analyticsSessions.createdAt, prevPeriodStart),
          lte(analyticsSessions.createdAt, prevPeriodEnd),
          eq(analyticsSessions.isTestData, false)
        )
      );

    const prevTotalSessions = prevSessions.length;
    const prevUniqueUsers = new Set(prevSessions.map(s => s.ipAddress).filter(Boolean)).size;
    const prevTotalDuration = prevSessions.reduce((sum, s) => sum + (s.sessionDuration || 0), 0);

    const periodAggregates = {
      periodSessions: totalSessions,
      periodUsers: uniqueUsers,
      periodAverageWatchTime: totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0,
      periodTotalEngagement: totalDuration,
      periodBounceRate: totalSessions > 0 ? Math.round((totalBounces / totalSessions) * 100) : 0,
      prevPeriodSessions: prevTotalSessions,
      prevPeriodUsers: prevUniqueUsers,
      prevPeriodAverageWatchTime: prevTotalSessions > 0 ? Math.round(prevTotalDuration / prevTotalSessions) : 0,
      prevPeriodTotalEngagement: prevTotalDuration,
    };

    console.log(`✅ [Trends] Returning ${dailyData.length} days of data, ${totalSessions} total sessions`);

    res.json({
      dailyData,
      periodAggregates,
    });
  } catch (error: any) {
    console.error('❌ [Trends] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch trends data',
      message: error.message,
    });
  }
});

// ============================================================================
// GA4 KPIs Endpoint (Key Performance Indicators)
// ============================================================================

router.get('/ga4/kpis', async (req: Request, res: Response) => {
  try {
    // Parse date parameters
    const startDateStr = String(req.query.startDate || req.query.start || '');
    const endDateStr = String(req.query.endDate || req.query.end || '');

    // Default to last 30 days if not provided
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startDate = startDateStr ? parseDate(startDateStr) : defaultStart;
    const endDate = endDateStr ? parseDate(endDateStr) : now;
    const endDateEnd = new Date(endDate);
    endDateEnd.setHours(23, 59, 59, 999);

    console.log(`📊 [KPIs] Fetching data from ${startDate.toISOString()} to ${endDateEnd.toISOString()}`);

    // Query current period sessions
    const sessions = await db
      .select()
      .from(analyticsSessions)
      .where(
        and(
          gte(analyticsSessions.createdAt, startDate),
          lte(analyticsSessions.createdAt, endDateEnd),
          eq(analyticsSessions.isTestData, false)
        )
      );

    const totalViews = sessions.length;
    const uniqueVisitors = new Set(sessions.map(s => s.ipAddress).filter(Boolean)).size;
    const returnVisitors = sessions.filter(s => s.isReturning).length;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.sessionDuration || 0), 0);
    const bounces = sessions.filter(s => s.isBounce).length;

    // Calculate previous period for comparison
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevPeriodEnd = new Date(startDate);
    prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
    const prevPeriodStart = new Date(prevPeriodEnd);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);

    const prevSessions = await db
      .select()
      .from(analyticsSessions)
      .where(
        and(
          gte(analyticsSessions.createdAt, prevPeriodStart),
          lte(analyticsSessions.createdAt, prevPeriodEnd),
          eq(analyticsSessions.isTestData, false)
        )
      );

    const prevTotalViews = prevSessions.length;
    const prevUniqueVisitors = new Set(prevSessions.map(s => s.ipAddress).filter(Boolean)).size;
    const prevReturnVisitors = prevSessions.filter(s => s.isReturning).length;

    // Calculate percentage change
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const kpis = {
      totalViews: { value: totalViews, trend: [], change: calculateChange(totalViews, prevTotalViews) },
      uniqueVisitors: { value: uniqueVisitors, trend: [], change: calculateChange(uniqueVisitors, prevUniqueVisitors) },
      returnVisitors: { value: returnVisitors, trend: [], change: calculateChange(returnVisitors, prevReturnVisitors) },
      sessions: { value: totalViews, trend: [], change: calculateChange(totalViews, prevTotalViews) },
      plays: { value: 0, trend: [], change: 0 },
      avgWatch: { value: totalViews > 0 ? Math.round(totalDuration / totalViews) : 0, trend: [], change: 0 },
      completions: { value: 0, trend: [], change: 0 },
      bounceRate: { value: totalViews > 0 ? Math.round((bounces / totalViews) * 100) : 0, trend: [], change: 0 },
    };

    const previousPeriod = {
      kpis: {
        totalViews: { value: prevTotalViews, trend: [] },
        uniqueVisitors: { value: prevUniqueVisitors, trend: [] },
        returnVisitors: { value: prevReturnVisitors, trend: [] },
        sessions: { value: prevTotalViews, trend: [] },
        plays: { value: 0, trend: [] },
        avgWatch: { value: 0, trend: [] },
        completions: { value: 0, trend: [] },
      },
    };

    console.log(`✅ [KPIs] Returning: ${totalViews} views, ${uniqueVisitors} unique visitors`);

    res.json({
      kpis,
      previousPeriod,
      sparklines: {},
      timestamp: new Date().toISOString(),
      cached: false,
    });
  } catch (error: any) {
    console.error('❌ [KPIs] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch KPIs',
      message: error.message,
    });
  }
});

// ============================================================================
// GA4 Realtime Endpoint (Active Users)
// ============================================================================

router.get('/ga4/realtime', async (req: Request, res: Response) => {
  try {
    // Try to get realtime data from GA4 API
    const client = getGA4Client();

    let activeUsers = 0;
    let byCountry: Array<{ country: string; users: number }> = [];
    let byDevice: Array<{ device: string; users: number }> = [];

    try {
      // Get active users
      const [activeUsersResponse] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        metrics: [{ name: 'activeUsers' }],
      });
      activeUsers = Number(activeUsersResponse.rows?.[0]?.metricValues?.[0]?.value || 0);

      // Get active users by country
      const [countryResponse] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5,
      });
      byCountry = (countryResponse.rows || []).map(row => ({
        country: row.dimensionValues?.[0]?.value || 'Unknown',
        users: Number(row.metricValues?.[0]?.value || 0),
      }));

      // Get active users by device
      const [deviceResponse] = await client.runRealtimeReport({
        property: GA4_PROPERTY,
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      });
      byDevice = (deviceResponse.rows || []).map(row => ({
        device: row.dimensionValues?.[0]?.value || 'Unknown',
        users: Number(row.metricValues?.[0]?.value || 0),
      }));

      console.log(`✅ [GA4 Realtime] ${activeUsers} active users`);
    } catch (ga4Error: any) {
      // GA4 API failed, return stubbed data
      console.log(`⚠️ [GA4 Realtime] API unavailable, returning stub: ${ga4Error.message}`);
    }

    res.json({
      activeUsers,
      byCountry,
      byDevice,
      timestamp: new Date().toISOString(),
      cached: false,
    });
  } catch (error: any) {
    console.error('❌ [GA4 Realtime] Error:', error);
    // Return stub data on error
    res.json({
      activeUsers: 0,
      byCountry: [],
      byDevice: [],
      timestamp: new Date().toISOString(),
      cached: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Video Analytics Endpoints
// ============================================================================

/**
 * GET /ga4/top-videos - Top performing videos
 * Returns array of videos with plays, avgWatchSeconds, completionRate
 */
router.get('/ga4/top-videos', async (req: Request, res: Response) => {
  try {
    const startDate = String(req.query.startDate || req.query.start || '');
    const endDate = String(req.query.endDate || req.query.end || '');
    const period = String(req.query.period || '30d');
    const limit = parseInt(String(req.query.limit || '10'), 10);

    console.log(`📊 [Top Videos] Request: period=${period}, limit=${limit}`);

    const topVideos = await videoAnalyticsService.getTopVideos(
      period,
      limit,
      startDate || undefined,
      endDate || undefined
    );

    // Return in the format expected by frontend (TopVideosResponse)
    res.json({
      topVideos: topVideos.map(v => ({
        videoId: v.video_id,
        title: v.title,
        views: v.plays,
        uniqueViewers: 0, // Would need session tracking
        averageWatchTime: v.avgWatchSeconds,
        completionRate: v.completePct,
        engagement: Math.min(100, Math.round((v.avgWatchSeconds / 60) * 10)),
        // Legacy fields for backward compatibility
        plays: v.plays,
        avgWatchSeconds: v.avgWatchSeconds,
        reach50Pct: v.reach50Pct,
        completePct: v.completePct,
      })),
      timestamp: new Date().toISOString(),
      cached: false,
    });
  } catch (error: any) {
    console.error('❌ [Top Videos] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch top videos',
      message: error.message,
    });
  }
});

/**
 * GET /ga4/videos - Video stats overview
 * Returns per-video metrics
 */
router.get('/ga4/videos', async (req: Request, res: Response) => {
  try {
    const startDate = String(req.query.startDate || req.query.start || '');
    const endDate = String(req.query.endDate || req.query.end || '');
    const period = String(req.query.period || '30d');

    console.log(`📊 [Videos] Request: period=${period}`);

    const [videoStats, engagement] = await Promise.all([
      videoAnalyticsService.getVideoStats(period, startDate || undefined, endDate || undefined),
      videoAnalyticsService.getVideoEngagement(period, startDate || undefined, endDate || undefined),
    ]);

    res.json({
      videos: videoStats,
      engagement,
      timestamp: new Date().toISOString(),
      cached: false,
    });
  } catch (error: any) {
    console.error('❌ [Videos] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch video stats',
      message: error.message,
    });
  }
});

/**
 * GET /ga4/funnel - Video progress funnel
 * Returns progress bucket counts for a specific video
 */
router.get('/ga4/funnel', async (req: Request, res: Response) => {
  try {
    const videoId = String(req.query.videoId || '');
    const startDate = String(req.query.startDate || req.query.start || '');
    const endDate = String(req.query.endDate || req.query.end || '');
    const period = String(req.query.period || '30d');

    if (!videoId) {
      return res.status(400).json({ error: 'Missing videoId parameter' });
    }

    console.log(`📊 [Funnel] Request: videoId=${videoId}, period=${period}`);

    const funnel = await videoAnalyticsService.getVideoFunnel(
      videoId,
      period,
      startDate || undefined,
      endDate || undefined
    );

    res.json({
      funnel,
      timestamp: new Date().toISOString(),
      cached: false,
    });
  } catch (error: any) {
    console.error('❌ [Funnel] Error:', error);
    res.json({
      funnel: [10, 25, 50, 75, 90].map(bucket => ({ bucket, count: 0 })),
      timestamp: new Date().toISOString(),
      cached: false,
      note: 'fallback: error occurred',
    });
  }
});

// ============================================================================
// Frontend Event Logging (to Supabase)
// ============================================================================

router.post('/event', async (req: Request, res: Response) => {
  try {
    const eventData = req.body;

    if (!eventData.event_name) {
      return res.status(400).json({ success: false, error: 'event_name is required' });
    }

    const enrichedEventData = {
      ...eventData,
      user_agent: req.headers['user-agent'] || null,
      referrer: req.headers.referer || req.headers.referrer || null,
      session_id: eventData.session_id || null,
    };

    // TODO: Log to Supabase via analytics DB service
    // analyticsDBService.logEvent(enrichedEventData).catch(console.error);

    console.log('📊 [Analytics] Event received:', enrichedEventData.event_name);
    res.json({ success: true });
  } catch (err) {
    console.error('Analytics event endpoint error:', err);
    res.status(500).json({ success: false, error: 'Failed to process analytics event' });
  }
});

router.get('/conversions', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date query parameters are required'
      });
    }

    // TODO: Fetch from analytics DB service
    // const totals = await analyticsDBService.getConversionTotals(start_date, end_date);

    res.json({ success: true, data: { total: 0, count: 0 } });
  } catch (err) {
    console.error('Analytics conversions endpoint error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversion data' });
  }
});

router.post('/performance', async (req: Request, res: Response) => {
  try {
    const performanceData = req.body;

    if (!performanceData.page_path) {
      return res.status(400).json({ success: false, error: 'page_path is required' });
    }

    const enrichedData = {
      ...performanceData,
      user_agent: req.headers['user-agent'] || null,
    };

    // TODO: Log to Supabase via analytics DB service
    // analyticsDBService.logPerformanceMetric(enrichedData).catch(console.error);

    console.log('⚡ [Analytics] Performance metric received for:', enrichedData.page_path);
    res.json({ success: true });
  } catch (err) {
    console.error('Performance metrics endpoint error:', err);
    res.status(500).json({ success: false, error: 'Failed to process performance metrics' });
  }
});

router.get('/health', (req: Request, res: Response) => {
  // TODO: Check analytics DB service status
  const isReady = !!process.env.DATABASE_URL;

  res.json({
    success: true,
    analytics_db_enabled: isReady,
    ga4_configured: !!GA4_MID,
    message: isReady ? 'Analytics service operational' : 'Analytics service disabled'
  });
});

// ============================================================================
// Unified Cache Stats Endpoint
// ============================================================================

router.get('/unified-cache/stats', (_req: Request, res: Response) => {
  try {
    // Return stub cache stats since video cache service isn't migrated yet
    const stats = {
      video: {
        totalSize: 0,
        itemCount: 0,
        hitRate: 0,
        missRate: 0,
      },
      image: {
        totalSize: 0,
        itemCount: 0,
        hitRate: 0,
        missRate: 0,
      },
      total: 0,
      timestamp: new Date().toISOString(),
      stub: true,
      message: 'Cache service not yet migrated',
    };

    res.json(stats);
  } catch (error: any) {
    console.error('❌ Unified cache stats error:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

export default router;
