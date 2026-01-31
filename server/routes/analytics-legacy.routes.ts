/**
 * Analytics Legacy Routes — STUB
 *
 * These 58 routes were extracted from the source monolithic routes.ts.
 * They depend on analytics infrastructure (hybrid-storage analytics methods,
 * ga4-service, location-service, etc.) that has NOT been migrated yet.
 *
 * This stub returns empty/default data so the frontend doesn't crash.
 * TODO: Migrate the full analytics data layer from the source project:
 *   - server/hybrid-storage.ts (analytics methods: getAnalyticsDashboard, etc.)
 *   - server/ga4-service.ts (qSessions, qPlays, qBlogPageViews, etc.)
 *   - server/location-service.ts (LocationService, geoResolver)
 *   - server/cache-origin-headers.ts, video-cache.ts
 *   - server/helpers/lang.ts
 *   - server/services/location-enrichment.ts (EnrichmentManager)
 */

import { Router, Request, Response } from "express";
import express from "express";
import ipExclusionService from "../services/analytics/ip-exclusion.service";
import eventRecorder, { extractClientIP } from "../services/analytics/event-recorder.service";
import sessionService from "../services/analytics/session.service";

const router = Router();

// Middleware: warn on every analytics-legacy call
router.use((_req: Request, _res: Response, next) => {
  // Uncomment for debugging:
  // console.log(`⚠️ [analytics-legacy STUB] ${_req.method} ${_req.originalUrl}`);
  next();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const emptyDashboard = {
  totalViews: 0,
  uniqueVisitors: 0,
  totalSessions: 0,
  averageSessionDuration: 0,
  bounceRate: 0,
  topPages: [],
  topCountries: [],
  topBrowsers: [],
  topDevices: [],
  topReferrers: [],
};

const emptyTimeSeries = { labels: [], datasets: [] };
const emptySettings = { excludedIps: [], timezone: "UTC", retentionDays: 90 };
const emptyArray: never[] = [];
const stubMsg = { stub: true, message: "Analytics not yet migrated — returning default data" };

// ---------------------------------------------------------------------------
// Core analytics routes
// ---------------------------------------------------------------------------

// GET / — main analytics data
router.get("/", (_req: Request, res: Response) => {
  res.json({ ...emptyDashboard, ...stubMsg });
});

// POST /video-view
router.post("/video-view", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// POST /session
router.post("/session", express.json(), (_req: Request, res: Response) => {
  res.json({ sessionId: "stub-session", ...stubMsg });
});

// GET /dashboard
router.get("/dashboard", (_req: Request, res: Response) => {
  res.json({ ...emptyDashboard, ...stubMsg });
});

// GET /time-series
router.get("/time-series", (_req: Request, res: Response) => {
  res.json({ ...emptyTimeSeries, ...stubMsg });
});

// GET /settings
router.get("/settings", (_req: Request, res: Response) => {
  res.json({ ...emptySettings, ...stubMsg });
});

// PUT /settings
router.put("/settings", express.json(), (_req: Request, res: Response) => {
  res.json({ ...emptySettings, ...stubMsg });
});

// GET /current-ip
router.get("/current-ip", (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  res.json({ ip: Array.isArray(ip) ? ip[0] : ip });
});

// GET /active-ips
router.get("/active-ips", (_req: Request, res: Response) => {
  res.json({ ips: emptyArray, ...stubMsg });
});

// GET /video-engagement
router.get("/video-engagement", (_req: Request, res: Response) => {
  res.json({ engagement: emptyArray, ...stubMsg });
});

// GET /unique-views
router.get("/unique-views", (_req: Request, res: Response) => {
  res.json({ count: 0, ...stubMsg });
});

// GET /re-engagement
router.get("/re-engagement", (_req: Request, res: Response) => {
  res.json({ rate: 0, ...stubMsg });
});

// GET /recent-visitors
// Frontend expects an array directly (calls .forEach on response)
router.get("/recent-visitors", (_req: Request, res: Response) => {
  res.json([]);  // Return empty array, not object
});

// GET /returning-visitors
router.get("/returning-visitors", (_req: Request, res: Response) => {
  res.json({ visitors: emptyArray, total: 0, ...stubMsg });
});

// POST /exclude-ip — Add IP to exclusion list
router.post("/exclude-ip", express.json(), async (req: Request, res: Response) => {
  try {
    const { ip, reason } = req.body;
    if (!ip) {
      return res.status(400).json({ success: false, error: "IP address is required" });
    }
    const exclusion = await ipExclusionService.addExclusion(ip, reason);
    res.json({ success: true, exclusion });
  } catch (error) {
    console.error("Error adding IP exclusion:", error);
    res.status(500).json({ success: false, error: "Failed to add IP exclusion" });
  }
});

// PATCH /exclude-ip/:ipAddress/comment — Update reason for an IP exclusion
router.patch("/exclude-ip/:ipAddress/comment", express.json(), async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.params;
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: "Reason is required" });
    }
    const exclusion = await ipExclusionService.updateExclusion(ipAddress, reason);
    if (!exclusion) {
      return res.status(404).json({ success: false, error: "IP exclusion not found" });
    }
    res.json({ success: true, exclusion });
  } catch (error) {
    console.error("Error updating IP exclusion:", error);
    res.status(500).json({ success: false, error: "Failed to update IP exclusion" });
  }
});

