# Database Architecture

## Overview

- **Provider**: Supabase PostgreSQL (self-hosted at `supabase.memopyk.org`)
- **ORM**: Drizzle ORM (`drizzle-orm/postgres-js`) with `postgres` driver
- **Schema source of truth**: `shared/schema.ts` (Drizzle table definitions)
- **Live database**: 88 tables in the `public` schema (85 app tables, excluding spatial_ref_sys, realtime_visitors, test_insert_123). 35 tables defined in Drizzle schema; the remaining 50 are DB-only (legacy Payload CMS, analytics extensions, PostGIS views)
- **Config**: `drizzle.config.ts` points to `./shared/schema.ts`, migrations output to `./migrations/`
- **No migration files exist** -- schema changes have been applied directly via Supabase SQL editor

## Tables by Domain

### Hero Section (3 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `hero_videos` | 10 | Background video carousel (bilingual titles, EN/FR URLs, ordering) |
| `hero_text_settings` | 16 | Overlay text with responsive font sizes (mobile/tablet/desktop) |
| `why_memopyk_cards` | 11 | Benefit cards below hero (icon, gradient, bilingual title/description) |

### Gallery (1 table)

| Table | Cols | Purpose |
|-------|------|---------|
| `gallery_items` | 39 | Portfolio items with video/image URLs, format badges, bilingual content, crop settings |

### Blog & Content (5 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `blog_posts` | 23 | Posts with slug, language (en-US/fr-FR), status (draft/in_review/published/archived), HTML content, SEO JSON, view count. Links to `content_topics` via `source_topic_id` and `image_bank` via `hero_image_bank_id` |
| `blog_tags` | 6 | Tag catalog with unique name/slug, color, icon |
| `blog_post_tags` | 2 | Junction table (post_id, tag_id) -- composite PK, cascade deletes |
| `blog_galleries` | 6 | Per-post image galleries (sort order, URL, title, alt) |
| `blog_post_views` | 10 | Per-post view tracking (exists in DB only, not in Drizzle schema) |

### Content Pipeline (4 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `content_topics` | 28 | Blog topic backlog with SEO data, hub-and-spoke structure (pillar/spoke roles, self-referencing `parent_topic_id`), cluster grouping, generation tracking |
| `content_keywords` | 13 | SEO keyword research (12,501 rows -- FR+EN). Composite unique on (keyword, market). Fields: volume, competition, intent, tier, cluster |
| `content_weekly_plans` | 11 | Weekly content schedules (week number, year, date range, selected topic IDs) |
| `content_daily_assignments` | 8 | Day-level topic assignments. Links to `content_topics` and optionally `blog_posts` |

### Image Bank (3 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `image_bank` | 26 | Centralized image library with file metadata, categorization, usage tracking, licensing info |
| `image_labels` | 7 | Label catalog with color codes |
| `image_label_links` | 4 | Many-to-many between images and labels (cascade deletes) |

### Analytics (7 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `analytics_sessions` | 29 | Visitor sessions with geo (country, city), device category, bounce/returning flags, duration |
| `analytics_views` | 21 | Page/video views per session with timestamps and engagement metrics |
| `analytics_events` | 33 | Granular event tracking (exists in DB only, not in Drizzle schema) |
| `analytics_conversions` | 13 | Conversion tracking by type and date (DB-only) |
| `analytics_exclusions` | 6 | IP/CIDR exclusion rules for filtering admin traffic |
| `realtime_visitors` | 11 | Current active visitors (session, page, location, last_seen) |
| `performance_metrics` | 30 | Web vitals and server performance (LCP, page load times). DB schema is wider than Drizzle definition |

Supporting tables:
| `conversion_funnel` | 6 | Funnel step tracking (DB-only) |
| `engagement_heatmap` | 12 | Click/scroll heatmap data (DB-only) |

### SEO (5 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `seo_settings` | 36 | Per-page SEO config (meta titles, OG tags, Twitter cards, robots, structured data, sitemap priority). DB schema wider than Drizzle definition |
| `seo_redirects` | 10 | 301/302 redirect rules with hit counting |
| `seo_audit_logs` | 9 | Change tracking for SEO edits |
| `seo_global_config` | 15 | Site-wide SEO defaults (DB-only) |
| `seo_global_settings` | 14 | Additional global SEO settings (DB-only) |

### Partners (1 table)

