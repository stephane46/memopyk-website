# Complete Supabase Database Schema Documentation

> **Generated:** 2026-02-17 by automated database audit (updated after legacy cleanup)
> **Database:** Supabase PostgreSQL at `supabase.memopyk.org`
> **ORM:** Drizzle ORM (`drizzle-orm/postgres-js`) with `postgres` driver
> **Schema source of truth:** `shared/schema.ts`

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total tables (public schema)** | 36 |
| **Tables in Drizzle ORM** | 34 |
| **DB-only tables** | 3 |
| **Tables with data (rows > 0)** | 18 |
| **Empty tables** | 18 |
| **Views** | 2 (PostGIS) |
| **Custom functions** | 21 |
| **Foreign key constraints** | 8 |
| **Total database size** | ~30 MB |

### Category Breakdown

| Category | Tables | In Drizzle | DB-Only | With Data |
|----------|--------|------------|---------|-----------|
| Website Core | 9 | 9 | 0 | 3 |
| Blog & Content | 12 | 12 | 0 | 5 |
| Analytics | 7 | 6 | 1 | 6 |
| SEO | 2 | 2 | 0 | 1 |
| Partners | 1 | 1 | 0 | 0 |
| Travel | 2 | 2 | 0 | 2 |
| Admin/System | 2 | 2 | 0 | 2 |
| **Total** | **36** | **34** | **1** | **19** |

> **Legacy cleanup (Feb 17, 2026):** 50 empty, unreferenced legacy tables dropped (Payload CMS, quoting system, misc). 102,299 test contact rows truncated. See commit for details.

### Storage Profile (Top 10 by Size)

| Table | Size | Rows | Category |
|-------|------|------|----------|
| analytics_sessions | 8.6 MB | 9,108 | Analytics |
| spatial_ref_sys | 7.1 MB | 0* | PostGIS system |
| analytics_events | 5.0 MB | 8,555 | Analytics |
| performance_metrics | 4.7 MB | 13,669 | Analytics |
| seo_settings | 2.7 MB | 2 | SEO |
| blog_posts | 504 KB | 18 | Blog |
| help_screens | 296 KB | 31 | Admin/System |
| content_topics | 192 KB | 28 | Blog |
| analytics_views | 176 KB | 147 | Analytics |
| ai_context | 160 KB | 6 | Blog |

*spatial_ref_sys shows 0 in pg_stat but contains PostGIS reference data (8,500+ coordinate systems)

> **contacts cleanup (Feb 17, 2026):** 102,299 test rows (4 test emails, 0 real customers) truncated. Table now empty.

---

## Tables by Category

### 1. Website Core (9 tables)

Homepage, contact form, FAQ, legal pages, gallery, CTA configuration.

| Table | Cols | Rows | Size | In Drizzle | Description |
|-------|------|------|------|------------|-------------|
| `hero_videos` | 10 | 3 | 64 KB | Yes | Background video carousel (bilingual titles, EN/FR URLs, ordering) |
| `hero_text_settings` | 16 | 0 | 16 KB | Yes | Hero overlay text with responsive font sizes (mobile/tablet/desktop) |
| `gallery_items` | 39 | 6 | 80 KB | Yes | Portfolio items with video/image URLs, format badges, bilingual content, crop settings |
| `faq_sections` | 8 | 0 | 16 KB | Yes | FAQ section groupings (bilingual names) |
| `faqs` | 13 | 0 | 120 KB | Yes | FAQ items with bilingual Q&A, section ordering, JSON-LD schema |
| `contacts` | 11 | 0 | 16 KB | Yes | Contact form submissions (name, email, phone, message, status). Truncated Feb 17, 2026 (102K test rows purged) |
| `legal_documents` | 8 | 0 | 88 KB | Yes | Legal page content (privacy, terms) -- bilingual |
| `cta_settings` | 8 | 0 | 16 KB | Yes | Call-to-action button configuration (bilingual text + URLs) |
| `why_memopyk_cards` | 11 | 0 | 16 KB | Yes | "Why MEMOPYK" benefit cards (icon, gradient, bilingual title/description) |

### 2. Blog & Content Pipeline (12 tables)

