# MEMOPYK Website

## CURRENT WORK IN PROGRESS

**Last session:** 2026-01-30
**Working on:** Partner Directory Leaflet bug - RESOLVED (minimal deploy)
**Status:** Staging live and functional. Partner Directory map working. Mapbox GL JS upgrade planned for next sprint.

### Session Summary (2026-01-30)

**Problem:** Partner Directory page crashed with "Maximum call stack size exceeded" in Leaflet.

**Root Cause:** Incompatibility between Leaflet 1.9.4's class extension system and react-leaflet hooks (`useMap()`, `useMapEvents()`) in Vite production build. Same code worked on Replit but crashed on Coolify.

**Solution:** Deployed minimal working map configuration:
- Removed crashing components: MapBoundsTracker, MapFitBounds, MapZoomController, MapAutoZoomToSearch, ClusterClickHandler, MarkerClusterGroup
- Kept working components: MapContainer, TileLayer, Markers, Tooltips
- Added MapErrorBoundary as safety net

**Commit:** 7dfd312 - "feat: Deploy minimal working Partner Directory map"

**Planned:** Migrate to Mapbox GL JS in future sprint (cleaner API, better React integration, no class system bugs)

**Full diagnostic report:** PARTNER_DIRECTORY_LEAFLET_BUG_REPORT.md

### What's Done (Phases 1-3G + Fixes)

**Phase 1-2:** Server infrastructure
- Created clean folder structure, base config, shared/schema.ts (43KB, 40 tables)
- Set up server entry point (index.ts, app.ts)
- Created route aggregator (routes.ts) — 15 route modules
- Extracted all 14 route files from monolithic routes.ts
- Created storage.service.ts (Drizzle-based CRUD for content tables)

**Phase 3C:** Utilities & shared code (38 files across 9 directories)
**Phase 3D:** Feature components (33 files: sections, forms, blog, gallery, custom, mobile)
**Phase 3E:** Pages (20 files) + missing shared/ files (partnerFormats.ts, partnerSchema.ts)
**Phase 3F:** Admin interface (110 files: admin/ + components/admin/)
**Phase 3G:** Build verification + fixes

**Phase 3G Fixes applied:**
- Installed 23+ npm packages (react-hook-form, leaflet, radix, tinymce, quill, zustand, etc.)
- Pinned react-leaflet@^4.2.1 (React 18 compat) and @hookform/resolvers@^3.10.0 (zod v3 compat)
- Added `"types": ["node", "vite/client"]` to tsconfig.json
- Replaced shared/utils/slugify.ts with source version (has ensureUniquePartnerSlugs)
- Installed embla-carousel-react

