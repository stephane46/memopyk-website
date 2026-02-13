/**
 * MEMOPYK Express Application Configuration
 * 
 * This file sets up the Express app with middleware, security headers,
 * and request processing. Routes are registered separately.
 */

import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
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
// STATIC FILE SERVING (Production) + Server-Side SEO Injection
// ============================================================================

// In-memory SEO cache: { [lang]: { html, timestamp } }
const seoCache: Record<string, { html: string; timestamp: number }> = {};
const SEO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function detectLanguage(req: Request): "fr-FR" | "en-US" {
  // Check URL path FIRST (social crawlers don't send Accept-Language)
  if (req.path.startsWith("/en-US") || req.path.includes("/en-US/")) return "en-US";
  if (req.path.startsWith("/fr-FR") || req.path.includes("/fr-FR/")) return "fr-FR";
  // Fall back to Accept-Language header
  const acceptLang = req.headers["accept-language"] || "";
  if (/^en/i.test(acceptLang)) return "en-US";
  return "fr-FR";
}

function extractBlogSlug(path: string): string | null {
  const match = path.match(/\/blog\/([^/?#]+)/);
  return match ? match[1] : null;
}

// Per-language OG image swap (DB stores FR image; EN variant uses same path with -en suffix)
const OG_IMAGE_FR = "og-home-fr.jpg";
const OG_IMAGE_EN = "og-home-en.jpg";

async function getSeoHtml(lang: "fr-FR" | "en-US", requestPath?: string): Promise<string> {
  const cacheKey = `${lang}:${requestPath || "/"}`;
  const cached = seoCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < SEO_CACHE_TTL) {
    return cached.html;
  }
  try {
    const { seoService } = await import("./services/seo.service");
    let html = await seoService.generateHeadPreview(lang, requestPath);
    // Swap OG/Twitter image to the EN variant when serving English
    if (lang === "en-US" && html.includes(OG_IMAGE_FR)) {
      html = html.replaceAll(OG_IMAGE_FR, OG_IMAGE_EN);
    }
    seoCache[cacheKey] = { html, timestamp: Date.now() };
    return html;
  } catch (err) {
    console.error("SEO injection: failed to generate tags", err);
    return "";
  }
}

export function setupStaticServing() {
  // Vite builds to dist/public/, server compiles to dist/server/
  const clientDist = path.resolve(process.cwd(), "dist/public");

  // Read index.html once at startup
  const indexPath = path.join(clientDist, "index.html");
  let indexHtml = "";
  try {
    indexHtml = fs.readFileSync(indexPath, "utf-8");
  } catch {
    console.warn("⚠️ Could not read index.html — SEO injection disabled");
  }

  // Serve static files for non-API routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    express.static(clientDist, { index: false })(req, res, next);
  });

  // Flags and other static assets are included in dist/public via Vite's publicDir
  app.use('/flags', express.static(path.join(clientDist, 'flags')));

  // SPA fallback — inject SEO meta tags into index.html before sending
  app.get("*", async (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    // Skip SEO injection for admin routes or if index.html wasn't loaded
    if (!indexHtml || req.path.startsWith("/admin")) {
      if (indexHtml) {
        res.type("html").send(indexHtml);
      } else {
        res.sendFile(indexPath);
      }
      return;
    }

    try {
      const lang = detectLanguage(req);
      const blogSlug = extractBlogSlug(req.path);

      let seoTags: string;
      if (blogSlug) {
        const { seoService } = await import("./services/seo.service");
        seoTags = await seoService.generateBlogPostHead(blogSlug, lang, req.path);
      } else {
        seoTags = await getSeoHtml(lang, req.path);
      }

      if (!seoTags) {
        res.type("html").send(indexHtml);
        return;
      }

      // Replace the static <title> and inject SEO tags before </head>
      let html = indexHtml;

      // Extract the dynamic title from the SEO tags
      const titleMatch = seoTags.match(/<title>([^<]*)<\/title>/);
      if (titleMatch) {
        // Replace the Vite default title with the SEO title
        html = html.replace(
          /<title>[^<]*<\/title>/,
          `<title>${titleMatch[1]}</title>`
        );
        // Remove the title from seoTags to avoid duplication
        const tagsWithoutTitle = seoTags.replace(/<title>[^<]*<\/title>\n?/, "");
        // Also replace the static meta description
        html = html.replace(
          /<meta name="description" content="[^"]*" \/>/,
          ""
        );
        html = html.replace("</head>", `    ${tagsWithoutTitle}\n  </head>`);
      } else {
        html = html.replace("</head>", `    ${seoTags}\n  </head>`);
      }

      // Set html lang attribute to match detected language
      html = html.replace(
        /<html lang="[^"]*">/,
        `<html lang="${lang === "fr-FR" ? "fr" : "en"}">`
      );

      res.type("html").send(html);
    } catch (err) {
      console.error("SEO injection error, serving plain index.html:", err);
      res.type("html").send(indexHtml);
    }
  });

  console.log(`📦 Static files configured from: ${clientDist}`);
}

export default app;
