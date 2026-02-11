# API Reference

Complete endpoint inventory from the 22 route modules in `server/routes/`.

## Route Module Inventory

| # | Module | File | Base Path | Auth | Count |
|---|--------|------|-----------|------|-------|
| 1 | Health | health.routes.ts | (inline) | None | 4 |
| 2 | Hero Videos | hero.routes.ts | /api/hero-videos | Mixed | 12 |
| 3 | Hero Text | hero.routes.ts | /api/hero-text | Mixed | 1 |
| 4 | Gallery | gallery.routes.ts | /api/gallery | Mixed | 8 |
| 5 | FAQ | faq.routes.ts | /api | Mixed | 10 |
| 6 | Contact | contact.routes.ts | /api | Mixed | 5 |
| 7 | CTA | cta.routes.ts | /api | Mixed | 7 |
| 8 | Legal | legal.routes.ts | /api | Mixed | 5 |
| 9 | Analytics | analytics.routes.ts | /api | None | 21 |
| 10 | Newsletter | newsletter.routes.ts | /api/newsletter | None | 1 |
| 11 | Partners | partners.routes.ts | /api/partners | Mixed | 6 |
| 12 | Admin | admin.routes.ts | /api/admin | Admin | 7 |
| 13 | Content | content.routes.ts | /api/admin/content | Admin | 21 |
| 14 | SEO | seo.routes.ts | /api | Mixed | 8 |
| 15 | Blog | blog.routes.ts | /api | None | 7 |
| 16 | Blog Tags | blog-tags.routes.ts | /api | Mixed | 7 |
| 17 | Blog Admin | blog-admin.routes.ts | /api | Admin | 14 |
| 18 | Media | media.routes.ts | (inline) | None | 24 |
| 19 | Travel Upload | travel-upload.routes.ts | (inline) | Mixed | 13 |
| 20 | Help | help.routes.ts | /api | Mixed | 10 |
| 21 | AI Context | ai-context.routes.ts | /api | Admin | 5 |
| 22 | Image Bank | image-bank.routes.ts | /api | Admin | 8 |
| 23 | Blog Analytics | blog-analytics.routes.ts | /api | None | 5 |

**Total: ~204 endpoints.** Auth column: None = all public, Admin = all requireAdmin, Mixed = some public + some admin.

## Authentication

**`requireAdmin`** (auth.middleware.ts) -- Checks `Authorization: Bearer <token>` against `ADMIN_SECRET` env var. Returns 503 if unconfigured, 401 if invalid.

**`validateApiKey`** (auth.middleware.ts) -- Checks `x-api-key` header against same `ADMIN_SECRET`. Used by legacy integrations.

**Frontend** (queryClient.ts) -- Three helpers auto-attach auth on `/admin` paths:
- `apiRequest(url, method, data?)` -- general API calls with JSON body
- `adminFetch(url, options?)` -- drop-in fetch replacement with auth headers
- `getQueryFn({ on401 })` -- React Query default queryFn

Token source: `VITE_ADMIN_SECRET` env var, sent as `Authorization: Bearer <token>`.

## Public Endpoints (No Auth)

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health, /api/health/detailed | Health checks (basic + DB/storage/uptime) |
| GET | /api/ready, /api/live | Kubernetes probes |

### Content Reading

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/hero-videos | List hero videos (30s cache) |
| GET | /api/hero-text | Hero text settings |
| GET | /api/gallery | Gallery items (30s cache) |
| GET | /api/faq-sections | FAQ sections |
| GET | /api/faqs, /api/faq | FAQs (current + legacy) |
| GET | /api/contact | Contact info |
| GET | /api/cta | CTA settings |
| GET | /api/why-memopyk-cards | Why MEMOPYK cards |
| GET | /api/legal, /api/legal/:type | Legal documents |
| GET | /api/seo, /api/seo-config | SEO configuration |
| GET | /api/partners | Approved partners list |
| GET | /api/blog-tags | Blog tags |

### Blog (All cached, 5-min TTL)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/blog/posts | List posts (paginated, filterable by language/tag/status) |
| GET | /api/blog/featured | Featured posts |
| GET | /api/blog/posts/search | Search posts |
| GET | /api/blog/posts/:slug | Get post by slug |
| GET | /api/blog/posts/:slug/related | Related posts |
| GET | /api/blog/posts/:slug/gallery | Post gallery images |
| GET | /api/blog/tags | Tags with post counts |

