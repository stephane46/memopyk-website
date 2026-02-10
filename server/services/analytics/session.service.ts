/**
 * Session Service
 *
 * Manages visitor sessions for analytics tracking.
 * Sessions group individual page views and video events into visitor journeys.
 * A new session is created after 30 minutes of inactivity.
 */

import { db } from "../../db";
import { analyticsSessions, analyticsExclusions } from "@shared/schema";
import { eq, and, gte, lte, desc, sql, notInArray, isNull, or } from "drizzle-orm";
import { isExcludedIP } from "./ip-exclusion.service";
import { lookupIP } from "./geo.service";

/**
 * Get list of excluded IP addresses from analytics_exclusions table
 */
async function getExcludedIPs(): Promise<string[]> {
  try {
    const exclusions = await db
      .select({ ipCidr: analyticsExclusions.ipCidr })
      .from(analyticsExclusions)
      .where(eq(analyticsExclusions.active, true));
    return exclusions.map(e => e.ipCidr.replace(/\/\d+$/, ''));
  } catch (error) {
    console.error('Error fetching excluded IPs:', error);
    return [];
  }
}

// Session timeout: 30 minutes of inactivity = new session
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// In-memory cache for active sessions (IP -> session data)
const activeSessions = new Map<string, { sessionId: string; lastActivity: number }>();

// Clean up stale cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeSessions.entries()) {
    if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
      activeSessions.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Detect device category from user agent
 */
function detectDeviceCategory(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return "mobile";
  }
  if (ua.includes("tablet") || ua.includes("ipad")) {
    return "tablet";
  }
  return "desktop";
}

/**
 * Detect if IP is likely test/development data
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

export interface SessionData {
  id: string;
  sessionId: string;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  language: string | null;
  countryCode: string | null;
  countryName: string | null;
  deviceCategory: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  sessionDuration: number | null;
  pageCount: number | null;
  isBounce: boolean | null;
  isReturning: boolean | null;
  isTestData: boolean | null;
  createdAt: Date | null;
}

export interface SessionFilters {
  period?: "7d" | "30d" | "90d" | "all";
  dateFrom?: string;
  dateTo?: string;
  country?: string;
  device?: string;
  excludeTestData?: boolean;
}

export interface SessionStats {
  totalSessions: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;
  newVisitors: number;
  returningVisitors: number;
}

/**
 * Get or create a session for a visitor
 * Returns existing session if within timeout, creates new one otherwise
 */
export async function getOrCreateSession(
  ip: string,
  userAgent: string,
  referrer?: string,
  language?: string
): Promise<{ sessionId: string; isNew: boolean } | null> {
  try {
    // Check IP exclusion
    if (await isExcludedIP(ip)) {
      return null;
    }

    const cacheKey = `${ip}:${userAgent.substring(0, 50)}`;
    const now = Date.now();

    // Check in-memory cache first
    const cached = activeSessions.get(cacheKey);
    if (cached && now - cached.lastActivity < SESSION_TIMEOUT_MS) {
      // Update last activity
      cached.lastActivity = now;
      activeSessions.set(cacheKey, cached);

      // Update session in database
      await updateSession(cached.sessionId, {
        lastSeenAt: new Date(),
        pageCount: sql`${analyticsSessions.pageCount} + 1`,
      });

      return { sessionId: cached.sessionId, isNew: false };
    }

    // Check database for recent session from this IP
    const cutoffTime = new Date(now - SESSION_TIMEOUT_MS);
    const existingSessions = await db
      .select()
      .from(analyticsSessions)
      .where(
        and(
          eq(analyticsSessions.ipAddress, ip),
          gte(analyticsSessions.lastSeenAt, cutoffTime)
        )
      )
      .orderBy(desc(analyticsSessions.lastSeenAt))
      .limit(1);

    if (existingSessions.length > 0) {
      const session = existingSessions[0];
      // Update cache and session
      activeSessions.set(cacheKey, {
        sessionId: session.sessionId,
        lastActivity: now,
      });

      await updateSession(session.sessionId, {
        lastSeenAt: new Date(),
        pageCount: sql`${analyticsSessions.pageCount} + 1`,
      });

      return { sessionId: session.sessionId, isNew: false };
    }

    // Check if this is a returning visitor
    const previousVisits = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyticsSessions)
      .where(eq(analyticsSessions.ipAddress, ip));
    const isReturning = (previousVisits[0]?.count || 0) > 0;

    // Create new session
    const sessionId = generateSessionId();
    const nowDate = new Date();

    // Non-blocking geo lookup — don't fail session creation if geo fails
    let geoData: { countryCode: string; countryName: string; city: string | null } | null = null;
    try {
      geoData = lookupIP(ip);
    } catch (e) {
      // Silently ignore geo errors
    }

    await db.insert(analyticsSessions).values({
      sessionId,
      ipAddress: ip,
      userAgent: userAgent || null,
      referrer: referrer || null,
      language: language || null,
      deviceCategory: detectDeviceCategory(userAgent),
      countryCode: geoData?.countryCode || null,
      countryName: geoData?.countryName || null,
      country: geoData?.countryName || null,
      countryIso2: geoData?.countryCode || null,
      city: geoData?.city || null,
      firstSeenAt: nowDate,
      lastSeenAt: nowDate,
      sessionDuration: 0,
      pageCount: 1,
      isBounce: true, // Initially true, will be updated on second page view
      isReturning,
      isTestData: isTestDataIP(ip),
    });

    // Update cache
    activeSessions.set(cacheKey, { sessionId, lastActivity: now });

    console.log(`📊 New session created: ${sessionId} (returning: ${isReturning})`);
    return { sessionId, isNew: true };
  } catch (error) {
    console.error("Error in getOrCreateSession:", error);
    return null;
  }
}