| Table | Cols | Purpose |
|-------|------|---------|
| `partners` | 32 | Digitization partner directory with geocoding (lat/lng), media format capabilities, approval status, map visibility |

### FAQ & Legal (3 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `faq_sections` | 8 | FAQ section groupings |
| `faqs` | 13 | FAQ items with bilingual Q&A, section ordering |
| `legal_documents` | 8 | Legal pages (privacy, terms) -- bilingual content |

### CTA & Site Settings (2 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `cta_settings` | 8 | Call-to-action button configuration (bilingual text + URLs) |
| `why_memopyk_cards` | 11 | "Why MEMOPYK" benefit cards below hero (bilingual title/description, lucide icon name, tailwind gradient, order index, active flag) |

### Contacts (1 table)

| Table | Cols | Purpose |
|-------|------|---------|
| `contacts` | 11 | Contact form submissions (name, email, message, status) |

### Travel Upload Portal (2 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `travel_agency_codes` | 9 | Agency access codes for the upload portal |
| `travel_upload_submissions` | 17 | Client uploads with Nextcloud share links, email notification tracking |

### Help System (2 tables)

| Table | Cols | Purpose |
|-------|------|---------|
| `help_screens` | 8 | Contextual help content per admin route (HTML, tags, related flows) |
| `help_flows` | 6 | Multi-step walkthrough guides stored as JSON steps |

### AI / Brand Brain (1 table)

| Table | Cols | Purpose |
|-------|------|---------|
| `ai_context` | 8 | Brand context entries for Claude API prompt injection (key, title, content, category) |

### Legacy / Payload CMS Tables (not used by current app)

These 30+ tables remain in the database from a previous Payload CMS setup. They are **not referenced** in the current codebase:

`activities`, `ai_prompts`, `attachments`, `block_button`, `block_button_group`, `block_form`, `block_gallery`, `block_gallery_items`, `block_hero`, `block_posts`, `block_pricing`, `block_pricing_cards`, `block_richtext`, `bundle_items`, `bundles`, `clients`, `content_blocks`, `content_image_bank`, `content_prompt_templates`, `deployment_history`, `devis`, `form_fields`, `form_submission_values`, `form_submissions`, `forms`, `fx_rates`, `galleries`, `globals`, `mizzap_users`, `navigation`, `navigation_items`, `page_blocks`, `pages`, `pdf_jobs`, `photos`, `posts`, `products`, `quote_blocks`, `quote_lines`, `quote_number_counters`, `quote_versions`, `quotes`, `redirects`, `seo_image_meta`, `tax_rates`, `test_insert_123`

PostGIS system views (auto-created by Supabase): `geography_columns`, `geometry_columns`, `spatial_ref_sys`

## Foreign Key Relationships

```
blog_post_tags.post_id      --> blog_posts.id       (CASCADE)
blog_post_tags.tag_id        --> blog_tags.id        (CASCADE)
blog_galleries.post_id       --> blog_posts.id       (CASCADE)
blog_posts.hero_image_bank_id --> image_bank.id
image_label_links.image_id   --> image_bank.id       (CASCADE)
image_label_links.label_id   --> image_labels.id     (CASCADE)
content_topics.parent_topic_id --> content_topics.id  (SET NULL, self-ref)
content_daily_assignments.post_id --> blog_posts.id
```

Note: `blog_posts.source_topic_id` references `content_topics.id` logically but has no DB-level FK constraint. Same for `faqs.section_id` referencing `faq_sections.id`.

## Indexes

### Performance indexes (added Feb 9, 2026)

These were added specifically for query optimization:

| Table | Index | Columns |
|-------|-------|---------|
| `content_keywords` | `idx_content_keywords_intent` | `intent` |
| `content_keywords` | `idx_content_keywords_market` | `market` |
| `content_keywords` | `idx_content_keywords_cluster` | `cluster` |
| `content_keywords` | `idx_content_keywords_volume` | `monthly_searches DESC` |
| `content_keywords` | `idx_content_keywords_tier` | `tier` |
| `content_topics` | `idx_content_topics_keyword_market` | `primary_keyword, market` |
| `content_daily_assignments` | `idx_assignments_topic` | `topic_id` |
| `content_daily_assignments` | `idx_assignments_date` | `date` |
| `blog_posts` | `idx_blog_posts_status_published` | `status, published_at DESC` (partial: status='published') |
| `blog_posts` | `idx_blog_posts_language_status` | `language, status` |

