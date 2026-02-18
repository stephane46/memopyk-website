/**
 * Realtime Analytics Service
 *
 * Provides live visitor tracking data from analytics_sessions and analytics_views.
 * Used by the Live View dashboard tab.
 */

import { db } from "../../db";
import { analyticsSessions, analyticsViews, realtimeVisitors } from "@shared/schema";
import { eq, and, gte, lte, desc, isNotNull, sql, inArray } from "drizzle-orm";
import ipExclusionService from "./ip-exclusion.service";

// ============================================================================
// Types
// ============================================================================

export interface LiveTrackingData {
  activeUsers: number;
  byCountry: Array<{ country: string; users: number; countryCode?: string }>;
  byDevice: Array<{ device: string; users: number }>;
  timestamp: string;
}

export interface RecentVisitor {
  ipAddress: string;
  country: string;
  region: string;
  city: string;
  language: string;
  lastVisit: string;
  userAgent: string;
  visitCount: number;
  sessionDuration: number;
  previousVisit: string | null;
}

export interface CurrentlyWatchingSession {
  sessionId: string;
  videoId: string | null;
  videoTitle?: string;
  progress: number;
  currentTime: number;
  duration: number;
  location: string;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
  regionCode?: string | null;
  device: string;
  clarityUrl: string;
}