/**
 * Update session data
 */
export async function updateSession(
  sessionId: string,
  data: Partial<{
    lastSeenAt: Date;
    sessionDuration: number;
    pageCount: any; // Can be number or SQL expression
    isBounce: boolean;
  }>
): Promise<boolean> {
  try {
    // If pageCount is being incremented, also update isBounce
    const updates: any = { ...data };

    // If this is a page count increment beyond 1, it's not a bounce
    if (data.pageCount) {
      updates.isBounce = false;
    }

    await db
      .update(analyticsSessions)
      .set(updates)
      .where(eq(analyticsSessions.sessionId, sessionId));

    return true;
  } catch (error) {
    console.error("Error updating session:", error);
    return false;
  }
}

/**
 * Get sessions with filters
 */
export async function getSessions(filters: SessionFilters = {}): Promise<SessionData[]> {
  try {
    const conditions = [];

    // Date range filter
    if (filters.period && filters.period !== "all") {
      const days = filters.period === "7d" ? 7 : filters.period === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      conditions.push(gte(analyticsSessions.createdAt, startDate));
    } else if (filters.dateFrom) {
      conditions.push(gte(analyticsSessions.createdAt, new Date(filters.dateFrom)));
    }

    if (filters.dateTo) {
      conditions.push(lte(analyticsSessions.createdAt, new Date(filters.dateTo)));
    }

    // Country filter
    if (filters.country) {
      conditions.push(eq(analyticsSessions.countryCode, filters.country));
    }

    // Device filter
    if (filters.device) {
      conditions.push(eq(analyticsSessions.deviceCategory, filters.device));
    }

    // Exclude test data by default
    if (filters.excludeTestData !== false) {
      conditions.push(eq(analyticsSessions.isTestData, false));
    }

    // Exclude IPs from analytics_exclusions table
    const excludedIPs = await getExcludedIPs();
    if (excludedIPs.length > 0) {
      conditions.push(
        or(
          isNull(analyticsSessions.ipAddress),
          notInArray(analyticsSessions.ipAddress, excludedIPs)
        )
      );
    }

    const query = conditions.length > 0
      ? db.select().from(analyticsSessions).where(and(...conditions))
      : db.select().from(analyticsSessions);

    const sessions = await query.orderBy(desc(analyticsSessions.createdAt)).limit(1000);

    return sessions;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
}

/**
 * Get aggregated session statistics for a period
 */
export async function getSessionStats(period: "7d" | "30d" | "90d" = "30d"): Promise<SessionStats> {
  try {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get excluded IPs for filtering
    const excludedIPs = await getExcludedIPs();

    // Get all sessions in period (excluding test data and excluded IPs)
    const sessions = await db
      .select()
      .from(analyticsSessions)
      .where(
        and(
          gte(analyticsSessions.createdAt, startDate),
          eq(analyticsSessions.isTestData, false),
          excludedIPs.length > 0
            ? or(
                isNull(analyticsSessions.ipAddress),
                notInArray(analyticsSessions.ipAddress, excludedIPs)
              )
            : sql`true`
        )
      );

    const totalSessions = sessions.length;

    if (totalSessions === 0) {
      return {
        totalSessions: 0,
        uniqueVisitors: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
        newVisitors: 0,
        returningVisitors: 0,
      };
    }

    // Calculate unique visitors (by IP)
    const uniqueIPs = new Set(sessions.map((s) => s.ipAddress).filter(Boolean));
    const uniqueVisitors = uniqueIPs.size;

    // Calculate bounce rate
    const bouncedSessions = sessions.filter((s) => s.isBounce === true).length;
    const bounceRate = totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0;

    // Calculate average session duration
    const totalDuration = sessions.reduce((sum, s) => sum + (s.sessionDuration || 0), 0);
    const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    // Count new vs returning
    const newVisitors = sessions.filter((s) => s.isReturning === false).length;
    const returningVisitors = sessions.filter((s) => s.isReturning === true).length;

    return {
      totalSessions,
      uniqueVisitors,
      bounceRate: Math.round(bounceRate * 100) / 100,
      avgSessionDuration: Math.round(avgSessionDuration),
      newVisitors,
      returningVisitors,
    };
  } catch (error) {
    console.error("Error calculating session stats:", error);
    return {
      totalSessions: 0,
      uniqueVisitors: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      newVisitors: 0,
      returningVisitors: 0,
    };
  }
}

/**
 * Update session duration based on last activity
 */
export async function updateSessionDuration(sessionId: string): Promise<boolean> {
  try {
    // Get session first/last seen times
    const sessions = await db
      .select({
        firstSeenAt: analyticsSessions.firstSeenAt,
        lastSeenAt: analyticsSessions.lastSeenAt,
      })
      .from(analyticsSessions)
      .where(eq(analyticsSessions.sessionId, sessionId))
      .limit(1);

    if (sessions.length === 0) return false;

    const session = sessions[0];
    if (!session.firstSeenAt || !session.lastSeenAt) return false;

    const duration = Math.floor(
      (session.lastSeenAt.getTime() - session.firstSeenAt.getTime()) / 1000
    );

    await db
      .update(analyticsSessions)
      .set({ sessionDuration: duration })
      .where(eq(analyticsSessions.sessionId, sessionId));

    return true;
  } catch (error) {
    console.error("Error updating session duration:", error);
    return false;
  }
}

export default {
  getOrCreateSession,
  updateSession,
  getSessions,
  getSessionStats,
  updateSessionDuration,
};
