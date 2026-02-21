# SEO Admin Audit Report

**Date:** 2026-02-21
**Auditor:** Claude (read-only investigation)
**Branch:** staging (fc54907)
**tsc errors:** 0

---

## Tab Inventory

The SEO admin panel is a single component (`client/src/components/admin/SeoManagement.tsx`, 1040 lines) rendered at `/admin?tab=seo`. It contains 5 inner tabs managed by Radix UI `<Tabs>`, plus a language switcher (FR/EN), History button, and Publish button at the top level.

### Tab 1: Basic SEO (`value="basic"`)

| Aspect | Details |
|--------|---------|
| **Purpose** | Core meta tags for search engines |
| **Fields** | Page Title (max 70 chars, counter), Meta Description (max 320 chars, counter), Keywords (comma-separated), Canonical URL |
| **Extras** | Google Search Result Preview card (live preview from form values) |
| **API calls** | `GET /api/admin/seo?lang={lang}` (load), `POST /api/admin/seo` (save) |
| **DB tables** | `seo_settings` (read/write), `seo_audit_logs` (write on save) |
| **Status** | **Working** -- Data populated for both FR and EN. FR title 57/70 chars, FR description 148/320 chars. |

### Tab 2: Robots (`value="robots"`)

| Aspect | Details |
|--------|---------|
| **Purpose** | Control how search engines crawl and index the page |
| **Fields** | Index Page (toggle), Follow Links (toggle), No Archive (toggle), No Snippet (toggle) |
| **Extras** | Live robots meta tag preview (generated from toggle states) |
| **API calls** | Same as Basic SEO (shared form) |
| **DB tables** | `seo_settings` columns: `robots_index`, `robots_follow`, `robots_noarchive`, `robots_nosnippet` |
| **Status** | **Working** -- Defaults: index=true, follow=true, noarchive=false, nosnippet=false |

### Tab 3: Social Media (`value="social"`)

| Aspect | Details |
|--------|---------|
| **Purpose** | Open Graph (Facebook/LinkedIn) and Twitter Card configuration |
| **Fields** | OG: title, description, image URL, type, URL. Twitter: card type (select), title, description, image URL |
| **API calls** | Same as Basic SEO (shared form, nested `openGraph` and `twitter` objects) |
| **DB tables** | `seo_settings` columns: `og_title_{en,fr}`, `og_description_{en,fr}`, `og_image_url`, `og_type`, `twitter_card`, `twitter_title_{en,fr}`, `twitter_description_{en,fr}`, `twitter_image_url` |
| **Status** | **Working** -- Both FR and EN OG/Twitter titles populated, OG image points to Supabase CDN |

### Tab 4: Advanced (`value="advanced"`)

| Aspect | Details |
|--------|---------|
| **Purpose** | JSON-LD structured data, hreflang entries, extra meta tags |
| **Fields** | JSON-LD textarea (freeform JSON), Hreflang list (add/remove lang+href pairs), Extra Meta Tags list (add/remove name+content pairs) |
| **API calls** | Same as Basic SEO (shared form). Hreflang and extras stored in `customMetaTags` jsonb |
| **DB tables** | `seo_settings` columns: `json_ld` (jsonb), `custom_meta_tags` (jsonb containing `{hreflang: [], extras: []}`) |
| **Status** | **Working** -- JSON-LD contains a rich `Service` schema with price, provider, contact. Hreflang has 3 entries (fr-FR, en-US, x-default). Extras array is empty. |

### Tab 5: Live Preview (`value="preview-tab"`)

| Aspect | Details |
|--------|---------|
| **Purpose** | Preview the actual HTML head tags that will be injected server-side |
| **Fields** | HTML lang attribute info card, "Generate Complete Preview" button, preview output in code block |
| **API calls** | `GET /api/admin/seo/preview?lang={lang}` |
| **DB tables** | Reads `seo_settings` via `seoService.generateHeadPreview()` |
| **Status** | **Working** -- Preview button generates full HTML head snippet including title, meta, OG, Twitter, hreflang, robots, canonical, JSON-LD |

### Top-Level Actions

