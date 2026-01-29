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
import heroRoutes, { heroTextRouter } from "./routes/hero.routes";
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
import travelUploadRoutes from "./routes/travel-upload.routes";

/**
 * Register all API routes on the Express app
 */
export async function registerRoutes(app: Express): Promise<void> {
  console.log("📋 Registering API routes...");
  
  // Health check routes (paths already include /api prefix)
  app.use(healthRoutes);             // /api/health/detailed, /api/ready, /api/live

  // Content management routes
  app.use("/api/hero-videos", heroRoutes);  // /api/hero-videos, /api/hero-videos/:id, /api/hero-videos/text

  // Hero text endpoint - frontend calls /api/hero-text
  app.use("/api/hero-text", heroTextRouter);
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

  // Travel Upload Portal routes (paths already include /api prefix)
  app.use(travelUploadRoutes);              // /api/travel-upload/*, /api/travel-agency-codes/*

  console.log("✅ All 16 route modules registered: health, hero, gallery, faq, contact, cta, legal, analytics, analytics-legacy(stub), newsletter, partners, admin, seo, blog, media, travel-upload");
  console.log("✅ All routes migrated ✅");
}

export default registerRoutes;
