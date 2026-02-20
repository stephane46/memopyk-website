# Architecture Overview

## High-Level Architecture

```
                         +-------------------+
                         |     Browser       |
                         | (React SPA, wouter)|
                         +--------+----------+
                                  |
                         HTTPS (Coolify reverse proxy)
                                  |
                         +--------v----------+
                         |  Express Server   |
                         |  (Node 20, port   |
                         |   5000)           |
                         +--+-----+------+--+
                            |     |      |
              +-------------+     |      +---------------+
              |                   |                      |
   +----------v---+    +----------v--------+    +--------v--------+
   | Supabase     |    | Supabase Storage  |    | External APIs   |
   | PostgreSQL   |    | (memopyk-videos,  |    | - Resend (email)|
   | (85 tables,  |    |  image-bank)      |    | - Anthropic     |
   |  Drizzle ORM)|    |                   |    |   (Claude API)  |
   +--------------+    +-------------------+    | - GA4 Data API  |
                                                | - Nextcloud     |
                                                |   (file shares) |
                                                +-----------------+
```

**Staging:** https://memopyk.memopyk.com (auto-deploys from `staging` branch)
**Production:** https://memopyk.com (auto-deploys from `main` branch)

## Request Flow

1. Browser sends request to Coolify reverse proxy (HTTPS).
2. Coolify forwards to Express on port 5000 inside the Docker container.
3. Express middleware chain: body parsing, cookie parser, CORS, request logging, API rate limiting, CSP headers.
4. **API requests** (`/api/*`): routed through 22 modular route files registered in `server/routes.ts`. Route handlers query the database via Drizzle ORM (`server/db.ts`) using the `postgres.js` driver. Responses are JSON.
5. **Static assets** (production): Express serves built files from `dist/public/`. Non-API, non-asset requests fall through to the SPA fallback, which serves `index.html`.
6. **SPA routing**: The React app uses `wouter` for client-side routing. All public pages are locale-prefixed (`/fr-FR/...`, `/en-US/...`). Admin pages are behind `AdminRoute` auth guards.

## Dev vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Client | Vite dev server on port 5173 with HMR | Pre-built static files in `dist/public/` served by Express |
| Server | `tsx watch server/index.ts` (live reload) | `node dist/server/index.js` (esbuild bundle) |
| API proxy | Vite proxies `/api` to `localhost:5000` | Express handles both API and static serving |
| Start command | `npm run dev` (concurrently runs both) | `npm run start` |
| Build | N/A | `npm run build` (Vite client build + esbuild server bundle) |

## Folder Structure

```
server/                 Express backend
  index.ts              Server entry point (startup sequence, health checks, background jobs)
  app.ts                Express app config (middleware, CSP, static serving, error handling)
  routes.ts             Route aggregator (imports and mounts 22 route modules)
  db.ts                 Lazy-initialized Drizzle ORM + postgres.js connection
  routes/               22 modular route files (health, hero, gallery, blog, analytics, etc.)
  middleware/            auth, cache, error, logger, security middleware
  services/             Business logic (email, analytics, cache, media, partners, SEO, etc.)
  jobs/                 Background tasks (ga4-scheduler.ts, sync.job.ts)
  config/               Database connection testing
  data/                 Runtime JSON backup files

client/                 React frontend (Vite)
  src/
    main.tsx            React entry point (createRoot, HelmetProvider)
    App.tsx             Root component (providers, routing, analytics init)
    pages/              Page components (HomePage, BlogIndexPage, AdminRoute, etc.)
    components/         Reusable UI components (Layout, sections, shadcn/ui)
    admin/              Admin dashboard components
    contexts/           React contexts (Language, Auth)
    hooks/              Custom hooks (use-analytics, etc.)
    lib/                Utilities (queryClient, analytics, fetch helpers)
    analytics/          Client-side analytics (Clarity integration)
    config/             GA4 configuration
    constants/          App constants
    types/              TypeScript type definitions
    utils/              Utility functions (performance monitoring)
    assets/             Static assets bundled by Vite
  public/               Static files copied to dist/public/ (favicon, flags, robots.txt, sitemap.xml)

shared/
  schema.ts             Drizzle ORM table definitions + Zod validation schemas (35 tables)

docs/                   Project documentation
scripts/                One-off data scripts (keyword imports, cluster refinement, help content)
tests/e2e/              Playwright end-to-end tests
migrations/             Drizzle-kit generated SQL migrations
dist/                   Build output (dist/public/ for client, dist/server/ for server)
uploads/                Local upload staging directory
```

## Key Entry Points

| File | Purpose |
|------|---------|
| `server/index.ts` | Server startup: validates env vars, registers health checks, creates HTTP server, registers routes, sets up static serving, launches background jobs (GA4 scheduler, sync service) |
| `server/app.ts` | Express app instance with middleware stack: body parsing (50mb limit), cookie-parser, CORS, request logging, API rate limiting, CSP headers, SPA fallback |
| `server/routes.ts` | Imports and mounts all 22 route modules under `/api` prefixes |
| `server/db.ts` | Lazy-initialized database connection via `postgres.js` driver + Drizzle ORM with full schema |
| `client/src/main.tsx` | React entry: `createRoot` with `HelmetProvider` for SEO meta tags |
| `client/src/App.tsx` | Root React component: `QueryClientProvider` (TanStack Query), `AuthProvider`, `LanguageProvider`, `wouter` Router, GA4/Clarity initialization |
| `shared/schema.ts` | All 35 Drizzle table definitions (pgTable) with Zod insert schemas, shared between server and client |
| `vite.config.ts` | Vite config: React plugin, `@` and `@shared` path aliases, builds to `dist/public/`, dev proxy for `/api` to port 5000 |