| Action | API | Status |
|--------|-----|--------|
| **Language Switcher** (FR/EN) | Re-fetches `GET /api/admin/seo?lang={lang}` | Working |
| **Save** | `POST /api/admin/seo` | Working |
| **History** | `GET /api/admin/seo/history?lang={lang}` | Working (7 audit log entries) |
| **Publish** | `POST /api/admin/seo/publish?lang={lang}` | Working (creates audit log backup) |

---

## API Endpoint Inventory

| Endpoint | Auth | HTTP | Response | Status |
|----------|------|------|----------|--------|
| `GET /api/seo` | Public | 200 | All seo_settings rows (array) | Working |
| `POST /api/seo` | Admin | -- | Create new seo_settings row | Working (protected) |
| `PATCH /api/seo/:id` | Admin | -- | Update seo_settings row | Working (protected) |
| `GET /api/seo-config?lang=` | Public | 200 | Single settings object shaped for frontend `<SEO>` component | Working |
| `GET /api/seo/test-timeout` | Public | 200 | `{success: true, databaseTimeoutMs: 0}` | Working (stub) |
| `GET /api/admin/seo?lang=` | Admin | 401 (no auth) | Settings for admin UI | Working (auth enforced) |
| `POST /api/admin/seo` | Admin | -- | Save settings + audit log | Working |
| `GET /api/admin/seo/preview?lang=` | Admin | -- | HTML head snippet | Working |
| `GET /api/admin/seo/history?lang=` | Admin | -- | Audit log entries | Working |
| `POST /api/admin/seo/publish?lang=` | Admin | -- | Backup + publish event | Working |
| `GET /sitemap.xml` | Public | 200 | Dynamic XML sitemap | Working (16 URLs) |
| `GET /robots.txt` | Public | 200 | `User-agent: * / Allow: / / Sitemap: ...` | Working |

---

## Database Schema

### `seo_settings` (1 row)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | uuid | NO | PK, auto-generated |
| `page` | text | NO | Identifier: "homepage" |
| `url_slug_en` | text | YES | Unused |
| `url_slug_fr` | text | YES | Unused |
| `meta_title_en` | text | YES | EN page title |
| `meta_title_fr` | text | YES | FR page title |
| `meta_description_en` | text | YES | EN meta description |
| `meta_description_fr` | text | YES | FR meta description |
| `meta_keywords_en` | text | YES | EN keywords (comma-separated) |
| `meta_keywords_fr` | text | YES | FR keywords (comma-separated) |
| `og_title_en` | text | YES | EN OG title |
| `og_title_fr` | text | YES | FR OG title |
| `og_description_en` | text | YES | EN OG description |
| `og_description_fr` | text | YES | FR OG description |
| `og_image_url` | text | YES | Shared OG image URL |
| `og_type` | text | YES | Default "website" |
| `twitter_card` | text | YES | Default "summary_large_image" |
| `twitter_title_en` | text | YES | EN Twitter title |
| `twitter_title_fr` | text | YES | FR Twitter title |
| `twitter_description_en` | text | YES | EN Twitter description |
| `twitter_description_fr` | text | YES | FR Twitter description |
| `twitter_image_url` | text | YES | Shared Twitter image URL |
| `canonical_url` | text | YES | Canonical URL |
| `robots_index` | boolean | YES | Default true |
| `robots_follow` | boolean | YES | Default true |
| `robots_noarchive` | boolean | YES | Default false |
| `robots_nosnippet` | boolean | YES | Default false |
| `custom_meta_tags` | jsonb | YES | Stores `{hreflang: [], extras: []}` |
| `structured_data` | jsonb | YES | Unused (NULL in both rows) |
| `seo_score` | integer | YES | Default 0, never populated |
| `priority` | numeric | YES | Default 0.5, sitemap priority |
| `change_freq` | text | YES | Default "monthly" |
| `is_active` | boolean | YES | Default true |
| `json_ld` | jsonb | YES | Service schema JSON-LD |
| `created_at` | timestamp | YES | Auto |
| `updated_at` | timestamp | YES | Auto |

**Row 1:** `page="homepage"` -- The active row. Has all data populated (titles, descriptions, OG, Twitter, JSON-LD, hreflang). Last updated 2026-02-12.

~~**Row 2:** `page="home"` -- **Orphan row.** Deleted on 2026-02-21 (see Fixes Applied).~~

