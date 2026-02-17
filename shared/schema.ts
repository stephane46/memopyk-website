import { pgTable, text, serial, bigserial, integer, boolean, timestamp, varchar, decimal, numeric, jsonb, uuid, unique, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  thumbnailUrl: text("thumbnail_url"), // Thumbnail image URL
  hasVideo: boolean("has_video").default(false), // Whether this item has a video
  videoAvailable: boolean("video_available").default(false), // Whether the video is accessible

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

// Analytics events table - CTA clicks, web vitals, form submissions, etc.
export const analyticsEvents = pgTable("analytics_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  eventId: uuid("event_id").defaultRandom().notNull(),
  eventName: varchar("event_name").notNull(),
  eventValue: numeric("event_value"),
  currency: varchar("currency").default("EUR"),
  userId: varchar("user_id"),
  sessionId: varchar("session_id"),
  pageName: varchar("page_name"),
  pagePath: varchar("page_path"),
  pageTitle: varchar("page_title"),
  formName: varchar("form_name"),
  formType: varchar("form_type"),
  formLanguage: varchar("form_language"),
  sharePlatform: varchar("share_platform"),
  scrollPercent: integer("scroll_percent"),
  videoTitle: varchar("video_title"),
  videoIndex: integer("video_index"),
  galleryItemTitle: varchar("gallery_item_title"),
  itemIndex: integer("item_index"),
  partnerCountry: varchar("partner_country"),
  servicesSelected: text("services_selected").array(),
  action: varchar("action"),
  pageLocation: varchar("page_location"),
  ctaId: varchar("cta_id"),
  packageName: varchar("package"),
  language: varchar("language"),
  userLanguage: varchar("user_language"),
  userTimezone: varchar("user_timezone"),
  userMarketSegment: varchar("user_market_segment"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// NOTE: performance_metrics table exists in DB with 13,669 historical rows but has no admin UI.
// Collection code removed Feb 17, 2026. Drizzle schema definition removed to prevent unnecessary queries.

// NOTE: country_names table does NOT exist in DB — all usage is via raw SQL in admin.routes.ts
// Drizzle schema definition removed to prevent misleading type generation.

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
export const insertHeroVideoSchema = createInsertSchema(heroVideos).omit({ id: true, createdAt: true, updatedAt: true });
export const insertHeroTextSettingsSchema = createInsertSchema(heroTextSettings).omit({ createdAt: true, updatedAt: true });
export const insertGalleryItemSchema = createInsertSchema(galleryItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFaqSectionSchema = createInsertSchema(faqSections).omit({ createdAt: true, updatedAt: true });
export const insertFaqSchema = createInsertSchema(faqs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({ id: true, updatedAt: true });
export const insertCtaSettingsSchema = createInsertSchema(ctaSettings).omit({ createdAt: true, updatedAt: true });
export const insertSeoSettingsSchema = createInsertSchema(seoSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSeoAuditLogSchema = createInsertSchema(seoAuditLogs).omit({ id: true, createdAt: true });
export const insertWhyMemopykCardsSchema = createInsertSchema(whyMemopykCards).omit({ createdAt: true, updatedAt: true });
export const insertAnalyticsExclusionSchema = createInsertSchema(analyticsExclusions).omit({ id: true, createdAt: true, appliesFrom: true });
export const insertAnalyticsSessionSchema = createInsertSchema(analyticsSessions).omit({ id: true, createdAt: true });
export const insertAnalyticsViewSchema = createInsertSchema(analyticsViews).omit({ id: true, createdAt: true });
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, eventId: true, createdAt: true, updatedAt: true });
export const insertRealtimeVisitorSchema = createInsertSchema(realtimeVisitors).omit({ id: true, createdAt: true, lastSeen: true });

// Select types for all tables
export type HeroVideo = typeof heroVideos.$inferSelect;
export type HeroTextSettings = typeof heroTextSettings.$inferSelect;
export type GalleryItem = typeof galleryItems.$inferSelect;
export type FaqSection = typeof faqSections.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type CtaSettings = typeof ctaSettings.$inferSelect;
export type SeoSettings = typeof seoSettings.$inferSelect;
export type SeoAuditLog = typeof seoAuditLogs.$inferSelect;
export type AnalyticsSession = typeof analyticsSessions.$inferSelect;
export type AnalyticsView = typeof analyticsViews.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type RealtimeVisitor = typeof realtimeVisitors.$inferSelect;
export type WhyMemopykCards = typeof whyMemopykCards.$inferSelect;
export type AnalyticsExclusion = typeof analyticsExclusions.$inferSelect;


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
  status: varchar("status", { length: 20 }).notNull().$type<'draft' | 'in_review' | 'published' | 'archived'>(),
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
  
  // Content Production System Integration
  sourceTopicId: uuid("source_topic_id"), // Links to content_topics table
  generationPrompt: text("generation_prompt"), // Prompt used to generate this post
  generationDate: timestamp("generation_date"), // When this post was AI-generated
  primaryKeyword: text("primary_keyword"), // Primary SEO keyword
  secondaryKeywords: text("secondary_keywords").array(), // Array of secondary keywords
  
  // Image Bank Integration
  heroImageBankId: uuid("hero_image_bank_id"), // References image_bank.id for hero image
  
  // Analytics
  viewCount: integer("view_count").default(0), // Total view count for analytics

  // Sitemap & Schema controls
  includeInSitemap: boolean("include_in_sitemap").default(true),
  enableFaqSchema: boolean("enable_faq_schema").default(true),

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
  icon: text("icon"),
  usageCount: integer("usage_count").default(0)
});

export const insertBlogTagSchema = createInsertSchema(blogTags).omit({
  id: true,
  usageCount: true
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

// Image Bank table - centralized image library for blog posts
export const imageBank = pgTable("image_bank", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // File info
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  storagePath: text("storage_path").notNull().unique(),
  publicUrl: text("public_url").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  mimeType: text("mime_type").notNull(),
  altText: text("alt_text"),
  caption: text("caption"),
  
  // Categorization
  category: text("category"),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  
  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  usedInPosts: uuid("used_in_posts").array().default(sql`'{}'::uuid[]`),
  
  // Licensing
  source: text("source"),
  licenseType: text("license_type"),
  creditRequired: boolean("credit_required").default(false),
  attributionText: text("attribution_text"),
  
  // Metadata
  isHeroSuitable: boolean("is_hero_suitable").default(true),
  isBodySuitable: boolean("is_body_suitable").default(true),
  uploadedBy: text("uploaded_by"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertImageBankSchema = createInsertSchema(imageBank).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type ImageBankItem = typeof imageBank.$inferSelect;
export type InsertImageBankItem = z.infer<typeof insertImageBankSchema>;

// Image Labels table - centralized catalog of image labels with colors
export const imageLabels = pgTable("image_labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(), // Hex color code
  usageCount: integer("usage_count").default(0),
  createdBy: text("created_by").default("admin"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertImageLabelSchema = createInsertSchema(imageLabels).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true
});

export type ImageLabel = typeof imageLabels.$inferSelect;
export type InsertImageLabel = z.infer<typeof insertImageLabelSchema>;

// Image Label Links table - many-to-many relationship between images and labels
export const imageLabelLinks = pgTable("image_label_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageId: uuid("image_id").notNull().references(() => imageBank.id, { onDelete: "cascade" }),
  labelId: uuid("label_id").notNull().references(() => imageLabels.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertImageLabelLinkSchema = createInsertSchema(imageLabelLinks).omit({
  id: true,
  createdAt: true
});

export type ImageLabelLink = typeof imageLabelLinks.$inferSelect;
export type InsertImageLabelLink = z.infer<typeof insertImageLabelLinkSchema>;

// ============================================================================
// CONTENT PRODUCTION SYSTEM TABLES
// ============================================================================

// Content topics table - stores 102 pre-researched blog topics
export const contentTopics = pgTable("content_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Core Info
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  market: text("market").default("fr").notNull(), // 'fr' | 'en'
  targetWordCount: integer("target_word_count").default(900),
  
  // SEO Data
  primaryKeyword: text("primary_keyword").notNull(),
  secondaryKeywords: text("secondary_keywords").array(),
  searchVolume: integer("search_volume"),
  competition: text("competition"),
  searchIntent: text("search_intent"),
  
  // Content Guidance
  contentAngle: text("content_angle"),
  description: text("description"),
  
  // Images
  heroImageConcept: text("hero_image_concept"),
  bodyImageConcepts: text("body_image_concepts").array(),
  
  // Planning
  priority: integer("priority").default(3),
  selectedForWeek: text("selected_for_week"),
  status: text("status").default("backlog"),

  // Hub-and-Spoke Structure
  role: text("role").default("spoke"), // 'pillar' | 'spoke'
  parentTopicId: uuid("parent_topic_id").references((): AnyPgColumn => contentTopics.id, { onDelete: 'set null' }),
  cluster: text("cluster"), // e.g., 'gift_retirement', 'vhs_legacy' — matches content_keywords.cluster

  // Internal Linking
  memopykLinkOpportunities: text("memopyk_link_opportunities"),
  memopykLinksPlaced: boolean("memopyk_links_placed").default(false),
  
  // Generation Tracking
  lastGeneratedAt: timestamp("last_generated_at"),
  timesGenerated: integer("times_generated").default(0),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertContentTopicSchema = createInsertSchema(contentTopics).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type ContentTopic = typeof contentTopics.$inferSelect;
export type InsertContentTopic = z.infer<typeof insertContentTopicSchema>;

// Content keywords table - stores SEO keyword research data
export const contentKeywords = pgTable("content_keywords", {
  id: uuid("id").primaryKey().defaultRandom(),

  keyword: text("keyword").notNull(),
  monthlySearches: integer("monthly_searches"),
  competition: text("competition"),
  difficultyScore: integer("difficulty_score"),
  intent: text("intent"),
  tier: integer("tier"),
  market: text("market").default("fr"), // 'fr' | 'en' — nullable in DB
  seasonal: boolean("seasonal").default(false),
  seasonalMonths: text("seasonal_months").array(),
  cluster: text("cluster"), // Content grouping (e.g., gift_retirement, vhs_legacy)

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  // Composite unique: same keyword can exist in different markets
  keywordMarketUnique: unique().on(table.keyword, table.market),
}));

export const insertContentKeywordSchema = createInsertSchema(contentKeywords).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type ContentKeyword = typeof contentKeywords.$inferSelect;
export type InsertContentKeyword = z.infer<typeof insertContentKeywordSchema>;

// Content weekly plans table - stores weekly content schedules
export const contentWeeklyPlans = pgTable("content_weekly_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  weekNumber: text("week_number").notNull(),
  year: integer("year").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  
  topicsSelected: text("topics_selected").array(), // Array of topic IDs
  status: text("status").default("planning"),
  timeSpentMinutes: integer("time_spent_minutes").default(0),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertContentWeeklyPlanSchema = createInsertSchema(contentWeeklyPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type ContentWeeklyPlan = typeof contentWeeklyPlans.$inferSelect;
export type InsertContentWeeklyPlan = z.infer<typeof insertContentWeeklyPlanSchema>;

// Content daily assignments table - stores topic assignments to specific days
export const contentDailyAssignments = pgTable("content_daily_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  date: timestamp("date").notNull(), // The specific date for this assignment
  topicId: uuid("topic_id").notNull(), // References content_topics.id
  postId: uuid("post_id"), // References blog_posts.id - nullable for existing assignments
  
  status: text("status").default("planned"), // planned, in_progress, published
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertContentDailyAssignmentSchema = createInsertSchema(contentDailyAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type ContentDailyAssignment = typeof contentDailyAssignments.$inferSelect;
export type InsertContentDailyAssignment = z.infer<typeof insertContentDailyAssignmentSchema>;



// Insert types for all tables
export type InsertHeroVideo = z.infer<typeof insertHeroVideoSchema>;
export type InsertHeroTextSettings = z.infer<typeof insertHeroTextSettingsSchema>;
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;
export type InsertFaqSection = z.infer<typeof insertFaqSectionSchema>;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;
export type InsertCtaSettings = z.infer<typeof insertCtaSettingsSchema>;
export type InsertSeoSettings = z.infer<typeof insertSeoSettingsSchema>;
export type InsertSeoAuditLog = z.infer<typeof insertSeoAuditLogSchema>;
export type InsertAnalyticsSession = z.infer<typeof insertAnalyticsSessionSchema>;
export type InsertAnalyticsView = z.infer<typeof insertAnalyticsViewSchema>;
export type InsertRealtimeVisitor = z.infer<typeof insertRealtimeVisitorSchema>;
export type InsertWhyMemopykCards = z.infer<typeof insertWhyMemopykCardsSchema>;
export type InsertAnalyticsExclusion = z.infer<typeof insertAnalyticsExclusionSchema>;

// ==================== TRAVEL UPLOAD PORTAL ====================

export const travelAgencyCodes = pgTable("travel_agency_codes", {
  id: serial("id").primaryKey(),

  agencyName: varchar("agency_name").notNull(),
  agencyCode: varchar("agency_code").notNull().unique(), // Stored uppercase for case-insensitive matching
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertTravelAgencyCodeSchema = createInsertSchema(travelAgencyCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type TravelAgencyCode = typeof travelAgencyCodes.$inferSelect;
export type InsertTravelAgencyCode = z.infer<typeof insertTravelAgencyCodeSchema>;

export const travelUploadSubmissions = pgTable("travel_upload_submissions", {
  id: serial("id").primaryKey(),

  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  agencyCode: varchar("agency_code").notNull(),
  agencyName: text("agency_name"),
  language: varchar("language").notNull(),

  folderPath: varchar("folder_path").notNull(),
  shareUrl: varchar("share_url"), // nullable in DB
  shareId: varchar("share_id"), // nullable in DB
  shareToken: varchar("share_token"), // nullable in DB

  status: varchar("status").default("active"),
  agencyEmailSent: boolean("agency_email_sent").default(false),
  ngocEmailSent: boolean("ngoc_email_sent").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertTravelUploadSubmissionSchema = createInsertSchema(travelUploadSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type TravelUploadSubmission = typeof travelUploadSubmissions.$inferSelect;
export type InsertTravelUploadSubmission = z.infer<typeof insertTravelUploadSubmissionSchema>;

// ============================================================================
// HELP SYSTEM TABLES
// ============================================================================

// Help screens table - contextual help for each admin screen
export const helpScreens = pgTable("help_screens", {
  id: uuid("id").primaryKey().defaultRandom(),
  route: varchar("route", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  htmlContent: text("html_content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by", { length: 255 }),
  tags: text("tags").array(),
  relatedFlowIds: uuid("related_flow_ids").array()
});

export const insertHelpScreenSchema = createInsertSchema(helpScreens).omit({
  id: true,
  updatedAt: true
});

export type HelpScreen = typeof helpScreens.$inferSelect;
export type InsertHelpScreen = z.infer<typeof insertHelpScreenSchema>;

// Help flows table - step-by-step guides across screens
export const helpFlows = pgTable("help_flows", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  stepsJson: jsonb("steps_json").notNull().$type<{
    step: number;
    route: string;
    title: string;
    instruction: string;
    highlightSelector?: string;
  }[]>(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by", { length: 255 })
});

export const insertHelpFlowSchema = createInsertSchema(helpFlows).omit({
  id: true,
  updatedAt: true
});

export type HelpFlow = typeof helpFlows.$inferSelect;
export type InsertHelpFlow = z.infer<typeof insertHelpFlowSchema>;

// ============================================================================
// AI CONTEXT (BRAND BRAIN) TABLES
// ============================================================================

// AI context table - central context for Claude API calls
export const aiContext = pgTable("ai_context", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default(''),
  category: text("category").notNull().default('brand'),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: text("updated_by")
});

export const insertAiContextSchema = createInsertSchema(aiContext).omit({
  id: true,
  updatedAt: true
});

export type AiContext = typeof aiContext.$inferSelect;
export type InsertAiContext = z.infer<typeof insertAiContextSchema>;
