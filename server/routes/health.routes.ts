/**
 * Health Check Routes
 * 
 * Endpoints for monitoring server health and readiness.
 */

import { Router, type Request, type Response } from "express";
import { getDatabaseHealth } from "../config/database";
import { client as ga4Client, PROPERTY as ga4Property } from "../services/analytics/ga4.service";

const router = Router();

const VERSION = "2.0.0-clean-rebuild";

/**
 * Basic liveness probe for Docker HEALTHCHECK / load balancers.
 * No database call — must stay fast and dependency-free.
 */
router.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * Detailed health check with database connectivity
 */
router.get("/api/health/detailed", async (req: Request, res: Response) => {
  const dbHealth = await getDatabaseHealth();
  
  const health = {
    status: dbHealth.connected ? "healthy" : "degraded",
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbHealth
    }
  };
  
  const statusCode = dbHealth.connected ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness probe for Kubernetes/Coolify
 */
router.get("/api/ready", async (req: Request, res: Response) => {
  const dbHealth = await getDatabaseHealth();
  
  if (dbHealth.connected) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: "Database unavailable" });
  }
});

/**
 * Analytics health check — used by the Diagnostics tab (AnalyticsNewFallback.tsx)
 * DB: live database ping. GA4: real API call with 3s timeout.
 */
router.get("/api/analytics/health", async (_req: Request, res: Response) => {
  const dbHealth = await getDatabaseHealth();

  let ga4Ok = false;
  try {
    const today = new Date().toISOString().split("T")[0];
    await Promise.race([
      ga4Client.runReport({
        property: ga4Property,
        dateRanges: [{ startDate: today, endDate: today }],
        metrics: [{ name: "activeUsers" }],
        limit: 1,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    ga4Ok = true;
  } catch {
    // GA4 unreachable or timed out
  }

  res.json({
    success: true,
    analytics_db_enabled: dbHealth.connected,
    ga4_configured: ga4Ok,
  });
});

/**
 * Liveness probe - simple response
 */
router.get("/api/live", (req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

export default router;
