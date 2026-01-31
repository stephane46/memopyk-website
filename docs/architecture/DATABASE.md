# Database Schema Reference

**Database:** PostgreSQL (Supabase self-hosted)  
**ORM:** Drizzle  
**Schema File:** `shared/schema.ts`  
**Tables:** 40  
**Last verified:** January 31, 2026

---

## Overview

The database uses two content strategies:
- **Bilingual structure** (En/Fr suffixed columns) for homepage content, FAQs, legal docs
- **Language field structure** (single content + `language` field) for blog posts

---

## Table Index

| Category | Tables |
|----------|--------|
| Homepage Content | `hero_videos`, `hero_text_settings`, `gallery_items`, `cta_settings`, `why_memopyk_cards` |
| FAQ | `faq_sections`, `faqs` |
| Blog System | `blog_posts`, `blog_tags`, `blog_post_tags`, `blog_galleries`, `blog_post_views` |
| Partners | `partners` |
| Legal | `legal_documents` |
| SEO | `seo_settings`, `seo_redirects`, `seo_audit_logs`, `seo_image_meta`, `seo_global_settings` |
| Analytics | `analytics_sessions`, `analytics_views`, `realtime_visitors`, `performance_metrics`, `engagement_heatmap`, `conversion_funnel`, `analytics_exclusions` |
| Image Management | `image_bank`, `image_labels`, `image_label_links` |
| Content Planning | `content_topics`, `content_keywords`, `content_weekly_plans`, `content_daily_assignments`, `content_image_bank`, `content_prompt_templates` |
| Travel Portal | `travel_agency_codes`, `travel_upload_submissions` |
| Utility | `contacts`, `country_names`, `deployment_history` |

---

## Homepage Content Tables

### `hero_videos`
Homepage hero section videos. **Bilingual structure.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title_en`, `title_fr` | TEXT | Video titles |
| `url_en`, `url_fr` | TEXT | Video URLs |
| `use_same_video` | BOOLEAN | Use English video for both languages |
| `order_index` | INTEGER | Display order |
| `is_active` | BOOLEAN | Active status |
| `created_at`, `updated_at` | TIMESTAMP | Timestamps |

### `hero_text_settings`
Hero section text overlays with responsive font sizes. **Bilingual structure.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | Primary key |
| `title_fr`, `title_en` | VARCHAR | Main titles |
| `title_mobile_fr`, `title_mobile_en` | VARCHAR | Mobile-specific titles |
| `title_desktop_fr`, `title_desktop_en` | VARCHAR | Desktop-specific titles |
| `subtitle_fr`, `subtitle_en` | VARCHAR | Subtitles |
| `is_active` | BOOLEAN | Active status |
| `font_size` | INTEGER | Legacy font size |
| `font_size_desktop`, `font_size_tablet`, `font_size_mobile` | INTEGER | Responsive font sizes (px) |

### `gallery_items`
Video gallery items with format badges. **Bilingual structure.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title_en`, `title_fr` | TEXT | Display titles |
| `price_en`, `price_fr` | TEXT | Price text (e.g., "USD 145") |
| `source_en`, `source_fr` | TEXT | Source count (e.g., "80 photos & 10 videos") |
| `duration_en`, `duration_fr` | TEXT | Video duration |
| `situation_en`, `situation_fr` | TEXT | Client situation description |
| `story_en`, `story_fr` | TEXT | Story description |
| `sorry_message_en`, `sorry_message_fr` | TEXT | No-video message |
| `format_platform_en`, `format_platform_fr` | TEXT | Platform badge |
| `format_type_en`, `format_type_fr` | TEXT | Format type badge |
| `video_url_en`, `video_url_fr` | TEXT | Video URLs |
| `video_filename` | TEXT | Unified filename for Supabase storage |
| `use_same_video` | BOOLEAN | Use same video for both languages |
| `video_width`, `video_height` | INTEGER | Video dimensions |
| `video_orientation` | TEXT | "portrait" or "landscape" |
| `image_url_en`, `image_url_fr` | TEXT | Image URLs |
| `static_image_url_en`, `static_image_url_fr` | TEXT | Thumbnail URLs (300x200) |
| `static_image_url` | TEXT | DEPRECATED legacy field |
| `crop_settings` | JSONB | Crop position for re-editing |
| `order_index` | INTEGER | Display order |
| `is_active` | BOOLEAN | Active status |

