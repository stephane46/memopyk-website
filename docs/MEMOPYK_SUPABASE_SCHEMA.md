# MEMOPYK Supabase Database Schema Documentation

**Generated:** 2025-11-01  
**Updated:** 2025-11-01 (Removed Directus - 37 objects deleted)
**Database:** Supabase PostgreSQL (Public Schema)  
**Total Tables:** 53  
**Total Views:** 3  
**Total Objects:** 56

---

## 🆕 Recent Updates

**November 1, 2025:**
- ✅ **REMOVED DIRECTUS** - Deleted 28 Directus tables + 9 Directus views
- Directus project deleted from VPS
- Database cleaned - down from 92 tables to 53 tables
- All Directus dependencies removed

---

## Table of Contents

1. [Analytics Tables](#analytics-tables) (5 tables)
2. [Content Management](#content-management) (12 tables)
3. [Block System](#block-system) (10 tables)
4. [Forms](#forms) (4 tables)
5. [Navigation](#navigation) (2 tables)
6. [SEO](#seo) (3 tables)
7. [Media & Galleries](#media--galleries) (4 tables)
8. [Users & Partners](#users--partners) (3 tables)
9. [Performance](#performance) (2 tables)
10. [Spatial/PostGIS](#spatialpostgis) (1 table)
11. [Analytics Summary Tables](#analytics-summary-tables) (7 tables - converted from views)
12. [Views](#views) (3 views)

---

## Analytics Tables

### 1. **analytics_sessions** (0 rows)
Session tracking and aggregation table

**Key Columns:**
- `id` (uuid, PK) - Unique session identifier
- `session_id` (text, UNIQUE) - Session tracking ID
- `user_id` (text) - Anonymous user identifier
- `ip_address` (text) - User IP address
- `user_agent` (text) - Browser user agent string
- `referrer` (text) - Referring URL
- `language` (text) - Browser language
- `country_code` (text) - ISO country code
- `country_name` (text) - Full country name
- `device_category` (text) - mobile/desktop/tablet
- `screen_resolution` (text) - Screen size
- `timezone` (text) - User timezone
- `first_seen_at` (timestamp) - Session start time
- `last_seen_at` (timestamp) - Last activity time
- `session_duration` (integer) - Duration in seconds
- `page_count` (integer, default: 1) - Number of pages viewed
- `is_bounce` (boolean, default: false) - Single page session
- `is_returning` (boolean, default: false) - Returning visitor flag
- `created_at`, `updated_at` (timestamp)

**Relationships:**
```
analytics_sessions
└── ← analytics_events (session_id) - Informal via session_id
```

---

### 2. **analytics_events** (943 rows)
Main event tracking table

**Key Columns:**
- `event_id` (uuid, PK)
- `event_name` (varchar) - page_view/click/conversion/etc
- `event_timestamp` (timestamp with timezone)
- `user_id` (varchar) - Anonymous user identifier
- `session_id` (varchar) - Links to analytics_sessions
- `page_url` (text)
- `page_title` (varchar)
- `referrer` (text)
- `utm_source`, `utm_medium`, `utm_campaign` (varchar)
- `device_type`, `browser`, `operating_system` (varchar)
- `country`, `city` (varchar)
- `latitude`, `longitude` (numeric)
- `event_properties` (jsonb) - Additional data

**Relationships:**
```
analytics_events
├── → analytics_sessions (session_id) - Informal
└── ← analytics_conversions (event_id) [CASCADE]
```

---

### 3. **analytics_conversions** (4 rows)
Conversion tracking

**Key Columns:**
- `conversion_id` (uuid, PK)
- `event_id` (uuid, FK → analytics_events)
- `conversion_type` (varchar) - form_submit/purchase/signup
- `conversion_value` (numeric)
- `currency` (varchar)
- `conversion_timestamp` (timestamp with timezone)
- `user_id` (varchar)

**Relationships:**
- → analytics_events (event_id, CASCADE delete)

---

### 4. **analytics_daily_summary** (0 rows)
Daily aggregated analytics

**Key Columns:**
- `date` (date, PK)
- `total_sessions` (integer)
- `total_pageviews` (integer)
- `unique_visitors` (integer)
- `bounce_rate` (numeric)
- `avg_session_duration` (interval)
- `total_conversions` (integer)

---

### 5. **performance_metrics** (3,184 rows)
Web performance monitoring

**Key Columns:**
- `metric_id` (uuid, PK)
- `metric_timestamp` (timestamp with timezone)
- `user_id`, `session_id` (varchar)
- `page_url` (text)
- `dns_time`, `tcp_time`, `ttfb`, `download_time` (integer) - Times in ms
- `dom_interactive`, `dom_complete`, `load_complete` (integer)
- `fcp` (integer) - First Contentful Paint
- `lcp` (integer) - Largest Contentful Paint
- `fid` (integer) - First Input Delay
- `cls` (numeric) - Cumulative Layout Shift
- `device_type`, `browser`, `os` (varchar)

---

## Content Management

### 6. **posts** (24 columns)
Main blog posts/content table

**Key Columns:**
- `id` (integer, PK)
- `title`, `slug` (text)
- `content`, `excerpt` (text)
- `featured_image_url` (text)
- `status` (text) - draft/published
- `published_at` (timestamp)
- `author_id` (integer)
- `view_count`, `like_count` (integer)
- `meta_title`, `meta_description` (text)
- `created_at`, `updated_at` (timestamp)

---

### 7. **blog_posts** (16 columns)
Alternative blog posts table

**Key Columns:**
- `id` (integer, PK)
- `title`, `slug` (text)
- `content`, `excerpt` (text)
- `featured_image` (text)
- `status` (text)
- `published_date` (timestamp)
- `author` (text)
- `created_at`, `updated_at` (timestamp)

---

### 8. **tags** (11 columns)
Content tagging system

**Key Columns:**
- `id` (integer, PK)
- `name`, `slug` (text, UNIQUE)
- `description` (text)
- `color` (varchar)
- `icon` (varchar)
- `post_count` (integer, default: 0)
- `created_at`, `updated_at` (timestamp)

---

### 9. **post_tags** (6 columns)
Many-to-many relationship between posts and tags

**Key Columns:**
- `id` (integer, PK)
- `post_id` (integer, FK → posts)
- `tag_id` (integer, FK → tags)
- `created_at` (timestamp)

**Relationships:**
- → posts (CASCADE delete)
- → tags (CASCADE delete)

---

### 10. **blog_tags** (5 columns)
Tags for blog_posts

**Key Columns:**
- `id` (integer, PK)
- `name` (text, UNIQUE)
- `slug` (text, UNIQUE)
- `created_at`, `updated_at` (timestamp)

---

### 11. **blog_post_tags** (2 columns)
Link table for blog_posts and blog_tags

**Key Columns:**
- `blog_post_id` (integer, FK → blog_posts)
- `blog_tag_id` (integer, FK → blog_tags)

**Composite PK:** (blog_post_id, blog_tag_id)

---

### 12. **pages** (11 columns)
CMS pages

**Key Columns:**
- `id` (integer, PK)
- `title`, `slug` (text, UNIQUE)
- `content` (text)
- `status` (text) - draft/published
- `template` (text)
- `published_at` (timestamp)
- `meta_title`, `meta_description` (text)
- `created_at`, `updated_at` (timestamp)

---

### 13. **page_blocks** (11 columns)
Block components for pages

**Key Columns:**
- `id` (integer, PK)
- `page_id` (integer, FK → pages)
- `block_type` (text) - hero/richtext/gallery/form/etc
- `block_id` (integer) - References specific block table
- `sort_order` (integer)
- `is_visible` (boolean, default: true)
- `created_at`, `updated_at` (timestamp)

**Relationships:**
- → pages (CASCADE delete)

---

### 14. **globals** (16 columns)
Global site settings

**Key Columns:**
- `id` (integer, PK)
- `site_name`, `site_description` (text)
- `logo_url`, `favicon_url` (text)
- `contact_email`, `contact_phone` (text)
- `social_media` (jsonb) - Social links
- `analytics_id` (text)
- `theme_settings` (jsonb)
- `maintenance_mode` (boolean, default: false)
- `created_at`, `updated_at` (timestamp)

---

### 15. **redirects** (9 columns)
URL redirect management

**Key Columns:**
- `id` (integer, PK)
- `source_path` (text, UNIQUE)
- `destination_path` (text)
- `status_code` (integer) - 301/302
- `is_active` (boolean, default: true)
- `hit_count` (integer, default: 0)
- `created_at`, `updated_at` (timestamp)

---

### 16. **ai_prompts** (11 columns)
AI/LLM prompt management

**Key Columns:**
- `id` (integer, PK)
- `name`, `description` (text)
- `prompt_template` (text)
- `category` (text)
- `is_active` (boolean, default: true)
- `usage_count` (integer, default: 0)
- `created_at`, `updated_at` (timestamp)

---

### 17. **users** (3 columns)
Simple user table

**Key Columns:**
- `id` (integer, PK)
- `email` (text)
- `name` (text)

---

## Block System

### 18. **block_hero** (11 columns)
Hero section blocks

**Key Columns:**
- `id` (integer, PK)
- `title`, `subtitle` (text)
- `background_image_url` (text)
- `cta_text`, `cta_url` (text)
- `alignment` (text) - left/center/right
- `height` (text) - small/medium/large/full
- `overlay_opacity` (numeric)
- `created_at`, `updated_at` (timestamp)

---

### 19. **block_richtext** (9 columns)
Rich text content blocks

**Key Columns:**
- `id` (integer, PK)
- `content` (text)
- `format` (text) - html/markdown
- `max_width` (text)
- `padding` (text)
- `background_color` (text)
- `created_at`, `updated_at` (timestamp)

---

### 20. **block_gallery** (7 columns)
Gallery blocks

**Key Columns:**
- `id` (integer, PK)
- `title` (text)
- `layout` (text) - grid/masonry/slider
- `columns` (integer)
- `gap` (text)
- `created_at`, `updated_at` (timestamp)

---

### 21. **block_gallery_items** (8 columns)
Items in gallery blocks

**Key Columns:**
- `id` (integer, PK)
- `block_gallery_id` (integer, FK → block_gallery)
- `image_url` (text)
- `caption`, `alt_text` (text)
- `sort_order` (integer)
- `created_at`, `updated_at` (timestamp)

**Relationships:**
- → block_gallery (CASCADE delete)

---

### 22. **block_form** (8 columns)
Form blocks

**Key Columns:**
- `id` (integer, PK)
- `form_id` (integer, FK → forms)
- `title` (text)
- `description` (text)
- `submit_button_text` (text)
- `success_message` (text)
- `created_at`, `updated_at` (timestamp)

**Relationships:**
- → forms (SET NULL)

---

### 23. **block_button** (13 columns)
Button/CTA blocks

**Key Columns:**
- `id` (integer, PK)
- `text` (text)
- `url` (text)
- `style` (text) - primary/secondary/outline
- `size` (text) - small/medium/large
- `icon` (text)
- `is_external` (boolean, default: false)
- `alignment` (text)
- `created_at`, `updated_at` (timestamp)

---

### 24. **block_button_group** (6 columns)
Button group container

**Key Columns:**
- `id` (integer, PK)
- `alignment` (text)
- `spacing` (text)
- `layout` (text) - horizontal/vertical
- `created_at`, `updated_at` (timestamp)

---

### 25. **block_posts** (9 columns)
Blog post listing blocks

**Key Columns:**
- `id` (integer, PK)
- `title` (text)
- `display_mode` (text) - grid/list/carousel
- `posts_per_page` (integer)
- `filter_by_tag` (integer)
- `show_excerpt` (boolean, default: true)
- `created_at`, `updated_at` (timestamp)

---

### 26. **block_pricing** (7 columns)
Pricing section blocks

**Key Columns:**
- `id` (integer, PK)
- `title`, `subtitle` (text)
- `billing_period` (text) - monthly/yearly
- `highlight_plan` (integer)
- `created_at`, `updated_at` (timestamp)

---

### 27. **block_pricing_cards** (14 columns)
Individual pricing cards

**Key Columns:**
- `id` (integer, PK)
- `block_pricing_id` (integer, FK → block_pricing)
- `name` (text)
- `price` (numeric)
- `features` (jsonb)
- `cta_text`, `cta_url` (text)
- `is_highlighted` (boolean, default: false)
- `sort_order` (integer)
- `created_at`, `updated_at` (timestamp)

**Relationships:**
- → block_pricing (CASCADE delete)

---

## Forms

### 28. **forms** (13 columns)
Form definitions

**Key Columns:**
- `id` (integer, PK)
- `name`, `description` (text)
- `submit_button_text` (text)
- `success_message` (text)
- `redirect_url` (text)
- `notification_email` (text)
- `is_active` (boolean, default: true)
- `submission_count` (integer, default: 0)
- `created_at`, `updated_at` (timestamp)

---

### 29. **form_fields** (16 columns)
Form field definitions

**Key Columns:**
- `id` (integer, PK)
- `form_id` (integer, FK → forms)
- `field_name`, `field_label` (text)
- `field_type` (text) - text/email/textarea/select/etc
- `is_required` (boolean, default: false)
- `placeholder`, `default_value` (text)
- `validation_rules` (jsonb)
- `options` (jsonb) - For select/radio/checkbox
- `sort_order` (integer)
- `created_at`, `updated_at` (timestamp)

**Relationships:**
- → forms (CASCADE delete)

---

### 30. **form_submissions** (3 columns)
Form submission records

**Key Columns:**
- `id` (integer, PK)
- `form_id` (integer, FK → forms)
- `submitted_at` (timestamp, default: NOW())

**Relationships:**
- → forms (CASCADE delete)

---

### 31. **form_submission_values** (7 columns)
Submitted form field values

**Key Columns:**
- `id` (integer, PK)
- `submission_id` (integer, FK → form_submissions)
- `field_id` (integer, FK → form_fields)
- `value` (text)
- `created_at` (timestamp)

**Relationships:**
- → form_submissions (CASCADE delete)
- → form_fields (CASCADE delete)

---

## Navigation

### 32. **navigation** (7 columns)
Navigation menu definitions

**Key Columns:**
- `id` (integer, PK)
- `name` (text, UNIQUE)
- `location` (text) - header/footer/sidebar
- `is_active` (boolean, default: true)
- `created_at`, `updated_at` (timestamp)

---

### 33. **navigation_items** (13 columns)
Navigation menu items

**Key Columns:**
- `id` (integer, PK)
- `navigation_id` (integer, FK → navigation)
- `parent_id` (integer) - Self-referential for sub-menus
- `title` (text)
- `url` (text)
- `icon` (text)
- `is_external` (boolean, default: false)
- `opens_in_new_tab` (boolean, default: false)
- `sort_order` (integer)
- `is_visible` (boolean, default: true)
- `created_at`, `updated_at` (timestamp)

**Relationships:**
- → navigation (CASCADE delete)
- → navigation_items (parent_id, CASCADE delete)

---

## SEO

### 34. **seo_settings** (32 columns)
SEO configuration per page/post

**Key Columns:**
- `id` (integer, PK)
- `entity_type` (text) - page/post/product
- `entity_id` (integer)
- `meta_title`, `meta_description` (text)
- `canonical_url` (text)
- `og_title`, `og_description`, `og_image` (text)
- `twitter_title`, `twitter_description`, `twitter_image` (text)
- `keywords` (text[])
- `robots` (text) - index,follow/noindex,nofollow
- `schema_markup` (jsonb)
- `breadcrumbs` (jsonb)
- `created_at`, `updated_at` (timestamp)

---

### 35. **seo_global_config** (15 columns)
Global SEO settings

**Key Columns:**
- `id` (integer, PK)
- `site_name`, `site_description` (text)
- `default_og_image` (text)
- `default_twitter_image` (text)
- `google_site_verification` (text)
- `google_analytics_id` (text)
- `robots_txt` (text)
- `sitemap_enabled` (boolean, default: true)
- `created_at`, `updated_at` (timestamp)

---

### 36. **redirects** (Already listed above in Content Management #15)

---

## Media & Galleries

### 37. **galleries** (11 columns)
Gallery collections

**Key Columns:**
- `id` (integer, PK)
- `title`, `slug` (text, UNIQUE)
- `description` (text)
- `cover_image_url` (text)
- `is_featured` (boolean, default: false)
- `view_count` (integer, default: 0)
- `photo_count` (integer, default: 0)
- `created_at`, `updated_at` (timestamp)

---

### 38. **gallery_images** (8 columns)
Images in galleries

**Key Columns:**
- `id` (integer, PK)
- `gallery_id` (integer, FK → galleries)
- `image_url` (text)
- `caption`, `alt_text` (text)
- `sort_order` (integer)
- `created_at`, `updated_at` (timestamp)

**Relationships:**
- → galleries (CASCADE delete)

---

### 39. **blog_galleries** (6 columns)
Galleries linked to blog posts

**Key Columns:**
- `id` (integer, PK)
- `blog_post_id` (integer, FK → blog_posts)
- `gallery_id` (integer, FK → galleries)
- `sort_order` (integer)
- `created_at`, `updated_at` (timestamp)

**Relationships:**
- → blog_posts (CASCADE delete)
- → galleries (CASCADE delete)

---

### 40. **photos** (23 columns)
Photo metadata and assets

**Key Columns:**
- `id` (integer, PK)
- `title`, `description` (text)
- `file_url` (text)
- `thumbnail_url` (text)
- `width`, `height` (integer)
- `file_size` (integer)
- `mime_type` (text)
- `camera_make`, `camera_model` (text)
- `focal_length`, `aperture`, `shutter_speed`, `iso` (text)
- `taken_at` (timestamp)
- `location` (text)
- `latitude`, `longitude` (numeric)
- `created_at`, `updated_at` (timestamp)

---

## Users & Partners

### 41. **mizzap_users** (16 columns)
Mizzap integration users

**Key Columns:**
- `id` (integer, PK)
- `email` (text, UNIQUE)
- `name` (text)
- `avatar_url` (text)
- `role` (text)
- `is_active` (boolean, default: true)
- `last_login_at` (timestamp)
- `login_count` (integer, default: 0)
- `preferences` (jsonb)
- `created_at`, `updated_at` (timestamp)

---

### 42. **partners** (32 columns)
Partner/vendor management

**Key Columns:**
- `id` (integer, PK)
- `name`, `company` (text)
- `email`, `phone` (text)
- `website` (text)
- `logo_url` (text)
- `category` (text)
- `status` (text) - active/inactive/pending
- `contract_start_date`, `contract_end_date` (date)
- `billing_address`, `shipping_address` (jsonb)
- `payment_terms` (text)
- `discount_percentage` (numeric)
- `notes` (text)
- `created_at`, `updated_at` (timestamp)

---

### 43. **users** (Already listed in Content Management #17)

---

## Performance

### 44. **performance_metrics** (Already listed in Analytics #5)

---

### 45. **performance_daily_summary** (23 columns)
Daily performance aggregations

**Key Columns:**
- `date` (date, PK)
- `avg_ttfb`, `avg_fcp`, `avg_lcp`, `avg_fid` (numeric)
- `p50_ttfb`, `p75_ttfb`, `p95_ttfb`, `p99_ttfb` (numeric)
- `p50_fcp`, `p75_fcp`, `p95_fcp` (numeric)
- `p50_lcp`, `p75_lcp`, `p95_lcp` (numeric)
- `avg_cls` (numeric)
- `total_measurements` (integer)
- `created_at`, `updated_at` (timestamp)

---

## Spatial/PostGIS

### 46. **spatial_ref_sys** (5 columns)
PostGIS spatial reference system definitions

**Key Columns:**
- `srid` (integer, PK) - Spatial Reference System ID
- `auth_name` (varchar)
- `auth_srid` (integer)
- `srtext` (varchar) - WKT representation
- `proj4text` (varchar) - Proj4 representation

**Purpose:** Standard PostGIS table for coordinate system definitions

---

## Analytics Summary Tables
*(Formerly Directus views, now base tables)*

These tables were converted from views after Directus removal. They appear to store aggregated analytics data.

### 47. **conversion_funnel** (1 column)
Conversion funnel metrics

### 48. **daily_kpi_summary** (1 column)
Daily KPI aggregations

### 49. **device_browser_stats** (1 column)
Device and browser statistics

### 50. **event_distribution** (1 column)
Event distribution analysis

### 51. **monthly_trends** (1 column)
Monthly trend data

### 52. **performance_by_page** (1 column)
Performance metrics per page

### 53. **performance_issues** (1 column)
Performance issue tracking

### 54. **realtime_dashboard** (1 column)
Real-time dashboard metrics

### 55. **recent_high_value_events** (1 column)
High-value event tracking

### 56. **top_conversions** (1 column)
Top conversion tracking

**Note:** These tables need schema investigation to document proper column structures.

---

## Views

### 1. **geography_columns** (PostGIS)
PostGIS geography columns metadata

### 2. **geometry_columns** (PostGIS)
PostGIS geometry columns metadata

### 3. **related_posts_view**
View for related posts recommendations

---

## Database Relationships Summary

### Core Content Flow:
```
posts ←→ post_tags ←→ tags
blog_posts ←→ blog_post_tags ←→ blog_tags
pages → page_blocks → block_* tables
```

### Forms Flow:
```
forms → form_fields
forms → form_submissions → form_submission_values → form_fields
```

### Analytics Flow:
```
analytics_sessions ← analytics_events → analytics_conversions
performance_metrics → performance_daily_summary (aggregation)
```

### Media Flow:
```
galleries → gallery_images
blog_posts ← blog_galleries → galleries
```

### Navigation Flow:
```
navigation → navigation_items → navigation_items (self-referential)
```

---

## Database Statistics

| Metric | Count |
|--------|-------|
| **Total Tables** | 53 |
| **Base Tables** | 53 |
| **Views** | 3 |
| **Total Objects** | 56 |
| **Foreign Keys** | ~50+ |
| **Total Rows** | ~15,000 |
| **Largest Tables** | spatial_ref_sys (8,500), performance_metrics (3,184), analytics_events (943) |
| **Removed (Nov 1)** | 37 Directus objects (28 tables + 9 views) |

---

## Migration Notes

**November 1, 2025 - Directus Removal:**

1. ✅ Dropped all 28 Directus tables (directus_users, directus_roles, etc.)
2. ✅ Dropped all 9 Directus views (directus_realtime_dashboard, etc.)
3. ⚠️ Some analytics views were recreated as tables (conversion_funnel, etc.)
4. ✅ No data loss - all content tables preserved
5. ✅ All relationships intact
6. ✅ VPS Directus project deleted

**Action Items:**
- [ ] Document proper schemas for converted analytics tables (#47-56)
- [ ] Verify if analytics summary tables are being populated
- [ ] Consider creating new analytics views if needed
- [ ] Update application code to remove Directus dependencies

---

**End of Schema Documentation**
