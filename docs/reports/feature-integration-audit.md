# Feature Integration Audit

**Date:** February 13, 2026
**Audited by:** Claude Code (3 agents + team lead)
**Staging:** https://memopyk.memopyk.com
**Branch:** staging

---

## 1. AI System (Brand Brain)

| Feature | Accessible | Claims | Reality | Connected | Issues |
|---------|-----------|--------|---------|-----------|--------|
| Brand Brain editor | Yes (Systeme > AI Context) | "Context injected into all Claude API calls" | Only injected into **Translation** API calls. AI Creator does NOT use it. | Partial | CRITICAL #1 |
| Brand identity entries | Yes | 5 brand entries + 1 translation rule | All populated but brief (116-159 chars each). `updated_by: null` on all — never edited by admin. | Yes (to Translation) | Low |
| Internal AI context API | Yes (`/api/internal/ai-context/full`) | Aggregates brand data for AI consumers | Correctly restricted to localhost. **Never called by any production code** — Translation fetches Brand Brain directly from Supabase. | Dead endpoint | Low |

## 2. Blog Pipeline

| Feature | Accessible | Claims | Reality | Connected | Issues |
|---------|-----------|--------|---------|-----------|--------|
| AI Creator tab | Direct URL only (`?tab=ai-creator`) | 4-step prompt generator workflow | Works as designed: generate prompt, copy to external AI, paste JSON back, validate & save. | To posts (save) | CRITICAL #2 — hidden tab |
| AI Creator (modal) | Yes (from Planner + Topics) | Same workflow via `BlogPostCreatorModal` | Works. Pre-fills keywords from topic data. Passes `source_topic_id`. | To posts + topics | OK |
| Topic → Post flow | Yes | Topics create linked posts | 13/16 posts have `source_topic_id`. Status syncs (topic → in_progress on create, reverts on delete). | Bidirectional | OK |
| Planner calendar | Yes (Blog Hub tab 3) | Assign topics to dates, create posts | Works. PenSquare icon on unassigned topics opens modal. | To Topics + Posts | OK |
| Publishing pipeline | Yes | Publish sets date, clears cache | `published_at` auto-set. `blogCacheClear()` called on all mutations. **No sitemap regeneration.** No webhook/notification. | Partial | CRITICAL #3 — no sitemap regen |
| Translation (one-click) | Yes (Posts list) | AI translation with Brand Brain context | Works. Uses Claude claude-sonnet-4-20250514, fetches Brand Brain, preserves images, creates duplicate post in target language. | Brand Brain + Posts | OK |
| Translation Assistant | Yes (Blog Editor) | In-editor translation with Brand Brain | Works. Available when editing `[TRANSLATE TO...]` drafts. AI + manual fallback. | Brand Brain + Editor | OK |
| Blog Hub tabs (5) | Yes | Keywords → Topics → Planner → Posts → Images | All 5 tabs render, show data, connect to next tab via shared IDs. | Full pipeline | OK |
| Blog SEO keywords editor | Yes (Blog Editor) | Edit primary/secondary keywords | Works. Fields load from DB, save on update. Green pill preview matches Posts list. | Posts table | OK |

## 3. SEO System

| Feature | Accessible | Claims | Reality | Connected | Issues |
|---------|-----------|--------|---------|-----------|--------|
| SEO Admin panel | Yes (sidebar: SEO) | Edit homepage meta tags, OG, Twitter, robots, JSON-LD | Works. 5 sub-tabs (Basic, Robots, Social Media, Advanced, Live Preview). Character counters, search preview, audit history. | seo_settings → server-side injection | OK |
| Server-side OG injection (homepage) | Automatic | Route-aware language detection, proper og:url | Works. Detects language from URL path, injects correct bilingual tags, 5-min cache. | seo_settings table → HTML | OK |
| Server-side OG injection (blog) | Automatic | Blog-specific OG tags + BlogPosting JSON-LD | Works. Queries blog_posts by slug, generates article-specific tags, published_time, JSON-LD schema. 5-min cache per slug. | blog_posts.seo → HTML | OK |
| SSR tag dedup | Automatic | Prevents duplicate OG tags between SSR and React | Works. `<meta name="ssr-seo">` marker injected server-side, cleaned up in client main.tsx before React mounts. | Server → Client | OK |
| Sitemap | Static file | Lists all pages | Static `sitemap.xml` with 20 hardcoded URLs. **New blog posts NOT added automatically.** Last-modified date hardcoded to 2025-11-03. | Not connected to blog_posts | CRITICAL #3 |
| Robots.txt | Static file | Points to sitemap | Correct: `Allow: /`, references `sitemap.xml`. | OK | OK |
| SEO audit history | Yes (SEO Admin) | Track changes with version history | Works. Records admin user, change reason, old/new values in `seo_audit_logs`. | seo_audit_logs table | OK |
| SEO redirects | No UI | 301/302 redirect management | `seo_redirects` table exists in schema but **no middleware to enforce redirects**. No admin UI to manage them. | DEAD | DEAD #1 |