// DELETE /exclude-ip/:ipAddress — Remove IP from exclusion list
router.delete("/exclude-ip/:ipAddress", async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.params;
    const deleted = await ipExclusionService.removeExclusion(ipAddress);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "IP exclusion not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing IP exclusion:", error);
    res.status(500).json({ success: false, error: "Failed to remove IP exclusion" });
  }
});

// GET /exclude-ip — List all IP exclusions
router.get("/exclude-ip", async (_req: Request, res: Response) => {
  try {
    const exclusions = await ipExclusionService.getAllExclusions();
    res.json({ excluded: exclusions });
  } catch (error) {
    console.error("Error fetching IP exclusions:", error);
    res.status(500).json({ excluded: [], error: "Failed to fetch IP exclusions" });
  }
});

// POST /reset
router.post("/reset", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// POST /session-update
router.post("/session-update", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// POST /session-page-view
router.post("/session-page-view", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// GET /enrich-locations/status
router.get("/enrich-locations/status", (_req: Request, res: Response) => {
  res.json({ status: "idle", processed: 0, total: 0, ...stubMsg });
});

// POST /enrich-locations
router.post("/enrich-locations", express.json(), (_req: Request, res: Response) => {
  res.json({ status: "stub — not started", ...stubMsg });
});

// GET /test-data/status
router.get("/test-data/status", (_req: Request, res: Response) => {
  res.json({ hasTestData: false, ...stubMsg });
});

// POST /clear/sessions
router.post("/clear/sessions", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, deleted: 0, ...stubMsg });
});

// POST /clear/views
router.post("/clear/views", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, deleted: 0, ...stubMsg });
});

// POST /clear/all
router.post("/clear/all", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, deleted: 0, ...stubMsg });
});

// POST /-session (NOTE: unusual path from source extraction)
router.post("/-session", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// POST /-view (NOTE: unusual path from source extraction)
router.post("/-view", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// ---------------------------------------------------------------------------
// Blog analytics routes
// ---------------------------------------------------------------------------

// POST /blog/view
router.post("/blog/view", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// Blog analytics — local DB variants
// Frontend expects arrays directly (calls .reduce, .map on response)
router.get("/blog/popular", (_req: Request, res: Response) => {
  res.json([]);  // PopularBlogPost[]
});

router.get("/blog/trends", (_req: Request, res: Response) => {
  res.json([]);  // BlogTrendData[]
});

router.get("/blog/topics", (_req: Request, res: Response) => {
  res.json([]);  // TopTopic[]
});

router.get("/blog/keywords", (_req: Request, res: Response) => {
  res.json([]);  // TopKeyword[]
});

router.get("/blog/categories", (_req: Request, res: Response) => {
  res.json([]);  // CategoryPerformance[]
});

// Blog analytics — GA4 variants
// Frontend expects arrays directly
router.get("/blog/ga4/popular", (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/blog/ga4/trends", (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/blog/ga4/topics", (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/blog/ga4/keywords", (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/blog/ga4/categories", (_req: Request, res: Response) => {
  res.json([]);
});

// Blog analytics — unfiltered variants
// Frontend expects arrays directly
router.get("/blog/unfiltered/popular", (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/blog/unfiltered/trends", (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/blog/unfiltered/topics", (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/blog/unfiltered/keywords", (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/blog/unfiltered/categories", (_req: Request, res: Response) => {
  res.json([]);
});

// ---------------------------------------------------------------------------
// Advanced analytics routes
// ---------------------------------------------------------------------------

// GET /video-performance
router.get("/video-performance", (_req: Request, res: Response) => {
  res.json({ videos: emptyArray, ...stubMsg });
});

// GET /cta-performance
router.get("/cta-performance", (_req: Request, res: Response) => {
  res.json({ ctas: emptyArray, ...stubMsg });
});

// GET /geo
router.get("/geo", (_req: Request, res: Response) => {
  res.json({ countries: emptyArray, cities: emptyArray, ...stubMsg });
});

// GET /overview
router.get("/overview", (_req: Request, res: Response) => {
  res.json({
    totalViews: 0,
    uniqueVisitors: 0,
    sessions: 0,
    avgDuration: 0,
    bounceRate: 0,
    ...stubMsg,
  });
});

// GET /fresh-video-data
router.get("/fresh-video-data", (_req: Request, res: Response) => {
  res.json({ videos: emptyArray, ...stubMsg });
});

// GET /recent-activity
router.get("/recent-activity", (_req: Request, res: Response) => {
  res.json({ activities: emptyArray, ...stubMsg });
});

// GET /live-tracking
router.get("/live-tracking", (_req: Request, res: Response) => {
  res.json({ activeUsers: 0, sessions: emptyArray, ...stubMsg });
});

// GET /sessions — List sessions with filters
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const { period, dateFrom, dateTo, country, device } = req.query;
    const sessions = await sessionService.getSessions({
      period: period as "7d" | "30d" | "90d" | "all",
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      country: country as string,
      device: device as string,
      excludeTestData: true,
    });
    res.json({ sessions, total: sessions.length });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ sessions: [], total: 0, error: "Failed to fetch sessions" });
  }
});

// GET /stats — Aggregated session statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { period } = req.query;
    const stats = await sessionService.getSessionStats(
      (period as "7d" | "30d" | "90d") || "30d"
    );
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      totalSessions: 0,
      uniqueVisitors: 0,
      bounceRate: 0,
      avgSessionDuration: 0,
      newVisitors: 0,
      returningVisitors: 0,
      error: "Failed to fetch stats",
    });
  }
});