Blog articles, content planning, keyword management, image bank, AI context.

| Table | Cols | Rows | Size | In Drizzle | Description |
|-------|------|------|------|------------|-------------|
| `blog_posts` | 25 | 18 | 504 KB | Yes | Articles with slug, language (en-US/fr-FR), status, HTML content, SEO JSON, view count |
| `blog_tags` | 6 | 0 | 64 KB | Yes | Tag catalog with unique name/slug, color, icon |
| `blog_post_tags` | 2 | 0 | 56 KB | Yes | Post-tag junction (composite PK, cascade deletes) |
| `blog_galleries` | 6 | 0 | 16 KB | Yes | Per-post image galleries (sort order, URL, title, alt) |
| ~~`blog_post_views`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, unreferenced)* |
| `image_bank` | 26 | 1 | 120 KB | Yes | Centralized image library with metadata, categorization, usage tracking |
| `image_labels` | 7 | 0 | 16 KB | Yes | Image classification label catalog with color codes |
| `image_label_links` | 4 | 0 | 16 KB | Yes | Image-label many-to-many junction (cascade deletes) |
| `content_topics` | 28 | 28 | 192 KB | Yes | Blog topic backlog with SEO data, hub-and-spoke (pillar/spoke), cluster grouping |
| `content_keywords` | 13 | 107 | 160 KB | Yes | SEO keywords (107 FR+EN). Composite unique on (keyword, market) |
| `content_weekly_plans` | 11 | 0 | 16 KB | Yes | Weekly content schedules (week, year, topic IDs) |
| `content_daily_assignments` | 8 | 0 | 16 KB | Yes | Daily topic assignments, links to `blog_posts` |
| ~~`content_blocks`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, unused)* |
| ~~`content_image_bank`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, superseded by image_bank)* |
| ~~`content_prompt_templates`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, superseded by ai_context)* |
| `ai_context` | 8 | 6 | 160 KB | Yes | Brand Brain entries for Claude API context (key, title, content, category) |

### 3. Analytics (7 tables)

Custom analytics tracking (sessions, views, events, performance, conversions).

| Table | Cols | Rows | Size | In Drizzle | Description |
|-------|------|------|------|------------|-------------|
| `analytics_sessions` | 29 | 9,108 | 8.6 MB | Yes | Visitor sessions with geo (country, city), device, bounce/returning flags, duration |
| `analytics_views` | 21 | 147 | 176 KB | Yes | Page views and video events per session |
| `analytics_events` | 33 | 8,555 | 5.0 MB | Yes | CTA click events. Added to Drizzle Feb 17. Still accessed via raw SQL in `analytics.routes.ts` |
| `analytics_exclusions` | 6 | 1 | 64 KB | Yes | IP/CIDR exclusion rules for filtering admin traffic |
| `analytics_conversions` | 13 | 10 | 152 KB | **No** | Conversion tracking by type and date |
| `performance_metrics` | 30 | 13,669 | 4.7 MB | Yes | Core Web Vitals (LCP, CLS, INP, FID, TTFB) and page load metrics |
| `realtime_visitors` | 11 | 0 | 16 KB | Yes | Active visitor tracking (session, page, location, last_seen) |
| ~~`conversion_funnel`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, unused)* |
| ~~`engagement_heatmap`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, unused)* |

> **analytics_events:** Added to Drizzle schema Feb 17, 2026. Still accessed via raw SQL in `analytics.routes.ts` for CTA click tracking (not yet migrated to Drizzle query builder).

### 4. SEO (2 tables)

Search engine optimization configuration and audit trail.

| Table | Cols | Rows | Size | In Drizzle | Description |
|-------|------|------|------|------------|-------------|
| `seo_settings` | 36 | 2 | 2.7 MB | Yes | Per-page SEO config (meta titles, OG tags, Twitter cards, robots, structured data, sitemap) |
| `seo_audit_logs` | 9 | 0 | 16 KB | Yes | Change tracking for SEO edits |
| ~~`seo_global_config`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, unused)* |
| ~~`seo_global_settings`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, unused)* |
| ~~`seo_image_meta`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, unused)* |
| ~~`seo_redirects`~~ | -- | -- | -- | -- | *Dropped Feb 17, 2026 (empty, unreferenced)* |

