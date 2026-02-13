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
import { analyticsSessions, analyticsExclusions, analyticsViews } from '@shared/schema';
import { gte, lte, eq, and, sql, desc, notInArray, isNull, or } from 'drizzle-orm';
import videoAnalyticsService from '../services/analytics/video-analytics.service';
import realtimeService from '../services/analytics/realtime.service';
import eventRecorder, { extractClientIP } from '../services/analytics/event-recorder.service';
import { getOrCreateSession, updateSession, updateSessionDuration } from '../services/analytics/session.service';
import {
  qSessions,
  qTotalUsers,
  qReturningUsers,
  qPlays,
  qWatchTimeTotal,
  qCompletes,
  qSessionsTrendWithComparison,
} from '../services/analytics/ga4.service';

// ============================================================================
// IP Exclusion Helper
// ============================================================================

/**
 * Get list of excluded IP addresses from analytics_exclusions table
 * Returns IPs without CIDR suffix (e.g., "109.17.150.48" not "109.17.150.48/32")
 */
async function getExcludedIPs(): Promise<string[]> {
  try {
    const exclusions = await db
      .select({ ipCidr: analyticsExclusions.ipCidr })
      .from(analyticsExclusions)
      .where(eq(analyticsExclusions.active, true));

    // Extract IP addresses (remove /32 or other CIDR suffixes)
    return exclusions.map(e => e.ipCidr.replace(/\/\d+$/, ''));
  } catch (error) {
    console.error('❌ [IP Exclusion] Error fetching exclusions:', error);
    return [];
  }
}

const router = Router();

// ============================================================================
// GA4 Client Initialization
// ============================================================================

let ga4Client: BetaAnalyticsDataClient | null = null;