### `cta_settings`
Call-to-action button settings. **Bilingual structure.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | Primary key |
| `button_text_fr`, `button_text_en` | VARCHAR | Button labels |
| `button_url_en`, `button_url_fr` | VARCHAR | Button URLs |
| `is_active` | BOOLEAN | Active status |

### `why_memopyk_cards`
"Why choose MEMOPYK" benefit cards. **Bilingual structure.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | Primary key |
| `title_en`, `title_fr` | TEXT | Card titles |
| `description_en`, `description_fr` | TEXT | Descriptions |
| `icon_name` | VARCHAR | Lucide icon name (e.g., "Zap") |
| `gradient` | VARCHAR | Tailwind gradient classes |
| `order_index` | INTEGER | Display order |
| `is_active` | BOOLEAN | Active status |

---

## FAQ Tables

### `faq_sections`
FAQ category sections. **Bilingual structure.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | Primary key |
| `key` | VARCHAR | Section key identifier |
| `name_en`, `name_fr` | VARCHAR | Section names |
| `order_index` | INTEGER | Display order |
| `is_active` | BOOLEAN | Active status |

### `faqs`
Individual FAQ items. **Bilingual structure.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `section_name_en`, `section_name_fr` | TEXT | Section names (denormalized) |
| `section_order` | INTEGER | Section display order |
| `order_index` | INTEGER | FAQ display order within section |
| `question_en`, `question_fr` | TEXT | Questions |
| `answer_en`, `answer_fr` | TEXT | Answers |
| `is_active` | BOOLEAN | Active status |
| `section_id` | VARCHAR | FK to faq_sections |

---

## Blog System Tables

### `blog_posts`
Blog articles. **Single-language with language field.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Post title |
| `slug` | TEXT | URL slug (unique) |
| `language` | VARCHAR(10) | Language code: 'en-US' or 'fr-FR' |
| `status` | VARCHAR(20) | 'draft', 'in_review', or 'published' |
| `content_html` | TEXT | Full HTML content |
| `description` | TEXT | Short description/excerpt |
| `hero_url` | TEXT | Featured image URL |
| `hero_caption` | TEXT | Image caption |
| `read_time_minutes` | INTEGER | Estimated read time |
| `seo` | JSONB | SEO metadata (title, description, keywords, ogImage) |
| `is_featured` | BOOLEAN | Featured post flag |
| `featured_order` | INTEGER | Featured post order |
| `published_at` | TIMESTAMP | Publication date |
| `source_topic_id` | UUID | FK to content_topics |
| `generation_prompt` | TEXT | AI generation prompt used |
| `generation_date` | TIMESTAMP | When AI-generated |
| `primary_keyword` | TEXT | Primary SEO keyword |
| `secondary_keywords` | TEXT[] | Array of secondary keywords |
| `hero_image_bank_id` | UUID | FK to image_bank |
| `view_count` | INTEGER | Total view count |
| `created_at`, `updated_at` | TIMESTAMP | Timestamps |

### `blog_tags`
Blog tags. **Single-language.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Tag name (unique) |
| `slug` | TEXT | URL slug (unique) |
| `color` | TEXT | Display color |
| `icon` | TEXT | Icon identifier |
| `usage_count` | INTEGER | Number of posts using tag |

### `blog_post_tags`
Many-to-many relationship between posts and tags.