// POST /cleanup
router.post("/cleanup", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, cleaned: 0, ...stubMsg });
});

// GET /cleanup/status
router.get("/cleanup/status", (_req: Request, res: Response) => {
  res.json({ status: "idle", lastRun: null, ...stubMsg });
});

// ---------------------------------------------------------------------------
// Export routes
// ---------------------------------------------------------------------------

// GET /export/csv
router.get("/export/csv", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=analytics-stub.csv");
  res.send("stub,true\nmessage,Analytics not yet migrated\n");
});

// GET /export/pdf
router.get("/export/pdf", (_req: Request, res: Response) => {
  res.status(503).json({ error: "PDF export not yet migrated", ...stubMsg });
});

// GET /export/sql
router.get("/export/sql", (_req: Request, res: Response) => {
  res.status(503).json({ error: "SQL export not yet migrated", ...stubMsg });
});

// ---------------------------------------------------------------------------
// Also handle /event and /performance at this mount point
// (frontend calls /api/analytics/event and /api/analytics/performance)
// ---------------------------------------------------------------------------

router.post("/event", express.json(), async (req: Request, res: Response) => {
  try {
    const { type, page, pageTitle, referrer, language, videoId, videoTitle, videoType, action, progress, watchTime, sessionId } = req.body;
    const ipAddress = extractClientIP(req.headers as Record<string, string | string[] | undefined>) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || undefined;

    let result;

    if (type === "video" && videoId) {
      // Video event
      result = await eventRecorder.recordVideoEvent({
        sessionId,
        videoId,
        videoTitle,
        videoType,
        action: action || "play",
        progress,
        watchTime,
        ipAddress,
        userAgent,
      });
    } else if (type === "pageview" || page) {
      // Page view event
      result = await eventRecorder.recordPageView({
        sessionId,
        pageUrl: page || req.body.pageUrl || "/",
        pageTitle,
        referrer,
        language,
        ipAddress,
        userAgent,
      });
    } else {
      return res.status(400).json({ success: false, error: "Invalid event type. Use 'pageview' or 'video'." });
    }

    if (result.success) {
      res.json({ success: true, id: result.id });
    } else {
      // Still return 200 for excluded/duplicate events (client doesn't need to know)
      res.json({ success: true, filtered: result.reason });
    }
  } catch (error) {
    console.error("Error processing event:", error);
    res.status(500).json({ success: false, error: "Failed to process event" });
  }
});

router.get("/performance", (_req: Request, res: Response) => {
  res.json({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    ...stubMsg,
  });
});

// POST /performance - Accept performance metrics from frontend
router.post("/performance", express.json(), async (req: Request, res: Response) => {
  try {
    const { lcp, fid, cls, fcp, ttfb, pageUrl, sessionId } = req.body;
    const ipAddress = extractClientIP(req.headers as Record<string, string | string[] | undefined>) || req.socket.remoteAddress || "unknown";
    const userAgent = req.headers["user-agent"] || undefined;

    const result = await eventRecorder.recordPerformanceMetrics({
      sessionId,
      lcp,
      fid,
      cls,
      fcp,
      ttfb,
      pageUrl,
      ipAddress,
      userAgent,
    });

    if (result.success) {
      res.json({ success: true });
    } else {
      // Still return 200 for excluded/duplicate events
      res.json({ success: true, filtered: result.reason });
    }
  } catch (error) {
    console.error("Error processing performance metrics:", error);
    res.status(500).json({ success: false, error: "Failed to process performance metrics" });
  }
});

router.get("/conversions", (_req: Request, res: Response) => {
  res.json({ conversions: emptyArray, ...stubMsg });
});

export default router;