## 4. Analytics System

| Feature | Accessible | Claims | Reality | Connected | Issues |
|---------|-----------|--------|---------|-----------|--------|
| Overview tab | Yes (Analytics > Overview) | KPIs + sparklines | Works. Dual-source (GA4/MEMOPYK toggle). Shows totalViews, uniqueVisitors, sessions, plays, avgWatch, completions, bounceRate. | GA4 API + analytics_views | OK |
| Live View tab | Yes (Analytics > Live) | Realtime active users | Works. Shows active users, by country, by device. Currently-watching sessions. | GA4 Realtime API | OK |
| Trends tab | Yes (Analytics > Trends) | Daily session trends | Works. Dual-source. Date range + locale/country filters. AreaChart visualization. | GA4 + analytics_views | OK |
| Video tab | Yes (Analytics > Video) | Video performance analytics | Works. Top videos, funnel (10-90%), realtime plays. | GA4 API | OK |
| Geo tab | Yes (Analytics > Geo) | Geographic analytics | Works (MEMOPYK source). Country-based sessions/users with percentage breakdown. | analytics_views | OK |
| CTA tab | Yes (Analytics > CTA) | Call-to-action click tracking | Works. book_call + quick_quote metrics. By-location breakdown. | analytics_events table | OK |
| Blog tab | Yes (Analytics > Blog) | Blog post analytics | Works. 5 sub-sections: popular posts, trends, topics, keywords, categories. MEMOPYK-only (GA4 stubbed). | analytics_views + blog_posts + content_topics | OK |
| Clarity tab | Yes (Analytics > Clarity) | Microsoft Clarity heatmaps | **NOT IMPLEMENTED.** Shows placeholder: "Clarity integration coming soon. SDK not yet installed." | Nothing | DEAD #2 |
| Fallback tab | Yes (Analytics > Fallback) | Debug/test data | Works as debug tool. | Test data | OK |
| Exclusions tab | Yes (Analytics > Exclusions) | IP exclusion filtering | Works. CRUD for IP/CIDR ranges. "Your IP" badge. Applied to all MEMOPYK-source queries. | analytics_exclusions table | OK |
| Dual-source toggle | Yes (Overview/Trends) | Switch between GA4 and MEMOPYK data | Works. Zustand store persists preference. Invalidates queries on change. | Both sources | OK |
| Session tracking | Automatic | Track user sessions and page views | Works. Frontend creates session, updates duration, records page views and video views. Server-side dedup. | analytics_sessions + analytics_views | OK |
| GA4 Measurement Protocol | Automatic | Ad-blocker bypass for video events | Works. Relays video_start/progress/complete events to GA4 via server proxy. | GA4 MP endpoint | OK |

## 5. Content Management

| Feature | Accessible | Claims | Reality | Connected | Issues |
|---------|-----------|--------|---------|-----------|--------|
| FAQ | Yes (Contenu Site > FAQ) | CRUD with sections, reorder, bilingual | Works. 3 sections, accordion UI. Public: homepage `#faq` anchor, filtered by `is_active`, sorted by `order_index`. | Admin → API → Public homepage | OK |
| Gallery (Videos) | Yes (Contenu Site > Galerie Videos) | CRUD with media upload, reorder | Works. Admin bypasses 30s cache. Public: homepage GallerySection + dedicated `/gallery` route. Cache invalidated on writes. | Admin → API → Public page | OK |
| Hero Videos | Yes (Contenu Site > Videos Hero) | Carousel management, text overlay | Works. 3+ active videos, bilingual URLs from Supabase Storage. Public: homepage carousel. Responsive text sizes. | Admin → API → Public homepage | OK |
| CTA Buttons | Yes (Contenu Site > Boutons CTA) | Manage call-to-action buttons | Works. 2 active CTAs (book_call, quick_quote). Public: homepage CtaSection, filtered by `isActive`. **No DELETE endpoint.** | Admin → API → Public homepage | Minor gap |
| Why MEMOPYK | Yes (Contenu Site > Pourquoi MEMOPYK) | Card management with icons | Works. Bilingual HTML descriptions, icons, gradients. Public: homepage WhyMemopykSection. | Admin → API → Public homepage | OK |
| Legal Documents | Yes (Contenu Site > Documents Legaux) | Legal page editor | Works. 5 document types (notice, privacy, terms, cookies, terms-sale). Public: `/legal/:docType` routes. HTML sanitized. | Admin → API → Public pages | OK |
| Image Bank | Yes (Blog Hub tab 5) | Image storage for blog posts | Works. Admin-only. Upload with Sharp metadata extraction. Supabase Storage bucket. Colored label tags. | Admin → Blog posts | OK |