| Column | Type | Description |
|--------|------|-------------|
| `post_id` | UUID | FK to blog_posts (cascade delete) |
| `tag_id` | UUID | FK to blog_tags (cascade delete) |

### `blog_galleries`
Optional images within blog posts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `post_id` | UUID | FK to blog_posts (cascade delete) |
| `sort` | INTEGER | Display order |
| `url` | TEXT | Image URL |
| `title` | TEXT | Image title |
| `alt` | TEXT | Alt text |

### `blog_post_views`
Blog post view tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `post_slug` | TEXT | Post slug |
| `post_title` | TEXT | Post title at time of view |
| `session_id` | TEXT | Viewer session |
| `ip_address` | TEXT | Viewer IP |
| `user_agent` | TEXT | Browser user agent |
| `referrer` | TEXT | Referrer URL |
| `language` | TEXT | Browser language |
| `time_on_page` | INTEGER | Seconds on page |
| `created_at` | TIMESTAMP | View timestamp |

---

## Partner Tables

### `partners`
Partner directory entries. **Single-language (not bilingual).**

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `timestamp` | TIMESTAMP | Creation timestamp |
| `partner_type` | VARCHAR(50) | Partner category (default: "digitization") |
| `partner_name` | TEXT | Company/partner name |
| `email` | TEXT | Contact email |
| `email_public` | BOOLEAN | Show email publicly |
| `phone` | TEXT | Contact phone |
| `phone_public` | BOOLEAN | Show phone publicly |
| `website` | TEXT | Website URL |
| `address`, `address_line2` | TEXT | Street address |
| `city` | TEXT | City name |
| `postal_code` | TEXT | Postal/ZIP code |
| `country` | VARCHAR(2) | ISO-2 country code |
| `photo_formats` | TEXT | Comma-separated photo formats |
| `other_photo` | TEXT | Other photo format notes |
| `film_formats` | TEXT | Comma-separated film formats |
| `other_film` | TEXT | Other film format notes |
| `video_cassettes` | TEXT | Comma-separated video formats |
| `other_video` | TEXT | Other video format notes |
| `delivery` | TEXT | Comma-separated delivery options |
| `other_delivery` | TEXT | Other delivery notes |
| `public_description` | TEXT | Public-facing description |
| `consent` | BOOLEAN | Data consent given |
| `status` | VARCHAR(50) | Approval status (default: "Pending") |
| `is_active` | BOOLEAN | Active on site |
| `show_on_map` | BOOLEAN | Display on map |
| `lat`, `lng` | NUMERIC(10,7) | Map coordinates |
| `slug` | TEXT | URL slug |

---

## Legal Tables

### `legal_documents`
Legal pages (Privacy, Terms, etc.). **Bilingual structure.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `type` | TEXT | Document type (privacy, terms, etc.) |
| `title_en`, `title_fr` | TEXT | Page titles |
| `content_en`, `content_fr` | TEXT | HTML content |
| `is_active` | BOOLEAN | Active status |
| `updated_at` | TIMESTAMP | Last updated |

---

## SEO Tables

### `seo_settings`
Per-page SEO configuration. **Bilingual structure.**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `page` | TEXT | Page identifier |
| `url_slug_en`, `url_slug_fr` | TEXT | URL slugs |
| `meta_title_en`, `meta_title_fr` | TEXT | Meta titles |
| `meta_description_en`, `meta_description_fr` | TEXT | Meta descriptions |
| `meta_keywords_en`, `meta_keywords_fr` | TEXT | Keywords (comma-separated) |
| `og_title_en`, `og_title_fr` | TEXT | Open Graph titles |
| `og_description_en`, `og_description_fr` | TEXT | Open Graph descriptions |
| `og_image_url` | TEXT | Open Graph image |
| `og_type` | TEXT | OG type (default: "website") |
| `twitter_card` | TEXT | Twitter card type |
| `twitter_title_en`, `twitter_title_fr` | TEXT | Twitter titles |
| `twitter_description_en`, `twitter_description_fr` | TEXT | Twitter descriptions |
| `twitter_image_url` | TEXT | Twitter image |
| `canonical_url` | TEXT | Canonical URL |
| `robots_index`, `robots_follow` | BOOLEAN | Robots directives |
| `robots_noarchive`, `robots_nosnippet` | BOOLEAN | Additional robots directives |
| `custom_meta_tags` | JSONB | Additional custom meta tags |
| `structured_data` | JSONB | JSON-LD structured data |
| `json_ld` | JSONB | Additional JSON-LD |
| `seo_score` | INTEGER | SEO score (0-100) |
| `priority` | DECIMAL | Sitemap priority (0.0-1.0) |
| `change_freq` | TEXT | Sitemap change frequency |
| `is_active` | BOOLEAN | Active status |