**Route mismatch fixes (2026-01-27):**
- Fix 1: Added `/api/hero-text` alias route in routes.ts (rewrites to hero router /text/*)
- Fix 4: Added `/api/admin/blog/images` CRUD routes to blog.routes.ts (multer upload)
- Fix 5: Added PATCH handler for `/api/admin/blog/posts/:id` in blog.routes.ts
- Fix 3: Created **STUB** analytics-legacy.routes.ts (58 endpoints returning empty data)
- Copied `client/public/` directory (favicon, logo, robots.txt, sitemap, flags/, images/)

### Current State

| Component | Status |
|-----------|--------|
| Server starts | YES (port 5000) |
| Vite starts | YES (port 5173) |
| Server TS errors | 0 |
| Client TS errors | 67 (non-blocking, Vite still builds) |
| Route modules | 15 registered |
| Analytics | STUBBED (returns empty data) |

### What's Left — Tomorrow's TODO

**Priority 1: Analytics data layer migration**
The 58 analytics endpoints are currently stubs. To make them functional, copy from source:
- `server/hybrid-storage.ts` — 8,033 lines, analytics data layer (getAnalyticsDashboard, createAnalyticsSession, getAnalyticsSettings, etc.)
- `server/ga4-service.ts` — GA4 query functions (qSessions, qPlays, qBlogPageViews, etc.)
- `server/location-service.ts` — LocationService class, IP geolocation
- `server/cache-origin-headers.ts`, `server/video-cache.ts` — caching utilities
- `server/helpers/lang.ts` — language helper
- `server/services/location-enrichment.ts` — EnrichmentManager
Then update `analytics-legacy.routes.ts` imports to reference these files.

**Priority 2: Fix 67 client TS errors**
All are in `client/src/` (admin analytics components). Non-blocking but should be cleaned up:
- Missing `@types/react-simple-maps` declaration
- Type mismatches in analyticsNew/ hooks and components
- Implicit any parameters in BlogEditor, HtmlEditor

**Priority 3: Pre-existing issues (not migration bugs)**
- `components/ui/slider.tsx` — imported but never existed in source
- `services/relatedPosts` — imported in RelatedPostsSection.tsx but never existed in source
- `/api/hero-videos/upload` — called by frontend but no handler in source either

**Files modified in this session:**
- `server/routes.ts` — added hero-text alias, analytics-legacy mount
- `server/routes/blog.routes.ts` — added PATCH handler, blog image CRUD
- `server/routes/analytics-legacy.routes.ts` — replaced 3K-line extraction with stub
- `tsconfig.json` — added types
- `shared/utils/slugify.ts` — replaced with source version
- `package.json` — 23+ deps added, hookform/resolvers pinned to v3

---

## Quick Context

MEMOPYK.com is a memory preservation service that creates cinematic films and albums from clients' photos and videos. This is the main website handling client onboarding, project management, and content delivery.

**Owner:** Stephane (MEMOPYK EURL, France)
**Target Market:** Global, French-Canadian focus

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| Backend | Express.js + TypeScript |
| ORM | Drizzle ORM |
| Database | Supabase PostgreSQL (VPS) |
| Storage | Supabase Storage CDN |
| Email | Resend |
| Analytics | Google Analytics 4 + BigQuery |

## Key Commands

```bash
npm install          # Install dependencies
npm run dev          # Development (client + server)
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

## Directory Structure

```
memopyk-clean/
├── client/           # React frontend
│   ├── public/       # Static assets (flags/, images/, favicon, robots.txt)
│   └── src/          # Source code
│       ├── components/   # UI components (shadcn/ui + custom)
│       ├── pages/        # Page components (20 pages)
│       ├── admin/        # Admin panel (42 files)
│       ├── hooks/        # Custom hooks
│       ├── contexts/     # React contexts
│       ├── lib/          # Utilities
│       ├── config/       # Frontend config
│       ├── constants/    # Constants
│       ├── analytics/    # Analytics tracking
│       └── types/        # TypeScript types
├── server/           # Express backend
│   ├── routes/       # API routes (15 modular files)
│   ├── services/     # Business logic
│   ├── middleware/    # Express middleware
│   ├── cache/        # Cache directory
│   ├── config/       # Server config
│   ├── data/         # JSON backups
│   ├── jobs/         # Background jobs
│   └── utils/        # Server utilities
├── shared/           # Shared code
│   ├── schema.ts     # Drizzle schema (40 tables)
│   ├── partnerFormats.ts
│   ├── partnerSchema.ts
│   └── utils/        # Shared utilities
└── docs/             # Documentation (see Documentation Structure below)
```

## Documentation Structure

**IMPORTANT:** This codebase is the main website for MEMOPYK EURL and will be maintained for years. Proper documentation is essential for any Claude instance to understand, navigate, and extend the code.

**Reference:** Full specification in `memopyk-website/docs/Migration/TARGET_FOLDER_STRUCTURE.md`

```
docs/
├── README.md                # Docs index (navigation guide)
│
├── architecture/            # Architecture documentation
│   ├── OVERVIEW.md          # System overview, data flow diagrams
│   ├── DATABASE.md          # Schema documentation, table purposes
│   ├── API.md               # API reference (all endpoints)
│   └── DECISIONS.md         # Architecture Decision Records (ADRs)
│
├── deployment/              # Deployment documentation
│   ├── COOLIFY.md           # Coolify setup, configuration
│   ├── DOCKER.md            # Dockerfile explanation, build process
│   └── ENVIRONMENT.md       # All environment variables explained
│
├── guides/                  # How-to guides for operations
│   ├── BLOG_WORKFLOW.md     # How to create/edit blog posts
│   ├── TRAVEL_PORTAL.md     # Travel upload portal SOP
│   └── ANALYTICS.md         # Analytics dashboard guide
│
└── migration/               # Migration history (archive)
    ├── *.md                 # Migration phase documents
    └── PERFORMANCE_COMPARISON.md  # Replit vs Coolify benchmarks
```

**Status:** Documentation structure incomplete. The folders exist but most files need to be created.

## Route Modules (15 total)

| File | Mount Point | Status |
|------|-------------|--------|
| health.routes.ts | /api/health/* | Active |
| hero.routes.ts | /api/hero-videos/* | Active |
| gallery.routes.ts | /api/gallery/* | Active |
| faq.routes.ts | /api/faq* | Active |
| contact.routes.ts | /api/contact* | Active |
| cta.routes.ts | /api/cta*, /api/why-memopyk-cards | Active |
| legal.routes.ts | /api/legal* | Active |
| analytics.routes.ts | /api/ga4/*, /api/event | Active |
| analytics-legacy.routes.ts | /api/analytics/* | **STUB** |
| newsletter.routes.ts | /api/newsletter/* | Active |
| partners.routes.ts | /api/partners/* | Active |
| admin.routes.ts | /api/admin/* | Active |
| seo.routes.ts | /api/seo* | Active |
| blog.routes.ts | /api/blog*, /api/admin/blog/* | Active |
| media.routes.ts | /api/upload/*, /api/video-* | Active |

## Environment Variables

See `.env.example` for required variables.

Key categories:
- Database (DATABASE_URL, SUPABASE_*)
- Authentication (SESSION_SECRET)
- Email (RESEND_API_KEY)
- Analytics (GA4_*, BIGQUERY_*)
- Integrations (ZOHO_*, NC_*)

---

*Last updated: January 30, 2026*