## 6. Partner Directory

| Feature | Accessible | Claims | Reality | Connected | Issues |
|---------|-----------|--------|---------|-----------|--------|
| Partner admin | Yes (Partenaires > Annuaire Pro) | CRUD, filtering, import/export | Works. 4-tab form, search, status filter, sort, toggle active/map/status. TSV import + Excel export. | Admin → API → Public page | OK |
| Public directory | Yes (`/annuaire-pro` FR, `/directory-pro` EN) | Map + partner listings | Works. **Uses Leaflet + OpenStreetMap** (not Mapbox). Marker clustering. Service badges. | Public API (no auth) | OK |
| Partner visibility | Automatic | Status-based filtering | Works. Public shows only `Approved + Active + ShowOnMap`. Three toggles in admin. | Admin status → Public filter | OK |
| Travel Agencies | Yes (Partenaires > Agences de Voyage) | Agency code management + upload portal | Works. Separate system from Partner Directory. Upload portal at `/travel-upload`. Agency codes with expiry. | Separate from Partners | OK |
| Partner intake form | Yes (`/annuaire-pro/devenir`, `/directory-pro/join`) | Public partner application | Works. Bilingual intake forms for new partner applications. | Public → API | OK |

## 7. System

| Feature | Accessible | Claims | Reality | Connected | Issues |
|---------|-----------|--------|---------|-----------|--------|
| Cache management | Yes (Systeme > Cache) | Clear server caches | Works. CacheManagementSection component. | Server caches | OK |
| AI Context (Brand Brain) | Yes (Systeme > AI Context) | See AI System section above | See section 1 | Partial | See CRITICAL #1 |

## 8. Navigation & Help

| Feature | Accessible | Claims | Reality | Connected | Issues |
|---------|-----------|--------|---------|-----------|--------|
| Sidebar navigation | Yes | All admin sections reachable | Works. 3 direct links + 3 collapsible sections (6+2+2 items). | All tabs | OK |
| Help system | Yes (bottom bar button) | Context-aware help drawer | Works. 31 help screens covering all tabs + analytics sub-tabs. Right-side drawer, state persisted to localStorage. | help_screens table | OK |
| Blog Hub sub-tabs | Yes (within Blog tab) | 5-tab workflow navigation | Works. URL-based routing (`?tab=keywords`, `topics`, `planner`, `posts`, `images`). | Internal to Blog Hub | OK |

---

## CRITICAL — Features That Claim Something They Don't Do

### CRITICAL #1: Brand Brain Claims "Injected Into All AI Calls"

**Location:** Systeme > AI Context
**Claim:** Info card says "These guidelines are automatically included when generating blog content, translations, and other AI-powered features."
**Reality:** Brand Brain is ONLY used by Translation (both one-click and Translation Assistant). The AI Creator — the primary blog content generation feature — has a **hardcoded 129-line prompt template** that does NOT fetch Brand Brain entries. Two separate prompt templates exist (`BlogAICreator.tsx` + `BlogPostCreatorModal.tsx`) with duplicated but divergent brand guidelines that will drift from any Brand Brain edits.
**Impact:** Admin edits to Brand Brain have no effect on AI-generated blog content.

### CRITICAL #2: AI Creator Tab is Hidden

**Location:** Blog Hub → should be a tab
**Claim:** Full-featured AI content creation workflow.
**Reality:** The `BlogAICreator` component renders when `tab=ai-creator`, but there is **no tab trigger** in the Blog Hub navigation bar (`ContentProductionHub.tsx` `tabConfig` array). The tab is only accessible via direct URL `?tab=ai-creator`. The **modal version** (`BlogPostCreatorModal`) is accessible from Planner and Topics and is the primary creation path.
**Impact:** The standalone AI Creator is effectively hidden. Users use the modal instead.

### CRITICAL #3: No Dynamic Sitemap Generation