### 5. Partners (1 table)

| Table | Cols | Rows | Size | In Drizzle | Description |
|-------|------|------|------|------------|-------------|
| `partners` | 32 | 0 | 144 KB | Yes | Digitization partner directory with geocoding (lat/lng), format capabilities, approval workflow, Mapbox map display |

### 6. Travel Upload Portal (2 tables)

| Table | Cols | Rows | Size | In Drizzle | Description |
|-------|------|------|------|------------|-------------|
| `travel_agency_codes` | 9 | 2 | 64 KB | Yes | Agency access codes for the upload portal |
| `travel_upload_submissions` | 17 | 3 | 80 KB | Yes | Client uploads with Nextcloud share links, email notifications |

### 7. Admin/System (2 tables)

| Table | Cols | Rows | Size | In Drizzle | Description |
|-------|------|------|------|------------|-------------|
| `help_screens` | 8 | 31 | 296 KB | Yes | Contextual help content per admin route (HTML, tags, related flows) |
| `help_flows` | 6 | 2 | 64 KB | Yes | Multi-step walkthrough guides stored as JSON steps |

### 8. Legacy Tables (DROPPED)

All 50 legacy tables were dropped on Feb 17, 2026. They were empty (0 rows), unreferenced in code, and originated from:

- **Payload CMS** (25 tables): `pages`, `page_blocks`, `posts`, `galleries`, `navigation`, `navigation_items`, `globals`, `redirects`, `block_button`, `block_button_group`, `block_form`, `block_gallery`, `block_gallery_items`, `block_hero`, `block_posts`, `block_pricing`, `block_pricing_cards`, `block_richtext`, `forms`, `form_fields`, `form_submissions`, `form_submission_values`, `attachments`, `photos`, `ai_prompts`
- **Quote/Invoice system** (6 tables): `quotes`, `quote_versions`, `quote_blocks`, `quote_lines`, `quote_number_counters`, `activities`
- **Business/Commerce** (7 tables): `clients`, `products`, `bundles`, `bundle_items`, `devis`, `fx_rates`, `tax_rates`
- **Miscellaneous** (12 tables): `mizzap_users`, `pdf_jobs`, `test_insert_123`, `content_blocks`, `content_image_bank`, `content_prompt_templates`, `conversion_funnel`, `deployment_history`, `engagement_heatmap`, `seo_global_config`, `seo_global_settings`, `seo_image_meta`

**Kept:** `spatial_ref_sys` (PostGIS system table, required by extension)

---

## Foreign Key Relationships

### Active Application FKs

```
blog_post_tags.post_id           --> blog_posts.id         (CASCADE)
blog_post_tags.tag_id            --> blog_tags.id          (CASCADE)
blog_galleries.post_id           --> blog_posts.id         (CASCADE)
blog_posts.hero_image_bank_id    --> image_bank.id
image_label_links.image_id       --> image_bank.id         (CASCADE)
image_label_links.label_id       --> image_labels.id       (CASCADE)
content_topics.parent_topic_id   --> content_topics.id     (SET NULL, self-ref)
content_daily_assignments.post_id --> blog_posts.id
```

**Logical FKs (no DB constraint):**
- `blog_posts.source_topic_id` references `content_topics.id`
- `faqs.section_id` references `faq_sections.id`
- `analytics_conversions.event_id` references `analytics_events` (no target column resolved)

*31 legacy FKs were dropped with the legacy tables on Feb 17, 2026.*

---

## Indexes

### Performance Indexes (added Feb 2026)

