# Architecture Decision Records

**Project:** MEMOPYK Website
**Maintained since:** 2026-02

---

## ADR-001: Replit to Coolify/Docker Migration

**Status:** Accepted
**Date:** 2026-01 (initial commit Jan 28, production cutover Feb 2)

### Context
The site was hosted on Replit, which suffered from shared infrastructure, cold starts, and variable performance. Lighthouse desktop score was 62, and API response times averaged 508ms with Gallery hitting 984ms. Replit's cost model was also less favorable for a persistent production service.

### Decision
Migrate to a self-managed VPS running Coolify (open-source PaaS) with Docker containers. A multi-stage Dockerfile (node:20-alpine builder + runner) builds with esbuild for the server and Vite for the client, runs as a non-root user, and includes a wget health check.

### Consequences
**Positive:** Lighthouse desktop score rose from 62 to 88 (+42%). TTFB dropped from 348ms to 121ms (2.9x). Gallery API went from 984ms to 129ms (7.6x). No cold starts. All Core Web Vitals pass Google targets.
**Negative:** Requires VPS management and monitoring. Mobile performance remained slow on both platforms (image weight issue, not hosting).

---

## ADR-002: Directus CMS Replaced by Custom Express + Supabase

**Status:** Accepted
**Date:** 2026-01

### Context
The project initially used Directus as a headless CMS layer on top of Supabase PostgreSQL. Directus added operational complexity (its own auth, API layer, admin UI) while the project already had a custom admin panel. The dual-system created confusion around which layer owned what.

### Decision
Drop Directus entirely. Access Supabase PostgreSQL directly via Drizzle ORM for structured queries and via the Supabase JS client for storage operations. Build all CRUD endpoints as Express route modules. Directus credentials remain as optional in `.env.example` but are unused.

### Consequences
**Positive:** Single source of truth for data access. Fewer moving parts in production. Full control over API shape and auth. Simpler Docker deployment (no Directus container).
**Negative:** Every new content type requires hand-written routes and admin UI components.

---

## ADR-003: Drizzle ORM for Database Access

**Status:** Accepted
**Date:** 2026-01

### Context
The project needed a TypeScript ORM for Supabase PostgreSQL. Candidates were Prisma (heavy, requires generation step), Knex (query builder only, no type safety from schema), and Drizzle (lightweight, TypeScript-first, schema-as-code).

### Decision
Use Drizzle ORM (`drizzle-orm` + `drizzle-zod` + `drizzle-kit`). Schema defined in `shared/schema.ts` using `pgTable` declarations. Zod schemas auto-generated with `createInsertSchema`. Drizzle Kit provides `db:push`, `db:generate`, and `db:studio` commands.

### Consequences
**Positive:** Type-safe queries with zero code generation step. Schema shared between server and client (via `@shared` alias). Zod integration gives free request validation. Lightweight runtime.
**Negative:** Some complex analytics queries still use raw `pg` Pool for multi-table JOINs that are awkward in Drizzle's query builder (being migrated, see ADR-006). 35 tables in schema.ts (of 85 app tables in database) is manageable; the 50-table gap is schema drift (DB-only tables not yet in Drizzle).

---

## ADR-004: React + Vite + TypeScript + Wouter Frontend

**Status:** Accepted
**Date:** 2026-01

### Context
The frontend needed to serve a bilingual (FR/EN) marketing site with an admin panel. The stack was inherited from the Replit era and proven in production.

### Decision
React 18 SPA with Vite 5 bundler, TypeScript 5.8, Wouter for routing (lightweight alternative to React Router), TanStack Query for server state, Tailwind CSS + Radix UI primitives for styling, and Zustand for client state. TinyMCE 7 (self-hosted, not cloud) as the rich text editor for blog posts. Client builds to `dist/public/`, served by Express in production.

### Consequences
**Positive:** Fast dev server (Vite HMR). Wouter is 2KB vs React Router's 30KB+. TanStack Query handles caching/refetching automatically. Radix gives accessible primitives without style opinions. Self-hosted TinyMCE avoids API key dependency.
**Negative:** SPA means no SSR -- SEO relies on `react-helmet-async` for meta tags. 36 pre-existing TS errors were fixed Feb 12 (status type, calendar icons, language codes, error casting). Bundle size addressed via React.lazy code splitting (Feb 9).

---

## ADR-005: Monolithic Express Server with Route Modules

**Status:** Accepted
**Date:** 2026-01

### Context
The backend serves public pages, admin APIs, analytics collection, media proxying, blog CRUD, contact forms, partner directory, and more. Microservices would add deployment complexity for a single-team project.

### Decision
Single Express 4 server (`server/index.ts`) with 23 route modules in `server/routes/` (plus 2 shared utility files: `blog-shared.ts`, `translation-service.ts`). Each route module exports a Router. Services extracted into `server/services/` for reusable logic (analytics, media caching, translation). Auth via `requireAdmin` middleware. Server bundled with esbuild to a single `dist/server/index.js`.

### Consequences
**Positive:** Simple deployment (one container, one process). Shared database connection pool. Easy to add new route files. esbuild bundles the entire server in seconds.
**Negative:** All routes share one process -- a crash affects everything. No independent scaling. Route count (22 modules, 24 files) is manageable but growing.

---

## ADR-006: Custom Analytics Alongside GA4

**Status:** Accepted
**Date:** 2026-01 (custom tracking); 2026-02 (GA4 integration, Microsoft Clarity added)

### Context
GA4 provides standard web analytics but cannot track custom business metrics (video watch progress, CTA interactions, blog content performance by keyword/topic). Ad blockers also prevent GA4 from collecting data on a significant portion of visitors.

