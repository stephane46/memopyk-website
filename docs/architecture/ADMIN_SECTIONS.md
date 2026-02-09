# Admin Section → API → DB Connection Map

**Generated:** 2026-02-09
**Branch:** staging
**Method:** Automated code analysis of all 14 admin sections

---

## Quick Reference

| # | Section | Tab ID | Component | Route File(s) | DB Tables | Status |
|---|---------|--------|-----------|---------------|-----------|--------|
| 1 | Analytics Dashboard | `analytics-new` | `admin/analyticsNew/AnalyticsNewDashboard.tsx` | `analytics.routes.ts`, `analytics-legacy.routes.ts` | analyticsSessions, analyticsExclusions | Working |
| 2 | Blog Hub | `blog` | `admin/ContentProductionHub.tsx` | `content.routes.ts`, `blog-admin.routes.ts`, `blog-tags.routes.ts`, `blog-images.routes.ts`, `image-bank.routes.ts` | content_keywords, content_topics, content_daily_assignments, blog_posts, blog_galleries, blog_post_tags, blog_tags, imageBank, imageLabels, imageLabelLinks | Working |
| 3 | Partners | `partners` | `admin/PartnersManagementEnhanced.tsx` | `partners.routes.ts` | partners | Working |
| 4 | Travel Uploads | `travel-agencies` | `admin/TravelUploadsAdmin.tsx`, `admin/TravelAgencyCodesAdmin.tsx` | `travel-upload.routes.ts` | travel_upload_submissions, travel_agency_codes | Working (auth gap) |
| 5 | SEO Management | `seo` | `admin/SeoManagement.tsx` | `seo.routes.ts` | seo_settings | Working (dummy auth) |
| 6 | Gallery | `gallery` | `admin/GalleryManagementNew.tsx` | `gallery.routes.ts` | galleryItems | Working |
| 7 | FAQ | `faq` | `admin/FAQManagementWorking.tsx` | `faq.routes.ts` | faqSections, faqs | Fully wired |
| 8 | Why MEMOPYK | `why-memopyk` | `admin/WhyMemopykManagement.tsx` | `cta.routes.ts` | whyMemopykCards | Working |
| 9 | CTA | `cta` | `admin/CtaManagement.tsx` | `cta.routes.ts` | cta_settings | Working |
| 10 | Legal Documents | `legal-docs` | `admin/LegalDocumentManagement.tsx` | `legal.routes.ts` | legal_documents | CRITICAL: no auth |
| 11 | AI Context | `ai-context` | `admin/AIContextManager.tsx` | `ai-context.routes.ts` | ai_context | Fully wired |
| 12 | Deployment | `deployment` | `admin/DeploymentManagement.tsx` | None | None (file-based) | DEAD CODE |
| 13 | System Tests | `tests` | `admin/SystemTestDashboard.tsx`, `admin/PerformanceTestDashboard.tsx` | `health.routes.ts` | None (indirect) | BROKEN |
| 14 | Hero Management | `hero-management` | Inline in `pages/AdminPage.tsx` | `hero.routes.ts`, `media.routes.ts` | hero_videos, hero_text | Working |

> All component paths relative to `client/src/components/` unless prefixed with `admin/` (meaning `client/src/admin/`) or `pages/` (meaning `client/src/pages/`).

---

## Critical Issues

