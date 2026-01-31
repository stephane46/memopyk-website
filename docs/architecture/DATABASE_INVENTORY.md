# Database Inventory

**Source:** Live Supabase query  
**Date:** January 31, 2026  
**Total tables in database:** 87 (including views and legacy)

---

## Active Tables (contain data)

These tables are actively being used by memopyk.com:

| Table | Rows | In schema.ts | Status |
|-------|------|--------------|--------|
| `contacts` | 94,267 | ✅ | Active - contact form submissions |
| `seo_settings` | 31,421 | ✅ | Active - per-page SEO config |
| `performance_metrics` | 13,616 | ✅ | Active - page/video load times |
| `analytics_sessions` | 9,024 | ✅ | Active - visitor sessions |
| `analytics_events` | 8,512 | ❌ | **MISSING FROM SCHEMA** |
| `analytics_conversions` | 10 | ❌ | **MISSING FROM SCHEMA** |
| `gallery_items` | 6 | ✅ | Active - video gallery |
| `analytics_views` | 5 | ✅ | Active - page/video views |
| `hero_videos` | 3 | ✅ | Active - homepage hero |
| `travel_upload_submissions` | 2 | ✅ | Active - travel portal |
| `travel_agency_codes` | 2 | ✅ | Active - agency codes |
| `analytics_exclusions` | 1 | ✅ | Active - IP filtering |

---

## Schema Gaps

### Tables in Database but NOT in schema.ts

These tables exist and have data but lack Drizzle schema definitions:

#### `analytics_events` (8,512 rows, 33 columns)
Primary event tracking table. Columns include:
- `id`, `event_id`, `event_name`, `event_value`, `currency`
- `user_id`, `session_id`, `page_name`, `page_path`, `page_title`
- `form_name`, `form_type`, `form_language`
- `share_platform`, `scroll_percent`
- `video_title`, `video_index`, `gallery_item_title`, `item_index`
- `partner_country`, `services_selected`, `action`, `page_location`
- `cta_id`, `package`, `language`, `user_language`, `user_timezone`
- `user_market_segment`, `referrer`, `user_agent`
- `created_at`, `updated_at`

#### `analytics_conversions` (10 rows, 13 columns)
Conversion tracking linked to events. Columns:
- `id`, `conversion_id`, `event_id` (FK to analytics_events)
- `conversion_type`, `conversion_value`, `currency`
- `user_id`, `session_id`, `page_name`, `page_path`
- `conversion_date`, `created_at`, `updated_at`

**Action needed:** Add these to `shared/schema.ts` or document as direct SQL access only.

---

## Empty Tables in schema.ts

These are defined in schema.ts but have 0 rows in production:

| Table | Purpose | Status |
|-------|---------|--------|
| `hero_text_settings` | Hero text overlays | Ready, unused |
| `faq_sections` | FAQ categories | Ready, unused |
| `faqs` | FAQ items | Ready, unused |
| `legal_documents` | Privacy/Terms | Ready, unused |
| `cta_settings` | CTA buttons | Ready, unused |
| `why_memopyk_cards` | Benefit cards | Ready, unused |
| `seo_redirects` | URL redirects | Ready, unused |
| `seo_audit_logs` | SEO change history | Ready, unused |
| `seo_image_meta` | Image SEO | Ready, unused |
| `seo_global_settings` | Global SEO | Ready, unused |
| `realtime_visitors` | Live visitors | Ready, unused |
| `engagement_heatmap` | Click tracking | Ready, unused |
| `conversion_funnel` | Funnel steps | Ready, unused |
| `deployment_history` | Deploy logs | Ready, unused |
| `partners` | Partner directory | Ready, unused |
| `blog_posts` | Blog articles | Ready, unused |
| `blog_tags` | Blog tags | Ready, unused |
| `blog_post_tags` | Post-tag links | Ready, unused |
| `blog_galleries` | Blog images | Ready, unused |
| `blog_post_views` | Blog analytics | Ready, unused |
| `image_bank` | Image library | Ready, unused |
| `image_labels` | Image tags | Ready, unused |
| `image_label_links` | Image-tag links | Ready, unused |
| `content_topics` | Blog topic ideas | Ready, unused |
| `content_keywords` | SEO keywords | Ready, unused |
| `content_weekly_plans` | Content calendar | Ready, unused |
| `content_daily_assignments` | Daily tasks | Ready, unused |
| `content_image_bank` | Content images | Ready, unused |
| `content_prompt_templates` | AI prompts | Ready, unused |

---

## Legacy Tables (not in schema.ts, 0 rows)

These appear to be from previous systems (Directus CMS, quote system, etc.):

### CMS/Page Builder (Directus legacy)
- `pages`, `page_blocks`, `content_blocks`
- `navigation`, `navigation_items`
- `block_hero`, `block_gallery`, `block_gallery_items`
- `block_button`, `block_button_group`
- `block_form`, `block_posts`, `block_pricing`, `block_pricing_cards`
- `block_richtext`
- `globals`, `redirects`
- `posts`, `galleries`

### Quote/Invoice System
- `quotes`, `quote_versions`, `quote_lines`, `quote_blocks`
- `quote_number_counters`
- `clients`, `products`, `bundles`, `bundle_items`
- `tax_rates`, `fx_rates`
- `devis`

### Forms System
- `forms`, `form_fields`, `form_submissions`, `form_submission_values`

### Other Legacy
- `activities`, `attachments`, `photos`
- `ai_prompts`, `pdf_jobs`
- `mizzap_users`
- `seo_global_config` (duplicate of seo_global_settings?)

### PostGIS (system)
- `spatial_ref_sys`, `geography_columns`, `geometry_columns`

---

## Recommendations

### Immediate Actions
1. **Add `analytics_events` to schema.ts** - It has 8,512 rows of real data
2. **Add `analytics_conversions` to schema.ts** - Links to events, has conversions
3. **Update DATABASE.md** with accurate table count and missing tables

### Consider Later
1. **Clean up legacy tables** - Remove unused Directus/quote tables
2. **Audit seo_settings** - 31K rows seems excessive, may need cleanup
3. **Audit contacts** - 94K rows, verify if all are real submissions

### Documentation Updates Needed
- [ ] Add analytics_events to DATABASE.md
- [ ] Add analytics_conversions to DATABASE.md  
- [ ] Update table count (was 40 in schema, 87 in DB)
- [ ] Document which tables are legacy vs active

---

*Generated from live Supabase query on January 31, 2026*