### Decision
Run both systems in parallel. Custom analytics writes to Supabase tables (`analytics_sessions`, `analytics_views`, `analytics_exclusions`, `performance_metrics`) via first-party `/api/analytics/*` endpoints that ad blockers do not block. GA4 runs client-side for standard metrics. The admin dashboard offers a data source toggle (custom vs GA4). Microsoft Clarity added Feb 10 for session recordings and heatmaps.

### Consequences
**Positive:** 100% visitor coverage via first-party tracking. Custom video funnel, CTA tracking, and blog analytics that GA4 cannot provide. IP exclusion for internal traffic. No data loss from ad blockers.
**Negative:** Dual system means ~8,000+ lines of analytics code. Strategic decision pending on whether to rebuild the analytics dashboard or fix existing code. Blog analytics endpoints were rewritten from raw pg Pool to Drizzle ORM (Feb 11) as part of ongoing cleanup.

---

## ADR-007: Blog Hub 5-Tab Content Pipeline

**Status:** Accepted
**Date:** 2026-02 (Keywords Feb 5-6, Topics Feb 5, Planner pre-existing, Posts unified Feb 4, Image Bank pre-existing)

### Context
The blog content workflow spans keyword research, topic planning, editorial calendar, post creation (manual or AI-assisted), and image management. These were originally separate admin sections with no connecting flow.

### Decision
Unify into a single `ContentProductionHub` component with 5 workflow tabs: Keywords, Topics, Planner, Posts, Image Bank. Each tab is a numbered step (1-5). Keywords hold 12,501 entries (FR+EN) with 25 clusters, multi-select filters, and quick filter presets. Topics link to keywords and generate posts. Posts support manual writing, AI generation (Claude API), and one-click translation. The hub uses URL params (`?tab=keywords`) for deep linking and help system integration.

### Consequences
**Positive:** End-to-end content workflow in one screen. Keyword-to-post traceability. AI-assisted content generation with brand context. Bilingual content pipeline (FR/EN market field on keywords).
**Negative:** ContentProductionHub orchestrates many sub-components, adding complexity. The Planner tab remains the default landing (most used), but tab order follows workflow logic.

---

## ADR-008: Staging/Production Branch Workflow

**Status:** Accepted
**Date:** 2026-02 (established Feb 1)

### Context
After the Coolify migration, the project needed a safe deployment workflow. Pushing directly to production risked breaking the live site.

### Decision
Two long-lived branches: `staging` deploys automatically to `memopyk.memopyk.com`, `main` deploys automatically to `memopyk.com`. All development happens on `staging`. Merges to `main` only after verification on staging. Coolify GitHub webhooks trigger auto-deploy on push to each branch. Claude Code defaults to `staging`; pushes to `main` require explicit user approval.

### Consequences
**Positive:** Every change is verified on staging before production. Auto-deploy means zero manual deployment steps. Clear separation of environments.
**Negative:** Requires discipline to not push directly to `main`. No feature branches -- all work goes to `staging` linearly (acceptable for a single-developer project).

---

## ADR-009: Bilingual Architecture (FR/EN Column Pairs)

**Status:** Accepted
**Date:** 2026-01 (present from initial commit)

### Context
MEMOPYK serves French and English-speaking customers. Content must be available in both languages with the ability to manage each independently.

### Decision
Bilingual content uses paired columns in the database schema: `title_fr`/`title_en`, `url_fr`/`url_en`, `subtitle_fr`/`subtitle_en`, etc. (77 FR/EN column references in `shared/schema.ts`). A `LanguageContext` React context provides `language`, `setLanguage`, and `t()` for UI translations. URL routing uses `/fr/` prefix for French pages. Blog posts have a `language` field for per-post language.

### Consequences
**Positive:** Full bilingual support without a translation framework dependency. Database-level separation means each language can have distinct content (not just translations). Simple implementation.
**Negative:** Column pairs double the schema width for bilingual tables. Adding a third language would require schema changes everywhere. The `t()` function uses a flat key-value map, not a full i18n library.

---

## ADR-010: Supabase Storage for Media Assets

**Status:** Accepted
**Date:** 2026-01

### Context
The site is media-heavy (hero videos, gallery videos, blog images, partner logos, image bank). Files need CDN delivery, and the storage layer must integrate with the existing Supabase PostgreSQL setup.

### Decision
Use Supabase Storage buckets (`memopyk-videos`, blog images, image bank) accessed via the Supabase JS client. The server handles uploads via multer, processes images with sharp, then stores in Supabase Storage. Public URLs served via Supabase CDN. A local disk cache (`server/cache/videos/`, `server/cache/images/`) added for frequently accessed media to reduce Supabase bandwidth.

### Consequences
**Positive:** Unified platform (database + storage + auth all Supabase). CDN delivery for media. Self-hosted Supabase means no vendor lock-in or egress fees. Local cache reduces latency for hero videos.
**Negative:** Total page weight ~21MB (mostly images) -- the root cause of poor mobile Lighthouse scores. Image optimization (WebP, compression) is a known future improvement.

---

## ADR-011: Claude API for AI Content Features

**Status:** Accepted
**Date:** 2026-02 (Brand Brain + AI Creator Feb 4, Translation Feb 4)

### Context
Blog content creation is time-consuming. The site needed AI assistance for drafting posts, translating between FR/EN, and maintaining brand voice consistency.

### Decision
Integrate the Anthropic Claude API (`@anthropic-ai/sdk`) server-side for three features: AI blog post generation (BlogAICreator), one-click FR-EN translation (translation-service), and brand context management (Brand Brain / `ai_context` table). All AI calls go through the Express server to keep the API key secure.

### Consequences
**Positive:** Significant time savings on content creation. Brand Brain provides consistent voice. Server-side integration keeps API key out of client bundle.
**Negative:** API cost per generation/translation. AI-generated content still requires human review before publishing.