## External Integrations

| Service | Package / API | Used For | Server Files |
|---------|--------------|----------|--------------|
| **Supabase PostgreSQL** | `postgres` + `drizzle-orm` | Primary database (85 app tables, 35 in Drizzle schema), all CRUD operations | `server/db.ts`, all route files |
| **Supabase Storage** | `@supabase/supabase-js` | Video and image hosting (buckets: `memopyk-videos`, image bank) | `hero.routes.ts`, `gallery.routes.ts`, `media.routes.ts`, `image-bank.routes.ts` |
| **Resend** | `resend` | Transactional email (contact forms, partner intake, travel upload confirmations, admin notifications) | `server/services/email.service.ts`, used by `newsletter.routes.ts`, `partners.routes.ts`, `travel-upload.routes.ts`, `contact.routes.ts` |
| **Anthropic Claude API** | `@anthropic-ai/sdk` | AI blog content generation, post translation (FR/EN), Brand Brain context | `ai-context.routes.ts`, `translation-service.ts`, `blog-admin.routes.ts` |
| **Google Analytics 4 Data API** | `@google-analytics/data` | Server-side analytics data retrieval for admin dashboard | `server/services/analytics/ga4.service.ts`, `analytics.routes.ts` |
| **Google BigQuery** | `@google-cloud/bigquery` | Analytics data export and querying | `analytics.routes.ts` |
| **Nextcloud** | WebDAV API (HTTP) | File delivery for travel upload portal (creates shared folders with upload links) | `travel-upload.routes.ts` |
| **Microsoft Clarity** | Client-side script | Heatmaps and session recordings on public pages | `client/src/analytics/clarity.ts` |
| **GA4 (client-side)** | gtag.js | Page views, events, conversion tracking on public pages | `client/src/config/ga4.config.ts` |

## Authentication

Admin routes are protected by a shared secret token (`ADMIN_SECRET` env var) passed via `Authorization: Bearer <token>` header. The `requireAdmin` middleware in `server/middleware/auth.middleware.ts` validates this token. The client stores the token and sends it with admin API requests via a centralized fetch helper.

## Deployment Pipeline

```
Developer pushes to GitHub
        |
        v
GitHub webhook triggers Coolify
        |
        v
Coolify runs Docker build (2-stage Dockerfile):
  Stage 1 (builder): npm ci, vite build (client), esbuild (server)
  Stage 2 (runner):   npm ci --omit=dev, copy dist/, run as non-root user
        |
        v
Container starts on port 5000
  - Health check: GET /api/health (30s interval)
  - Server timeout: 120s
        |
        v
Coolify reverse proxy routes HTTPS traffic to container
```

- **Staging**: push to `staging` branch deploys to `memopyk.memopyk.com`
- **Production**: push to `main` branch deploys to `memopyk.com`

Both environments use the same Dockerfile. Environment variables (database URLs, API keys) are configured in Coolify per environment.

## Background Services

Two background jobs are lazily loaded after server startup (non-blocking):

1. **GA4 Scheduler** (`server/jobs/ga4-scheduler.ts`): Periodic Google Analytics data sync.
2. **Universal Sync Service** (`server/jobs/sync.job.ts`): Background data synchronization tasks.

Both are optional and log warnings if they fail to initialize, without blocking the server.

## Analytics Architecture: GA4 vs MEMOPYK

MEMOPYK runs a dual analytics system. Understanding which data source powers each tab is critical.

### Data Sources

| Source | How It Works | Strengths | Limitations |
|--------|-------------|-----------|-------------|
| **GA4** (Google Analytics 4) | Client-side gtag.js + server-side Data API | Industry standard, rich dimensions | Blocked by ad blockers, 24-48h delay for some reports |
| **MEMOPYK** (Custom) | Server-side session tracking in `analytics_sessions` table | Unblockable, real-time, excludes admin IPs | Less dimensional depth than GA4 |

### Tab → Data Source Mapping

| Tab | Data Source | Why |
|-----|-------------|-----|
| Overview | Both (toggle) | KPIs from either source |
| Trends | Both (toggle) | Session trends from either source |
| Geo | MEMOPYK | Server-side IP geolocation |
| Blog | GA4 only | Blog page views tracked by gtag.js |
| Video | MEMOPYK | Server-side video event recording |
| CTA | MEMOPYK | Server-side click event recording |
| Live | MEMOPYK + GA4 Realtime | Combined real-time data |
| Clarity | External | Microsoft Clarity heatmaps (iframe) |
| Exclusions | MEMOPYK | IP exclusion management |
| Diagnostics | N/A | System health checks |

### Key Files

| File | Purpose |
|------|---------|
| `client/src/admin/analyticsNew/analyticsNewFilters.store.ts` | Zustand store — global filter state (date, language, country, data source) |
| `client/src/admin/analyticsNew/data/analyticsFilters.ts` | Centralized query parameter builder — ALL analytics requests go through this |
| `server/routes/analytics.routes.ts` | All analytics API endpoints (GA4, MEMOPYK, video, CTA, geo, trends) |
| `server/services/analytics/video-analytics.service.ts` | Video metrics aggregation from `analytics_views` table |
| `server/services/analytics/ga4.service.ts` | GA4 Data API wrapper functions |
| `server/services/analytics/realtime.service.ts` | Live tracking data from `realtime_visitors` table |

### Bot & IP Filtering

All MEMOPYK queries filter out bots (`is_bot = false`) and test data (`is_test_data = false`). The Exclusions tab lets admins add IP addresses to exclude from analytics. Excluded IPs are checked via `getExcludedIPs()` in `analytics.routes.ts`.