### `seo_redirects`
URL redirect rules.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `from_path` | TEXT | Source path |
| `to_path` | TEXT | Destination path |
| `redirect_type` | INTEGER | HTTP status (301, 302) |
| `is_active` | BOOLEAN | Active status |
| `description` | TEXT | Admin notes |
| `hit_count` | INTEGER | Times redirect used |
| `last_hit` | TIMESTAMP | Last redirect hit |

### `seo_audit_logs`
SEO change history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `page_id` | TEXT | References seo_settings |
| `action` | TEXT | Action type (created, updated, deleted) |
| `field` | TEXT | Field changed |
| `old_value`, `new_value` | TEXT | Before/after values |
| `admin_user` | TEXT | Who made change |
| `change_reason` | TEXT | Why changed |
| `created_at` | TIMESTAMP | Timestamp |

### `seo_image_meta`
Image SEO metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `image_url` | TEXT | Image URL |
| `alt_text_en`, `alt_text_fr` | TEXT | Alt text |
| `title_en`, `title_fr` | TEXT | Title attribute |
| `caption` | TEXT | Image caption |
| `is_lazy_loaded` | BOOLEAN | Lazy loading enabled |
| `compression_level` | INTEGER | Compression (1-100) |
| `width`, `height` | INTEGER | Dimensions |
| `file_size` | INTEGER | Size in bytes |
| `format` | TEXT | File format |
| `seo_friendly_name` | TEXT | SEO-optimized filename |

### `seo_global_settings`
Site-wide SEO settings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `robots_txt` | TEXT | robots.txt content |
| `sitemap_enabled` | BOOLEAN | Sitemap generation |
| `sitemap_frequency` | TEXT | Sitemap regen frequency |
| `default_meta_title` | TEXT | Fallback meta title |
| `default_meta_description` | TEXT | Fallback description |
| `default_og_image` | TEXT | Default OG image |
| `google_analytics_id` | TEXT | GA tracking ID |
| `google_search_console_code` | TEXT | GSC verification |
| `bing_webmaster_code` | TEXT | Bing verification |
| `facebook_pixel_id` | TEXT | Facebook Pixel ID |
| `is_maintenance_mode` | BOOLEAN | Maintenance mode flag |

---

## Analytics Tables

### `analytics_sessions`
Session tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | TEXT | Session identifier (unique) |
| `user_id` | TEXT | User identifier |
| `ip_address` | TEXT | IP address |
| `user_agent` | TEXT | Browser user agent |
| `referrer` | TEXT | Referrer URL |
| `language` | TEXT | Browser language |
| `country_code`, `country_name` | TEXT | Country info |
| `country`, `country_iso2`, `country_iso3` | TEXT | Legacy country fields |
| `city` | TEXT | City name |
| `device_category` | TEXT | Device type |
| `screen_resolution` | TEXT | Screen size |
| `timezone` | TEXT | User timezone |
| `first_seen_at`, `last_seen_at` | TIMESTAMP | Session boundaries |
| `ended_at` | TIMESTAMP | Legacy end time |
| `session_duration`, `duration` | INTEGER | Duration in seconds |
| `page_count`, `page_views` | INTEGER | Pages visited |
| `is_bounce` | BOOLEAN | Single-page session |
| `is_returning` | BOOLEAN | Return visitor |
| `is_bot` | BOOLEAN | Bot detection |
| `is_test_data` | BOOLEAN | Test data flag |