| Table | Index | Columns | Notes |
|-------|-------|---------|-------|
| `content_keywords` | `idx_content_keywords_intent` | `intent` | |
| `content_keywords` | `idx_content_keywords_market` | `market` | |
| `content_keywords` | `idx_content_keywords_cluster` | `cluster` | |
| `content_keywords` | `idx_content_keywords_volume` | `monthly_searches DESC` | |
| `content_keywords` | `idx_content_keywords_tier` | `tier` | |
| `content_topics` | `idx_content_topics_keyword_market` | `primary_keyword, market` | |
| `content_topics` | `idx_content_topics_status` | `status` | |
| `content_topics` | `idx_content_topics_category` | `category` | |
| `content_topics` | `idx_content_topics_priority` | `priority` | |
| `content_topics` | `idx_content_topics_cluster` | `cluster` | |
| `content_topics` | `idx_content_topics_role` | `role` | |
| `content_topics` | `idx_content_topics_parent` | `parent_topic_id` | |
| `content_daily_assignments` | `idx_assignments_topic` | `topic_id` | |
| `content_daily_assignments` | `idx_assignments_date` | `date` | |
| `blog_posts` | `idx_blog_posts_status_published` | `status, published_at DESC` | Partial: status='published' |
| `blog_posts` | `idx_blog_posts_language_status` | `language, status` | |
| `blog_posts` | `idx_blog_posts_published_at` | `published_at DESC` | |
| `blog_posts` | `idx_blog_posts_source_topic` | `source_topic_id` | |
| `blog_posts` | `idx_blog_posts_is_featured` | `is_featured` | Partial: is_featured=true |
| `blog_posts` | `idx_blog_posts_hero_image_bank` | `hero_image_bank_id` | |

### Analytics Indexes

| Table | Index | Columns | Notes |
|-------|-------|---------|-------|
| `analytics_sessions` | `idx_analytics_sessions_date_test` | `first_seen_at DESC, is_test_data` | Primary query index |
| `analytics_sessions` | `idx_analytics_sessions_test_data` | `is_test_data` | Partial: is_test_data=false |
| `analytics_sessions` | `idx_analytics_sessions_ip` | `ip_address` | |
| `analytics_sessions` | `idx_analytics_sessions_country` | `country_name` | |
| `analytics_sessions` | `idx_analytics_sessions_device` | `device_category` | |
| `analytics_sessions` | `idx_analytics_sessions_first_seen` | `first_seen_at DESC` | |
| `analytics_views` | `idx_analytics_views_session_id` | `session_id` | |
| `analytics_views` | `idx_analytics_views_video_id` | `video_id` | |
| `analytics_views` | `idx_analytics_views_created_at` | `created_at` | |
| `analytics_events` | `idx_analytics_events_event_name` | `event_name` | |
| `analytics_events` | `idx_analytics_events_session_id` | `session_id` | |
| `analytics_events` | `idx_analytics_events_created_at` | `created_at` | |
| `analytics_events` | `idx_analytics_events_user_id` | `user_id` | |
| `analytics_events` | `idx_analytics_events_event_value` | `event_value` | Partial: NOT NULL |
| `analytics_exclusions` | `idx_analytics_exclusions_active` | `active` | Partial: active=true |
| `analytics_exclusions` | `idx_analytics_exclusions_ip` | `ip_cidr` | |
| `performance_metrics` | `idx_performance_metrics_created_at` | `created_at` | |
| `performance_metrics` | `idx_performance_metrics_device_type` | `device_type` | |
| `performance_metrics` | `idx_performance_metrics_lcp` | `lcp_value` | Partial: NOT NULL |
| `performance_metrics` | `idx_performance_metrics_page_name` | `page_name` | |
| `performance_metrics` | `idx_performance_metrics_page_path` | `page_path` | |

### Other Notable Indexes

| Table | Index | Type | Notes |
|-------|-------|------|-------|
| `partners` | `idx_partners_active_map` | btree | Partial: status='Approved' |
| `partners` | `idx_partners_location` | btree(lat, lng) | Partial: non-null |
| `partners` | `idx_partners_slug` | btree | |
| `image_bank` | `idx_image_bank_tags` | GIN | Array search on tags |
| `image_bank` | `idx_image_bank_category` | btree | |
| `image_bank` | `idx_image_bank_usage` | btree | usage_count DESC |
| `contacts` | `idx_contacts_created_at` | btree | created_at DESC |
| `contacts` | `idx_contacts_status` | btree | |
| `help_screens` | `idx_help_screens_route` | btree | |
| `blog_post_tags` | `idx_blog_post_tags_post_id` | btree | Both sides indexed |
| `blog_post_tags` | `idx_blog_post_tags_tag_id` | btree | |
| ~~`blog_post_views`~~ | ~~`idx_blog_post_views_post_slug`~~ | -- | *Dropped Feb 17, 2026* |
| `travel_agency_codes` | `idx_travel_agency_codes_code` | btree | upper(agency_code) unique |
| ~~`posts`~~ | ~~`idx_posts_*_search`~~ | ~~GIN~~ | *Dropped with legacy tables Feb 17, 2026* |

