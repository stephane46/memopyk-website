# MEMOPYK Website

## What Is MEMOPYK?

MEMOPYK creates professional "Films Souvenirs" (souvenir/memory films) from clients' existing photos and videos. Target market: families aged 35-65, French and French-Canadian markets. This is a premium memory preservation service — NOT a productivity tool, NOT a SaaS app.

## Current Status

**Last updated:** February 19, 2026
**Staging:** https://memopyk.memopyk.com (auto-deploys on push to `staging`)
**Production:** https://memopyk.com (auto-deploys on push to `main`)

| Component | Status |
|-----------|--------|
| Server | ✅ Express.js (port 5000) |
| Client | ✅ React 18 + Vite |
| Database | ✅ Supabase PostgreSQL (35 tables, 33 in Drizzle) |
| Analytics | ✅ GA4 + custom Supabase (blog analytics endpoints added Feb 11) |
| Partner Directory | ✅ Mapbox GL JS with clustering (migrated Feb 14) |
| Auto-deploy | ✅ Push → GitHub webhook → Coolify |
| Help System | ✅ Complete (30 screens, 2 flows, V8 validated 28/28 CLEAR, Blog Editor 11/11) |
| Blog Hub | ✅ 5 workflow tabs, 107 keywords, 25 clusters |
| Production | ✅ Live on Coolify (Replit fully replaced Feb 2) |

## Quick Commands

```
npm install          # Install dependencies
npm run dev          # Development (Express + Vite)
npm run build        # Production build
npm run start        # Start production server
```

## Before You Code

READ THESE FIRST:
1. docs/WORKING_WITH_CLAUDE.md — Roles, workflow, how we work together
2. docs/README.md — Project structure, tech stack, documentation index
3. docs/TECH_DEBT.md — Known issues and deferred work

## Deployment

| Branch | Deploys To | URL |
|--------|------------|-----|
| `staging` | Staging | https://memopyk.memopyk.com |
| `main` | Production | https://memopyk.com |

**Always push to `staging` first. Only merge to `main` with Stéphane's approval.**

## Admin Panel Sections

| Section | Description |
|---------|-------------|
| Blog Hub | 5-tab content workflow: Keywords → Planned Posts → Planner → Posts → Image Bank |
| Partners | Partner directory management + map |
| Contenu Site | Homepage content, gallery, FAQ |
| Analytics | GA4 + custom dashboards |
| SEO | Meta tags, sitemap |
| System | Cache, health, configuration |

## Key Architecture

| Layer | Tech | Key Files |
|-------|------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui | `client/src/` |
| Backend | Express.js, TypeScript | `server/routes/` (23 route modules) |
| Database | Supabase PostgreSQL, Drizzle ORM | `shared/schema.ts` (34 tables), `docs/architecture/DATABASE.md` |
| Deployment | Docker, Coolify | `Dockerfile`, `docker-compose.yml` |
| Email | Resend | Contact form, notifications |
| Storage | Supabase Storage CDN | Images, videos |

## Recent Work