### `analytics_views`
Page/video view tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `view_id` | TEXT | View identifier (unique) |
| `session_id` | TEXT | Session reference |
| `video_id` | TEXT | Video identifier |
| `video_title` | TEXT | Video title |
| `video_type` | TEXT | Video type (hero, gallery) |
| `cta_id` | TEXT | CTA identifier |
| `page_url` | TEXT | Page URL |
| `page_title` | TEXT | Page title |
| `view_timestamp` | TIMESTAMP | View time |
| `time_on_page` | INTEGER | Seconds on page |
| `is_bounce_view` | BOOLEAN | Bounce view flag |
| `referrer` | TEXT | Referrer URL |
| `language` | TEXT | Content language |
| `view_duration` | INTEGER | Legacy duration field |
| `completion_percentage` | NUMERIC | Video completion % |
| `watched_to_end` | BOOLEAN | Video completed |
| `ip_address`, `user_agent` | TEXT | Viewer info |
| `is_test_data` | BOOLEAN | Test data flag |

### `realtime_visitors`
Real-time visitor tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | TEXT | Session identifier |
| `ip_address` | TEXT | IP address |
| `current_page` | TEXT | Current page |
| `user_agent` | TEXT | Browser user agent |
| `country`, `city` | TEXT | Location |
| `is_active` | BOOLEAN | Currently active |
| `last_seen` | TIMESTAMP | Last activity |
| `is_test_data` | BOOLEAN | Test data flag |

### `performance_metrics`
Performance tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `metric_type` | TEXT | Type (page_load, video_load, api_response, server_health) |
| `metric_name` | TEXT | Metric name |
| `value` | NUMERIC | Metric value |
| `unit` | TEXT | Unit (ms, mb, percent, count) |
| `session_id` | TEXT | Session reference |
| `ip_address`, `user_agent` | TEXT | Client info |
| `metadata` | JSONB | Additional context |
| `is_test_data` | BOOLEAN | Test data flag |

### `engagement_heatmap`
User engagement heatmap data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | TEXT | Session reference |
| `page_url` | TEXT | Page URL |
| `element_id` | TEXT | CSS selector or element ID |
| `event_type` | TEXT | Event (click, hover, scroll, focus) |
| `x_position`, `y_position` | INTEGER | Click coordinates |
| `viewport_width`, `viewport_height` | INTEGER | Viewport size |
| `timestamp` | TIMESTAMP | Event time |
| `duration` | INTEGER | Duration for hover/focus |
| `is_test_data` | BOOLEAN | Test data flag |

### `conversion_funnel`
Conversion funnel tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `session_id` | TEXT | Session reference |
| `funnel_step` | TEXT | Step name (visit_home, view_gallery, etc.) |
| `step_order` | INTEGER | Step order |
| `completed_at` | TIMESTAMP | Completion time |
| `metadata` | JSONB | Additional context |

### `analytics_exclusions`
IP/visitor exclusion rules for filtering analytics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `ip_cidr` | TEXT | IP address or CIDR range |
| `label` | TEXT | Human-readable reason |
| `active` | BOOLEAN | Exclusion active |
| `created_at` | TIMESTAMP | Created time |
| `applies_from` | TIMESTAMP | When exclusion takes effect |

---

## Image Management Tables

