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
router.get("/recent-visitors", (_req: Request, res: Response) => {
  res.json({ visitors: emptyArray, total: 0, ...stubMsg });
});

// GET /returning-visitors
router.get("/returning-visitors", (_req: Request, res: Response) => {
  res.json({ visitors: emptyArray, total: 0, ...stubMsg });
});

// POST /exclude-ip
router.post("/exclude-ip", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// PATCH /exclude-ip/:ipAddress/comment
router.patch("/exclude-ip/:ipAddress/comment", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// DELETE /exclude-ip/:ipAddress
router.delete("/exclude-ip/:ipAddress", (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
});

// GET /exclude-ip
router.get("/exclude-ip", (_req: Request, res: Response) => {
  res.json({ excluded: emptyArray, ...stubMsg });
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
router.get("/blog/popular", (_req: Request, res: Response) => {
  res.json({ posts: emptyArray, ...stubMsg });
});

router.get("/blog/trends", (_req: Request, res: Response) => {
  res.json({ trends: emptyArray, ...stubMsg });
});

router.get("/blog/topics", (_req: Request, res: Response) => {
  res.json({ topics: emptyArray, ...stubMsg });
});

router.get("/blog/keywords", (_req: Request, res: Response) => {
  res.json({ keywords: emptyArray, ...stubMsg });
});

router.get("/blog/categories", (_req: Request, res: Response) => {
  res.json({ categories: emptyArray, ...stubMsg });
});

// Blog analytics — GA4 variants
router.get("/blog/ga4/popular", (_req: Request, res: Response) => {
  res.json({ posts: emptyArray, source: "ga4", ...stubMsg });
});

router.get("/blog/ga4/trends", (_req: Request, res: Response) => {
  res.json({ trends: emptyArray, source: "ga4", ...stubMsg });
});

router.get("/blog/ga4/topics", (_req: Request, res: Response) => {
  res.json({ topics: emptyArray, source: "ga4", ...stubMsg });
});

router.get("/blog/ga4/keywords", (_req: Request, res: Response) => {
  res.json({ keywords: emptyArray, source: "ga4", ...stubMsg });
});

router.get("/blog/ga4/categories", (_req: Request, res: Response) => {
  res.json({ categories: emptyArray, source: "ga4", ...stubMsg });
});

// Blog analytics — unfiltered variants
router.get("/blog/unfiltered/popular", (_req: Request, res: Response) => {
  res.json({ posts: emptyArray, ...stubMsg });
});

router.get("/blog/unfiltered/trends", (_req: Request, res: Response) => {
  res.json({ trends: emptyArray, ...stubMsg });
});

router.get("/blog/unfiltered/topics", (_req: Request, res: Response) => {
  res.json({ topics: emptyArray, ...stubMsg });
});

router.get("/blog/unfiltered/keywords", (_req: Request, res: Response) => {
  res.json({ keywords: emptyArray, ...stubMsg });
});

router.get("/blog/unfiltered/categories", (_req: Request, res: Response) => {
  res.json({ categories: emptyArray, ...stubMsg });
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

// GET /sessions
router.get("/sessions", (_req: Request, res: Response) => {
  res.json({ sessions: emptyArray, total: 0, ...stubMsg });
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

router.post("/event", express.json(), (_req: Request, res: Response) => {
  res.json({ success: true, ...stubMsg });
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

router.get("/conversions", (_req: Request, res: Response) => {
  res.json({ conversions: emptyArray, ...stubMsg });
});

export default router;