---

## Views

| View | Type | Description |
|------|------|-------------|
| `geography_columns` | PostGIS | Auto-created geography column metadata |
| `geometry_columns` | PostGIS | Auto-created geometry column metadata |

---

## Custom Database Functions

### Application Functions (actively used)

| Function | Purpose |
|----------|---------|
| `blog_set_updated_at()` | Trigger: auto-update `updated_at` on blog tables |
| `update_seo_settings_updated_at()` | Trigger: auto-update `updated_at` on seo_settings |
| `update_updated_at_column()` | Generic trigger: auto-update `updated_at` |
| `update_partners_updated_at()` | Trigger: auto-update `updated_at` on partners |
| `update_daily_analytics()` | Aggregation: compute daily analytics summaries |
| `update_daily_performance()` | Aggregation: compute daily performance summaries |
| `increment_post_view_count()` | Counter: increment blog post view_count |
| `handle_new_user()` | Supabase auth hook: handle new user creation |
| `get_post_with_translation()` | Blog: fetch post with translation data |
| `search_posts()` | Blog: full-text search across posts |
| `update_category_post_count()` | Maintenance: update post counts on categories |
| `update_tag_post_count()` | Maintenance: update post counts on tags |
| `update_post_search_vector()` | Maintenance: rebuild search index on post change |

### Utility / Diagnostic Functions

| Function | Purpose |
|----------|---------|
| `execute_sql_secure()` | Secure SQL execution wrapper |
| `get_database_health()` | Health check: table counts, sizes, connection stats |
| `get_table_columns_simple()` | Schema introspection helper |
| `get_table_indexes_detailed()` | Index introspection helper |
| `get_table_schema()` | Table schema helper |
| `list_all_tables_enhanced()` | Enhanced table listing |
| `list_tables_simple()` | Simple table listing |
| `test_mcp_connection()` | MCP server connection test |

---

## Drizzle ORM Configuration

### Schema Definition

All 34 active tables are defined in `shared/schema.ts` using `pgTable()`. Each table export includes:
- Table definition: `export const blogPosts = pgTable("blog_posts", { ... })`
- Insert schema: `createInsertSchema()` from `drizzle-zod` (omitting auto-generated fields)
- TypeScript types: `$inferSelect` and `z.infer<>`

### Database Connection

`server/db.ts` exports two lazy-initialized singletons:
- **`db`**: Drizzle ORM instance (`PostgresJsDatabase<typeof schema>`) -- used by all route files and services
- **`pool`**: Raw `postgres.js` SQL client -- used by `server/cache.ts` for direct SQL

Both are wrapped in `Proxy` objects for lazy initialization on first access, reading `DATABASE_URL` from environment.

### Query Patterns

Routes import `db` from `../db` and table definitions from `@shared/schema`:

```typescript
import { db } from '../db';
import { blogPosts } from '@shared/schema';
const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, 'published'));
```

Some routes also use raw SQL via `pool` (e.g., `analytics.routes.ts` for `analytics_events` and country aggregations).

### Files Importing Schema

14 server files import from `@shared/schema`: `db.ts`, 4 route files (`analytics`, `blog-analytics`, `help`, `image-bank`), and 9 service files (`database`, `storage`, `seo`, `partners`, `travel`, and 5 analytics services).

---

## Data Profile

### Tables with Active Data