### `image_bank`
Centralized image library for blog posts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `filename` | TEXT | Current filename |
| `original_filename` | TEXT | Original filename |
| `storage_path` | TEXT | Storage path (unique) |
| `public_url` | TEXT | Public URL |
| `file_size_bytes` | INTEGER | File size |
| `width`, `height` | INTEGER | Dimensions |
| `mime_type` | TEXT | MIME type |
| `alt_text`, `caption` | TEXT | Accessibility |
| `category` | TEXT | Image category |
| `tags` | TEXT[] | Tags array |
| `usage_count` | INTEGER | Times used |
| `last_used_at` | TIMESTAMP | Last use time |
| `used_in_posts` | UUID[] | Posts using image |
| `source` | TEXT | Image source |
| `license_type` | TEXT | License type |
| `credit_required` | BOOLEAN | Attribution needed |
| `attribution_text` | TEXT | Attribution text |
| `is_hero_suitable`, `is_body_suitable` | BOOLEAN | Usage flags |
| `uploaded_by` | TEXT | Uploader |
| `notes` | TEXT | Admin notes |

### `image_labels`
Image label catalog with colors.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Label name (unique) |
| `color` | TEXT | Hex color code |
| `usage_count` | INTEGER | Usage count |
| `created_by` | TEXT | Creator |

### `image_label_links`
Many-to-many: images to labels.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `image_id` | UUID | FK to image_bank (cascade) |
| `label_id` | UUID | FK to image_labels (cascade) |

---

## Content Planning Tables

### `content_topics`
Pre-researched blog topic ideas.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Topic title |
| `slug` | TEXT | URL slug (unique) |
| `category` | TEXT | Content category |
| `type` | TEXT | Content type |
| `target_word_count` | INTEGER | Target length |
| `primary_keyword` | TEXT | Primary SEO keyword |
| `secondary_keywords` | TEXT[] | Secondary keywords |
| `search_volume` | INTEGER | Monthly search volume |
| `competition` | TEXT | Competition level |
| `search_intent` | TEXT | Search intent |
| `content_angle` | TEXT | Content angle |
| `description` | TEXT | Topic description |
| `hero_image_concept` | TEXT | Hero image idea |
| `body_image_concepts` | TEXT[] | Body image ideas |
| `priority` | INTEGER | Priority level |
| `selected_for_week` | TEXT | Week selected |
| `status` | TEXT | Topic status |
| `memopyk_link_opportunities` | TEXT | Internal linking notes |
| `memopyk_links_placed` | BOOLEAN | Links added |
| `last_generated_at` | TIMESTAMP | Last generation |
| `times_generated` | INTEGER | Generation count |

### `content_keywords`
SEO keyword research data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `keyword` | TEXT | Keyword phrase (unique) |
| `monthly_searches` | INTEGER | Search volume |
| `competition` | TEXT | Competition level |
| `difficulty_score` | INTEGER | SEO difficulty |
| `intent` | TEXT | Search intent |
| `tier` | INTEGER | Keyword tier |
| `seasonal` | BOOLEAN | Seasonal keyword |
| `seasonal_months` | TEXT[] | Active months |
| `notes` | TEXT | Notes |

### `content_weekly_plans`
Weekly content schedules.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `week_number` | TEXT | Week identifier |
| `year` | INTEGER | Year |
| `start_date`, `end_date` | TIMESTAMP | Week boundaries |
| `topics_selected` | TEXT[] | Selected topic IDs |
| `status` | TEXT | Plan status |
| `time_spent_minutes` | INTEGER | Time tracking |
| `notes` | TEXT | Notes |

### `content_daily_assignments`
Daily content assignments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `date` | TIMESTAMP | Assignment date |
| `topic_id` | UUID | FK to content_topics |
| `post_id` | UUID | FK to blog_posts |
| `status` | TEXT | Assignment status |
| `notes` | TEXT | Notes |