const initGA4Client = () => {
  try {
    const SA_KEY = process.env.GA4_SERVICE_ACCOUNT_KEY;
    console.log('🔑 [GA4] Initializing client with service account JSON');

    if (!SA_KEY) {
      return new BetaAnalyticsDataClient();
    }

    // Try base64 decode first (recommended for Coolify/Docker)
    let jsonStr: string;
    try {
      jsonStr = Buffer.from(SA_KEY, 'base64').toString('utf-8');
      JSON.parse(jsonStr); // Verify it's valid JSON after base64 decode
    } catch {
      // Not base64, try as raw JSON
      jsonStr = SA_KEY;
    }

    const parsed = JSON.parse(jsonStr);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return new BetaAnalyticsDataClient({ credentials: parsed });
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
// Unified GA4 Report Endpoint
// Routes to different handlers based on ?report= parameter
// ============================================================================

router.get('/ga4/report', async (req: Request, res: Response) => {
  const reportType = String(req.query.report || '');
  const startDate = String(req.query.startDate || req.query.start || '');
  const endDate = String(req.query.endDate || req.query.end || '');
  const period = String(req.query.period || req.query.preset || '30d');
  const videoId = String(req.query.videoId || '');
  const limit = parseInt(String(req.query.limit || '10'), 10);
  const locale = String(req.query.locale || 'all');
  const country = String(req.query.country || 'all');

  console.log(`📊 [GA4 Report] type=${reportType}, period=${period}, locale=${locale}, country=${country}`);

  try {
    switch (reportType) {
      case 'topVideos': {
        const videoStats = await videoAnalyticsService.getVideoStats(
          period,
          startDate || undefined,
          endDate || undefined,
          locale,
          country
        );

        // Return in format expected by frontend (with 'videos' key)
        res.json({
          videos: videoStats.map(v => ({
            videoId: v.videoId,
            title: v.title,
            views: v.views,
            uniqueViewers: v.uniqueViewers,
            averageWatchTime: v.averageWatchTime,
            completionRate: v.completionRate,
            engagement: v.engagement,
            // Legacy aliases
            video_id: v.videoId,
            plays: v.views,
            avgWatchSeconds: v.averageWatchTime,
            reach50Pct: v.reach50Pct,
            completePct: v.completionRate,
          })),
          topVideos: videoStats.map(v => ({
            videoId: v.videoId,
            title: v.title,
            views: v.views,
            uniqueViewers: v.uniqueViewers,
            averageWatchTime: v.averageWatchTime,
            completionRate: v.completionRate,
            engagement: v.engagement,
          })),
          totalViews: videoStats.reduce((sum, v) => sum + v.views, 0),
          totalUniqueViewers: videoStats.reduce((sum, v) => sum + v.uniqueViewers, 0),
          averageCompletionRate: videoStats.length > 0
            ? Math.round(videoStats.reduce((sum, v) => sum + v.completionRate, 0) / videoStats.length)
            : 0,
          timestamp: new Date().toISOString(),
          cached: false,
        });
        break;
      }

      case 'videoFunnel': {
        if (!videoId) {
          return res.status(400).json({ error: 'Missing videoId parameter' });
        }
        const funnel = await videoAnalyticsService.getVideoFunnel(
          videoId,
          period,
          startDate || undefined,
          endDate || undefined,
          locale,
          country
        );
        res.json({
          funnel,
          timestamp: new Date().toISOString(),
          cached: false,
        });
        break;
      }

      case 'geo': {
        // Stub for geo data - would need a geo analytics service
        res.json({
          countries: [],
          topCountries: [],
          timestamp: new Date().toISOString(),
          cached: false,
          stub: true,
        });
        break;
      }

      case 'trends': {
        // Redirect to the trends endpoint logic
        // Parse dates
        const now = new Date();
        const defaultStart = new Date(now);
        defaultStart.setDate(defaultStart.getDate() - 30);

        const parsedStartDate = startDate ? parseDate(startDate) : defaultStart;
        const parsedEndDate = endDate ? parseDate(endDate) : now;

        const sessions = await db
          .select()
          .from(analyticsSessions)
          .where(
            and(
              gte(analyticsSessions.createdAt, parsedStartDate),
              lte(analyticsSessions.createdAt, parsedEndDate),
              eq(analyticsSessions.isTestData, false)
            )
          )
          .orderBy(desc(analyticsSessions.createdAt));

        // Group by date
        const dailyMap = new Map<string, { sessions: number; uniqueIPs: Set<string>; totalDuration: number }>();

        for (const session of sessions) {
          const dateKey = formatDateToYYYYMMDD(session.createdAt || new Date());
          if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, { sessions: 0, uniqueIPs: new Set(), totalDuration: 0 });
          }
          const day = dailyMap.get(dateKey)!;
          day.sessions++;
          if (session.ipAddress) day.uniqueIPs.add(session.ipAddress);
          day.totalDuration += session.sessionDuration || 0;
        }

        const dailyData = Array.from(dailyMap.entries())
          .map(([date, data]) => ({
            date,
            sessions: data.sessions,
            users: data.uniqueIPs.size,
            avgSessionDuration: data.sessions > 0 ? Math.round(data.totalDuration / data.sessions) : 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        res.json({
          dailyData,
          periodAggregates: {
            periodSessions: sessions.length,
            periodUsers: new Set(sessions.map(s => s.ipAddress).filter(Boolean)).size,
          },
          timestamp: new Date().toISOString(),
          cached: false,
        });
        break;
      }

      default:
        res.status(400).json({
          error: 'Invalid report type',
          message: `Unknown report type: ${reportType}. Valid types: topVideos, videoFunnel, geo, trends`,
        });
    }
  } catch (error: any) {
    console.error(`❌ [GA4 Report] Error for ${reportType}:`, error);
    res.status(500).json({
      error: 'Failed to fetch report',
      message: error.message,
    });
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

/** Convert any date string to GA4 YYYY-MM-DD format. */
function toGA4Date(dateStr: string | undefined, fallback: Date): string {
  const d = dateStr ? parseDate(dateStr) : fallback;
  return d.toISOString().split('T')[0];
}

router.get('/ga4/trend', async (req: Request, res: Response) => {
  try {
    // Parse date parameters
    const startDateStr = String(req.query.startDate || req.query.start || '');
    const endDateStr = String(req.query.endDate || req.query.end || '');
    const dataSource = String(req.query.dataSource || 'memopyk');
    const locale = String(req.query.locale || 'all');
    const country = String(req.query.country || 'all');

    // Default to last 30 days if not provided
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startDate = startDateStr ? parseDate(startDateStr) : defaultStart;
    const endDate = endDateStr ? parseDate(endDateStr) : now;

    // ---------------------------------------------------------------
    // GA4 DATA SOURCE — query Google Analytics API
    // ---------------------------------------------------------------
    if (dataSource === 'ga4') {
      const ga4Start = toGA4Date(startDateStr, defaultStart);
      const ga4End = toGA4Date(endDateStr, now);
      const localeParam = locale === 'all' ? undefined : locale;
      const countryParam = country === 'all' ? undefined : country;

      console.log(`📊 [Trends/GA4] Fetching from GA4 API: ${ga4Start} to ${ga4End} (locale=${locale}, country=${country})`);

      const result = await qSessionsTrendWithComparison(ga4Start, ga4End, localeParam, countryParam);

      console.log(`✅ [Trends/GA4] Returning ${result.dailyData.length} days of data`);

      return res.json({
        ...result,
        dataSource: 'ga4',
      });
    }

    // ---------------------------------------------------------------
    // MEMOPYK DATA SOURCE (default) — query Supabase analytics_sessions
    // ---------------------------------------------------------------

    // Add time to end date to include the full day
    const endDateEnd = new Date(endDate);
    endDateEnd.setHours(23, 59, 59, 999);

    console.log(`📊 [Trends/Memopyk] Fetching data from ${startDate.toISOString()} to ${endDateEnd.toISOString()}`);

    // Get excluded IPs for filtering
    const excludedIPs = await getExcludedIPs();

    // Query sessions in the date range (exclude test data and excluded IPs)
    const sessions = await db
      .select()
      .from(analyticsSessions)
      .where(
        and(
          gte(analyticsSessions.createdAt, startDate),
          lte(analyticsSessions.createdAt, endDateEnd),
          eq(analyticsSessions.isTestData, false),
          excludedIPs.length > 0
            ? or(
                isNull(analyticsSessions.ipAddress),
                notInArray(analyticsSessions.ipAddress, excludedIPs)
              )
            : sql`true`
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
          eq(analyticsSessions.isTestData, false),
          excludedIPs.length > 0
            ? or(
                isNull(analyticsSessions.ipAddress),
                notInArray(analyticsSessions.ipAddress, excludedIPs)
              )
            : sql`true`
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

    console.log(`✅ [Trends/Memopyk] Returning ${dailyData.length} days of data, ${totalSessions} total sessions`);

    res.json({
      dailyData,
      periodAggregates,
      dataSource: 'memopyk',
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
    const dataSource = String(req.query.dataSource || 'memopyk');
    const locale = String(req.query.locale || 'all');
    const country = String(req.query.country || 'all');

    // Default to last 30 days if not provided
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startDate = startDateStr ? parseDate(startDateStr) : defaultStart;
    const endDate = endDateStr ? parseDate(endDateStr) : now;

    // Calculate percentage change
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // ---------------------------------------------------------------
    // GA4 DATA SOURCE — query Google Analytics API
    // ---------------------------------------------------------------
    if (dataSource === 'ga4') {
      const ga4Start = toGA4Date(startDateStr, defaultStart);
      const ga4End = toGA4Date(endDateStr, now);
      const localeParam = locale === 'all' ? undefined : locale;
      const countryParam = country === 'all' ? undefined : country;

      // Previous period dates
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const prevEnd = new Date(startDate);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - periodDays);
      const ga4PrevStart = prevStart.toISOString().split('T')[0];
      const ga4PrevEnd = prevEnd.toISOString().split('T')[0];

      console.log(`📊 [KPIs/GA4] Fetching from GA4 API: ${ga4Start} to ${ga4End} (locale=${locale}, country=${country})`);

      const [sessions, totalUsers, returningUsers, plays, watchTime, completions] = await Promise.all([
        qSessions(ga4Start, ga4End, localeParam, countryParam),
        qTotalUsers(ga4Start, ga4End, localeParam, countryParam),
        qReturningUsers(ga4Start, ga4End, localeParam, countryParam),
        qPlays(ga4Start, ga4End, localeParam, countryParam),
        qWatchTimeTotal(ga4Start, ga4End, localeParam, countryParam),
        qCompletes(ga4Start, ga4End, localeParam, countryParam),
      ]);

      const [prevSessionsCount, prevUsersCount, prevReturningCount] = await Promise.all([
        qSessions(ga4PrevStart, ga4PrevEnd, localeParam, countryParam),
        qTotalUsers(ga4PrevStart, ga4PrevEnd, localeParam, countryParam),
        qReturningUsers(ga4PrevStart, ga4PrevEnd, localeParam, countryParam),
      ]);

      const kpis = {
        totalViews: { value: sessions, trend: [], change: calculateChange(sessions, prevSessionsCount) },
        uniqueVisitors: { value: totalUsers, trend: [], change: calculateChange(totalUsers, prevUsersCount) },
        returnVisitors: { value: returningUsers, trend: [], change: calculateChange(returningUsers, prevReturningCount) },
        sessions: { value: sessions, trend: [], change: calculateChange(sessions, prevSessionsCount) },
        plays: { value: plays, trend: [], change: 0 },
        avgWatch: { value: plays > 0 ? Math.round(watchTime / plays) : 0, trend: [], change: 0 },
        completions: { value: completions, trend: [], change: 0 },
        bounceRate: { value: 0, trend: [], change: 0 },
      };

      const previousPeriod = {
        kpis: {
          totalViews: { value: prevSessionsCount, trend: [] },
          uniqueVisitors: { value: prevUsersCount, trend: [] },
          returnVisitors: { value: prevReturningCount, trend: [] },
          sessions: { value: prevSessionsCount, trend: [] },
          plays: { value: 0, trend: [] },
          avgWatch: { value: 0, trend: [] },
          completions: { value: 0, trend: [] },
        },
      };

      console.log(`✅ [KPIs/GA4] sessions=${sessions}, users=${totalUsers}, plays=${plays}`);

      return res.json({
        kpis,
        previousPeriod,
        sparklines: {},
        timestamp: new Date().toISOString(),
        cached: false,
        dataSource: 'ga4',
      });
    }

    // ---------------------------------------------------------------
    // MEMOPYK DATA SOURCE (default) — query Supabase analytics_sessions
    // ---------------------------------------------------------------
    const endDateEnd = new Date(endDate);
    endDateEnd.setHours(23, 59, 59, 999);

    console.log(`📊 [KPIs/Memopyk] Fetching data from ${startDate.toISOString()} to ${endDateEnd.toISOString()}`);

    // Get excluded IPs for filtering
    const excludedIPs = await getExcludedIPs();

    // Query current period sessions (exclude test data and excluded IPs)
    const sessions = await db
      .select()
      .from(analyticsSessions)
      .where(
        and(
          gte(analyticsSessions.createdAt, startDate),
          lte(analyticsSessions.createdAt, endDateEnd),
          eq(analyticsSessions.isTestData, false),
          excludedIPs.length > 0
            ? or(
                isNull(analyticsSessions.ipAddress),
                notInArray(analyticsSessions.ipAddress, excludedIPs)
              )
            : sql`true`
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
          eq(analyticsSessions.isTestData, false),
          excludedIPs.length > 0
            ? or(
                isNull(analyticsSessions.ipAddress),
                notInArray(analyticsSessions.ipAddress, excludedIPs)
              )
            : sql`true`
        )
      );

    const prevTotalViews = prevSessions.length;
    const prevUniqueVisitors = new Set(prevSessions.map(s => s.ipAddress).filter(Boolean)).size;
    const prevReturnVisitors = prevSessions.filter(s => s.isReturning).length;

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

    console.log(`✅ [KPIs/Memopyk] Returning: ${totalViews} views, ${uniqueVisitors} unique visitors`);

    res.json({
      kpis,
      previousPeriod,
      sparklines: {},
      timestamp: new Date().toISOString(),
      cached: false,
      dataSource: 'memopyk',
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
    const locale = String(req.query.locale || 'all');
    const country = String(req.query.country || 'all');

    console.log(`📊 [Top Videos] Request: period=${period}, limit=${limit}, locale=${locale}, country=${country}`);

    const topVideos = await videoAnalyticsService.getTopVideos(
      period,
      limit,
      startDate || undefined,
      endDate || undefined,
      locale,
      country
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
    const locale = String(req.query.locale || 'all');
    const country = String(req.query.country || 'all');

    console.log(`📊 [Videos] Request: period=${period}, locale=${locale}, country=${country}`);

    const [videoStats, engagement] = await Promise.all([
      videoAnalyticsService.getVideoStats(period, startDate || undefined, endDate || undefined, locale, country),
      videoAnalyticsService.getVideoEngagement(period, startDate || undefined, endDate || undefined, locale, country),
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
    const locale = String(req.query.locale || 'all');
    const country = String(req.query.country || 'all');

    if (!videoId) {
      return res.status(400).json({ error: 'Missing videoId parameter' });
    }

    console.log(`📊 [Funnel] Request: videoId=${videoId}, period=${period}, locale=${locale}, country=${country}`);

    const funnel = await videoAnalyticsService.getVideoFunnel(
      videoId,
      period,
      startDate || undefined,
      endDate || undefined,
      locale,
      country
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
// GA4 Geo Endpoint (Geographic distribution)
// ============================================================================

router.get('/ga4/geo', async (req: Request, res: Response) => {
  try {
    const startDateStr = String(req.query.startDate || req.query.start || '');
    const endDateStr = String(req.query.endDate || req.query.end || '');
    const locale = String(req.query.locale || 'all');

    console.log(`📊 [Geo] Request: startDate=${startDateStr}, endDate=${endDateStr}, locale=${locale}`);

    // Default to last 30 days if not provided
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startDate = startDateStr ? parseDate(startDateStr) : defaultStart;
    const endDate = endDateStr ? parseDate(endDateStr) : now;
    const endDateEnd = new Date(endDate);
    endDateEnd.setHours(23, 59, 59, 999);

    // Get excluded IPs for filtering
    const excludedIPs = await getExcludedIPs();

    // Build filter conditions
    const conditions = [
      gte(analyticsSessions.createdAt, startDate),
      lte(analyticsSessions.createdAt, endDateEnd),
      eq(analyticsSessions.isTestData, false),
      excludedIPs.length > 0
        ? or(
            isNull(analyticsSessions.ipAddress),
            notInArray(analyticsSessions.ipAddress, excludedIPs)
          )
        : sql`true`,
    ];

    // Apply locale filter
    if (locale && locale !== 'all') {
      conditions.push(eq(analyticsSessions.language, locale));
    }

    // Query sessions with country data (exclude test data and excluded IPs)
    const sessions = await db
      .select()
      .from(analyticsSessions)
      .where(and(...conditions));

    // Aggregate by country
    const countryMap = new Map<string, { sessions: number; uniqueIPs: Set<string> }>();

    for (const session of sessions) {
      const country = session.countryCode || 'Unknown';
      if (!countryMap.has(country)) {
        countryMap.set(country, { sessions: 0, uniqueIPs: new Set() });
      }
      const data = countryMap.get(country)!;
      data.sessions++;
      if (session.ipAddress) data.uniqueIPs.add(session.ipAddress);
    }

    // Convert to array and sort by sessions
    const countries = Array.from(countryMap.entries())
      .map(([code, data]) => ({
        country: code,
        countryCode: code,
        sessions: data.sessions,
        users: data.uniqueIPs.size,
        percentage: sessions.length > 0 ? Math.round((data.sessions / sessions.length) * 100) : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);

    console.log(`✅ [Geo] Returning ${countries.length} countries from ${sessions.length} sessions`);

    res.json({
      countries,
      topCountries: countries.slice(0, 10),
      totalSessions: sessions.length,
      totalUsers: new Set(sessions.map(s => s.ipAddress).filter(Boolean)).size,
      timestamp: new Date().toISOString(),
      cached: false,
    });
  } catch (error: any) {
    console.error('❌ [Geo] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch geo data',
      message: error.message,
    });
  }
});

// ============================================================================
// GA4 CTA Endpoint (Call-to-Action tracking)
// ============================================================================

router.get('/ga4/cta', async (req: Request, res: Response) => {
  try {
    const startDateStr = String(req.query.startDate || req.query.start || '');
    const endDateStr = String(req.query.endDate || req.query.end || '');
    const locale = String(req.query.locale || 'all');
    const country = String(req.query.country || 'all');

    console.log(`📊 [CTA] Request: startDate=${startDateStr}, endDate=${endDateStr}, locale=${locale}, country=${country}`);

    // Default to last 30 days
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startDate = startDateStr ? parseDate(startDateStr) : defaultStart;
    const endDate = endDateStr ? parseDate(endDateStr) : now;
    const endDateEnd = new Date(endDate);
    endDateEnd.setHours(23, 59, 59, 999);

    // Query CTA click events from analytics_events table
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const params: any[] = [startDate, endDateEnd];
    let idx = 3;

    let localeFilter = '';
    if (locale && locale !== 'all') {
      localeFilter = `AND (ae.language = $${idx} OR ae.user_language = $${idx})`;
      params.push(locale);
      idx++;
    }

    let countryFilter = '';
    // Country filter via session join if needed
    if (country && country !== 'all' && country !== 'ALL') {
      countryFilter = `AND EXISTS (SELECT 1 FROM analytics_sessions s WHERE s.session_id = ae.session_id AND s.country_code = $${idx})`;
      params.push(country);
      idx++;
    }

    const { rows } = await pool.query(
      `SELECT
         ae.cta_id,
         ae.language,
         ae.page_path,
         ae.page_location,
         ae.created_at
       FROM analytics_events ae
       WHERE ae.event_name = 'cta_click'
         AND ae.created_at >= $1
         AND ae.created_at <= $2
         ${localeFilter}
         ${countryFilter}
       ORDER BY ae.created_at DESC`,
      params
    );

    // Aggregate by CTA ID
    const ctaMap = new Map<string, {
      totalClicks: number;
      frClicks: number;
      enClicks: number;
      sections: Record<string, number>;
      dailyClicks: Map<string, number>;
    }>();

    for (const row of rows) {
      const ctaId = row.cta_id || 'unknown';
      if (!ctaMap.has(ctaId)) {
        ctaMap.set(ctaId, { totalClicks: 0, frClicks: 0, enClicks: 0, sections: {}, dailyClicks: new Map() });
      }
      const cta = ctaMap.get(ctaId)!;
      cta.totalClicks++;
      if (row.language?.startsWith('fr')) cta.frClicks++;
      else cta.enClicks++;

      // Track by page section
      const section = row.page_path || row.page_location || '/';
      cta.sections[section] = (cta.sections[section] || 0) + 1;

      // Track daily
      const dateKey = new Date(row.created_at).toISOString().split('T')[0];
      cta.dailyClicks.set(dateKey, (cta.dailyClicks.get(dateKey) || 0) + 1);
    }

    // Build response matching CtaAnalyticsData format
    const buildCtaData = (ctaId: string) => {
      const data = ctaMap.get(ctaId);
      if (!data) return { totalClicks: 0, frClicks: 0, enClicks: 0, sections: {}, dailyClicks: [] };
      return {
        totalClicks: data.totalClicks,
        frClicks: data.frClicks,
        enClicks: data.enClicks,
        sections: data.sections,
        dailyClicks: Array.from(data.dailyClicks.entries())
          .map(([date, clicks]) => ({ date, clicks }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      };
    };

    const totalClicks = rows.length;

    res.json({
      ctaClicks: rows.slice(0, 100).map(r => ({
        cta_id: r.cta_id,
        language: r.language,
        page_path: r.page_path,
        created_at: r.created_at,
      })),
      topCTAs: Array.from(ctaMap.entries())
        .map(([id, data]) => ({ ctaId: id, clicks: data.totalClicks }))
        .sort((a, b) => b.clicks - a.clicks),
      book_call: buildCtaData('book_call'),
      quick_quote: buildCtaData('quick_quote'),
      totalClicks,
      conversionRate: 0,
      byLocation: {},
      timestamp: new Date().toISOString(),
      cached: false,
    });

    await pool.end();
  } catch (error: any) {
    console.error('❌ [CTA] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch CTA data',
      message: error.message,
    });
  }
});

// ============================================================================
// Tracker Currently Watching Endpoint (Live video viewers)
// ============================================================================

router.get('/tracker/currently-watching', async (_req: Request, res: Response) => {
  try {
    const data = await realtimeService.getCurrentlyWatching();
    res.json(data);
  } catch (error: any) {
    console.error('❌ [Currently Watching] Error:', error);
    res.json({
      totalActive: 0,
      sessions: [],
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// Session Recording Endpoints (/api/analytics/*)
// Frontend tracker (useVideoAnalytics.ts) depends on these
// ============================================================================

/**
 * GET /analytics/current-ip
 * Returns the caller's IP address (for the Exclusions tab "Your IP" badge).
 */
router.get('/analytics/current-ip', (req: Request, res: Response) => {
  const ip = extractClientIP(req.headers as Record<string, string | string[] | undefined>)
    || req.socket.remoteAddress
    || 'unknown';
  res.json(ip);
});

/**
 * POST /analytics/session
 * Create or resume a visitor session.
 * Frontend stores the returned session ID in localStorage for subsequent calls.
 */
router.post('/analytics/session', async (req: Request, res: Response) => {
  try {
    const { language, page_url, referrer } = req.body;
    const ipAddress = extractClientIP(req.headers as Record<string, string | string[] | undefined>)
      || (req.socket.remoteAddress ?? 'unknown');
    const userAgent = req.headers['user-agent'] || '';

    const result = await getOrCreateSession(ipAddress, userAgent, referrer, language);

    if (!result) {
      return res.json({ success: true, filtered: 'ip_excluded' });
    }

    console.log(`📊 [Session] ${result.isNew ? 'Created' : 'Resumed'}: ${result.sessionId}`);

    // Frontend expects { session: { id, session_id } }
    res.json({
      success: true,
      session: { id: result.sessionId, session_id: result.sessionId },
      isNew: result.isNew,
    });
  } catch (error) {
    console.error('❌ [Session] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

/**
 * POST /analytics/session-update
 * Update session duration (called periodically + on page hide/unload)
 */
router.post('/analytics/session-update', async (req: Request, res: Response) => {
  try {
    const { sessionId, duration } = req.body;

    if (!sessionId) {
      return res.json({ success: true, filtered: 'no_session' });
    }

    await updateSession(sessionId, {
      lastSeenAt: new Date(),
      sessionDuration: typeof duration === 'number' ? duration : 0,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Session Update] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update session' });
  }
});

/**
 * POST /analytics/session-page-view
 * Record a SPA page navigation within an existing session
 */
router.post('/analytics/session-page-view', async (req: Request, res: Response) => {
  try {
    const { sessionId, pageUrl } = req.body;
    const ipAddress = extractClientIP(req.headers as Record<string, string | string[] | undefined>)
      || (req.socket.remoteAddress ?? 'unknown');
    const userAgent = req.headers['user-agent'] || '';

    if (!sessionId) {
      return res.json({ success: true, filtered: 'no_session' });
    }

    const result = await eventRecorder.recordPageView({
      sessionId,
      pageUrl: pageUrl || '/',
      ipAddress,
      userAgent,
    });

    res.json({ success: true, recorded: result.success });
  } catch (error) {
    console.error('❌ [Page View] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to record page view' });
  }
});

/**
 * POST /analytics/video-view
 * Record a video view event, linked to existing session if available
 */
router.post('/analytics/video-view', async (req: Request, res: Response) => {
  try {
    const { video_id, duration_watched, completed, session_id, progress, completion_percentage, video_duration } = req.body;
    const ipAddress = extractClientIP(req.headers as Record<string, string | string[] | undefined>)
      || (req.socket.remoteAddress ?? 'unknown');
    const userAgent = req.headers['user-agent'] || '';

    // Server-side dedup: check for existing view of same video in same session
    if (session_id && video_id) {
      const existingViews = await db.select()
        .from(analyticsViews)
        .where(and(
          eq(analyticsViews.sessionId, session_id),
          eq(analyticsViews.videoId, video_id)
        ))
        .limit(1);

      if (existingViews.length > 0) {
        const existing = existingViews[0];

        // Already completed — skip entirely
        if (existing.watchedToEnd) {
          return res.json({ success: true, deduplicated: true });
        }

        // Existing row not completed but new event has completion/progress — update it
        if (completed || duration_watched) {
          let newCompletion: string | null = existing.completionPercentage;
          if (completed) {
            newCompletion = '100';
          } else if (progress ?? completion_percentage) {
            newCompletion = String(progress ?? completion_percentage);
          } else if (duration_watched && video_duration) {
            newCompletion = String(Math.round((duration_watched / video_duration) * 100));
          }

          await db.update(analyticsViews)
            .set({
              viewDuration: duration_watched ?? existing.viewDuration,
              completionPercentage: newCompletion,
              watchedToEnd: completed || false,
            })
            .where(eq(analyticsViews.viewId, existing.viewId));

          return res.json({ success: true, updated: true });
        }

        // Duplicate play event — skip
        return res.json({ success: true, deduplicated: true });
      }
    }

    const action = completed ? 'complete' : (duration_watched ? 'progress' : 'play');

    // Calculate progress if not provided but video_duration is known
    let progressValue = progress ?? completion_percentage;
    if (progressValue == null && duration_watched && video_duration) {
      progressValue = Math.round((duration_watched / video_duration) * 100);
    }

    const result = await eventRecorder.recordVideoEvent({
      sessionId: session_id,
      videoId: video_id,
      action,
      watchTime: duration_watched,
      progress: progressValue,
      ipAddress,
      userAgent,
    });

    res.json({ success: true, recorded: result.success });
  } catch (error) {
    console.error('❌ [Video View] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to record video view' });
  }
});

/**
 * POST /analytics/event
 * General event recording.
 * Accepts BOTH event_name (new frontend) and type (legacy) fields.
 */
router.post('/analytics/event', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    // Normalize: frontend sends event_name, legacy code sends type
    const type = body.type || body.event_name;
    const ipAddress = extractClientIP(req.headers as Record<string, string | string[] | undefined>)
      || (req.socket.remoteAddress ?? 'unknown');
    const userAgent = req.headers['user-agent'] || '';

    if (!type) {
      return res.status(400).json({ success: false, error: 'event_name or type is required' });
    }

    let result;

    if ((type === 'video' || body.videoId || body.video_id) && (body.videoId || body.video_id)) {
      result = await eventRecorder.recordVideoEvent({
        sessionId: body.sessionId || body.session_id,
        videoId: body.videoId || body.video_id,
        videoTitle: body.videoTitle,
        videoType: body.videoType,
        action: body.action || 'play',
        progress: body.progress,
        watchTime: body.watchTime,
        ipAddress,
        userAgent,
      });
    } else if (type === 'pageview' || body.page || body.pageUrl || body.page_path) {
      result = await eventRecorder.recordPageView({
        sessionId: body.sessionId || body.session_id,
        pageUrl: body.page || body.pageUrl || body.page_path || '/',
        pageTitle: body.pageTitle || body.page_title,
        referrer: body.referrer,
        language: body.language || body.user_language,
        ipAddress,
        userAgent,
      });
    } else {
      // Generic event (button_click, scroll_engagement, etc.) — log only
      console.log(`📊 [Analytics Event] ${type}: ${body.page_path || '/'}`);
      return res.json({ success: true, type: 'logged' });
    }

    if (result.success) {
      res.json({ success: true, id: result.id });
    } else {
      res.json({ success: true, filtered: result.reason });
    }
  } catch (error) {
    console.error('❌ [Analytics Event] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process event' });
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

    // Persist CTA click events to analytics_events table
    if (eventData.event_name === 'cta_click' && process.env.DATABASE_URL) {
      try {
        const { Pool } = await import('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        await pool.query(
          `INSERT INTO analytics_events (event_name, cta_id, page_path, page_location, language, user_agent, referrer, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            'cta_click',
            eventData.cta_id || null,
            eventData.page_path || null,
            eventData.page_location || null,
            eventData.language || null,
            enrichedEventData.user_agent,
            enrichedEventData.referrer,
          ]
        );
        await pool.end();
        console.log(`📊 [Analytics] CTA click persisted: ${eventData.cta_id}`);
      } catch (dbErr) {
        console.error('❌ [Analytics] Failed to persist CTA event:', dbErr);
      }
    } else {
      console.log('📊 [Analytics] Event received:', enrichedEventData.event_name);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Analytics event endpoint error:', err);
    res.status(500).json({ success: false, error: 'Failed to process analytics event' });
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

export default router;