- 2026-02-19: Blog Hub deep audit — 15 fixes (P1/P2/P3) across 11 files from BLOG_HUB_AUDIT.md. P1: AI Creator language field + visible tab, Posts limit=200 with "Showing X of Y", image bank hero/body filter removed. P2: Planner "Assigned This Week" fixed to current ISO week, "Ready to Write" → "In Backlog", Keywords Posts column navigates correctly, Planner limit=200, "In Progress" split into Planned + In Progress. P3: tag autocomplete sort by name, image bank usageCount tracking, new post language selector, volume range shared constants
- 2026-02-19: Hero image picker fix — BlogHeroImageUpload was calling non-existent `/api/admin/blog/images`, fixed to `/api/image-bank`
- 2026-02-19: Blog Editor Topic field — searchable combobox (TopicCombobox.tsx) to link posts to planned topics via sourceTopicId. Loads all topics client-side, shows category/status badges
- 2026-02-19: Posts tab cleanup — removed language picker from header (redundant, language set in editor). New Post always creates fr-FR draft
- 2026-02-19: Topics tab fixes — grouped view as default, dynamic filter values from DB (fixed broken Category/Type/Role filters), workflow strip reduced to 5 steps
- 2026-02-19: SEO keyword fields — replaced plain text inputs with searchable combobox (KeywordCombobox.tsx, MultiKeywordCombobox) for primary and secondary keywords in BlogEditor
- 2026-02-19: Blog post allowlist data loss fix — PUT/PATCH allowlist was missing 7 fields (contentHtml, seo, heroCaption, featuredOrder, includeInSitemap, enableFaqSchema, readTimeMinutes). Content never saved, sitemap/FAQ toggles silently dropped. Fixed with both camelCase and snake_case variants
- 2026-02-19: publishedAt toISOString 500 fix — Drizzle's PgTimestamp.mapToDriverValue() crashed on string values. Added Date coercion guard + debug logging in both PUT and PATCH handlers
- 2026-02-17: Overnight hardening — Contact form rate limiting (3/hr per IP + honeypot), schema alignment (19 warnings → 0), Web Vitals collection removed (unnecessary DB writes, no UI), production smoke test (49 screens), schema audit now 0 CRITICAL / 0 WARNING
- 2026-02-17: Database cleanup — 88→35 tables. Dropped 50 empty legacy tables (Payload CMS + quoting system), dropped 2 empty unreferenced tables, truncated 102K test contacts (28 MB), added analytics_events to Drizzle. All application tables now in Drizzle schema.
- 2026-02-17: Schema audit automation — `tests/e2e/schema-audit.ts` (654 lines), compares 34 Drizzle tables (482 cols) vs actual DB. Found 19 issues manual audit missed.
- 2026-02-17: Schema vs DB fixes — 5 Replit migration ghosts fixed (performance_metrics wrong table, country_names phantom, gallery_items missing cols, blog_tags phantom timestamps, FAQ field names)
- 2026-02-17: Smoke test infrastructure — 51-screen automated smoke test (29 admin + 22 public), reusable for staging→production validation
- 2026-02-17: Contact page wired up, blog tags 500 error fixed, keywords help content gap fixed
- 2026-02-17: DATABASE.md created — complete schema documentation for all 35 tables with categories, relationships, indexes
- 2026-02-17: CLAUDE_WORKING_CONSTRAINTS.md v4.0 — Rule 11 added (verify deliverables before accepting completion)
- 2026-02-16: Help content enrichment — 5 screens updated in Supabase (CTA Buttons rewrite, Analytics Overview, Planner, FAQ Management, Travel Agencies). QC screenshots in tests/e2e/screenshots/help-qc/
- 2026-02-15: V8 naive user test — strict UI-only, 28/28 CLEAR, 14/15 flow steps CLEAR, Blog Editor 11/11, 2 final fixes (Agences heading, Flow 2 Step 6 wording)
- 2026-02-14: CSP fix — added Mapbox domains to Content-Security-Policy (script-src blob:, worker-src, connect-src api.mapbox.com)
- 2026-02-14: Cleanup + Mapbox + E2E — Leaflet→Mapbox GL JS migration (PartnerMapbox.tsx shared component, GeoJSON clustering, fly-to), 5 orphan analytics files deleted (516 lines), 3 junk draft posts deleted, 7 skipped E2E tests fixed (4 AI Creator + 3 Post Actions)
- 2026-02-14: Help system V6 fix — 22 AMBIGUOUS screens enriched (800-4300 chars each), 3 flow steps fixed, jargon removed (Supabase, API, endpoint), post titles clickable in Blog Posts tab, Travel Agency tab styling enhanced, QC spot-check 5/5 pass
- 2026-02-13: UI fixes — language selector moved to top of editor, blank draft Discard button + AI CTA banner, "Write Manually" in topic modal, stats labels fixed, help text rewritten (Sitemap/FAQ), naive user test 19/19
- 2026-02-13: Blog URL fix — language-prefix auto-redirect for cross-language slugs, related posts fallback to same-language posts
- 2026-02-13: Post-overhaul verification — puppy post fixes (alt text, internal links), keyword count corrected (107), naive user help test 20/20, 3 help screens updated (keywords count, Blog Hub Brand Brain link, Posts share buttons + language dialog)
- 2026-02-13: Infrastructure overhaul — Brand Brain enriched (6 entries, 1900-2800 chars each), generate-content API endpoint (Anthropic + Brand Brain), dynamic sitemap (/sitemap.xml), blog editor AI Assist modal, language selector, sitemap/FAQ schema toggles, WhatsApp share button, 4 dead endpoints removed, seoRedirects removed from schema, CreatePostLanding + CacheManagementPage deleted, 13 FR articles regenerated with Brand Brain, 5 help screens updated
- 2026-02-13: Server-side SEO fix — route-aware language detection, blog post OG tags + JSON-LD, og:url/og:locale, SSR dedup (30/30 checks pass)
- 2026-02-12: Content pipeline — 13 FR articles drafted (6 P1 + 7 P2), 59 image suggestions, social OG audit
- 2026-02-12: E2E evening run — 39/39 pass, social sharing report (3 OG issues documented)
- 2026-02-12: Content pipeline overnight — 10 topics inserted, 6 FR P1 articles drafted as blog posts
- 2026-02-12: API health check (56 endpoints, 96.4% pass) — 1 GA4 realtime credential bug found
- 2026-02-12: E2E test suite expansion — 7 new spec files (blog-crud, seo, faq, gallery, partners, cache, hero), 1,603 lines
- 2026-02-12: Architecture doc fixes — route count consistency (22 files/23 groups), partners admin endpoints, content pipeline expanded to 21 endpoints
- 2026-02-12: Fix 36 TS errors (zero remaining), rewrite ANALYTICS.md, verify/update architecture docs
- 2026-02-12: Help content 20/20 — all admin screens pass naive user test, Cache help rewritten
- 2026-02-12: Production SEO values set — bilingual titles/descriptions, OG images, JSON-LD (Service+Organization), hreflang
- 2026-02-12: SEO bugs fixed — EN language switch blank page, server-side meta tag injection for crawlers
- 2026-02-12: DB cleanup — 34K duplicate SEO rows removed
- 2026-02-12: Overnight Agent Teams — doc fixes (table count, help screens, flagged items), help validation, SEO service implementation, naive-user help test
- 2026-02-11: Documentation audit — 107→33 files, 9.5MB→387KB (96% reduction). Updated README, MIGRATION_PROGRESS, TECH_DEBT, BLOG_WORKFLOW.
- 2026-02-11: Blog analytics endpoints (5 new: popular, trends, topics, keywords, categories)
- 2026-02-09: Architecture audit — security hardening, 48 dead files removed (~12K lines), 9 DB indexes, fetch pattern standardization, React.lazy code splitting
- 2026-02-06: Keyword management system — 107 FR+EN keywords (reduced from 12,501 during strategy review), 25 clusters, multi-select filters, quick presets
- 2026-02-05: Topics CRUD, Blog Hub workflow tabs (numbered circles ①-⑤)
- 2026-02-04: AI translation, unified post creation, Brand Brain foundation
- 2026-02-02: Production live on Coolify, help system complete

## Known Issues

See docs/TECH_DEBT.md for full list. No blocking items.

## Agent Teams

This project uses Claude Code Agent Teams for parallel development. If you're reading this as a teammate:

**Your scope:** Follow your spawn prompt. Only modify files in your assigned directories. If you need changes outside your scope, message the team lead — don't do it yourself.

**Coordination:**
- Check the shared task list before starting work
- Claim tasks, don't duplicate work another teammate is doing
- Message the team lead when you finish a task or hit a blocker
- Message other teammates directly if your work affects theirs

**Before coding:** Read `.claude/rules/working-constraints.md` and any path-scoped rules that match your files. Read `docs/README.md` for the documentation index.

**After coding:** Verify your changes (Rule 4), commit to `staging` branch (Rule 3), update relevant docs if architecture changed.
