/**
 * Video Analytics Service
 *
 * Aggregates video performance data from analytics_views table.
 * Provides metrics like views, watch time, completion rates.
 */

import { db } from "../../db";
import { analyticsViews, analyticsSessions } from "@shared/schema";
import { eq, and, gte, lte, isNotNull, sql, desc, inArray } from "drizzle-orm";

/**
 * Parse period string to date range
 */
function parsePeriod(period: string = "30d"): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  const match = period.match(/^(\d+)d$/);
  if (match) {
    const days = parseInt(match[1], 10);
    startDate.setDate(startDate.getDate() - days);
  } else if (period === "7d") {
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === "90d") {
    startDate.setDate(startDate.getDate() - 90);
  } else {
    startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate };
}

/**
 * Parse date from YYYYMMDD or ISO format
 */
function parseDate(dateStr: string): Date {
  if (/^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

/**
 * Get sessionIds for non-bot sessions matching date range and optional locale/country filters.
 * Always filters out bots. Returns empty array if no sessions match.
 */
async function getFilteredSessionIds(
  startDate: Date,
  endDate: Date,
  locale?: string,
  country?: string
): Promise<string[]> {
  const conditions: any[] = [
    gte(analyticsSessions.createdAt, startDate),
    lte(analyticsSessions.createdAt, endDate),
    eq(analyticsSessions.isTestData, false),
    eq(analyticsSessions.isBot, false),
  ];

  if (locale && locale !== 'all') {
    conditions.push(eq(analyticsSessions.language, locale));
  }
  if (country && country !== 'all') {
    conditions.push(eq(analyticsSessions.countryCode, country));
  }

  const sessions = await db
    .select({ sessionId: analyticsSessions.sessionId })
    .from(analyticsSessions)
    .where(and(...conditions));

  return sessions.map(s => s.sessionId);
}

export interface VideoStats {
  videoId: string;
  title: string;
  videoType: string;
  views: number;
  uniqueViewers: number;
  averageWatchTime: number;
  completionRate: number;
  engagement: number;
  // Legacy aliases
  plays?: number;
  avgWatchSeconds?: number;
  reach50Pct?: number;
  completePct?: number;
}

export interface TopVideoRow {
  video_id: string;
  title: string;
  plays: number;
  avgWatchSeconds: number;
  reach50Pct: number;
  completePct: number;
}

export interface VideoEngagement {
  totalVideoViews: number;
  totalWatchTimeSeconds: number;
  avgCompletionRate: number;
  viewersWhoWatchedVideos: number;
  totalVisitors: number;
  engagementPercentage: number;
}

/**
 * Get video statistics aggregated from analytics_views
 */
export async function getVideoStats(
  period?: string,
  startDateStr?: string,
  endDateStr?: string,
  locale?: string,
  country?: string
): Promise<VideoStats[]> {
  try {
    let startDate: Date;
    let endDate: Date;

    if (startDateStr && endDateStr) {
      startDate = parseDate(startDateStr);
      endDate = parseDate(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const range = parsePeriod(period);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    console.log(`📊 [Video Stats] Fetching from ${startDate.toISOString()} to ${endDate.toISOString()}, locale=${locale || 'all'}, country=${country || 'all'}`);

    // Get non-bot session IDs (always filters bots + optional locale/country)
    const sessionIds = await getFilteredSessionIds(startDate, endDate, locale, country);
    if (sessionIds.length === 0) {
      console.log(`📊 [Video Stats] No sessions match filters — returning empty`);
      return [];
    }

    // Build WHERE conditions
    const conditions: any[] = [
      isNotNull(analyticsViews.videoId),
      gte(analyticsViews.viewTimestamp, startDate),
      lte(analyticsViews.viewTimestamp, endDate),
      eq(analyticsViews.isTestData, false),
      inArray(analyticsViews.sessionId, sessionIds),
    ];

    // Query video views
    const videoViews = await db
      .select()
      .from(analyticsViews)
      .where(and(...conditions));

    console.log(`📊 [Video Stats] Found ${videoViews.length} video view records`);

    // Aggregate by videoId
    const videoMap = new Map<string, {
      videoId: string;
      title: string;
      videoType: string;
      views: number;
      uniqueIPs: Set<string>;
      totalWatchTime: number;
      completions: number;
      reach25: number;
      reach50: number;
      reach75: number;
    }>();

    for (const view of videoViews) {
      const videoId = view.videoId || "unknown";
      if (!videoMap.has(videoId)) {
        videoMap.set(videoId, {
          videoId,
          title: view.videoTitle || videoId,
          videoType: view.videoType || "gallery",
          views: 0,
          uniqueIPs: new Set(),
          totalWatchTime: 0,
          completions: 0,
          reach25: 0,
          reach50: 0,
          reach75: 0,
        });
      }

      const stats = videoMap.get(videoId)!;
      stats.views++;
      if (view.ipAddress) stats.uniqueIPs.add(view.ipAddress);
      stats.totalWatchTime += view.viewDuration || 0;
      if (view.watchedToEnd) stats.completions++;

      const pct = parseFloat(view.completionPercentage || '0');
      if (pct >= 25) stats.reach25++;
      if (pct >= 50) stats.reach50++;
      if (pct >= 75) stats.reach75++;
    }

    // Convert to array with calculated metrics
    const result: VideoStats[] = Array.from(videoMap.values()).map((v) => {
      const completionRate = v.views > 0 ? Math.round((v.completions / v.views) * 100) : 0;
      const avgWatchTime = v.views > 0 ? Math.round(v.totalWatchTime / v.views) : 0;
      const engagement = v.views > 0 ? Math.min(100, Math.round((avgWatchTime / 60) * 10)) : 0;

      return {
        videoId: v.videoId,
        title: v.title,
        videoType: v.videoType,
        views: v.views,
        uniqueViewers: v.uniqueIPs.size,
        averageWatchTime: avgWatchTime,
        completionRate,
        engagement,
        // Legacy aliases
        plays: v.views,
        avgWatchSeconds: avgWatchTime,
        reach50Pct: v.views > 0 ? Math.round((v.reach50 / v.views) * 100) : 0,
        completePct: completionRate,
      };
    });

    // Sort by views descending
    result.sort((a, b) => b.views - a.views);

    console.log(`✅ [Video Stats] Returning ${result.length} videos`);
    return result;
  } catch (error) {
    console.error("❌ [Video Stats] Error:", error);
    return [];
  }
}

/**
 * Get top performing videos
 */
export async function getTopVideos(
  period?: string,
  limit: number = 10,
  startDateStr?: string,
  endDateStr?: string,
  locale?: string,
  country?: string
): Promise<TopVideoRow[]> {
  const stats = await getVideoStats(period, startDateStr, endDateStr, locale, country);

  return stats.slice(0, limit).map((s) => ({
    video_id: s.videoId,
    title: s.title,
    plays: s.views,
    avgWatchSeconds: s.averageWatchTime,
    reach50Pct: s.reach50Pct || 0,
    completePct: s.completionRate,
  }));
}

/**
 * Get overall video engagement statistics
 */
export async function getVideoEngagement(
  period?: string,
  startDateStr?: string,
  endDateStr?: string,
  locale?: string,
  country?: string
): Promise<VideoEngagement> {
  try {
    let startDate: Date;
    let endDate: Date;

    if (startDateStr && endDateStr) {
      startDate = parseDate(startDateStr);
      endDate = parseDate(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const range = parsePeriod(period);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    // Build session filter conditions
    const sessionConditions: any[] = [
      gte(analyticsSessions.createdAt, startDate),
      lte(analyticsSessions.createdAt, endDate),
      eq(analyticsSessions.isTestData, false),
      eq(analyticsSessions.isBot, false),
    ];
    if (locale && locale !== 'all') {
      sessionConditions.push(eq(analyticsSessions.language, locale));
    }
    if (country && country !== 'all') {
      sessionConditions.push(eq(analyticsSessions.countryCode, country));
    }

    // Get total sessions for the period (with locale/country filters)
    const sessions = await db
      .select()
      .from(analyticsSessions)
      .where(and(...sessionConditions));

    // Get non-bot session IDs for video views query
    const sessionIds = sessions.map(s => s.sessionId);
    if (sessionIds.length === 0) {
      return {
        totalVideoViews: 0,
        totalWatchTimeSeconds: 0,
        avgCompletionRate: 0,
        viewersWhoWatchedVideos: 0,
        totalVisitors: 0,
        engagementPercentage: 0,
      };
    }

    // Build view conditions (always filter by non-bot sessions)
    const viewConditions: any[] = [
      isNotNull(analyticsViews.videoId),
      gte(analyticsViews.viewTimestamp, startDate),
      lte(analyticsViews.viewTimestamp, endDate),
      eq(analyticsViews.isTestData, false),
      inArray(analyticsViews.sessionId, sessionIds),
    ];

    // Get video views
    const videoViews = await db
      .select()
      .from(analyticsViews)
      .where(and(...viewConditions));

    const totalVideoViews = videoViews.length;
    const totalWatchTimeSeconds = videoViews.reduce((sum, v) => sum + (v.viewDuration || 0), 0);
    const completions = videoViews.filter((v) => v.watchedToEnd).length;
    const avgCompletionRate = totalVideoViews > 0 ? Math.round((completions / totalVideoViews) * 100) : 0;

    const uniqueVideoViewerIPs = new Set(videoViews.map((v) => v.ipAddress).filter(Boolean));
    const viewersWhoWatchedVideos = uniqueVideoViewerIPs.size;
    const totalVisitors = new Set(sessions.map((s) => s.ipAddress).filter(Boolean)).size;
    const engagementPercentage = totalVisitors > 0 ? Math.round((viewersWhoWatchedVideos / totalVisitors) * 100) : 0;

    return {
      totalVideoViews,
      totalWatchTimeSeconds,
      avgCompletionRate,
      viewersWhoWatchedVideos,
      totalVisitors,
      engagementPercentage,
    };
  } catch (error) {
    console.error("❌ [Video Engagement] Error:", error);
    return {
      totalVideoViews: 0,
      totalWatchTimeSeconds: 0,
      avgCompletionRate: 0,
      viewersWhoWatchedVideos: 0,
      totalVisitors: 0,
      engagementPercentage: 0,
    };
  }
}

/**
 * Get video funnel data (progress buckets)
 */
export async function getVideoFunnel(
  videoId: string,
  period?: string,
  startDateStr?: string,
  endDateStr?: string,
  locale?: string,
  country?: string
): Promise<Array<{ bucket: number; count: number }>> {
  try {
    let startDate: Date;
    let endDate: Date;

    if (startDateStr && endDateStr) {
      startDate = parseDate(startDateStr);
      endDate = parseDate(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const range = parsePeriod(period);
      startDate = range.startDate;
      endDate = range.endDate;
    }

    // Get non-bot session IDs (always filters bots + optional locale/country)
    const sessionIds = await getFilteredSessionIds(startDate, endDate, locale, country);
    if (sessionIds.length === 0) {
      return [10, 25, 50, 75, 90].map((bucket) => ({ bucket, count: 0 }));
    }

    // Build WHERE conditions
    const conditions: any[] = [
      eq(analyticsViews.videoId, videoId),
      gte(analyticsViews.viewTimestamp, startDate),
      lte(analyticsViews.viewTimestamp, endDate),
      eq(analyticsViews.isTestData, false),
      inArray(analyticsViews.sessionId, sessionIds),
    ];

    // Query video views for this video
    const videoViews = await db
      .select()
      .from(analyticsViews)
      .where(and(...conditions));

    // Aggregate by completion percentage buckets
    const buckets = [10, 25, 50, 75, 90];
    const bucketCounts = new Map<number, number>();
    buckets.forEach((b) => bucketCounts.set(b, 0));

    for (const view of videoViews) {
      const completion = parseFloat(view.completionPercentage || "0");
      for (const bucket of buckets) {
        if (completion >= bucket) {
          bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1);
        }
      }
    }

    return buckets.map((bucket) => ({
      bucket,
      count: bucketCounts.get(bucket) || 0,
    }));
  } catch (error) {
    console.error("❌ [Video Funnel] Error:", error);
    return [10, 25, 50, 75, 90].map((bucket) => ({ bucket, count: 0 }));
  }
}

export default {
  getVideoStats,
  getTopVideos,
  getVideoEngagement,
  getVideoFunnel,
};
