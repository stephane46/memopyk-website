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
import contentRoutes from "./routes/content.routes";

import seoRoutes from "./routes/seo.routes";
import blogRoutes from "./routes/blog.routes";
import blogTagsRoutes from "./routes/blog-tags.routes";
import blogAdminRoutes from "./routes/blog-admin.routes";
import blogImagesRoutes from "./routes/blog-images.routes";
import mediaRoutes from "./routes/media.routes";
import analyticsLegacyRoutes from "./routes/analytics-legacy.routes";
import travelUploadRoutes from "./routes/travel-upload.routes";
import helpRoutes from "./routes/help.routes";
import aiContextRoutes from "./routes/ai-context.routes";
import imageBankRoutes from "./routes/image-bank.routes";

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

  // Content production routes
  app.use("/api/admin/content", contentRoutes);  // /api/admin/content/topics, /api/admin/content/assignments, etc.

  // SEO routes
  app.use("/api", seoRoutes);               // /api/seo/*, /api/seo-config, /api/admin/seo/*

  // Blog routes (split into 4 modules)
  app.use("/api", blogRoutes);              // /api/blog/* (public routes)
  app.use("/api", blogTagsRoutes);          // /api/blog-tags, /api/admin/blog/tags, /api/admin/blog/posts/:id/tags
  app.use("/api", blogAdminRoutes);         // /api/admin/blog/posts, /api/admin/blog/create-from-ai
  app.use("/api", blogImagesRoutes);        // /api/admin/blog/images

  // Media routes (paths already include /api prefix)
  app.use(mediaRoutes);                     // /api/upload/*, /api/video-cache/*, /api/video-proxy, etc.

  // Travel Upload Portal routes (paths already include /api prefix)
  app.use(travelUploadRoutes);              // /api/travel-upload/*, /api/travel-agency-codes/*

  // Help System routes
  app.use("/api", helpRoutes);              // /api/help/screens, /api/help/flows

  // AI Context (Brand Brain) routes
  app.use("/api", aiContextRoutes);         // /api/admin/ai-context, /api/internal/ai-context/full

  // Image Bank routes
  app.use("/api", imageBankRoutes);         // /api/image-bank, /api/image-labels

  console.log("✅ All 23 route modules registered: health, hero, gallery, faq, contact, cta, legal, analytics, analytics-legacy(stub), newsletter, partners, admin, content, seo, blog, blog-tags, blog-admin, blog-images, media, travel-upload, help, ai-context, image-bank");
  console.log("✅ All routes migrated ✅");
}

export default registerRoutes;