| Table | Rows | Last Activity | Notes |
|-------|------|---------------|-------|
| performance_metrics | 13,669 | Ongoing | Core Web Vitals from real visitors |
| analytics_sessions | 9,108 | Ongoing | Visitor session tracking |
| analytics_events | 8,555 | Ongoing | CTA click events |
| analytics_views | 147 | Ongoing | Page views (lower than sessions due to dedup) |
| content_keywords | 107 | Feb 2026 | SEO keyword research data |
| help_screens | 31 | Feb 2026 | Admin help content for all screens |
| content_topics | 28 | Feb 2026 | Blog content pipeline topics |
| blog_posts | 18 | Feb 2026 | Published articles (13 FR + 5 EN) |
| analytics_conversions | 10 | Feb 2026 | Conversion tracking |
| ai_context | 6 | Feb 2026 | Brand Brain entries |
| gallery_items | 6 | Feb 2026 | Homepage portfolio items |
| hero_videos | 3 | Feb 2026 | Background video carousel |
| travel_upload_submissions | 3 | Feb 2026 | Client photo uploads |
| seo_settings | 2 | Feb 2026 | Per-page SEO (FR and EN) |
| travel_agency_codes | 2 | Feb 2026 | Agency access codes |
| help_flows | 2 | Feb 2026 | Admin walkthrough guides |
| image_bank | 1 | Feb 2026 | Shared image repository |
| analytics_exclusions | 1 | Feb 2026 | IP exclusion rule |

### Tables with Data but No Drizzle Schema

| Table | Rows | Concern | Recommendation |
|-------|------|---------|----------------|
| `analytics_conversions` | 10 | Has data (10 "card_interaction" rows from Jan 30), no code references | Verify if still needed or drop |

---

## Legacy Cleanup History

**Feb 17, 2026 (phase 1):** 50 legacy tables dropped, 102,299 test contacts truncated.

- **Safety verified:** grep confirmed zero code references to any legacy table
- **contacts:** All 102,299 rows were test data (4 test emails: test@example.com, integration.test@memopyk.com, test@memopyk.com, test@test.com)
- **50 tables dropped:** Payload CMS (25), Quote/Invoice (6), Business/Commerce (7), Miscellaneous (12)
- **Space freed:** ~30 MB (contacts 28 MB + legacy table overhead)
- **Kept:** `spatial_ref_sys` (PostGIS system table, required by extension)

**Feb 17, 2026 (phase 2):** DB-only table resolution — 4 tables investigated, 2 dropped, 1 added to Drizzle.

- **`analytics_events`** → Classification A: ACTIVELY USED (8,555 rows, 4 code refs in analytics.routes.ts). Added to Drizzle schema.
- **`analytics_conversions`** → Classification D: UNREFERENCED BUT HAS DATA (10 rows of "card_interaction" from Jan 30, 0 code refs). Flagged for Stéphane.
- **`blog_post_views`** → Classification C: UNREFERENCED AND EMPTY. Dropped.
- **`seo_redirects`** → Classification C: UNREFERENCED AND EMPTY. Dropped.

---

## Storage Architecture

### Supabase Storage (CDN)

- **`memopyk-videos`** bucket: Hero background videos and gallery portfolio videos
- **`memopyk-images`** bucket: Blog hero images, image bank files
- Base URL: `https://supabase.memopyk.org/storage/v1/object/public/`

### Local Disk Cache

Server caches Supabase Storage videos to local disk (`/app/cache/` in Docker) via `server/services/media/video-cache.service.ts` to reduce CDN bandwidth.

---

## Schema vs Database Mismatches

The automated schema audit (`tests/e2e/schema-audit.ts`) compares Drizzle definitions against the live database. Last run (Feb 17, 2026, after DB-only table resolution):

- **0 CRITICAL** mismatches
- **15 WARNING** -- text vs varchar type differences in `travel_agency_codes` (4) and `travel_upload_submissions` (11). Functionally identical in PostgreSQL.
- **4 INFO** -- nullable column mismatches in `content_keywords.market` and `travel_upload_submissions` share fields
- **3 DB-only tables** -- `analytics_conversions` (flagged for review), `spatial_ref_sys` (PostGIS), `geography_columns` (PostGIS)

Run the audit: `npx tsx tests/e2e/schema-audit.ts`

---

*Generated by database audit on 2026-02-17. Machine-readable inventory at `test-results/schema-audit/database-inventory.json`.*
