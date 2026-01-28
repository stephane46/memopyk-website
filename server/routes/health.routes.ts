/**
 * Health Check Routes
 * 
 * Endpoints for monitoring server health and readiness.
 */

import { Router, type Request, type Response } from "express";
import { getDatabaseHealth } from "../config/database";

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
 * Liveness probe - simple response
 */
router.get("/api/live", (req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

export default router;
