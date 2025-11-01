# MEMOPYK Supabase Database Schema Documentation

**Generated:** 2025-11-01  
**Database:** Supabase PostgreSQL (Public Schema)  
**Total Tables:** 91  
**Total Views:** 9

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Core Content Tables](#core-content-tables)
3. [Block/Component Tables](#blockcomponent-tables)
4. [Analytics Tables](#analytics-tables)
5. [Form Management](#form-management)
6. [Directus CMS Tables](#directus-cms-tables)
7. [Relationships Diagram](#relationships-diagram)
8. [Complete Foreign Key Reference](#complete-foreign-key-reference)

---

## Database Overview

### Table Categories

| Category | Tables | Purpose |
|----------|--------|---------|
| **Content Management** | pages, posts, galleries, tags | Core content |
| **Blocks/Components** | block_* (13 tables) | Page builder components |
| **Analytics** | analytics_* (4 tables + views) | Event tracking & metrics |
| **Performance** | performance_* (3 tables + views) | Performance monitoring |
| **Forms** | forms, form_fields, form_submissions | Form handling |
| **Navigation** | navigation, navigation_items | Site navigation |
| **SEO** | seo_global_config, seo_settings, redirects | SEO management |
| **Directus** | directus_* (38 tables) | CMS system tables |
| **User Management** | directus_users, mizzap_users | User accounts |

---

## Core Content Tables

### 1. **posts** (18 rows)
Main blog/content posts table

**Key Columns:**
- `id` (uuid, PK) - Unique identifier
- `title` (varchar) - Post title
- `slug` (varchar, unique) - URL slug
- `content` (text) - Post content
- `excerpt` (text) - Short description
- `status` (varchar) - draft/published/archived
- `featured` (boolean) - Featured post flag
- `author` (uuid, FK → directus_users)
- `image` (uuid, FK → directus_files)
- `published_date` (timestamp)
- `views_count` (integer) - View counter
- `reading_time` (integer) - Estimated reading time
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → directus_users (author, user_created, user_updated)
- → directus_files (image)
- ← galleries (post_id)
- ← post_tags (post_id)
- ← block_button (post)
- ← navigation_items (post)

---

### 2. **pages** (5 rows)
Static pages table

**Key Columns:**
- `id` (uuid, PK)
- `title` (varchar)
- `slug` (varchar, unique)
- `status` (varchar)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → directus_users (user_created, user_updated)
- ← page_blocks (page)
- ← block_button (page)
- ← navigation_items (page)

---

### 3. **tags** (0 rows)
Content tags/categories

**Key Columns:**
- `id` (uuid, PK)
- `name` (varchar)
- `slug` (varchar, unique)
- `description` (text)
- `color` (varchar)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → directus_users (user_created, user_updated)
- ← post_tags (tag_id)

---

### 4. **post_tags** (0 rows)
Many-to-many junction table for posts ↔ tags

**Key Columns:**
- `post_id` (uuid, FK → posts)
- `tag_id` (uuid, FK → tags)
- `user_created` (FK → directus_users)
- `date_created` (timestamp)

**Relationships:**
- → posts (CASCADE delete)
- → tags (CASCADE delete)
- → directus_users (user_created)

---

### 5. **galleries** (1 row)
Image galleries for posts

**Key Columns:**
- `id` (uuid, PK)
- `title` (varchar)
- `description` (text)
- `post_id` (uuid, FK → posts)
- `status` (varchar)
- `sort` (integer)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → posts (post_id, CASCADE delete)
- → directus_users (user_created, user_updated)
- ← gallery_images (gallery_id)

---

### 6. **gallery_images** (0 rows)
Individual images within galleries

**Key Columns:**
- `id` (uuid, PK)
- `gallery_id` (uuid, FK → galleries)
- `image_id` (uuid, FK → directus_files)
- `title` (varchar)
- `caption` (text)
- `sort` (integer)
- `date_created` (timestamp)
- `user_created` (FK → directus_users)

**Relationships:**
- → galleries (gallery_id, CASCADE delete)
- → directus_files (image_id)
- → directus_users (user_created)

---

## Block/Component Tables

### Block System Overview
The block system enables flexible page building with reusable components.

**Available Block Types:**
1. `block_hero` - Hero sections
2. `block_richtext` - Rich text content
3. `block_button` - Call-to-action buttons
4. `block_button_group` - Button collections
5. `block_gallery` - Image galleries
6. `block_gallery_items` - Gallery images
7. `block_posts` - Post listings
8. `block_form` - Forms
9. `block_pricing` - Pricing sections
10. `block_pricing_cards` - Pricing cards

---

### 7. **page_blocks** (11 rows)
Junction table linking blocks to pages

**Key Columns:**
- `id` (integer, PK)
- `page` (uuid, FK → pages)
- `block_type` (varchar) - Type of block
- `block_id` (varchar) - ID of specific block
- `sort` (integer) - Display order
- `hidden` (boolean) - Visibility flag
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → pages (page)
- → directus_users (user_created, user_updated)

---

### 8. **block_hero** (1 row)
Hero/banner sections

**Key Columns:**
- `id` (uuid, PK)
- `title` (varchar)
- `subtitle` (text)
- `content` (text)
- `image` (uuid, FK → directus_files)
- `button_group` (uuid, FK → block_button_group)
- `alignment` (varchar)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → directus_files (image)
- → block_button_group (button_group)
- → directus_users (user_created, user_updated)

---

### 9. **block_button** (11 rows)
Individual buttons/CTAs

**Key Columns:**
- `id` (uuid, PK)
- `label` (varchar)
- `url` (varchar)
- `style` (varchar) - primary/secondary/etc
- `icon` (varchar)
- `target` (varchar) - _blank/_self
- `page` (uuid, FK → pages)
- `post` (uuid, FK → posts)
- `button_group` (uuid, FK → block_button_group)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → pages (page)
- → posts (post)
- → block_button_group (button_group)
- → directus_users (user_created, user_updated)
- ← block_pricing_cards (button)

---

### 10. **block_richtext** (9 rows)
Rich text content blocks

**Key Columns:**
- `id` (uuid, PK)
- `content` (text)
- `alignment` (varchar)
- `max_width` (varchar)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

---

### 11. **block_posts** (2 rows)
Post listing blocks

**Key Columns:**
- `id` (uuid, PK)
- `title` (varchar)
- `limit` (integer) - Number of posts to show
- `filter_type` (varchar) - latest/featured/category
- `show_excerpt` (boolean)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

---

## Analytics Tables

### 12. **analytics_events** (943 rows)
Main event tracking table

**Key Columns:**
- `event_id` (uuid, PK)
- `event_name` (varchar) - page_view/click/conversion/etc
- `event_timestamp` (timestamp with timezone)
- `user_id` (varchar) - Anonymous user identifier
- `session_id` (varchar)
- `page_url` (text)
- `page_title` (varchar)
- `referrer` (text)
- `utm_source`, `utm_medium`, `utm_campaign` (varchar)
- `device_type` (varchar)
- `browser` (varchar)
- `operating_system` (varchar)
- `country` (varchar)
- `city` (varchar)
- `latitude`, `longitude` (numeric)
- `event_properties` (jsonb) - Additional data

**Relationships:**
- ← analytics_conversions (event_id)

---

### 13. **analytics_conversions** (4 rows)
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

### 14. **analytics_daily_summary** (0 rows)
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

### 15. **performance_metrics** (3,184 rows)
Web performance monitoring

**Key Columns:**
- `metric_id` (uuid, PK)
- `metric_timestamp` (timestamp with timezone)
- `user_id` (varchar)
- `session_id` (varchar)
- `page_url` (text)
- `dns_time` (integer) - DNS lookup time (ms)
- `tcp_time` (integer) - TCP connection time
- `ttfb` (integer) - Time to First Byte
- `download_time` (integer)
- `dom_interactive` (integer)
- `dom_complete` (integer)
- `load_complete` (integer)
- `fcp` (integer) - First Contentful Paint
- `lcp` (integer) - Largest Contentful Paint
- `fid` (integer) - First Input Delay
- `cls` (numeric) - Cumulative Layout Shift
- `device_type`, `browser`, `os` (varchar)

---

### 16. **performance_daily_summary** (0 rows)
Daily performance aggregations

**Key Columns:**
- `date` (date, PK)
- `avg_ttfb`, `avg_fcp`, `avg_lcp`, `avg_fid` (numeric)
- `p95_ttfb`, `p95_fcp`, `p95_lcp` (numeric) - 95th percentile
- `avg_cls` (numeric)
- `total_measurements` (integer)

---

## Form Management

### 17. **forms** (2 rows)
Form definitions

**Key Columns:**
- `id` (uuid, PK)
- `name` (varchar)
- `title` (varchar)
- `description` (text)
- `success_message` (text)
- `redirect_url` (varchar)
- `email_notifications` (boolean)
- `notification_email` (varchar)
- `status` (varchar)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → directus_users (user_created, user_updated)
- ← form_fields (form)
- ← form_submissions (form)
- ← block_form (form)

---

### 18. **form_fields** (7 rows)
Form field definitions

**Key Columns:**
- `id` (uuid, PK)
- `form` (uuid, FK → forms)
- `field_name` (varchar)
- `field_type` (varchar) - text/email/tel/textarea/select/etc
- `label` (varchar)
- `placeholder` (varchar)
- `required` (boolean)
- `validation_rules` (jsonb)
- `options` (jsonb) - For select/radio/checkbox
- `sort` (integer)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → forms (form, CASCADE delete)
- → directus_users (user_created, user_updated)
- ← form_submission_values (field)

---

### 19. **form_submissions** (1 row)
Form submission records

**Key Columns:**
- `id` (uuid, PK)
- `form` (uuid, FK → forms)
- `submitted_at` (timestamp)

**Relationships:**
- → forms (form)
- ← form_submission_values (form_submission)

---

### 20. **form_submission_values** (2 rows)
Individual field values per submission

**Key Columns:**
- `id` (integer, PK)
- `form_submission` (uuid, FK → form_submissions)
- `field` (uuid, FK → form_fields)
- `value` (text)
- `file` (uuid, FK → directus_files) - For file uploads

**Relationships:**
- → form_submissions (form_submission, CASCADE delete)
- → form_fields (field)
- → directus_files (file)

---

## Navigation & SEO

### 21. **navigation** (2 rows)
Navigation menus

**Key Columns:**
- `id` (uuid, PK)
- `name` (varchar)
- `key` (varchar, unique) - main/footer/etc
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → directus_users (user_created, user_updated)
- ← navigation_items (navigation)

---

### 22. **navigation_items** (7 rows)
Individual navigation menu items

**Key Columns:**
- `id` (uuid, PK)
- `navigation` (uuid, FK → navigation)
- `title` (varchar)
- `url` (varchar)
- `page` (uuid, FK → pages)
- `post` (uuid, FK → posts)
- `parent` (uuid, FK → navigation_items) - For submenus
- `target` (varchar)
- `icon` (varchar)
- `sort` (integer)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

**Relationships:**
- → navigation (navigation)
- → pages (page)
- → posts (post)
- → navigation_items (parent) - Self-referencing for hierarchy
- → directus_users (user_created, user_updated)

---

### 23. **seo_global_config** (1 row)
Global SEO settings

**Key Columns:**
- `id` (uuid, PK)
- `site_name` (varchar)
- `site_description` (text)
- `default_meta_title` (varchar)
- `default_meta_description` (text)
- `default_og_image` (uuid)
- `twitter_handle` (varchar)
- `google_analytics_id` (varchar)
- `google_tag_manager_id` (varchar)

---

### 24. **redirects** (1 row)
URL redirects

**Key Columns:**
- `id` (uuid, PK)
- `from_url` (varchar)
- `to_url` (varchar)
- `status_code` (integer) - 301/302
- `enabled` (boolean)
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK → directus_users)

---

## Directus CMS Tables

### Core Directus Tables

**25. directus_users** (5 rows) - User accounts  
**26. directus_roles** (4 rows) - User roles  
**27. directus_policies** (9 rows) - Permission policies  
**28. directus_permissions** (159 rows) - Granular permissions  
**29. directus_access** (13 rows) - User-role-policy junction  
**30. directus_sessions** (7 rows) - Active sessions  
**31. directus_files** (23 rows) - File/media assets  
**32. directus_folders** (4 rows) - File organization  
**33. directus_collections** (36 rows) - Collection metadata  
**34. directus_fields** (310 rows) - Field definitions  
**35. directus_relations** (66 rows) - Relationship definitions  
**36. directus_activity** (1,193 rows) - Activity log  
**37. directus_revisions** (1,091 rows) - Content versioning  
**38. directus_versions** (0 rows) - Version control  
**39. directus_settings** (1 row) - System settings  

### Workflow & Automation

**40. directus_flows** (9 rows) - Automation flows  
**41. directus_operations** (36 rows) - Flow operations  
**42. directus_webhooks** (0 rows) - Webhook configurations  

### UI & Dashboards

**43. directus_dashboards** (2 rows) - Dashboard definitions  
**44. directus_panels** (16 rows) - Dashboard panels  
**45. directus_presets** (20 rows) - UI presets  

### Other

**46. directus_shares** (0 rows) - Shared content links  
**47. directus_comments** (0 rows) - Content comments  
**48. directus_notifications** (0 rows) - System notifications  
**49. directus_translations** (1 row) - UI translations  
**50. directus_extensions** (17 rows) - Installed extensions  
**51. directus_migrations** (91 rows) - Database migrations  

---

## Analytics Views

### Directus-Prefixed Views (for dashboard integration)

**52. directus_daily_kpi_summary** (VIEW)  
**53. directus_conversion_funnel** (VIEW)  
**54. directus_device_browser_stats** (VIEW)  
**55. directus_event_distribution** (VIEW)  
**56. directus_monthly_trends** (VIEW)  
**57. directus_performance_by_page** (VIEW)  
**58. directus_performance_issues** (VIEW)  
**59. directus_realtime_dashboard** (VIEW)  
**60. directus_recent_high_value_events** (VIEW)  
**61. directus_top_conversions** (VIEW)  

### Base Tables (aggregation targets)

**62. daily_kpi_summary** (0 rows)  
**63. conversion_funnel** (0 rows)  
**64. device_browser_stats** (0 rows)  
**65. event_distribution** (0 rows)  
**66. monthly_trends** (0 rows)  
**67. performance_by_page** (0 rows)  
**68. performance_issues** (0 rows)  
**69. realtime_dashboard** (0 rows)  
**70. recent_high_value_events** (0 rows)  
**71. top_conversions** (0 rows)  

---

## Additional Tables

**72. globals** (1 row) - Global site settings  
**73. partners** (14 rows) - Partner/sponsor management  
**74. mizzap_users** (6 rows) - External user integration  
**75. ai_prompts** (3 rows) - AI prompt templates  
**76. photos** (1 row) - Photo metadata  
**77. blog_posts** (2 rows) - Legacy blog posts  
**78. blog_tags** (0 rows) - Legacy blog tags  
**79. blog_galleries** (0 rows) - Legacy blog galleries  
**80. blog_post_tags** (0 rows) - Legacy junction table  
**81. related_posts_view** (VIEW) - Related posts query  

### PostGIS Tables (spatial data)

**82. spatial_ref_sys** (8,500 rows) - Spatial reference systems  
**83. geography_columns** (VIEW) - Geography metadata  
**84. geometry_columns** (VIEW) - Geometry metadata  

---

## Complete Foreign Key Reference

### Content Management Relationships

```
posts
├── → directus_users (author, user_created, user_updated)
├── → directus_files (image)
├── ← galleries (post_id) [CASCADE]
├── ← post_tags (post_id) [CASCADE]
├── ← block_button (post) [SET NULL]
└── ← navigation_items (post) [SET NULL]

tags
├── → directus_users (user_created, user_updated)
└── ← post_tags (tag_id) [CASCADE]

post_tags
├── → posts (post_id) [CASCADE]
├── → tags (tag_id) [CASCADE]
└── → directus_users (user_created)

galleries
├── → posts (post_id) [CASCADE]
├── → directus_users (user_created, user_updated)
└── ← gallery_images (gallery_id) [CASCADE]

gallery_images
├── → galleries (gallery_id) [CASCADE]
├── → directus_files (image_id)
└── → directus_users (user_created)

pages
├── → directus_users (user_created, user_updated)
├── ← page_blocks (page) [SET NULL]
├── ← block_button (page) [SET NULL]
└── ← navigation_items (page) [SET NULL]
```

### Block System Relationships

```
page_blocks
├── → pages (page) [SET NULL]
└── → directus_users (user_created, user_updated)

block_hero
├── → directus_files (image) [SET NULL]
├── → block_button_group (button_group) [SET NULL]
└── → directus_users (user_created, user_updated)

block_button
├── → pages (page) [SET NULL]
├── → posts (post) [SET NULL]
├── → block_button_group (button_group) [SET NULL]
├── → directus_users (user_created, user_updated)
└── ← block_pricing_cards (button) [SET NULL]

block_button_group
├── → directus_users (user_created, user_updated)
├── ← block_button (button_group)
└── ← block_hero (button_group)

block_gallery
├── → directus_users (user_created, user_updated)
└── ← block_gallery_items (block_gallery) [CASCADE]

block_gallery_items
├── → block_gallery (block_gallery) [CASCADE]
├── → directus_files (directus_file) [CASCADE]
└── → directus_users (user_created, user_updated)

block_pricing
├── → directus_users (user_created, user_updated)
└── ← block_pricing_cards (pricing) [SET NULL]

block_pricing_cards
├── → block_pricing (pricing) [SET NULL]
├── → block_button (button) [SET NULL]
└── → directus_users (user_created, user_updated)

block_form
├── → forms (form) [SET NULL]
└── → directus_users (user_created, user_updated)

block_richtext
└── → directus_users (user_created, user_updated)

block_posts
└── → directus_users (user_created, user_updated)
```

### Analytics Relationships

```
analytics_events
└── ← analytics_conversions (event_id) [CASCADE]

analytics_conversions
└── → analytics_events (event_id) [CASCADE]
```

### Form Relationships

```
forms
├── → directus_users (user_created, user_updated)
├── ← form_fields (form) [CASCADE]
├── ← form_submissions (form) [SET NULL]
└── ← block_form (form) [SET NULL]

form_fields
├── → forms (form) [CASCADE]
├── → directus_users (user_created, user_updated)
└── ← form_submission_values (field) [SET NULL]

form_submissions
├── → forms (form) [SET NULL]
└── ← form_submission_values (form_submission) [CASCADE]

form_submission_values
├── → form_submissions (form_submission) [CASCADE]
├── → form_fields (field) [SET NULL]
└── → directus_files (file) [SET NULL]
```

### Navigation Relationships

```
navigation
├── → directus_users (user_created, user_updated)
└── ← navigation_items (navigation) [SET NULL]

navigation_items
├── → navigation (navigation) [SET NULL]
├── → pages (page) [SET NULL]
├── → posts (post) [SET NULL]
├── → navigation_items (parent) [NO ACTION] -- Self-reference
└── → directus_users (user_created, user_updated)
```

### Directus Core Relationships

```
directus_users
├── → directus_roles (role) [SET NULL]
├── ← directus_access (user) [CASCADE]
├── ← directus_sessions (user) [CASCADE]
├── ← directus_files (uploaded_by, modified_by)
├── ← directus_activity (user)
├── ← directus_notifications (recipient, sender)
└── ← All content tables (user_created, user_updated)

directus_roles
├── → directus_roles (parent) [NO ACTION] -- Self-reference
├── ← directus_access (role) [CASCADE]
├── ← directus_users (role)
├── ← directus_presets (role) [CASCADE]
└── ← directus_shares (role) [CASCADE]

directus_policies
├── ← directus_access (policy) [CASCADE]
└── ← directus_permissions (policy) [CASCADE]

directus_files
├── → directus_folders (folder) [SET NULL]
├── → directus_users (uploaded_by, modified_by)
├── ← directus_settings (project_logo, public_*)
├── ← globals (logo, logo_dark_mode, favicon)
├── ← posts (image)
├── ← gallery_images (image_id)
├── ← block_hero (image)
├── ← block_gallery_items (directus_file)
└── ← form_submission_values (file)

directus_folders
├── → directus_folders (parent) [NO ACTION] -- Self-reference
└── ← directus_files (folder)

directus_flows
├── → directus_users (user_created)
├── ← directus_operations (flow) [CASCADE]
└── ← directus_webhooks (migrated_flow) [SET NULL]

directus_operations
├── → directus_flows (flow) [CASCADE]
├── → directus_operations (resolve, reject) [NO ACTION] -- Self-reference
└── → directus_users (user_created)

directus_collections
├── → directus_collections (group) [NO ACTION] -- Self-reference
├── ← directus_shares (collection) [CASCADE]
└── ← directus_versions (collection) [CASCADE]

directus_revisions
├── → directus_activity (activity) [CASCADE]
├── → directus_revisions (parent) [NO ACTION] -- Self-reference
└── → directus_versions (version) [CASCADE]

directus_versions
├── → directus_collections (collection) [CASCADE]
└── → directus_users (user_created, user_updated)

directus_sessions
├── → directus_users (user) [CASCADE]
└── → directus_shares (share) [CASCADE]

directus_shares
├── → directus_collections (collection) [CASCADE]
├── → directus_roles (role) [CASCADE]
└── → directus_users (user_created)

directus_dashboards
├── → directus_users (user_created)
└── ← directus_panels (dashboard) [CASCADE]

directus_panels
├── → directus_dashboards (dashboard) [CASCADE]
└── → directus_users (user_created)

directus_presets
├── → directus_roles (role) [CASCADE]
└── → directus_users (user) [CASCADE]

directus_access
├── → directus_policies (policy) [CASCADE]
├── → directus_roles (role) [CASCADE]
└── → directus_users (user) [CASCADE]
```

---

## Key Design Patterns

### 1. **Audit Trail Pattern**
Most tables include:
- `date_created`, `date_updated` (timestamps)
- `user_created`, `user_updated` (FK to directus_users)

### 2. **Soft Delete Pattern**
Tables with `status` field support draft/published/archived states instead of hard deletes.

### 3. **Cascade Delete Pattern**
Junction tables and dependent data use CASCADE delete rules:
- `post_tags` → CASCADE on both posts and tags
- `gallery_images` → CASCADE on galleries
- `form_submission_values` → CASCADE on form_submissions

### 4. **Set NULL Pattern**
Optional relationships use SET NULL on delete:
- Content references to images (SET NULL if file deleted)
- User audit fields (SET NULL if user deleted)

### 5. **Polymorphic Relationships**
`page_blocks` can reference different block types via:
- `block_type` (varchar) + `block_id` (varchar)

### 6. **Self-Referencing Hierarchies**
- `navigation_items.parent` → navigation_items (submenus)
- `directus_folders.parent` → directus_folders (folder trees)
- `directus_roles.parent` → directus_roles (role inheritance)

---

## Database Statistics

| Metric | Count |
|--------|-------|
| **Total Tables** | 91 |
| **Base Tables** | 82 |
| **Views** | 9 |
| **Foreign Keys** | 138 |
| **Total Rows** | ~18,000 |
| **Largest Tables** | spatial_ref_sys (8,500), performance_metrics (3,184), directus_activity (1,193) |

---

## Usage Notes

### For Queries:
1. Use the SQL file `supabase_schema_export.sql` for detailed column-level schema
2. Run individual sections to get specific information
3. All queries target the `public` schema

### For Development:
1. Always use foreign keys for referential integrity
2. Follow the audit trail pattern for new tables
3. Use CASCADE carefully - review impact before implementing
4. Maintain the status field pattern for soft deletes

### For Analytics:
1. Use the `directus_*` views for dashboard integration
2. Base tables are aggregation targets
3. `analytics_events` is the primary event source
4. `performance_metrics` tracks all web vitals

---

**End of Schema Documentation**
