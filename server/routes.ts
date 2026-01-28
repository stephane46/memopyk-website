/**
 * Route Aggregator
 * 
 * Imports and registers all modular route files.
 * This replaces the monolithic 538KB routes.ts file.
 */

import type { Express } from "express";
import { Router } from "express";

// Import route modules
import healthRoutes from "./routes/health.routes";
import heroRoutes from "./routes/hero.routes";
import galleryRoutes from "./routes/gallery.routes";
import faqRoutes from "./routes/faq.routes";
import contactRoutes from "./routes/contact.routes";
import ctaRoutes from "./routes/cta.routes";
import legalRoutes from "./routes/legal.routes";
import analyticsRoutes from "./routes/analytics.routes";
import newsletterRoutes from "./routes/newsletter.routes";
import partnersRoutes from "./routes/partners.routes";
import adminRoutes from "./routes/admin.routes";

import seoRoutes from "./routes/seo.routes";
import blogRoutes from "./routes/blog.routes";
import mediaRoutes from "./routes/media.routes";
import analyticsLegacyRoutes from "./routes/analytics-legacy.routes";

/**
 * Register all API routes on the Express app
 */
export async function registerRoutes(app: Express): Promise<void> {
  console.log("📋 Registering API routes...");
  
  // Health check routes (paths already include /api prefix)
  app.use(healthRoutes);             // /api/health/detailed, /api/ready, /api/live

  // Content management routes
  app.use("/api/hero-videos", heroRoutes);  // /api/hero-videos, /api/hero-videos/:id, /api/hero-videos/text

  // Legacy alias: frontend calls /api/hero-text/* but hero router uses /text/*
  // Rewrite /api/hero-text/* → /api/hero-videos/text/* internally
  app.use("/api/hero-text", (req, _res, next) => {
    req.url = `/text${req.url === '/' ? '' : req.url}`;
    next();
  }, heroRoutes);
  app.use("/api/gallery", galleryRoutes);   // /api/gallery, /api/gallery/:id, /api/gallery/admin
  app.use("/api", faqRoutes);               // /api/faq-sections, /api/faqs, /api/faq
  app.use("/api", contactRoutes);           // /api/contact, /api/contacts
  app.use("/api", ctaRoutes);               // /api/cta, /api/why-memopyk-cards
  app.use("/api", legalRoutes);             // /api/legal, /api/legal/:type

  // Analytics routes (GA4 MP proxy, realtime, basic events)
  app.use("/api", analyticsRoutes);         // /api/ga4/*, /api/event, /api/conversions

  // Analytics legacy routes (STUB — 58 endpoints returning empty data)
  // Mounted at /api/analytics so frontend calls like /api/analytics/dashboard work
  app.use("/api/analytics", analyticsLegacyRoutes);

  // Newsletter routes
  app.use("/api/newsletter", newsletterRoutes); // /api/newsletter/subscribe

  // Partners directory routes
  app.use("/api/partners", partnersRoutes); // /api/partners, /api/partners/intake, /api/partners/:id

  // Admin routes
  app.use("/api/admin", adminRoutes);       // /api/admin/country-names/*

  // SEO routes
  app.use("/api", seoRoutes);               // /api/seo/*, /api/seo-config, /api/admin/seo/*

  // Blog routes
  app.use("/api", blogRoutes);              // /api/blog/*, /api/blog-tags, /api/admin/blog/*

  // Media routes (paths already include /api prefix)
  app.use(mediaRoutes);                     // /api/upload/*, /api/video-cache/*, /api/video-proxy, etc.

  console.log("✅ All 15 route modules registered: health, hero, gallery, faq, contact, cta, legal, analytics, analytics-legacy(stub), newsletter, partners, admin, seo, blog, media");
  console.log("✅ All routes migrated ✅");
}

export default registerRoutes;