### Other notable non-PK indexes

| Table | Index | Type |
|-------|-------|------|
| `analytics_sessions` | `idx_analytics_sessions_date_test` | `first_seen_at DESC, is_test_data` |
| `analytics_sessions` | `idx_analytics_sessions_test_data` | Partial on `is_test_data = false` |
| `analytics_sessions` | `idx_analytics_sessions_ip` | `ip_address` |
| `analytics_sessions` | `idx_analytics_sessions_country` | `country_name` |
| `analytics_sessions` | `idx_analytics_sessions_device` | `device_category` |
| `analytics_events` | `idx_analytics_events_event_name` | `event_name` |
| `analytics_events` | `idx_analytics_events_session_id` | `session_id` |
| `analytics_exclusions` | `idx_analytics_exclusions_active` | Partial on `active = true` |
| `blog_posts` | `idx_blog_posts_source_topic` | `source_topic_id` |
| `blog_posts` | `idx_blog_posts_is_featured` | Partial on `is_featured = true` |
| `blog_post_tags` | `idx_blog_post_tags_post_id` / `tag_id` | Both sides of junction |
| `image_bank` | `idx_image_bank_tags` | GIN index on `tags` array |
| `image_bank` | `idx_image_bank_category` | `category` |
| `partners` | `idx_partners_active_map` | Partial: `status = 'Approved'` |
| `partners` | `idx_partners_location` | `lat, lng` (partial: non-null) |
| `content_topics` | `idx_content_topics_status` / `category` / `priority` / `cluster` / `role` / `parent` | Individual btree indexes |
| `travel_agency_codes` | `idx_travel_agency_codes_code` | `upper(agency_code)` -- case-insensitive unique |
| `posts` | `idx_posts_title_search` / `content_search` / `description_search` | GIN full-text search (legacy) |

## Drizzle ORM Usage

### Schema definition

All active tables are defined in `shared/schema.ts` using `pgTable()`. Each table export includes:
- The table definition (e.g., `export const blogPosts = pgTable(...)`)
- An insert schema via `createInsertSchema()` from `drizzle-zod` (omitting auto-generated fields)
- TypeScript types via `$inferSelect` and `z.infer<>`

### Database connection

`server/db.ts` exports two lazy-initialized singletons:
- **`db`**: Drizzle ORM instance (`PostgresJsDatabase<typeof schema>`) -- used by all route files and services
- **`pool`**: Raw `postgres.js` SQL client -- used by `server/cache.ts` for direct SQL

Both are wrapped in `Proxy` objects for lazy initialization on first access, reading `DATABASE_URL` from environment.

### Query patterns in route files

Routes and services import `db` from `../db` and table definitions from `@shared/schema`:

```typescript
import { db } from '../db';
import { blogPosts, contentTopics } from '@shared/schema';

// Drizzle select
const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, 'published'));

// Drizzle insert
await db.insert(blogPosts).values({ title, slug, ... });
```

Some routes (blog, gallery, content) also use the Supabase JS client directly for Storage operations and certain table queries via `@supabase/supabase-js`.

A thin CRUD helper layer exists in `server/services/database.service.ts` providing `findAll()`, `findById()`, and re-exporting `db`.

### Files that import from schema

14 server files import from `@shared/schema`: `db.ts`, 4 route files (`analytics`, `blog-analytics`, `help`, `image-bank`), and 9 service files (`database`, `storage`, `seo`, `partners`, `travel`, and 5 analytics services).

## Storage

### Supabase Storage (CDN)

- **`memopyk-videos`** bucket: Hero background videos and gallery portfolio videos. Referenced by `gallery_items.video_filename` and `hero_videos.url_en`/`url_fr`. Base URL: `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/`
- Blog hero images and image bank files are also stored in Supabase Storage, referenced by URL in `blog_posts.hero_url` and `image_bank.public_url`

### Database (PostgreSQL)

All structured content is stored in PostgreSQL: blog post HTML, SEO metadata, analytics events, contact submissions, keyword research data, partner directory entries, FAQ content, and legal documents.

### Local disk cache

The server caches Supabase Storage videos to local disk (`/app/cache/` in Docker) via `server/services/media/video-cache.service.ts` to reduce CDN bandwidth and improve load times.