### `content_image_bank`
External image tracking for content.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `filename` | TEXT | Image filename |
| `source`, `photographer` | TEXT | Attribution |
| `source_url` | TEXT | Original source URL |
| `alt_text` | TEXT | Alt text |
| `license` | TEXT | License type |
| `orientation` | TEXT | Image orientation |
| `width`, `height` | INTEGER | Dimensions |
| `file_size_kb` | INTEGER | File size |
| `used_in_posts` | TEXT[] | Posts using image |
| `used_count` | INTEGER | Usage count |
| `last_used_at` | TIMESTAMP | Last use time |
| `tags` | TEXT[] | Tags |
| `suitable_for_categories` | TEXT[] | Suitable categories |

### `content_prompt_templates`
AI prompt templates for content generation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Template name (unique) |
| `template_text` | TEXT | Prompt template |
| `variables` | TEXT[] | Variable placeholders |
| `version` | INTEGER | Template version |
| `is_active` | BOOLEAN | Active status |

---

## Travel Portal Tables

### `travel_agency_codes`
Agency codes for travel upload portal.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `agency_name` | TEXT | Agency name |
| `agency_code` | TEXT | Unique code (uppercase) |
| `contact_email` | TEXT | Contact email |
| `contact_phone` | TEXT | Contact phone |
| `notes` | TEXT | Internal notes |
| `is_active` | BOOLEAN | Active status |

### `travel_upload_submissions`
Travel portal form submissions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `first_name`, `last_name` | TEXT | Client name |
| `email` | TEXT | Client email |
| `phone` | TEXT | Client phone |
| `agency_code` | TEXT | Agency code used |
| `agency_name` | TEXT | Agency name (denormalized) |
| `language` | TEXT | Submission language |
| `folder_path` | TEXT | Nextcloud folder path |
| `share_url` | TEXT | Nextcloud share URL |
| `share_id`, `share_token` | TEXT | Share identifiers |
| `status` | TEXT | Submission status |
| `agency_email_sent` | BOOLEAN | Agency notification sent |
| `ngoc_email_sent` | BOOLEAN | Internal notification sent |

---

## Utility Tables

### `contacts`
Contact form submissions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Contact name |
| `email` | TEXT | Email address |
| `phone` | TEXT | Phone number |
| `subject` | TEXT | Message subject |
| `message` | TEXT | Message content |
| `package` | TEXT | Selected package |
| `preferred_contact` | TEXT | Preferred contact method |
| `status` | TEXT | Follow-up status |

### `country_names`
Country name translations.

| Column | Type | Description |
|--------|------|-------------|
| `iso3` | VARCHAR(3) | Primary key (ISO-3 code) |
| `display_name` | TEXT | Legacy display name |
| `display_name_en`, `display_name_fr` | TEXT | Translated names |

### `deployment_history`
Deployment tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `type` | TEXT | Deployment type |
| `status` | TEXT | Deployment status |
| `start_time`, `end_time` | TIMESTAMP | Timing |
| `duration` | INTEGER | Duration in seconds |
| `logs` | TEXT | Deployment logs |
| `host`, `domain` | TEXT | Target info |

---

## Relationships

```
blog_posts ─────────┬───── blog_post_tags ─────── blog_tags
                    │
                    ├───── blog_galleries
                    │
                    ├───── blog_post_views
                    │
                    └───── content_daily_assignments
                                    │
content_topics ─────────────────────┘

image_bank ─────────── image_label_links ─────── image_labels

faq_sections ─────────── faqs

travel_agency_codes ─────── travel_upload_submissions
```

---

## Key Differences: Bilingual vs Language Field

| Approach | Tables | How it works |
|----------|--------|--------------|
| **Bilingual** (En/Fr columns) | Homepage content, FAQs, Legal, SEO | One row with `title_en` + `title_fr` columns |
| **Language field** | Blog posts | Separate rows per language with `language` field |

**Why different approaches?**
- Homepage content is always displayed in both languages on same page = bilingual columns
- Blog posts are separate URLs per language = separate rows with language field

---

*Schema verified against `shared/schema.ts` on January 31, 2026.*
