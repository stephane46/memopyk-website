import { pgTable, text, serial, integer, boolean, timestamp, varchar, decimal, numeric, jsonb, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (admin authentication)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull()
});

// Hero videos table - bilingual structure
export const heroVideos = pgTable("hero_videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  titleEn: text("title_en").notNull(),
  titleFr: text("title_fr").notNull(),
  urlEn: text("url_en").notNull(),
  urlFr: text("url_fr").notNull(),
  useSameVideo: boolean("use_same_video").default(true), // When true, use urlEn for both languages
  orderIndex: integer("order_index").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Hero text settings table - bilingual structure with responsive font sizes and separate mobile/desktop fields
export const heroTextSettings = pgTable("hero_text_settings", {
  id: varchar("id").primaryKey(),
  titleFr: varchar("title_fr").notNull(),
  titleEn: varchar("title_en").notNull(),
  // Separate mobile and desktop title fields for responsive line breaking
  titleMobileFr: varchar("title_mobile_fr"),
  titleMobileEn: varchar("title_mobile_en"),
  titleDesktopFr: varchar("title_desktop_fr"),
  titleDesktopEn: varchar("title_desktop_en"),
  subtitleFr: varchar("subtitle_fr"),
  subtitleEn: varchar("subtitle_en"),
  isActive: boolean("is_active").notNull().default(false),
  fontSize: integer("font_size").default(60), // Legacy field maintained for backward compatibility
  fontSizeDesktop: integer("font_size_desktop").default(60),
  fontSizeTablet: integer("font_size_tablet").default(45),
  fontSizeMobile: integer("font_size_mobile").default(32),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});



// Gallery items table - bilingual structure
export const galleryItems = pgTable("gallery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Core display fields
  titleEn: text("title_en").notNull(),
  titleFr: text("title_fr").notNull(),
  priceEn: text("price_en"), // Text field for prices like "USD 145"
  priceFr: text("price_fr"), // Text field for prices like "145 USD"
  
  // Gallery card content fields
  sourceEn: text("source_en"), // "80 photos & 10 videos" - top overlay text
  sourceFr: text("source_fr"), // "80 photos et 10 vidéos" - top overlay text
  durationEn: text("duration_en"), // "2 minutes" - duration with film icon (up to 5 lines)
  durationFr: text("duration_fr"), // "2 minutes" - duration with film icon (up to 5 lines)
  situationEn: text("situation_en"), // "The Client is a wife..." - client description (up to 5 lines)
  situationFr: text("situation_fr"), // "Le client est une épouse..." - client description (up to 5 lines)
  storyEn: text("story_en"), // "This film shows..." - story description (up to 5 lines)
  storyFr: text("story_fr"), // "Ce film montre..." - story description (up to 5 lines)
  
  // Sorry message for when no video is available
  sorryMessageEn: text("sorry_message_en"), // "Sorry, we cannot show you the video at this stage"
  sorryMessageFr: text("sorry_message_fr"), // "Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade"
  
  // Format badge fields for strategic marketing display
  formatPlatformEn: text("format_platform_en"), // "Social Media", "Social Feed", "Professional"
  formatPlatformFr: text("format_platform_fr"), // "Réseaux Sociaux", "Réseaux Sociaux", "Professionnel"
  formatTypeEn: text("format_type_en"), // "Mobile Stories", "Instagram Posts", "TV & Desktop"
  formatTypeFr: text("format_type_fr"), // "Stories Mobiles", "Posts Instagram", "TV & Bureau"
  
  // Media fields
  videoUrlEn: text("video_url_en"),
  videoUrlFr: text("video_url_fr"),
  videoFilename: text("video_filename"), // Unified filename for memopyk-videos bucket (e.g., "VideoHero1.mp4")
  useSameVideo: boolean("use_same_video").default(true), // When true, use videoUrlEn for both languages
  videoWidth: integer("video_width"),
  videoHeight: integer("video_height"),
  videoOrientation: text("video_orientation"), // "portrait" or "landscape"
  
  // Image fields
  imageUrlEn: text("image_url_en"),
  imageUrlFr: text("image_url_fr"),
  staticImageUrlEn: text("static_image_url_en"), // 300x200 cropped JPEG for English thumbnails
  staticImageUrlFr: text("static_image_url_fr"), // 300x200 cropped JPEG for French thumbnails
  staticImageUrl: text("static_image_url"), // DEPRECATED: Legacy single field - will be removed
  cropSettings: jsonb("crop_settings"), // Stores crop position settings for re-editing
  
  // System fields
  orderIndex: integer("order_index").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});