### Analytics (All public, no auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/ga4/mp | GA4 Measurement Protocol relay (ad-blocker bypass) |
| GET | /api/ga4/report | GA4 report data |
| GET | /api/ga4/realtime | Realtime active users |
| GET | /api/ga4/realtime/top-videos | Realtime top videos |
| GET | /api/ga4/realtime/video-progress | Realtime video progress |
| GET | /api/ga4/trend | Trend data |
| GET | /api/ga4/kpis | KPI summary |
| GET | /api/ga4/top-videos, /api/ga4/videos | Video analytics |
| GET | /api/ga4/funnel | Conversion funnel |
| GET | /api/ga4/geo | Geographic breakdown |
| GET | /api/ga4/cta | CTA click tracking |
| POST | /api/analytics/session | Create session |
| POST | /api/analytics/session-update | Update session |
| POST | /api/analytics/session-page-view | Record page view |
| POST | /api/analytics/video-view | Record video view |
| POST | /api/analytics/event | Record custom event |
| POST | /api/analytics/performance | Record performance metrics |
| GET | /api/analytics/current-ip | Get client IP |
| POST | /api/event, /api/performance | Frontend event/perf logging |
| GET | /api/conversions | Conversion data |
| GET | /api/unified-cache/stats | Cache statistics |
| GET | /api/tracker/currently-watching | Live watching tracker |

### Blog Analytics (No auth, filters excluded IPs)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/analytics/blog/popular | Posts ranked by views |
| GET | /api/analytics/blog/trends | Daily view trends |
| GET | /api/analytics/blog/topics | Topics ranked by views |
| GET | /api/analytics/blog/keywords | Keywords ranked by traffic |
| GET | /api/analytics/blog/categories | Category performance |

### Media (No auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/upload/generate-signed-url | Supabase signed upload URL |
| POST | /api/upload/server-side-upload | Server-side upload to Supabase |
| POST | /api/upload/complete-direct-upload | Complete direct upload |
| POST | /api/upload/image | Upload image |
| POST | /api/gallery/upload-video | Upload gallery video |
| POST | /api/gallery/upload-image | Upload gallery image |
| POST | /api/gallery/upload-static-image | Upload static image to disk |
| GET | /api/video-proxy | Stream video (disk cache + CDN fallback) |
| HEAD | /api/video-proxy | Video proxy HEAD |
| GET | /api/image-proxy | Proxy image from Supabase |
| GET | /api/gallery-video-proxy | Proxy gallery video |
| GET | /api/video-debug | Debug video URL resolution |
| GET/POST | /api/video-cache/status | Video cache status |
| GET | /api/video-cache/stats | Cache statistics |
| POST | /api/video-cache/force | Force-cache single video |
| POST | /api/video-cache/force-all-media | Force-cache all DB media |
| POST | /api/video-cache/force-all | Force-cache all videos |
| POST | /api/video-cache/clear | Clear video cache |
| POST | /api/video-cache/refresh | Refresh cache |
| GET | /api/cache/breakdown, /api/cache/status | Cache disk info |
| POST | /api/cache/cleanup | Cleanup stale cache files |
| POST | /api/cache/cleanup-orphaned-static-images | Remove orphaned images |

### Forms & Subscriptions (No auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/contacts | Submit contact form (sends email via Resend) |
| POST | /api/newsletter/subscribe | Newsletter subscription |
| POST | /api/partners/intake | Partner intake form |
| POST | /api/travel-upload/submit | Travel upload (Multer + Nextcloud) |
| GET | /api/travel-agency-codes/validate/:code | Validate agency code |

### Help (Public reading)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/help/screens/:route | Help for screen (with an_tab fallback) |
| GET | /api/help/flows | List help flows |
| GET | /api/help/flows/:id | Get flow with steps |

## Admin Endpoints (requireAdmin)

### Content Management (CRUD pattern: GET list, GET :id, POST, PATCH :id, DELETE :id)

| Domain | Base Path | Resources |
|--------|-----------|-----------|
| Hero Videos | /api/hero-videos | Videos (POST upload, POST, PATCH :id, PATCH :id/reorder, PATCH :id/toggle, DELETE :id) + Text (POST, PATCH :id, PATCH :id/apply, DELETE :id) |
| Gallery | /api/gallery | POST, GET /admin, PATCH :id, DELETE :id, PATCH :id/reorder, PATCH :id1/swap/:id2, POST upload-static-image |
| FAQ | /api | Sections (POST, PATCH :id, PATCH :id/reorder, DELETE :id) + FAQs (POST, PATCH :id, DELETE :id) |
| Contact | /api/contacts | GET (list), PATCH :id, DELETE :id |
| CTA | /api | CTA (POST, PATCH :id) + Why cards (POST, PATCH :id, DELETE :id) |
| Legal | /api/legal | POST, PATCH :id, DELETE :id |
| SEO | /api/seo, /api/admin/seo | POST, PATCH :id, GET admin list, POST admin, GET preview, GET history, POST publish |
| Help Screens | /api/help/screens | GET (list), POST, PATCH :id, DELETE :id |
| Help Flows | /api/help/flows | POST, PATCH :id, DELETE :id |

