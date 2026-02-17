/**
 * Event Recorder Service
 *
 * Core analytics tracking: records page views, video events, and performance metrics.
 * All events are checked against IP exclusions before recording.
 * Includes deduplication to prevent spam within 30-second windows.
 */

import { db } from "../../db";
import { analyticsViews, analyticsSessions, performanceMetrics } from "@shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { isExcludedIP } from "./ip-exclusion.service";
import { getOrCreateSession } from "./session.service";

// Deduplication cache: key -> timestamp
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 30_000; // 30 seconds

/**
 * Clean up old entries from deduplication cache
 */
function cleanupDeduplicationCache(): void {
  const now = Date.now();
  for (const [key, timestamp] of recentEvents.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentEvents.delete(key);
    }
  }
}

// Clean up cache every minute
setInterval(cleanupDeduplicationCache, 60_000);

/**
 * Check if an event is a duplicate within the deduplication window
 */
function isDuplicate(key: string): boolean {
  const lastSeen = recentEvents.get(key);
  if (lastSeen && Date.now() - lastSeen < DEDUP_WINDOW_MS) {
    return true;
  }
  recentEvents.set(key, Date.now());
  return false;
}

/**
 * Generate a unique view ID
 */
function generateViewId(): string {
  return `view_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract client IP from request headers
 */
export function extractClientIP(headers: Record<string, string | string[] | undefined>): string {
  // Check x-forwarded-for header (for proxied requests)
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0].trim();
    if (ip) return ip;
  }

  // Check x-real-ip header
  const realIp = headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return "unknown";
}

export interface PageViewData {
  sessionId?: string;
  pageUrl: string;
  pageTitle?: string;
  referrer?: string;
  language?: string;
  ipAddress: string;
  userAgent?: string;
}

export interface VideoEventData {
  sessionId?: string;
  videoId: string;
  videoTitle?: string;
  videoType?: string; // "hero", "gallery", etc.
  action: "play" | "progress" | "complete" | "pause";
  progress?: number; // 0-100 for progress events
  watchTime?: number; // seconds watched
  ipAddress: string;
  userAgent?: string;
}

export interface PerformanceData {
  sessionId?: string;
  lcp?: number; // Largest Contentful Paint (ms)
  fid?: number; // First Input Delay (ms)
  cls?: number; // Cumulative Layout Shift (score)
  ttfb?: number; // Time to First Byte (ms)
  pageUrl?: string;
  ipAddress: string;
  userAgent?: string;
}

export interface RecordResult {
  success: boolean;
  reason?: string;
  id?: string;
}

/**
 * Record a page view event
 */
export async function recordPageView(data: PageViewData): Promise<RecordResult> {
  try {
    // Check IP exclusion (done in getOrCreateSession, but check early for dedup)
    if (await isExcludedIP(data.ipAddress)) {
      return { success: false, reason: "ip_excluded" };
    }

    // Deduplicate: same IP + same page within window
    const dedupKey = `pageview:${data.ipAddress}:${data.pageUrl}`;
    if (isDuplicate(dedupKey)) {
      return { success: false, reason: "duplicate" };
    }

    // Get or create session (this also updates session page count)
    let sessionId = data.sessionId;
    if (!sessionId) {
      const sessionResult = await getOrCreateSession(
        data.ipAddress,
        data.userAgent || "",
        data.referrer,
        data.language
      );
      if (sessionResult) {
        sessionId = sessionResult.sessionId;
      } else {
        // Session creation failed (likely IP excluded)
        return { success: false, reason: "session_failed" };
      }
    }

    const viewId = generateViewId();

    const rows = await db
      .insert(analyticsViews)
      .values({
        viewId,
        sessionId,
        pageUrl: data.pageUrl,
        pageTitle: data.pageTitle || null,
        referrer: data.referrer || null,
        language: data.language || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        viewTimestamp: new Date(),
        isBounceView: false,
        isTestData: isTestDataIP(data.ipAddress),
      })
      .returning();

    console.log(`📊 Page view recorded: ${data.pageUrl} (${viewId}, session: ${sessionId})`);
    return { success: true, id: rows[0]?.id };
  } catch (error) {
    console.error("Error recording page view:", error);
    return { success: false, reason: "database_error" };
  }
}

/**
 * Record a video event (play, progress, complete, pause)
 */
export async function recordVideoEvent(data: VideoEventData): Promise<RecordResult> {
  try {
    // Check IP exclusion
    if (await isExcludedIP(data.ipAddress)) {
      return { success: false, reason: "ip_excluded" };
    }

    // Deduplicate: same IP + same video + same action within window
    const dedupKey = `video:${data.ipAddress}:${data.videoId}:${data.action}`;
    if (isDuplicate(dedupKey)) {
      return { success: false, reason: "duplicate" };
    }

    // Get or create session
    let sessionId = data.sessionId;
    if (!sessionId) {
      const sessionResult = await getOrCreateSession(
        data.ipAddress,
        data.userAgent || ""
      );
      if (sessionResult) {
        sessionId = sessionResult.sessionId;
      } else {
        return { success: false, reason: "session_failed" };
      }
    }

    const viewId = generateViewId();

    // Calculate completion percentage for progress/complete events
    let completionPercentage: string | null = null;
    if (data.action === "complete") {
      completionPercentage = "100";
    } else if (data.action === "progress" && data.progress !== undefined) {
      completionPercentage = String(data.progress);
    }

    const rows = await db
      .insert(analyticsViews)
      .values({
        viewId,
        sessionId,
        videoId: data.videoId,
        videoTitle: data.videoTitle || null,
        videoType: data.videoType || "gallery",
        viewDuration: data.watchTime || null,
        completionPercentage,
        watchedToEnd: data.action === "complete",
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        viewTimestamp: new Date(),
        isTestData: isTestDataIP(data.ipAddress),
      })
      .returning();

    console.log(`🎬 Video event recorded: ${data.action} on ${data.videoId} (${viewId})`);
    return { success: true, id: rows[0]?.id };
  } catch (error) {
    console.error("Error recording video event:", error);
    return { success: false, reason: "database_error" };
  }
}

/**
 * Record Core Web Vitals performance metrics
 * Inserts one row per page with all metric values as columns (matches DB schema)
 */
export async function recordPerformanceMetrics(data: PerformanceData): Promise<RecordResult> {
  try {
    // Check IP exclusion
    if (await isExcludedIP(data.ipAddress)) {
      return { success: false, reason: "ip_excluded" };
    }

    // Deduplicate: same IP + same page within window
    const dedupKey = `perf:${data.ipAddress}:${data.pageUrl || "unknown"}`;
    if (isDuplicate(dedupKey)) {
      return { success: false, reason: "duplicate" };
    }

    // Check if we have any metrics to record
    if (data.lcp === undefined && data.fid === undefined && data.cls === undefined && data.ttfb === undefined) {
      return { success: false, reason: "no_metrics" };
    }

    await db.insert(performanceMetrics).values({
      pagePath: data.pageUrl || null,
      lcpValue: data.lcp !== undefined ? String(data.lcp) : null,
      clsValue: data.cls !== undefined ? String(data.cls) : null,
      fidValue: data.fid !== undefined ? String(data.fid) : null,
      ttfb: data.ttfb !== undefined ? Math.round(data.ttfb) : null,
    });

    const metricNames: string[] = [];
    if (data.lcp !== undefined) metricNames.push("LCP");
    if (data.fid !== undefined) metricNames.push("FID");
    if (data.cls !== undefined) metricNames.push("CLS");
    if (data.ttfb !== undefined) metricNames.push("TTFB");

    console.log(`⚡ Performance metrics recorded: ${metricNames.join(", ")}`);
    return { success: true };
  } catch (error) {
    console.error("Error recording performance metrics:", error);
    return { success: false, reason: "database_error" };
  }
}

/**
 * Helper: Detect if IP is likely test/development data
 */
function isTestDataIP(ip: string): boolean {
  return (
    ip === "unknown" ||
    ip === "0.0.0.0" ||
    ip.startsWith("127.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.")
  );
}

export default {
  recordPageView,
  recordVideoEvent,
  recordPerformanceMetrics,
  extractClientIP,
};