// FAQ sections table - bilingual structure
export const faqSections = pgTable("faq_sections", {
  id: varchar("id").primaryKey(),
  key: varchar("key").notNull(),
  nameEn: varchar("name_en").notNull(),
  nameFr: varchar("name_fr").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// FAQs table - bilingual structure
export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  sectionNameEn: text("section_name_en").notNull(),
  sectionNameFr: text("section_name_fr").notNull(),
  sectionOrder: integer("section_order").default(0),
  orderIndex: integer("order_index").default(0),
  questionEn: text("question_en").notNull(),
  questionFr: text("question_fr").notNull(),
  answerEn: text("answer_en").notNull(),
  answerFr: text("answer_fr").notNull(),
  isActive: boolean("is_active").default(true),
  sectionId: varchar("section_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject"),
  message: text("message").notNull(),
  package: text("package"),
  preferredContact: text("preferred_contact"),
  status: text("status").default("new"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Legal documents table - bilingual structure
export const legalDocuments = pgTable("legal_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  titleEn: text("title_en").notNull(),
  titleFr: text("title_fr").notNull(),
  contentEn: text("content_en").notNull(),
  contentFr: text("content_fr").notNull(),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow()
});

// CTA settings table - bilingual structure
export const ctaSettings = pgTable("cta_settings", {
  id: varchar("id").primaryKey(),
  buttonTextFr: varchar("button_text_fr").notNull(),
  buttonTextEn: varchar("button_text_en").notNull(),
  buttonUrlEn: varchar("button_url_en").notNull(),
  buttonUrlFr: varchar("button_url_fr").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Why choose MEMOPYK benefit cards - bilingual structure
export const whyMemopykCards = pgTable("why_memopyk_cards", {
  id: varchar("id").primaryKey(),
  titleEn: text("title_en").notNull(),
  titleFr: text("title_fr").notNull(),
  descriptionEn: text("description_en").notNull(),
  descriptionFr: text("description_fr").notNull(),
  iconName: varchar("icon_name").notNull(), // lucide icon name like "Zap", "Clock", etc.
  gradient: varchar("gradient").notNull(), // tailwind gradient classes
  orderIndex: integer("order_index").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// SEO settings table - comprehensive SEO management
export const seoSettings = pgTable("seo_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  page: text("page").notNull(),
  urlSlugEn: text("url_slug_en"),
  urlSlugFr: text("url_slug_fr"),
  metaTitleEn: text("meta_title_en"),
  metaTitleFr: text("meta_title_fr"),
  metaDescriptionEn: text("meta_description_en"),
  metaDescriptionFr: text("meta_description_fr"),
  metaKeywordsEn: text("meta_keywords_en"), // Keywords separated by commas
  metaKeywordsFr: text("meta_keywords_fr"), // Keywords separated by commas
  ogTitleEn: text("og_title_en"),
  ogTitleFr: text("og_title_fr"),
  ogDescriptionEn: text("og_description_en"),
  ogDescriptionFr: text("og_description_fr"),
  ogImageUrl: text("og_image_url"),
  ogType: text("og_type").default("website"), // website, article, video, etc.
  twitterCard: text("twitter_card").default("summary_large_image"), // summary, summary_large_image, app, player
  twitterTitleEn: text("twitter_title_en"),
  twitterTitleFr: text("twitter_title_fr"),
  twitterDescriptionEn: text("twitter_description_en"),
  twitterDescriptionFr: text("twitter_description_fr"),
  twitterImageUrl: text("twitter_image_url"),
  canonicalUrl: text("canonical_url"),
  robotsIndex: boolean("robots_index").default(true),
  robotsFollow: boolean("robots_follow").default(true),
  robotsNoArchive: boolean("robots_noarchive").default(false),
  robotsNoSnippet: boolean("robots_nosnippet").default(false),
  customMetaTags: jsonb("custom_meta_tags"), // Additional custom meta tags as JSON
  structuredData: jsonb("structured_data"), // JSON-LD structured data
  seoScore: integer("seo_score").default(0), // 0-100 SEO score
  priority: decimal("priority").default("0.5"), // Sitemap priority 0.0-1.0
  changeFreq: text("change_freq").default("monthly"), // never, yearly, monthly, weekly, daily, hourly, always
  isActive: boolean("is_active").default(true),
  jsonLd: jsonb("json_ld"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// SEO redirect rules table - 301/302 redirects management
export const seoRedirects = pgTable("seo_redirects", {
  id: serial("id").primaryKey(),
  fromPath: text("from_path").notNull(), // Source path to redirect from
  toPath: text("to_path").notNull(), // Target path to redirect to
  redirectType: integer("redirect_type").default(301), // 301 permanent, 302 temporary
  isActive: boolean("is_active").default(true),
  description: text("description"), // Admin notes about the redirect
  hitCount: integer("hit_count").default(0), // Track how often redirect is used
  lastHit: timestamp("last_hit"), // When redirect was last used
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// SEO audit logs table - track SEO changes over time
export const seoAuditLogs = pgTable("seo_audit_logs", {
  id: serial("id").primaryKey(),
  pageId: text("page_id"), // References seoSettings.id
  action: text("action").notNull(), // "created", "updated", "deleted"
  field: text("field"), // Which field was changed
  oldValue: text("old_value"), // Previous value
  newValue: text("new_value"), // New value
  adminUser: text("admin_user"), // Who made the change
  changeReason: text("change_reason"), // Why the change was made
  createdAt: timestamp("created_at").defaultNow()
});

// SEO image metadata table - manage alt text and SEO for images
export const seoImageMeta = pgTable("seo_image_meta", {
  id: serial("id").primaryKey(),
  imageUrl: text("image_url").notNull(),
  altTextEn: text("alt_text_en"),
  altTextFr: text("alt_text_fr"),
  titleEn: text("title_en"), // Image title attribute
  titleFr: text("title_fr"), // Image title attribute
  caption: text("caption"), // Image caption
  isLazyLoaded: boolean("is_lazy_loaded").default(true),
  compressionLevel: integer("compression_level").default(80), // 1-100
  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size"), // In bytes
  format: text("format"), // jpg, png, webp, etc.
  seoFriendlyName: text("seo_friendly_name"), // SEO-optimized filename
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// SEO global settings table - robots.txt, sitemap configuration
export const seoGlobalSettings = pgTable("seo_global_settings", {
  id: serial("id").primaryKey(),
  robotsTxt: text("robots_txt"), // Content of robots.txt file
  sitemapEnabled: boolean("sitemap_enabled").default(true),
  sitemapFrequency: text("sitemap_frequency").default("daily"), // How often to regenerate sitemap
  defaultMetaTitle: text("default_meta_title"), // Fallback meta title
  defaultMetaDescription: text("default_meta_description"), // Fallback meta description
  defaultOgImage: text("default_og_image"), // Default Open Graph image
  googleAnalyticsId: text("google_analytics_id"), // GA tracking ID
  googleSearchConsoleCode: text("google_search_console_code"), // GSC verification code
  bingWebmasterCode: text("bing_webmaster_code"), // Bing verification code
  facebookPixelId: text("facebook_pixel_id"), // Facebook Pixel ID
  isMaintenanceMode: boolean("is_maintenance_mode").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Analytics session tracking table - updated to match Supabase VPS schema
export const analyticsSessions = pgTable("analytics_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull().unique(),
  userId: text("user_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  language: text("language"),
  // Updated schema fields to match migration
  countryCode: text("country_code"),
  countryName: text("country_name"),
  deviceCategory: text("device_category"),
  screenResolution: text("screen_resolution"),
  timezone: text("timezone"),
  firstSeenAt: timestamp("first_seen_at"),
  lastSeenAt: timestamp("last_seen_at"),
  sessionDuration: integer("session_duration"), // in seconds
  pageCount: integer("page_count").default(1),
  isBounce: boolean("is_bounce").default(false),
  isReturning: boolean("is_returning").default(false),
  // Legacy fields for backward compatibility
  country: text("country"),
  countryIso2: text("country_iso2"), // ISO2 country code (e.g., FR, US, CA)
  countryIso3: text("country_iso3"), // ISO3 country code (e.g., FRA, USA, CAN)
  city: text("city"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"), // in seconds
  pageViews: integer("page_views").default(0),
  isBot: boolean("is_bot").default(false),
  isTestData: boolean("is_test_data").default(false), // Flag to distinguish test data from real data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Analytics video views table - updated to match Supabase VPS schema
export const analyticsViews = pgTable("analytics_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  viewId: text("view_id").notNull().unique(), // New unique view identifier
  sessionId: text("session_id").notNull(),
  videoId: text("video_id"), // Made nullable to match migration
  videoTitle: text("video_title"),
  videoType: text("video_type"), // Added for video performance analytics (e.g., "hero", "gallery")
  ctaId: text("cta_id"), // Added for CTA performance analytics
  pageUrl: text("page_url"), // New field from migration
  pageTitle: text("page_title"), // New field from migration
  viewTimestamp: timestamp("view_timestamp"), // New field from migration
  timeOnPage: integer("time_on_page"), // New field from migration
  isBounceView: boolean("is_bounce_view").default(false), // New field from migration
  referrer: text("referrer"), // New field from migration
  language: text("language"), // New field from migration
  // Legacy fields for backward compatibility
  viewDuration: integer("view_duration"), // in seconds
  completionPercentage: numeric("completion_percentage"),
  watchedToEnd: boolean("watched_to_end").default(false),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isTestData: boolean("is_test_data").default(false), // Flag to distinguish test data from real data
  createdAt: timestamp("created_at").defaultNow()
});

// Real-time visitor tracking table
export const realtimeVisitors = pgTable("realtime_visitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull(),
  ipAddress: text("ip_address"),
  currentPage: text("current_page"),
  userAgent: text("user_agent"),
  country: text("country"),
  city: text("city"),
  isActive: boolean("is_active").default(true),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  isTestData: boolean("is_test_data").default(false) // Flag to distinguish test data from real data
});

// Performance metrics table
export const performanceMetrics = pgTable("performance_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  metricType: text("metric_type").notNull(), // 'page_load', 'video_load', 'api_response', 'server_health'
  metricName: text("metric_name").notNull(),
  value: numeric("value").notNull(),
  unit: text("unit"), // 'ms', 'mb', 'percent', 'count'
  sessionId: text("session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"), // Additional context like video_id, page_url, error_details
  createdAt: timestamp("created_at").defaultNow(),
  isTestData: boolean("is_test_data").default(false) // Flag to distinguish test data from real data
});

// User engagement heatmap data table
export const engagementHeatmap = pgTable("engagement_heatmap", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull(),
  pageUrl: text("page_url").notNull(),
  elementId: text("element_id"), // CSS selector or element ID
  eventType: text("event_type").notNull(), // 'click', 'hover', 'scroll', 'focus'
  xPosition: integer("x_position"),
  yPosition: integer("y_position"),
  viewportWidth: integer("viewport_width"),
  viewportHeight: integer("viewport_height"),
  timestamp: timestamp("timestamp").defaultNow(),
  duration: integer("duration"), // for hover/focus events
  isTestData: boolean("is_test_data").default(false) // Flag to distinguish test data from real data
});

// Conversion funnel tracking table
export const conversionFunnel = pgTable("conversion_funnel", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull(),
  funnelStep: text("funnel_step").notNull(), // 'visit_home', 'view_gallery', 'view_video', 'contact_form', 'form_submit'
  stepOrder: integer("step_order").notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
  metadata: jsonb("metadata") // Additional context like video_id, form_fields, etc.
});

// Deployment history table
export const deploymentHistory = pgTable("deployment_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"),
  logs: text("logs"),
  host: text("host"),
  domain: text("domain"),
  createdAt: timestamp("created_at").defaultNow()
});

// Country names lookup table for localization
export const countryNames = pgTable("country_names", {
  iso3: varchar("iso3", { length: 3 }).primaryKey(),
  displayName: text("display_name"), // Legacy field for backward compatibility
  displayNameEn: text("display_name_en"),
  displayNameFr: text("display_name_fr"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Analytics IP exclusions table - for blocking IPs from GA4 data and future event ingestion
export const analyticsExclusions = pgTable("analytics_exclusions", {
  id: uuid("id").primaryKey().defaultRandom(),
  ipCidr: text("ip_cidr").notNull(), // IP address or CIDR range (e.g., "192.168.1.1" or "192.168.1.0/24")
  label: text("label").notNull(), // Human-readable reason/description
  active: boolean("active").notNull().default(true), // Whether this exclusion is currently active
  createdAt: timestamp("created_at").defaultNow(),
  appliesFrom: timestamp("applies_from").defaultNow() // When this exclusion takes effect
});

// Insert schemas for all tables
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertHeroVideoSchema = createInsertSchema(heroVideos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHeroTextSettingsSchema = createInsertSchema(heroTextSettings).omit({ createdAt: true, updatedAt: true });
export const insertGalleryItemSchema = createInsertSchema(galleryItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFaqSectionSchema = createInsertSchema(faqSections).omit({ createdAt: true, updatedAt: true });
export const insertFaqSchema = createInsertSchema(faqs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({ id: true, updatedAt: true });
export const insertCtaSettingsSchema = createInsertSchema(ctaSettings).omit({ createdAt: true, updatedAt: true });
export const insertSeoSettingsSchema = createInsertSchema(seoSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSeoRedirectSchema = createInsertSchema(seoRedirects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSeoAuditLogSchema = createInsertSchema(seoAuditLogs).omit({ id: true, createdAt: true });
export const insertSeoImageMetaSchema = createInsertSchema(seoImageMeta).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSeoGlobalSettingsSchema = createInsertSchema(seoGlobalSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeploymentHistorySchema = createInsertSchema(deploymentHistory).omit({ id: true, createdAt: true });
export const insertCountryNamesSchema = createInsertSchema(countryNames).omit({ createdAt: true, updatedAt: true });
export const insertWhyMemopykCardsSchema = createInsertSchema(whyMemopykCards).omit({ createdAt: true, updatedAt: true });
export const insertAnalyticsExclusionSchema = createInsertSchema(analyticsExclusions).omit({ id: true, createdAt: true, appliesFrom: true });
export const insertAnalyticsSessionSchema = createInsertSchema(analyticsSessions).omit({ id: true, createdAt: true });
export const insertAnalyticsViewSchema = createInsertSchema(analyticsViews).omit({ id: true, createdAt: true });
export const insertRealtimeVisitorSchema = createInsertSchema(realtimeVisitors).omit({ id: true, createdAt: true, lastSeen: true });
export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({ id: true, createdAt: true });
export const insertEngagementHeatmapSchema = createInsertSchema(engagementHeatmap).omit({ id: true, timestamp: true });
export const insertConversionFunnelSchema = createInsertSchema(conversionFunnel).omit({ id: true, completedAt: true });

// Select types for all tables
export type User = typeof users.$inferSelect;
export type HeroVideo = typeof heroVideos.$inferSelect;
export type HeroTextSettings = typeof heroTextSettings.$inferSelect;
export type GalleryItem = typeof galleryItems.$inferSelect;
export type FaqSection = typeof faqSections.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type CtaSettings = typeof ctaSettings.$inferSelect;
export type SeoSettings = typeof seoSettings.$inferSelect;
export type SeoRedirect = typeof seoRedirects.$inferSelect;
export type SeoAuditLog = typeof seoAuditLogs.$inferSelect;
export type SeoImageMeta = typeof seoImageMeta.$inferSelect;
export type SeoGlobalSettings = typeof seoGlobalSettings.$inferSelect;
export type DeploymentHistory = typeof deploymentHistory.$inferSelect;
export type CountryNames = typeof countryNames.$inferSelect;
export type AnalyticsSession = typeof analyticsSessions.$inferSelect;
export type AnalyticsView = typeof analyticsViews.$inferSelect;
export type RealtimeVisitor = typeof realtimeVisitors.$inferSelect;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type EngagementHeatmap = typeof engagementHeatmap.$inferSelect;
export type ConversionFunnel = typeof conversionFunnel.$inferSelect;
export type WhyMemopykCards = typeof whyMemopykCards.$inferSelect;
export type AnalyticsExclusion = typeof analyticsExclusions.$inferSelect;

// Partner Submissions table - Partner directory and intake system
export const partnerSubmissions = pgTable("partner_submissions", {
  id: serial("id").primaryKey(),
  partnerType: varchar("partner_type", { length: 50 }).notNull().default("digitization"),
  partnerName: text("partner_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  emailPublic: boolean("email_public").default(false),
  phone: text("phone"),
  phonePublic: boolean("phone_public").default(false),
  website: text("website"),
  
  // Address fields
  address: text("address"),
  addressLine2: text("address_line2"),
  city: text("city").notNull(),
  postalCode: text("postal_code"),
  country: text("country").notNull(),
  
  // Geolocation
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  
  // Service offerings - stored as comma-separated for Excel compatibility
  photoFormats: text("photo_formats"),
  filmFormats: text("film_formats"),
  videoCassettes: text("video_cassettes"),
  
  // Public directory fields
  publicDescription: text("public_description"),
  slug: text("slug").notNull(),
  
  // Status and visibility
  status: varchar("status", { length: 20 }).notNull().default("Pending"),
  isActive: boolean("is_active").default(false),
  showOnMap: boolean("show_on_map").default(false),
  
  // Additional information
  specialties: text("specialties"),
  yearsExperience: integer("years_experience"),
  notes: text("notes"),
  
  // Timestamps
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPartnerSubmissionSchema = createInsertSchema(partnerSubmissions).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});

export type PartnerSubmission = typeof partnerSubmissions.$inferSelect;
export type InsertPartnerSubmission = z.infer<typeof insertPartnerSubmissionSchema>;

// Partners table (approved partners for directory map)
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  partnerType: varchar("partner_type", { length: 50 }).default("digitization"),
  partnerName: text("partner_name").notNull(),
  email: text("email").notNull(),
  emailPublic: boolean("email_public").default(true),
  phone: text("phone"),
  phonePublic: boolean("phone_public").default(false),
  website: text("website"),
  address: text("address"),
  addressLine2: text("address_line2"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: varchar("country", { length: 2 }), // ISO-2 country code
  photoFormats: text("photo_formats"), // Comma-separated string
  otherPhoto: text("other_photo"),
  filmFormats: text("film_formats"), // Comma-separated string
  otherFilm: text("other_film"),
  videoCassettes: text("video_cassettes"), // Comma-separated string
  otherVideo: text("other_video"),
  delivery: text("delivery"), // Comma-separated string
  otherDelivery: text("other_delivery"),
  publicDescription: text("public_description"),
  consent: boolean("consent").default(false),
  status: varchar("status", { length: 50 }).default("Pending"),
  isActive: boolean("is_active").default(false),
  showOnMap: boolean("show_on_map").default(false),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  slug: text("slug"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;

// ============================================================================
// BLOG SYSTEM TABLES
// ============================================================================

// Blog posts table
export const blogPosts = pgTable("blog_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  language: varchar("language", { length: 10 }).notNull().$type<'en-US' | 'fr-FR'>(),
  status: varchar("status", { length: 20 }).notNull().$type<'draft' | 'published'>(),
  contentHtml: text("content_html").notNull(),
  description: text("description"),
  heroUrl: text("hero_url"), // Public URL in Supabase Storage
  heroCaption: text("hero_caption"),
  readTimeMinutes: integer("read_time_minutes"),
  seo: jsonb("seo").$type<{
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  }>(),
  isFeatured: boolean("is_featured").default(false),
  featuredOrder: integer("featured_order"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;

// Blog tags table
export const blogTags = pgTable("blog_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  color: text("color"),
  icon: text("icon")
});

export const insertBlogTagSchema = createInsertSchema(blogTags).omit({
  id: true
});

export type BlogTag = typeof blogTags.$inferSelect;
export type InsertBlogTag = z.infer<typeof insertBlogTagSchema>;

// Blog post-tags junction table (many-to-many)
export const blogPostTags = pgTable("blog_post_tags", {
  postId: uuid("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => blogTags.id, { onDelete: "cascade" })
});

// Blog galleries table (optional images per post)
export const blogGalleries = pgTable("blog_galleries", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
  sort: integer("sort"),
  url: text("url").notNull(), // Public URL in Supabase Storage
  title: text("title"),
  alt: text("alt")
});

export const insertBlogGallerySchema = createInsertSchema(blogGalleries).omit({
  id: true
});

export type BlogGallery = typeof blogGalleries.$inferSelect;
export type InsertBlogGallery = z.infer<typeof insertBlogGallerySchema>;

// Insert types for all tables
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertHeroVideo = z.infer<typeof insertHeroVideoSchema>;
export type InsertHeroTextSettings = z.infer<typeof insertHeroTextSettingsSchema>;
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;
export type InsertFaqSection = z.infer<typeof insertFaqSectionSchema>;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;
export type InsertCtaSettings = z.infer<typeof insertCtaSettingsSchema>;
export type InsertSeoSettings = z.infer<typeof insertSeoSettingsSchema>;
export type InsertSeoRedirect = z.infer<typeof insertSeoRedirectSchema>;
export type InsertSeoAuditLog = z.infer<typeof insertSeoAuditLogSchema>;
export type InsertSeoImageMeta = z.infer<typeof insertSeoImageMetaSchema>;
export type InsertSeoGlobalSettings = z.infer<typeof insertSeoGlobalSettingsSchema>;
export type InsertDeploymentHistory = z.infer<typeof insertDeploymentHistorySchema>;
export type InsertCountryNames = z.infer<typeof insertCountryNamesSchema>;
export type InsertAnalyticsSession = z.infer<typeof insertAnalyticsSessionSchema>;
export type InsertAnalyticsView = z.infer<typeof insertAnalyticsViewSchema>;
export type InsertRealtimeVisitor = z.infer<typeof insertRealtimeVisitorSchema>;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;
export type InsertEngagementHeatmap = z.infer<typeof insertEngagementHeatmapSchema>;
export type InsertConversionFunnel = z.infer<typeof insertConversionFunnelSchema>;
export type InsertWhyMemopykCards = z.infer<typeof insertWhyMemopykCardsSchema>;
export type InsertAnalyticsExclusion = z.infer<typeof insertAnalyticsExclusionSchema>;