### Blog Admin

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/blog/posts | Create post |
| POST | /api/admin/blog/create-from-ai | AI-generate post |
| POST | /api/admin/blog/posts/:id/translate | Translate via Claude API |
| GET | /api/admin/blog/posts | List posts |
| GET | /api/admin/blog/posts-by-date | Posts grouped by date |
| GET | /api/admin/blog/posts/:id | Get post |
| PUT/PATCH | /api/admin/blog/posts/:id | Update post (full/partial) |
| DELETE | /api/admin/blog/posts/:id | Delete post |
| GET/POST | /api/admin/blog/posts/:id/gallery | Gallery CRUD |
| PUT | /api/admin/blog/posts/:id/gallery/:imageId | Update gallery image |
| DELETE | /api/admin/blog/posts/:id/gallery/:imageId | Delete gallery image |
| PUT | /api/admin/blog/posts/:id/gallery/reorder | Reorder gallery |
| GET/POST/PUT/DELETE | /api/admin/blog/tags | Tag CRUD |
| POST/GET | /api/admin/blog/posts/:id/tags | Assign/get post tags |

### Content Pipeline (base: /api/admin/content, standard CRUD for each)

Keywords (GET /stats, list, :id, POST, PATCH :id, DELETE :id), Topics, Plans, Assignments -- all follow the same 5-6 endpoint pattern.

### Admin Utilities

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/admin/country-names/upload | Upload country names JSON |
| GET | /api/admin/country-names/download | Download country names |
| POST | /api/admin/country-names/sync-from-library | Sync from i18n library |
| GET/POST/PUT/DELETE | /api/admin/analytics/exclusions | IP exclusion CRUD |

### Travel Upload Admin

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/travel-upload/test-connection | Test Nextcloud connection |
| GET | /api/travel-upload/submissions | List submissions |
| DELETE | /api/travel-upload/submissions/:id | Delete submission |
| POST | /api/travel-upload/submissions/:id/resend-email | Resend notification |
| GET | /api/travel-upload/submissions/:id/folder-stats | Folder statistics |
| POST | /api/travel-upload/bulk-folder-stats | Bulk folder stats |
| CRUD | /api/travel-agency-codes | Agency code management |

### AI Context / Brand Brain

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/ai-context | List context entries |
| GET/PUT | /api/admin/ai-context/:key | Get/upsert by key |
| POST | /api/admin/translate | Translate text via Claude |

### Image Bank (standard CRUD)

Images: GET list, POST upload, PATCH :id, DELETE :id. Labels: GET list, POST, PATCH :id, DELETE :id.

## Internal Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/internal/ai-context/full | Localhost only | Full context dump (IP check: 127.0.0.1/::1) |

## Notable Patterns

- **In-memory caching**: Blog endpoints use `blogCacheGet`/`blogCacheSet` (5-min TTL). Gallery has 30s cache. Keyword stats have 1-min cache.
- **IP exclusion filtering**: Analytics and blog analytics exclude IPs from `analytics_exclusions` table, stripping CIDR suffixes.
- **Slug-based blog joins**: Blog analytics join `analytics_views.page_url` to `blog_posts.slug` via `SUBSTRING(page_url FROM '/blog/([^/?#]+)')`.
- **Bilingual content**: Blog, FAQ, legal, CTA, hero text, SEO all support `language` field (en-US/fr-FR).
- **File uploads**: Supabase signed URLs for media, Multer memory storage for API uploads, Multer disk storage for Nextcloud travel uploads.
- **No auth on media/analytics**: All media proxy, cache, upload, and analytics endpoints are public.
- **GA4 MP relay**: `POST /api/ga4/mp` forwards events to Google Analytics, bypassing client-side ad blockers.
- **Blog cache invalidation**: Admin writes (create/update/delete posts/tags/gallery) call `blogCacheClear()`.
- **Zod validation**: Used in SEO, content, and blog admin routes for request body validation.
- **Error convention**: Endpoints catch errors, log to console, return `[]` (analytics) or `{ error: "..." }` with 500.