**Location:** `client/public/sitemap.xml`
**Claim:** Sitemap lists all site pages for search engines.
**Reality:** Sitemap is a **static file** with 20 hardcoded URLs and a last-modified date of 2025-11-03. When new blog posts are published, they are **NOT automatically added**. No server-side sitemap generation code exists anywhere in the codebase. There is no publish trigger that regenerates the sitemap.
**Impact:** Search engines won't discover new blog posts via sitemap until manual regeneration. Currently 16 blog posts exist but only 2 example slugs are in the sitemap.

---

## DISCONNECTED — Features Not Reachable From Navigation

### DISCONNECTED #1: AI Creator Tab (`?tab=ai-creator`)

The standalone AI Creator is rendered by `BlogAICreator.tsx` when the URL has `tab=ai-creator`, but no tab trigger exists in the Blog Hub navigation bar. It duplicates functionality available via `BlogPostCreatorModal` (accessible from Planner and Topics tabs). The modal version is the de facto creation path.

### DISCONNECTED #2: `cache-management` Tab (`?tab=cache-management`)

Renders `CacheManagementPage` (different component from the sidebar's `cache` tab which renders `CacheManagementSection`). No sidebar link, no help content. Appears to be a legacy/duplicate implementation. Users would never discover it.

### DISCONNECTED #3: `new-post` Tab (`?tab=new-post`)

Renders `CreatePostLanding` (the "Write from scratch" / "Generate with AI" choice page). No sidebar link, but accessible via "Create New Post" button in Blog Posts tab. Has help content. This is intentionally a workflow step, not a navigation issue — included here for completeness.

---

## DEAD — Features That Exist But Do Nothing

### DEAD #1: SEO Redirects Table

**Table:** `seo_redirects` exists in the database schema.
**Reality:** No server middleware reads this table. No admin UI to manage redirects. No routes to enforce 301/302 redirects. The table is completely unused.

### DEAD #2: Clarity Analytics Tab

**Location:** Analytics > Clarity
**Reality:** Placeholder component displaying "Clarity integration coming soon. SDK not yet installed." No Microsoft Clarity SDK, no project ID, no data. The tab renders but shows nothing useful.

### DEAD #3: Internal AI Context Endpoint

**Endpoint:** `GET /api/internal/ai-context/full`
**Reality:** Correctly restricted to localhost. Aggregates Brand Brain + published posts. However, **no production code calls it**. Translation service fetches Brand Brain directly from Supabase via `fetchAIContext()`. The endpoint exists for documentation/display purposes only.

### DEAD #4: Performance Metrics Endpoint

**Endpoint:** `POST /analytics/performance` and `POST /performance`
**Reality:** Accepts Web Vitals data but only logs to console. No persistence, no dashboard, no table. Data is discarded.

### DEAD #5: Conversions Endpoint (Stubbed)

**Endpoint:** `GET /conversions`
**Reality:** Returns `{ success: true, data: { total: 0, count: 0 } }`. Hardcoded empty response. No actual conversion tracking.

### DEAD #6: Unified Cache Stats (Stubbed)

**Endpoint:** `GET /unified-cache/stats`
**Reality:** Returns stubbed data with `stub: true` flag. No real cache statistics collection.

---

## Duplicate / Divergent Code

| Item | File A | File B | Issue |
|------|--------|--------|-------|
| AI prompt template | `BlogAICreator.tsx` (129-line `MASTER_PROMPT_TEMPLATE`) | `BlogPostCreatorModal.tsx` (separate prompt template) | Different prompt structures, different field sets. Will diverge over time. Neither uses Brand Brain. |
| Cache management | `CacheManagementSection` (sidebar `cache` tab) | `CacheManagementPage` (orphan `cache-management` tab) | Two separate components for the same purpose. Only `CacheManagementSection` is in navigation. |

---

## Summary Statistics

| Category | Total Features | Working | Partial | Dead/Broken |
|----------|---------------|---------|---------|-------------|
| AI System | 3 | 1 | 1 | 1 |
| Blog Pipeline | 9 | 8 | 1 | 0 |
| SEO System | 8 | 6 | 0 | 2 |
| Analytics | 14 | 11 | 0 | 3 |
| Content Mgmt | 7 | 7 | 0 | 0 |
| Partners | 5 | 5 | 0 | 0 |
| System | 2 | 1 | 1 | 0 |
| Navigation | 3 | 3 | 0 | 0 |
| **Total** | **51** | **42 (82%)** | **3 (6%)** | **6 (12%)** |

**3 Critical issues** requiring action.
**3 Disconnected features** not in navigation.
**6 Dead features** that exist but do nothing.