export interface CurrentlyWatchingData {
  totalActive: number;
  sessions: CurrentlyWatchingSession[];
  timestamp: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date N minutes ago
 */
function getMinutesAgo(minutes: number): Date {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date;
}

/**
 * Parse device category from user agent
 */
function parseDeviceCategory(userAgent: string | null): string {
  if (!userAgent) return "Desktop";
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return "Mobile";
  }
  if (ua.includes("tablet") || ua.includes("ipad")) {
    return "Tablet";
  }
  return "Desktop";
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get live tracking data (active users in last 30 minutes)
 */
export async function getLiveTracking(timeWindowMinutes: number = 30): Promise<LiveTrackingData> {
  try {
    const cutoffTime = getMinutesAgo(timeWindowMinutes);

    console.log(`📊 [Realtime] Fetching active sessions since ${cutoffTime.toISOString()}`);

    // Query sessions active in the time window using createdAt
    const sessions = await db
      .select()
      .from(analyticsSessions)
      .where(
        and(
          gte(analyticsSessions.createdAt, cutoffTime),
          eq(analyticsSessions.isTestData, false)
        )
      );

    // Filter out excluded IPs
    const filteredSessions = [];
    for (const session of sessions) {
      if (session.ipAddress) {
        const isExcluded = await ipExclusionService.isExcludedIP(session.ipAddress);
        if (!isExcluded) {
          filteredSessions.push(session);
        }
      } else {
        filteredSessions.push(session);
      }
    }

    // Aggregate by country
    const countryMap = new Map<string, { count: number; countryCode?: string }>();
    for (const session of filteredSessions) {
      const country = session.countryName || session.country || "Unknown";
      const countryCode = session.countryCode || session.countryIso2 || undefined;
      const existing = countryMap.get(country) || { count: 0, countryCode };
      countryMap.set(country, { count: existing.count + 1, countryCode: countryCode || existing.countryCode });
    }

    const byCountry = Array.from(countryMap.entries())
      .map(([country, data]) => ({
        country,
        users: data.count,
        countryCode: data.countryCode,
      }))
      .sort((a, b) => b.users - a.users);

    // Aggregate by device
    const deviceMap = new Map<string, number>();
    for (const session of filteredSessions) {
      const device = session.deviceCategory || parseDeviceCategory(session.userAgent);
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
    }

    const byDevice = Array.from(deviceMap.entries())
      .map(([device, users]) => ({ device, users }))
      .sort((a, b) => b.users - a.users);

    console.log(`✅ [Realtime] ${filteredSessions.length} active users`);

    return {
      activeUsers: filteredSessions.length,
      byCountry,
      byDevice,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ [Realtime] Error fetching live tracking:", error);
    return {
      activeUsers: 0,
      byCountry: [],
      byDevice: [],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get recent visitors (today or custom date range)
 */
export async function getRecentVisitors(
  datePreset: string = "today",
  limit: number = 50,
  dateFrom?: Date | string,
  dateTo?: Date | string,
  country?: string
): Promise<RecentVisitor[]> {
  try {
    let startDate: Date;
    let endDate: Date | undefined;
    const now = new Date();

    if (dateFrom) {
      // Explicit date range takes priority over preset
      startDate = dateFrom instanceof Date ? dateFrom : new Date(dateFrom);
      endDate = dateTo
        ? (dateTo instanceof Date ? dateTo : new Date(dateTo))
        : now;
      // Include full end day
      endDate = new Date(endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (datePreset) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "7d":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
    }

    console.log(`📊 [Realtime] Fetching recent visitors since ${startDate.toISOString()}${endDate ? ` to ${endDate.toISOString()}` : ''}`);

    // Build where conditions
    const conditions = [
      gte(analyticsSessions.createdAt, startDate),
      eq(analyticsSessions.isTestData, false),
    ];

    if (endDate) {
      conditions.push(lte(analyticsSessions.createdAt, endDate) as any);
    }

    if (country && country !== 'all' && country !== 'ALL') {
      conditions.push(eq(analyticsSessions.countryCode, country) as any);
    }

    // Query recent sessions ordered by most recent
    const sessions = await db
      .select()
      .from(analyticsSessions)
      .where(and(...conditions))
      .orderBy(desc(analyticsSessions.createdAt))
      .limit(limit * 2); // Get more to account for exclusions

    console.log(`📊 [Realtime] Found ${sessions.length} sessions in DB`);

    // Get per-IP session counts in one grouped query to avoid N+1
    const ipCounts = new Map<string, number>();
    if (sessions.length > 0) {
      const ipAddresses = [...new Set(sessions.map(s => s.ipAddress).filter(Boolean))] as string[];
      if (ipAddresses.length > 0) {
        const countRows = await db
          .select({
            ipAddress: analyticsSessions.ipAddress,
            count: sql<number>`count(*)::int`,
          })
          .from(analyticsSessions)
          .where(
            and(
              inArray(analyticsSessions.ipAddress, ipAddresses),
              eq(analyticsSessions.isTestData, false)
            )
          )
          .groupBy(analyticsSessions.ipAddress);

        for (const row of countRows) {
          if (row.ipAddress) {
            ipCounts.set(row.ipAddress, row.count);
          }
        }
      }
    }

    // Filter out excluded IPs and build visitor list
    const visitors: RecentVisitor[] = [];
    const seenIPs = new Set<string>();

    for (const session of sessions) {
      if (visitors.length >= limit) break;

      // Skip if already seen this IP (show unique visitors)
      if (session.ipAddress && seenIPs.has(session.ipAddress)) continue;

      // Check exclusion (skip if excluded)
      if (session.ipAddress) {
        const isExcluded = await ipExclusionService.isExcludedIP(session.ipAddress);
        if (isExcluded) continue;
        seenIPs.add(session.ipAddress);
      }

      visitors.push({
        ipAddress: session.ipAddress || "unknown",
        country: session.countryName || session.country || "Unknown",
        region: "", // Not stored in current schema
        city: session.city || "",
        language: session.language || "Unknown",
        lastVisit: (session.lastSeenAt || session.createdAt || new Date()).toISOString(),
        userAgent: session.userAgent || "",
        visitCount: (session.ipAddress ? ipCounts.get(session.ipAddress) : undefined) ?? 1,
        sessionDuration: session.sessionDuration || 0,
        previousVisit: null,
      });
    }

    console.log(`✅ [Realtime] Returning ${visitors.length} recent visitors (filtered from ${sessions.length} sessions)`);
    return visitors;
  } catch (error) {
    console.error("❌ [Realtime] Error fetching recent visitors:", error);
    return [];
  }
}

/**
 * Get currently watching video sessions (last 2 minutes)
 */
export async function getCurrentlyWatching(): Promise<CurrentlyWatchingData> {
  try {
    const cutoffTime = getMinutesAgo(2);

    console.log(`📊 [Realtime] Fetching video views since ${cutoffTime.toISOString()}`);

    // Query recent video views
    const views = await db
      .select()
      .from(analyticsViews)
      .where(
        and(
          isNotNull(analyticsViews.videoId),
          gte(analyticsViews.viewTimestamp, cutoffTime),
          eq(analyticsViews.isTestData, false)
        )
      )
      .orderBy(desc(analyticsViews.viewTimestamp));

    // Filter out excluded IPs
    const filteredViews = [];
    for (const view of views) {
      if (view.ipAddress) {
        const isExcluded = await ipExclusionService.isExcludedIP(view.ipAddress);
        if (!isExcluded) {
          filteredViews.push(view);
        }
      } else {
        filteredViews.push(view);
      }
    }

    // Build session list
    const sessions: CurrentlyWatchingSession[] = filteredViews.map((view) => {
      const progress = parseFloat(view.completionPercentage || "0");
      const duration = view.viewDuration || 0;

      return {
        sessionId: view.sessionId || view.id,
        videoId: view.videoId,
        videoTitle: view.videoTitle || undefined,
        progress,
        currentTime: Math.round((progress / 100) * duration),
        duration,
        location: view.countryName || view.country || "Unknown",
        country: view.countryName || view.country || null,
        countryCode: view.countryCode || null,
        city: view.city || null,
        region: view.region || null,
        regionCode: null,
        device: view.deviceCategory || "Desktop",
        clarityUrl: "", // Clarity integration not implemented
      };
    });

    console.log(`✅ [Realtime] ${sessions.length} currently watching`);

    return {
      totalActive: sessions.length,
      sessions,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ [Realtime] Error fetching currently watching:", error);
    return {
      totalActive: 0,
      sessions: [],
      timestamp: new Date().toISOString(),
    };
  }
}

export default {
  getLiveTracking,
  getRecentVisitors,
  getCurrentlyWatching,
};