### `seo_audit_logs` (7 rows)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | serial | NO | PK |
| `page_id` | text | YES | References seo_settings.id or literal "homepage" |
| `action` | text | NO | "created", "updated", "save", "publish" |
| `field` | text | YES | Usually "all" |
| `old_value` | text | YES | Previous value |
| `new_value` | text | YES | New value (full JSON) |
| `admin_user` | text | YES | "admin" or "system" |
| `change_reason` | text | YES | Human-readable reason |
| `created_at` | timestamp | YES | Auto |

**Observation:** 7 entries total. Last entry is from 2025-08-22. No entries from the 2026-02-12 update (which means the `saveSeoSettings` function was not used for the most recent update, or the data was edited directly).

### Blog Post SEO (in `blog_posts` table)

Each blog post has:
- `seo` jsonb column: `{title, description}` per-post SEO overrides
- `include_in_sitemap` boolean: controls sitemap inclusion
- `primary_keyword` text: primary SEO keyword

Currently 2 published posts, both included in sitemap, both with populated SEO data.

---

## Live Site SEO State

### Homepage Meta Tags (FR, from SSR)

| Tag | Value | Source |
|-----|-------|--------|
| `<title>` | MEMOPYK -- Films et Albums Souvenirs \| Vos Photos en Video | SSR injection from seo_settings |
| `meta description` | Transformez vos photos et videos en films souvenirs... | SSR injection |
| `canonical` | https://www.memopyk.com | SSR injection (dynamic per path) |
| `og:title` | Same as title | SSR injection |
| `og:description` | Same as description | SSR injection |
| `og:image` | Supabase CDN URL | SSR injection |
| `og:type` | website | SSR injection |
| `og:locale` | fr_FR | SSR injection |
| `og:site_name` | MEMOPYK | SSR injection |
| `twitter:card` | summary_large_image | SSR injection |
| `hreflang` | fr, en, x-default | SSR injection |
| `robots` | index, follow | SSR injection |
| JSON-LD | Service schema with pricing, provider | SSR injection |

### Sitemap (`/sitemap.xml`)

- **Status:** 200 OK
- **Format:** Valid XML with `xmlns:xhtml` for hreflang
- **URLs:** 16 total (4 static pages x 2 locales + 2 blog posts x 2 locales)
- **Static pages:** homepage, gallery, blog, contact
- **Blog posts:** 2 (puppy photos FR + EN)
- **Cache:** 1 hour TTL, `Cache-Control: public, max-age=3600`
- **Base URL:** `https://www.memopyk.com` (production domain, correct)

### robots.txt

- **Status:** 200 OK
- **Content:** `User-agent: * / Allow: / / Sitemap: https://www.memopyk.com/sitemap.xml`
- ~~**Note:** Sitemap URL used `memopyk.com` not `www.memopyk.com` -- fixed 2026-02-21~~

### SSR Injection Pipeline

The server (`server/app.ts`) intercepts all non-API GET requests and:
1. Detects language from URL path (e.g., `/fr-FR/...` or `/en-US/...`)
2. For blog post URLs, calls `seoService.generateBlogPostHead(slug, lang, path)` -- includes BlogPosting JSON-LD + FAQ schema extraction
3. For other pages, calls `seoService.generateHeadPreview(lang, path)`
4. Replaces `<title>` and injects all SEO tags before `</head>`
5. Sets `<html lang="fr">` or `<html lang="en">`
6. Caches SSR output for 5 minutes
7. Skips injection for `/admin` routes

The client-side `<SEO>` component (`client/src/components/SEO.tsx`) also fetches `/api/seo-config?lang=` and renders via `react-helmet-async`. This creates a **dual injection** pattern: SSR for crawlers, client-side for SPA navigation.

---

## Issues Found

### Critical

*None found.*

### High

