/**
 * MEMOPYK Express Application Configuration
 * 
 * This file sets up the Express app with middleware, security headers,
 * and request processing. Routes are registered separately.
 */

import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { requestLogger } from "./middleware/logger.middleware";
import { corsMiddleware, apiRateLimit } from "./middleware/security.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export const app = express();

// ============================================================================
// TRUST PROXY (Required for reverse proxy / Coolify)
// ============================================================================
app.set('trust proxy', true);

// ============================================================================
// BODY PARSING
// ============================================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ 
  extended: false, 
  limit: '50mb',
  parameterLimit: 10000
}));
app.use(cookieParser());

// ============================================================================
// CORS & REQUEST LOGGING (from middleware modules)
// ============================================================================
app.use(corsMiddleware);
app.use(requestLogger);

// Rate-limit API routes only (not static assets)
app.use('/api', apiRateLimit);

// ============================================================================
// SECURITY HEADERS (CSP) — deployment-specific, kept inline
// ============================================================================
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://scripts.clarity.ms https://cdn.tiny.cloud; " +
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://analytics.google.com https://stats.g.doubleclick.net https://cdn.jsdelivr.net https://supabase.memopyk.org wss://supabase.memopyk.org https://api.ipapi.co https://www.clarity.ms https://z.clarity.ms wss: ws:; " +
    "img-src 'self' data: blob: https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://supabase.memopyk.org https://cdn.jsdelivr.net https://flagcdn.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; " +
    "font-src 'self' data: https://fonts.gstatic.com https://unpkg.com; " +
    "frame-src 'self' https://www.googletagmanager.com; " +
    "media-src 'self' https://supabase.memopyk.org; " +
    "frame-ancestors 'self';"
  );
  next();
});

// ============================================================================
// ERROR HANDLING (from middleware module — registered in index.ts after routes)
// ============================================================================
export function setupErrorHandler() {
  app.use(notFoundHandler);
  app.use(errorHandler);
}

// ============================================================================
// STATIC FILE SERVING (Production)
// ============================================================================
export function setupStaticServing() {
  const clientDist = path.resolve(process.cwd(), "dist");
  
  // Serve static files for non-API routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    express.static(clientDist, { index: false })(req, res, next);
  });
  
  // Serve flags from public directory
  app.use('/flags', express.static(path.resolve(process.cwd(), 'public/flags')));
  
  // Serve public folder for static assets
  app.use(express.static(path.resolve(process.cwd(), 'public')));
  
  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
  
  console.log(`📦 Static files configured from: ${clientDist}`);
}

export default app;