| Priority | Section | Issue |
|----------|---------|-------|
| CRITICAL | Legal Documents (#10) | POST/PATCH/DELETE have **no `requireAdmin` middleware** — publicly writable |
| CRITICAL | Legal Documents (#10) | camelCase/snake_case field mismatch — component sends `titleEn`, routes validate `title_en` |
| CRITICAL | Deployment (#12) | All 5 endpoints missing — **entire tab is dead code** (no route file exists) |
| CRITICAL | System Tests (#13) | 12 `/api/test/*` endpoints not registered — test suite returns 404 |
| HIGH | SEO (#5) | Hardcoded token `'admin-token-temp'` instead of real auth |
| HIGH | Travel Uploads (#4) | No auth middleware on admin endpoints (TODO noted in route file) |
| MEDIUM | Hero (#14) | `POST /api/hero-videos/upload` called by component but no route handler |
| MEDIUM | SEO (#5) | Rollback function only `console.log`s — not implemented |
| LOW | Gallery (#6) | 2 orphaned upload endpoints (`upload-video`, `upload-image`) |
| LOW | CTA (#9) | DELETE endpoint orphaned (no UI button) |
| LOW | Partners (#3) | Inconsistent `fetch`/`adminFetch` usage |
| LOW | Why MEMOPYK (#8) | Uses raw `fetch()` — may bypass auth headers |

---

## 1. Analytics Dashboard (tab=analytics-new)

**Component:** `client/src/admin/analyticsNew/AnalyticsNewDashboard.tsx`

**Sub-components:**
- `AnalyticsNewTabNavigation` — tabs and navigation
- `AnalyticsNewGlobalFilters` — date/filter controls
- `IpExclusionsManager` — IP exclusion management
- `AnalyticsNewOverview` — KPI overview
- `AnalyticsNewLiveView` — real-time data
- `AnalyticsNewVideo` — video analytics (includes `TopVideosTable`, `VideoFunnel`)
- `AnalyticsNewTrends` — time series (includes `TrendCard`)
- `AnalyticsNewGeo` — geographic distribution
- `AnalyticsNewCta` — CTA tracking (stub)
- `AnalyticsNewBlog` — blog analytics (stub)
- `AnalyticsNewLoadingStates` — loading UI
- `DataSourceBadge` — data source indicator
- `OverviewKpis` — nested in Overview

All sub-components in `client/src/admin/analyticsNew/`.

**API Calls:**

| Method | Endpoint | Tab | Description |
|--------|----------|-----|-------------|
| GET | `/api/ga4/realtime` | Overview | Active users by country/device (15s polling) |
| GET | `/api/ga4/kpis` | Overview | Sessions, plays, avgWatch, bounceRate, completions |
| GET | `/api/admin/analytics/exclusions` | Overview + Exclusions | IP exclusion list and count badge |
| GET | `/api/ga4/report?report=topVideos` | Video | Top performing videos |
| GET | `/api/ga4/report?report=videoFunnel&videoId={id}` | Video | Video progress funnel (10/25/50/75/90%) |
| GET | `/api/ga4/realtime/top-videos` | Video (live) | Realtime top videos |
| GET | `/api/ga4/realtime/video-progress?videoId={id}` | Video (live) | Realtime video progress |
| GET | `/api/ga4/trend` | Trends | Daily aggregated trends |
| GET | `/api/ga4/geo` | Geo | Countries, topCountries, totalSessions, totalUsers |
| GET | `/api/ga4/cta` | CTA | CTA click data (stub: returns empty) |

**DB Tables:** `analyticsSessions`, `analyticsExclusions`

**Architecture:**
- All queries via centralized hooks (`useFilteredKpis`, `useFilteredTopVideos`, `useFilteredTrends`, `useFilteredGeo`, `useFilteredCta`)
- Filter state stored in Zustand store (`analyticsNewFilters.store.ts`)
- `buildAnalyticsParams()` and `buildAnalyticsUrl()` standardize query construction
- Dual data source: GA4 (Google Analytics API) or MEMOPYK (local DB with IP exclusion filtering)
- Cache stale times: KPIs 2min, Trends/Geo 1min, Video 2min, Realtime 0s (15s polling)

**Notes:**
- CTA and Blog tabs are stubs (not yet implemented)
- **55+ orphaned stub routes** in `analytics-legacy.routes.ts` — none called by this dashboard
- No direct `fetch()` calls in components; all via centralized hooks

---

## 2. Blog Hub (tab=blog)

**Component:** `client/src/components/admin/ContentProductionHub.tsx`

Main container with 5 tabs + 1 hidden editor tab. Tab order: Keywords (1) → Topics/Planned Posts (2) → Planner (3) → Posts (4) → Image Bank (5).

### 2a. Keywords Tab (1)

**Sub-components:**
- `ContentProductionKeywords.tsx`
- `KeywordFormModal.tsx` — create/edit form
- `KeywordDeleteDialog.tsx` — delete confirmation
- `MultiSelectFilter.tsx` — checkbox dropdown filters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/content/keywords/stats` | Aggregated stats (cached 1 min) |
| GET | `/api/admin/content/keywords` | Paginated list with filters/sorting |
| GET | `/api/admin/content/keywords/:id` | Single keyword |
| POST | `/api/admin/content/keywords` | Create keyword |
| PATCH | `/api/admin/content/keywords/:id` | Update keyword |
| DELETE | `/api/admin/content/keywords/:id` | Delete keyword |

**DB Tables:** `content_keywords`, `content_topics` (enriches topics_count via primary_keyword match), `blog_posts` (enriches posts_count via source_topic_id)

**Filter params:** tier, intent, market, cluster, competition, search, volume_range, page, limit, offset

**Pagination:** 100/page, background loading in 500-chunk batches

### 2b. Topics / Planned Posts Tab (2)

**Sub-components:**
- `ContentProductionTopics.tsx`
- `TopicFormModal.tsx` — create/edit form
- `TopicDeleteDialog.tsx` — delete with dependency check
- `BlogPostCreatorModal.tsx` — create post from topic

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/content/topics` | List with post counts |
| GET | `/api/admin/content/topics/:id` | Single topic |
| POST | `/api/admin/content/topics` | Create topic |
| PATCH | `/api/admin/content/topics/:id` | Update topic |
| DELETE | `/api/admin/content/topics/:id` | Delete (unlinks posts, blocks if assignments) |

**DB Tables:** `content_topics`, `blog_posts` (post_count enrichment), `content_daily_assignments` (dependency check on delete)

**Filter params:** category, priority, status, market

### 2c. Planner Tab (3)

**Sub-components:**
- `ContentProductionPlanner.tsx`
- `BlogPostCreatorModal.tsx`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/content/topics` | Topics for assignment dropdown |
| GET | `/api/admin/content/assignments` | Assignments for date range |
| GET | `/api/admin/blog/posts` | All posts for view option |
| GET | `/api/admin/blog/posts-by-date` | Posts grouped by date |
| POST | `/api/admin/content/assignments` | Create daily assignment (camelCase→snake_case) |
| PATCH | `/api/admin/content/assignments/:id` | Update assignment |
| DELETE | `/api/admin/content/assignments/:id` | Delete assignment |
| PATCH | `/api/admin/content/topics/:id` | Sync topic status on assignment change |
| PATCH | `/api/admin/blog/posts/:id` | Update post status (publish) |

**DB Tables:** `content_topics`, `content_daily_assignments`, `blog_posts`

**Architecture:**
- Calendar view: 12 weeks default, 4 weeks lookback
- View mode toggle: topics or posts (localStorage-persisted)
- Cascading status sync: assignment status → topic status → post status

### 2d. Posts Tab (4) + Blog Editor (hidden tab)

**Sub-components:**
- `BlogManagePosts.tsx` — list view (`client/src/admin/BlogManagePosts.tsx`)
- `BlogEditor.tsx` — full editor, URL-routed via `?tab=blog-edit&id={postId}` (`client/src/admin/BlogEditor.tsx`)
- `HtmlEditor.tsx` — rich text editor
- `HeroImageUpload.tsx` — hero image management
- `BlogTagSelector.tsx` — tag assignment
- `TranslationAssistant.tsx` — duplicate/translate posts
- `TagManagementModal.tsx` — inline tag CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/blog/posts` | List posts with language/status + pagination |
| GET | `/api/admin/blog/posts/:id` | Single post for editing |
| POST | `/api/admin/blog/posts` | Create blank post (auto-slug) |
| PATCH | `/api/admin/blog/posts/:id` | Update post |
| PUT | `/api/admin/blog/posts/:id` | Alias for PATCH |
| DELETE | `/api/admin/blog/posts/:id` | Delete post + sync status revert |
| POST | `/api/admin/blog/posts/:id/translate` | Duplicate for translation (manual or AI) |
| POST | `/api/admin/blog/create-from-ai` | Create from AI JSON + auto-sync |
| GET | `/api/blog-tags` | Public tag list |
| GET | `/api/admin/blog/tags` | Admin tags with autocomplete (`?suggest={term}`) |
| POST | `/api/admin/blog/tags` | Create tag |
| PUT | `/api/admin/blog/tags/:id` | Update tag |
| DELETE | `/api/admin/blog/tags/:id` | Delete tag |
| POST | `/api/admin/blog/posts/:id/tags` | Assign tags to post |
| GET | `/api/admin/blog/posts/:id/tags` | Get post tags |
| GET | `/api/admin/blog/posts/:id/gallery` | Get gallery images |
| POST | `/api/admin/blog/posts/:id/gallery` | Add gallery image |
| PUT | `/api/admin/blog/posts/:id/gallery/:imageId` | Update gallery image |
| DELETE | `/api/admin/blog/posts/:id/gallery/:imageId` | Delete gallery image |
| PUT | `/api/admin/blog/posts/:id/gallery/reorder` | Reorder gallery |

**DB Tables:** `blog_posts`, `blog_galleries`, `blog_post_tags`, `blog_tags`, `content_topics`, `content_daily_assignments`

**Architecture:**
- Post deletion reverts topic status to "planned" if no other posts reference topic
- Translation workflow: duplicate post + optional AI translation via Claude API (images extracted → translated → reinserted)
- Gallery: drag-to-reorder with auto-incrementing sort order

### 2e. Image Bank Tab (5)

**Sub-components:**
- `ImageBankManager.tsx` (`client/src/components/admin/ImageBankManager.tsx`)
- `ImageLabelManagementDialog.tsx` — create/update/delete labels
- `ImageLabelSelectDialog.tsx` — tag images with labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/image-bank` | List images with filters |
| POST | `/image-bank/upload` | Upload image + metadata (FormData) |
| PATCH | `/image-bank/:id` | Update image metadata |
| DELETE | `/image-bank/:id` | Delete from storage + DB |
| GET | `/image-labels` | List labels with usage counts |
| POST | `/image-labels` | Create label (auto-assigned color) |
| PATCH | `/image-labels/:id` | Update label (cascades to image tags) |
| DELETE | `/image-labels/:id` | Delete label (removes from all images) |

**DB Tables:** `imageBank`, `imageLabels`, `imageLabelLinks` (cascade delete)

**Storage:** Supabase bucket `memopyk-blog`, path `image-bank/{uuid-filename}`

**Filter params:** category, usage (unused/used/hero/body), search

### Blog Hub: Orphaned Endpoints

| Endpoint | Route File | Reason |
|----------|-----------|--------|
| `GET /api/admin/content/plans` | content.routes.ts | Weekly planning UI never implemented |
| `GET /api/admin/blog/images` | blog-images.routes.ts | Replaced by Image Bank |
| `POST /api/admin/blog/images` | blog-images.routes.ts | Replaced by Image Bank |
| `GET /api/admin/blog/images/:name/usage` | blog-images.routes.ts | Replaced by Image Bank |
| `DELETE /api/admin/blog/images/:name` | blog-images.routes.ts | Replaced by Image Bank |

### Blog Hub: Table Relationships

```
content_keywords (tier, intent, market, cluster, competition, monthly_searches)
    ↓ primary_keyword match
content_topics (title, category, market, primary_keyword, status)
    ↓ source_topic_id FK
blog_posts (source_topic_id, status, published_at)
    ↓ id FK (junction)
blog_post_tags (post_id, tag_id)
    ↓ tag_id FK
blog_tags (name, slug, color)

content_topics (id)
    ↓ topic_id FK
content_daily_assignments (topic_id, date, status, post_id)
    ↓ post_id FK
blog_posts (id)

blog_posts (id)
    ↓ post_id FK
blog_galleries (post_id, url, title, alt, sort)

imageBank (id, tags[] references imageLabels.name)
imageLabels (id, name, color)
imageLabelLinks (imageId, labelId) — cascade delete
```

### Blog Hub: Key Patterns

- **Status sync cascade:** `blog_posts.status` → `content_topics.status` → `content_daily_assignments.status`
- **Keywords enrichment:** `topics_count` and `posts_count` derived at query-time via JOINs
- **Translation:** AI-powered via Claude API (extract images → translate → reinsert)
- **Multi-language:** Keywords/Topics use `market` (fr/en), Posts use `language` (en-US/fr-FR)

---

## 3. Partners Management (tab=partners)

**Component:** `client/src/components/admin/PartnersManagementEnhanced.tsx`

**Sub-components:** None

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/partners` | List partners (pagination, filtering, sorting) |
| POST | `/api/partners/create` | Create new partner |
| PATCH | `/api/partners/:id/update` | Update partner fields |
| DELETE | `/api/partners/:id` | Delete partner |
| POST | `/api/partners/import-tsv` | Bulk import from TSV |
| GET | `/api/partners/download` | Export all to Excel |

**DB Tables:** `partners` (id, partner_type, partner_name, email, phone, website, address, city, postal_code, country, status, is_active, show_on_map, lat, lng, slug, etc.)

**Notes:**
- Uses `adminFetch()` and raw `fetch()` inconsistently — should standardize on `adminFetch()`
- TSV import uses positional array mapping (no header validation)
- Public intake form `POST /api/partners/intake` exists in routes but is not part of admin UI
- Slug auto-generation via `generateSlug()` utility
- Excel export via XLSX library with formatted headers

---

## 4. Travel Uploads (tab=travel-agencies)

**Components:**
- `client/src/components/admin/TravelUploadsAdmin.tsx` — submission management
- `client/src/components/admin/TravelAgencyCodesAdmin.tsx` — agency code management

**Sub-components:** None

### TravelUploadsAdmin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/travel-upload/submissions` | Fetch submissions with filters |
| POST | `/api/travel-upload/bulk-folder-stats` | Nextcloud folder stats via PROPFIND |
| POST | `/api/travel-upload/submissions/:id/resend-email` | Resend confirmation email |
| DELETE | `/api/travel-upload/submissions/:id` | Delete submission (DB only) |

### TravelAgencyCodesAdmin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/travel-agency-codes` | List agency codes |
| POST | `/api/travel-agency-codes` | Create agency code |
| PATCH | `/api/travel-agency-codes/:id` | Update agency code |
| DELETE | `/api/travel-agency-codes/:id` | Delete agency code |

**DB Tables:** `travel_upload_submissions`, `travel_agency_codes`

**Notes:**
- Both components use raw `fetch()` with manual `getAdminToken()` — should migrate to `adminFetch()`
- Post-upload DB save happens in `setImmediate()` background job after response sent — race condition risk
- **No auth middleware** on admin endpoints (TODO noted in route file lines 671, 1180)
- **Orphaned:** `GET /api/travel-upload/test-connection` — debug endpoint, no UI call

---

## 5. SEO Management (tab=seo)

**Component:** `client/src/components/admin/SeoManagement.tsx`

**Sub-components:** None

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/seo?lang={lang}` | Fetch SEO settings for language |
| POST | `/api/admin/seo` | Save SEO settings with validation |
| GET | `/api/admin/seo/preview?lang={lang}` | Generate HTML head preview |
| GET | `/api/admin/seo/history?lang={lang}` | Get version history |
| POST | `/api/admin/seo/publish?lang={lang}` | Publish SEO settings (backup + validation) |

**DB Tables:** `seo_settings` (lang, title, description, canonical, keywords, robots flags, openGraph, twitter, jsonLd, hreflang, extras, version, createdBy, createdAt, changeReason)

**Notes:**
- **Hardcoded token** `'admin-token-temp'` at line 117 — security issue, should use auth context
- Rollback button in History dialog only `console.log`s — not implemented
- Extensive `console.log` debug output throughout (lines 140, 166, 178-183, 203, 353, 359)
- Uses react-hook-form with zod validation

**Orphaned endpoints:**
- `POST /api/admin/seo/rollback` — backend exists, UI not wired
- `GET /seo`, `POST /seo`, `PATCH /seo/:id` — public endpoints, no admin UI
- `GET /api/seo-config` — public endpoint, not called
- `GET /seo/test-timeout` — test endpoint

---

## 6. Gallery Management (tab=gallery)

**Component:** `client/src/components/admin/GalleryManagementNew.tsx`

**Sub-components:** None

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gallery` | List all gallery items (30s cache) |
| POST | `/api/gallery` | Create new item |
| PATCH | `/api/gallery/{id}` | Update item |
| DELETE | `/api/gallery/{id}` | Delete item |
| PATCH | `/api/gallery/{id}/swap/{id2}` | Swap display order |
| POST | `/api/gallery/upload-static-image` | Upload cropped thumbnail (300x200) |

**DB Tables:** `galleryItems`

**Notes:**
- All mutation endpoints require `requireAdmin` middleware
- 30-second TTL cache with bypass header support (`x-test-bypass-cache`)
- Cache key inconsistency: multiple query key variants used (`['/api/gallery']`, `['/api/gallery', 'v1.0.110']`, `['/api/gallery', 'public']`)

**Orphaned endpoints:**
- `POST /api/gallery/upload-video` — defined with 5GB multer config, never called
- `POST /api/gallery/upload-image` — defined with auto-thumbnail, never called
- Component only uses `POST /api/gallery/upload-static-image`

---

## 7. FAQ Management (tab=faq)

**Component:** `client/src/components/admin/FAQManagementWorking.tsx`

**Sub-components:** None (uses `RichTextEditor` from UI library)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/faq-sections` | Fetch all FAQ sections |
| GET | `/api/faqs` | Fetch all FAQs |
| POST | `/api/faq-sections` | Create section |
| POST | `/api/faqs` | Create FAQ |
| PATCH | `/api/faq-sections/{id}` | Update section |
| PATCH | `/api/faqs/{id}` | Update FAQ |
| DELETE | `/api/faq-sections/{id}` | Delete section |
| DELETE | `/api/faqs/{id}` | Delete FAQ |
| PATCH | `/api/faq-sections/{id}/reorder` | Reorder section |
| PATCH | `/api/faqs/{id}/reorder` | Reorder FAQ |

**DB Tables:**
- `faqSections` (id, titleEn, titleFr, orderIndex)
- `faqs` (id, sectionId, questionEn, questionFr, answerEn, answerFr, orderIndex, isActive)

**Notes:**
- **Fully wired** — all 11 routes used by component, zero orphaned endpoints
- Bilingual (FR/EN) with rich text HTML answers
- HTML backward compatibility: converts plain text to HTML via sanitizer
- Visibility toggle: `isActive` flag for FAQ items
- Legacy `GET /api/faq` endpoint aliased to `/api/faqs`
- Uses react-hook-form with zod validation

---

## 8. Why MEMOPYK (tab=why-memopyk)

**Component:** `client/src/components/admin/WhyMemopykManagement.tsx`

**Sub-components:** None (uses `RichTextEditor` from UI library)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/why-memopyk-cards` | Fetch all cards |
| POST | `/api/why-memopyk-cards` | Create card |
| PATCH | `/api/why-memopyk-cards/{id}` | Update card |
| DELETE | `/api/why-memopyk-cards/{id}` | Delete card |

**DB Tables:** `whyMemopykCards` (id, icon, gradient, titleEn, titleFr, descriptionEn, descriptionFr, orderIndex)

**Route file:** `server/routes/cta.routes.ts` (shared with CTA Management)

**Notes:**
- Uses raw `fetch()` instead of `apiRequest()` — may bypass auth headers
- Dispatches `window.dispatchEvent(new Event('why-memopyk-updated'))` for public site cache invalidation
- Reorder via PATCH (orderIndex update) — doesn't use swap pattern like Gallery
- Hardcoded `ICON_MAP` (8 icons) and `GRADIENT_OPTIONS` (6 gradients)
- Manual form state management (not react-hook-form)

---

## 9. CTA Management (tab=cta)

**Component:** `client/src/components/admin/CtaManagement.tsx`

**Sub-components:** None

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cta` | Fetch all CTA settings |
| POST | `/api/cta` | Create CTA setting |
| PATCH | `/api/cta/:id` | Update CTA setting |

**DB Tables:** `cta_settings` (id, buttonTextFr, buttonTextEn, buttonUrlEn, buttonUrlFr, isActive, createdAt, updatedAt)

**Route file:** `server/routes/cta.routes.ts` (shared with Why MEMOPYK)

**Notes:**
- **Orphaned:** `DELETE /api/cta/:id` — fully implemented in backend but no UI delete button
- UI exposes Create, Edit, Toggle Active only
- Uses TanStack React Query with implicit queryKey

---

## 10. Legal Documents (tab=legal-docs)

**Component:** `client/src/components/admin/LegalDocumentManagement.tsx`

**Sub-components:** `RichTextEditor` (`client/src/components/ui/rich-text-editor.tsx`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/legal` | Fetch all legal documents (public) |
| POST | `/api/legal` | Create legal document |
| PATCH | `/api/legal/:id` | Update legal document |
| DELETE | `/api/legal/:id` | Delete legal document |

**DB Tables:** `legal_documents` (id, type, titleEn, titleFr, contentEn, contentFr, isActive, updatedAt)

**Document types:** legal-notice, terms, terms-sale, privacy, cookies, refund, disclaimer

### CRITICAL ISSUES

1. **Missing auth middleware:** POST/PATCH/DELETE routes have **no `requireAdmin`** — `requireAdmin` is not even imported in `legal.routes.ts`. Anyone can create/modify/delete legal documents.

2. **Field name mismatch:** Component sends camelCase (`titleEn`, `titleFr`, `contentEn`, `contentFr`), but route validation at line 68 expects snake_case (`title_en`, `title_fr`, `content_en`, `content_fr`). POST validation will fail.

**Orphaned:** `GET /api/legal/:type` — get by document type, defined but never called

---

## 11. AI Context / Brand Brain (tab=ai-context)

**Component:** `client/src/admin/AIContextManager.tsx`

**Sub-components:** None

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/ai-context` | Fetch all context entries (requireAdmin) |
| PUT | `/api/admin/ai-context/:key` | Update context entry (requireAdmin) |

**DB Tables:** `ai_context` (id, key, title, content, category, sort_order, updated_at, updated_by)

**Additional endpoints in same route file (not called by component):**
- `GET /api/admin/ai-context/:key` — single entry by key (requireAdmin)
- `GET /api/internal/ai-context/full` — full context for Claude API (no auth, internal server-to-server; includes 50 recent published blog posts)
- `POST /api/admin/translate` — translation via Claude API (requireAdmin)

**Notes:**
- **Fully wired** — all admin endpoints properly protected with `requireAdmin`
- Entries grouped by category (brand, translation) with sort_order
- Uses `adminFetch` utility directly
- Explicit queryKey `['ai-context']`

---

## 12. Deployment Management (tab=deployment)

**Component:** `client/src/components/admin/DeploymentManagement.tsx`

**Sub-components:** None

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/deployment/create-marker` | Create deployment marker | NOT REGISTERED |
| POST | `/api/deployment/cleanup` | Remove old markers | NOT REGISTERED |
| GET | `/api/deployment/markers` | List deployment markers | NOT REGISTERED |
| POST | `/api/deployment/sitemap/generate` | Generate sitemap.xml | NOT REGISTERED |
| GET | `/api/deployment/sitemap/status` | Sitemap file info | NOT REGISTERED |

**DB Tables:** None (file-system based)

### CRITICAL: ENTIRE TAB IS DEAD CODE

- **No route file exists** for deployment endpoints
- **No registration** in `server/routes.ts`
- All 5 API calls return 404
- Two-tab UI (deployment markers + sitemap SEO) renders but is completely non-functional
- References deprecated Replit deploy workflow (should update to Coolify)
- References node scripts (`create-deployment-marker.js`) that may not exist

---

## 13. System Tests (tab=tests)

**Components:**
- `client/src/components/admin/SystemTestDashboard.tsx`
- `client/src/components/admin/PerformanceTestDashboard.tsx`

**Sub-components:** None (uses performance-thresholds library from `@/lib/performance-thresholds`)

### Working API Calls (registered)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/video-cache/stats` | Video cache statistics (media.routes.ts) |
| GET | `/api/gallery` | Gallery items (gallery.routes.ts) |
| GET | `/api/hero-videos` | Hero videos (hero.routes.ts) |
| GET | `/api/faq` | FAQ items (faq.routes.ts) |
| GET | `/api/video-proxy?filename=...` | Video proxy with range requests (media.routes.ts) |
| HEAD | `/api/video-proxy?filename=...` | Cache validation (media.routes.ts) |

### Broken API Calls (12 test endpoints — NOT registered anywhere)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/test/database` | Database connection test |
| GET | `/api/test/video-cache` | Video cache system test |
| GET | `/api/test/video-streaming-speed` | Video streaming benchmark |
| GET | `/api/test/image-loading-speed` | Image loading benchmark |
| GET | `/api/test/database-query-speed` | Database query benchmark |
| GET | `/api/test/cache-performance` | Cache hit/miss benchmark |
| GET | `/api/test/api-response-times` | API response time benchmark |
| GET | `/api/test/analytics` | Analytics system health |
| GET | `/api/test/gallery` | Gallery CRUD test |
| GET | `/api/test/faq` | FAQ system test |
| GET | `/api/test/seo` | SEO management test |
| GET | `/api/test/performance` | Full performance suite |

### Additional Issue

- Component calls `GET /api/system/health` but only `GET /api/health` (and `/api/health/detailed`) exists in `health.routes.ts` — naming mismatch

**DB Tables (indirect):** `hero_videos`, `blog_posts`, `faqs`, `galleryItems`, `seo_settings` (queried via their respective endpoints)

**Notes:**
- Tests use `adminFetch()` wrapper for auth headers
- Results persisted to localStorage (`memopyk-system-tests`, `memopyk-performance-results`)
- Performance thresholds configurable per endpoint type (Hero Video: <1000ms, Gallery: <2000ms, etc.)
- Hardcoded test filenames: VideoHero1.mp4, PomGalleryC.mp4, VitaminSeaC.mp4, safari-1.mp4

---

## 14. Hero Management (tab=hero-management)

**Component:** Inline in `client/src/pages/AdminPage.tsx` (~lines 767-2200)

**Sub-components:** None (uses standard UI components)

### Hero Videos

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hero-videos` | Fetch all hero videos |
| POST | `/api/hero-videos` | Create hero video entry |
| PATCH | `/api/hero-videos/:id` | Update video metadata |
| PATCH | `/api/hero-videos/:id/reorder` | Update play order |
| PATCH | `/api/hero-videos/:id/toggle` | Toggle active/inactive |
| DELETE | `/api/hero-videos/:id` | Delete video + storage + cache |

### Hero Text Overlays

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hero-text` | Fetch hero text overlays |
| POST | `/api/hero-text` | Create text overlay |
| PATCH | `/api/hero-text/:id` | Update text styling |
| PATCH | `/api/hero-text/:id/apply` | Apply as active (deactivates others) |
| DELETE | `/api/hero-text/:id` | Delete text overlay |

### Related

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/video-cache/stats` | Invalidated after video deletion |
| GET | `/api/video-proxy?filename={url}` | Stream video for preview player |

**DB Tables:**
- `hero_videos` (id, title_en, title_fr, url_en, url_fr, use_same_video, is_active, order_index, updated_at)
- `hero_text` (id, title_fr, title_en, subtitle_fr, subtitle_en, title_mobile_fr, title_mobile_en, title_desktop_fr, title_desktop_en, font_size, font_size_desktop, font_size_tablet, font_size_mobile, is_active)

**Notes:**
- **Orphaned:** `POST /api/hero-videos/upload` — called in component but no route handler exists
- Bilingual EN/FR with `use_same_video` toggle for shared video approach
- Responsive typography: 3 breakpoints (desktop 60px, tablet 45px, mobile 36px)
- Only one `hero_text` record should have `is_active = true` at any time
- Video preview via embedded `<video>` element using `/api/video-proxy`
- Uses `apiRequest()` wrapper for auth headers
- Query invalidation covers both query and cache/stats queries on mutation

---

## DB Tables Summary (27 tables)

| Table | Section(s) |
|-------|-----------|
| `analyticsSessions` | Analytics (#1) |
| `analyticsExclusions` | Analytics (#1) |
| `content_keywords` | Blog Hub — Keywords (#2a) |
| `content_topics` | Blog Hub — Keywords, Topics, Planner (#2a-c) |
| `content_daily_assignments` | Blog Hub — Planner, Posts (#2c-d) |
| `blog_posts` | Blog Hub — Keywords, Topics, Planner, Posts (#2a-d) |
| `blog_galleries` | Blog Hub — Posts (#2d) |
| `blog_post_tags` | Blog Hub — Posts (#2d) |
| `blog_tags` | Blog Hub — Posts (#2d) |
| `imageBank` | Blog Hub — Image Bank (#2e) |
| `imageLabels` | Blog Hub — Image Bank (#2e) |
| `imageLabelLinks` | Blog Hub — Image Bank (#2e) |
| `partners` | Partners (#3) |
| `travel_upload_submissions` | Travel Uploads (#4) |
| `travel_agency_codes` | Travel Uploads (#4) |
| `seo_settings` | SEO (#5) |
| `galleryItems` | Gallery (#6) |
| `faqSections` | FAQ (#7) |
| `faqs` | FAQ (#7) |
| `whyMemopykCards` | Why MEMOPYK (#8) |
| `cta_settings` | CTA (#9) |
| `legal_documents` | Legal Documents (#10) |
| `ai_context` | AI Context (#11) |
| `hero_videos` | Hero Management (#14), System Tests (#13 indirect) |
| `hero_text` | Hero Management (#14) |

---

## Orphaned Endpoints Summary

Endpoints defined in route files but not called by any admin component:

| Endpoint | Route File | Reason |
|----------|-----------|--------|
| 55+ legacy analytics stubs | analytics-legacy.routes.ts | Old dashboard replaced by analytics-new |
| `GET /api/admin/content/plans` | content.routes.ts | Weekly planning never built |
| 4 blog-images endpoints | blog-images.routes.ts | Replaced by Image Bank |
| `POST /api/partners/intake` | partners.routes.ts | Public form, not admin |
| `GET /api/travel-upload/test-connection` | travel-upload.routes.ts | Debug endpoint |
| `POST /api/admin/seo/rollback` | seo.routes.ts | UI not wired (console.log only) |
| `GET /seo`, `POST /seo`, `PATCH /seo/:id` | seo.routes.ts | Public endpoints, no admin UI |
| `GET /api/seo-config` | seo.routes.ts | Public, not called |
| `POST /api/gallery/upload-video` | gallery.routes.ts | Replaced by upload-static-image |
| `POST /api/gallery/upload-image` | gallery.routes.ts | Replaced by upload-static-image |
| `DELETE /api/cta/:id` | cta.routes.ts | No UI delete button |
| `GET /api/legal/:type` | legal.routes.ts | Not called by component |
| `POST /api/admin/translate` | ai-context.routes.ts | Not called by AI Context component |

## Missing/Broken Endpoints

Endpoints called by components but not registered in any route file:

| Endpoint | Called From | Impact |
|----------|-----------|--------|
| `POST /api/deployment/create-marker` | DeploymentManagement.tsx | 404 — dead code |
| `POST /api/deployment/cleanup` | DeploymentManagement.tsx | 404 — dead code |
| `GET /api/deployment/markers` | DeploymentManagement.tsx | 404 — dead code |
| `POST /api/deployment/sitemap/generate` | DeploymentManagement.tsx | 404 — dead code |
| `GET /api/deployment/sitemap/status` | DeploymentManagement.tsx | 404 — dead code |
| 12x `GET /api/test/*` | SystemTestDashboard.tsx | 404 — test suite broken |
| `GET /api/system/health` | SystemTestDashboard.tsx | 404 — naming mismatch (should be `/api/health`) |
| `POST /api/hero-videos/upload` | AdminPage.tsx (hero) | 404 — upload broken |