**H1. Canonical URL is hardcoded to FR for EN pages**
- The `canonical_url` column in `seo_settings` is `https://www.memopyk.com/fr-FR` for both languages.
- The SSR injection dynamically overrides this to the correct locale path (`generateHeadPreview` uses `requestPath`), so the **injected canonical is correct**.
- However, the admin UI's "Canonical URL" field shows `https://www.memopyk.com/fr-FR` even when viewing EN settings. This is because canonical_url is a **non-language-specific column** -- it's shared between FR and EN in the DB schema.
- The client-side `<SEO>` component uses `seoData.canonical || https://memopyk.com/${language}` as fallback, so it would show the FR canonical for EN users during SPA navigation.
- **Impact:** The SSR path handles this correctly for crawlers, but SPA navigation may serve wrong canonical to client-side rendered pages.
- **Fix:** Either make canonical_url lang-specific (add `canonical_url_en`/`canonical_url_fr`) or remove it from the DB and always compute it dynamically.

**H2. OG image URL is shared between languages**
- `og_image_url` and `twitter_image_url` are single columns, not bilingual.
- The SSR injection in `app.ts` swaps `og-home-fr.jpg` → `og-home-en.jpg` for EN, but this only works if the filename follows the pattern.
- The admin UI stores the same image for both languages. The EN Social Media tab shows the FR image URL.
- **Impact:** If an admin sets a different OG image via the admin UI, the EN swap won't work unless the filename matches the hardcoded pattern.

### Medium

**M1. Orphan `page='home'` row in seo_settings**
- Row `a6aaf10e-fec7-4c54-b22f-85e53e58c8d7` has `page='home'` (not `'homepage'`).
- The service only queries `WHERE page = 'homepage'`, so this row is never read.
- All text fields are NULL. Only `og_image_url` has a value (outdated `memopyk.com/images/` path).
- **Impact:** Dead data, minor clutter. No functional impact.
- **Fix:** Delete the orphan row.

**M2. Audit log gap -- no entries since Aug 2025**
- The audit log has 7 entries, all from 2025-07-29 to 2025-08-22.
- The `homepage` row was updated on 2026-02-12 (per `updated_at`), but there's no corresponding audit log entry.
- This means the Feb 2026 update bypassed `seoService.saveSeoSettings()` (which creates audit entries) -- likely a direct DB update or a different code path.
- **Impact:** History tab shows no recent changes. Publish events not tracked.

**M3. `seo_score` field never populated**
- The `seo_score` column (0-100) exists in the schema but defaults to 0 and is never set.
- The admin UI doesn't display it.
- **Impact:** Unused column. Low priority but could be useful for content quality tracking.

**M4. `structured_data` column exists but `json_ld` is used instead**
- Both `structured_data` (jsonb) and `json_ld` (jsonb) columns exist.
- The service exclusively uses `json_ld`. `structured_data` is NULL in both rows.
- **Impact:** Confusing schema. Consider removing `structured_data`.

**M5. `constants/seo.ts` DEFAULT_OG images reference non-existent files**
- `DEFAULT_OG.url` = `/images/brand/en-home-1200x630.jpg`
- `DEFAULT_OG_FR.url` = `/images/brand/fr-home-1200x630.jpg`
- These are used as fallback OG images in `BlogIndexPage` and `BlogPostPage`.
- The actual OG images are stored on Supabase CDN, not at `/images/brand/`.
- **Impact:** If blog pages fail to load their hero image, the fallback OG image will 404.

**M6. `robots.txt` sitemap URL inconsistency**
- `robots.txt` references `https://memopyk.com/sitemap.xml` (no www)
- The sitemap itself uses `https://www.memopyk.com` as base URL
- **Impact:** Minor -- both domains should redirect to the same place, but it's inconsistent.

### Low

**L1. `seo/test-timeout` endpoint is a stub**
- Returns hardcoded `{success: true, databaseTimeoutMs: 0}` without actually testing anything.
- Public endpoint with no auth required.
- **Impact:** Functionally useless. Could be removed.

**L2. Public `GET /api/seo` returns all rows including the orphan**
- Returns both `page='homepage'` and `page='home'` rows.
- No consumer currently uses this endpoint (the frontend uses `/api/seo-config` instead).
- **Impact:** Minor data leak of the orphan row. No security concern.

**L3. `PATCH /api/seo/:id` and `POST /api/seo` exist alongside admin endpoints**
- These appear to be legacy CRUD endpoints from an earlier design.
- The admin UI exclusively uses `/api/admin/seo` endpoints.
- **Impact:** Dead endpoints. Could be removed to reduce attack surface.

**L4. Blog posts only have 2 published articles in sitemap**
- Only 2 blog posts are published and in the sitemap.
- Not a bug, just a content gap.

---

## Architecture Summary

```
                    ┌─────────────────────────────────────────┐
                    │            Admin UI                      │
                    │  SeoManagement.tsx (5 tabs)              │
                    │  GET/POST /api/admin/seo                 │
                    └────────────────┬────────────────────────┘
                                     │
                    ┌────────────────▼────────────────────────┐
                    │         seo.routes.ts                    │
                    │  Admin: GET/POST /admin/seo              │
                    │         GET /admin/seo/preview           │
                    │         GET /admin/seo/history           │
                    │         POST /admin/seo/publish          │
                    │  Public: GET /seo-config?lang=           │
                    └────────────────┬────────────────────────┘
                                     │
                    ┌────────────────▼────────────────────────┐
                    │         seo.service.ts                   │
                    │  getSeoSettings()                        │
                    │  saveSeoSettings()                       │
                    │  generateHeadPreview()                   │
                    │  generateBlogPostHead()                  │
                    │  getSeoHistory()                         │
                    │  createBackup()                          │
                    └────────────────┬────────────────────────┘
                                     │
                    ┌────────────────▼────────────────────────┐
                    │         Database                         │
                    │  seo_settings (2 rows, 36 cols)          │
                    │  seo_audit_logs (7 rows)                 │
                    └─────────────────────────────────────────┘

         SSR Pipeline (server/app.ts):
         Request → detectLanguage → generateHeadPreview/generateBlogPostHead
                → inject into index.html → send to client

         Client Pipeline (components/SEO.tsx):
         SPA navigation → fetch /api/seo-config?lang= → Helmet → <head>
```

---

## Recommendations

### Fix First (High)

1. **H1 -- Canonical URL:** Make the SSR injection the sole authority for canonical URLs (it already computes them correctly). Consider removing the `canonical_url` column from admin UI display or making it read-only/informational, since the SSR path overrides it anyway.

2. **H2 -- OG Image:** Either add `og_image_url_en` / `og_image_url_fr` columns to support per-language OG images properly, or document that the filename-swap hack in `app.ts` is the intended mechanism.

### Clean Up (Medium)

3. **M1 -- Delete orphan row:** `DELETE FROM seo_settings WHERE page = 'home';`

4. **M4 -- Remove `structured_data` column:** It duplicates `json_ld` and is never used.

5. **M5 -- Fix DEFAULT_OG paths:** Update `constants/seo.ts` to point to actual Supabase CDN URLs or remove the fallback constants.

6. **M6 -- Align robots.txt:** Update sitemap URL to use `https://www.memopyk.com/sitemap.xml`.

### Optional Cleanup (Low)

7. **L1 -- Remove test-timeout stub** endpoint.
8. **L3 -- Remove legacy CRUD endpoints** (`GET /seo`, `POST /seo`, `PATCH /seo/:id`) if unused.
9. **M3 -- seo_score:** Either implement it or remove the column.

---

## Verification

- **tsc:** 0 errors
- **All API endpoints:** Responding correctly (public: 200, admin: 401 without auth)
- **sitemap.xml:** Valid XML, 16 URLs, hreflang alternates present
- **robots.txt:** Valid, allows all crawlers
- **SSR injection:** Working (meta tags visible in page source)
- **Admin UI:** All 5 tabs render and load data correctly

---

## Fixes Applied (2026-02-21)

| Issue | Fix | Status |
|-------|-----|--------|
| **M1** Orphan `page='home'` row | `DELETE FROM seo_settings WHERE page = 'home';` — verified 1 row remains | **DONE** |
| **M5** DEFAULT_OG images 404 | Updated `constants/seo.ts` to point to actual Supabase CDN URLs (`og-home-en.jpg`, `og-home-fr.jpg`) | **DONE** |
| **M6** robots.txt sitemap URL mismatch | Changed `client/public/robots.txt` from `memopyk.com` to `www.memopyk.com` | **DONE** |
| **H2** OG image shared (admin awareness) | Added amber warning in Social Media tab below OG Image URL and Twitter Image URL fields explaining the FR/EN swap mechanism | **DONE** |
