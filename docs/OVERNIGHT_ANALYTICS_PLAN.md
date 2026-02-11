# Overnight Analytics Build — Feb 10-11, 2026

> **Note:** Historical planning document from January 2026. Module counts and architecture references reflect the state at time of writing.

## Status: COMPLETE
## Last updated: 2026-02-11 02:00

### Task 1: Blog Analytics Endpoints — DONE
- [x] Endpoint: /api/analytics/blog/popular
- [x] Endpoint: /api/analytics/blog/trends
- [x] Endpoint: /api/analytics/blog/topics
- [x] Endpoint: /api/analytics/blog/keywords
- [x] Endpoint: /api/analytics/blog/categories
- Notes: Created server/routes/blog-analytics.routes.ts (5 endpoints). Uses raw pg Pool for complex JOINs. All support days + language params + IP exclusion. Registered in routes.ts (module count 21→22).

### Task 2: Clarity SDK Verification — DONE (documentation only)
- [x] Check if Clarity script is in index.html or cookie consent
- [x] Document what's needed
- Notes: Confirmed missing. No script tag in index.html, no CLARITY_PROJECT_ID env var. CSP headers already configured. ClarityRouteListener component loads but silently no-ops. Stéphane needs to create project at clarity.microsoft.com and add project ID.

### Task 3: Filter Coverage — DONE
- [x] /api/ga4/geo — added locale filter via Drizzle where clause
- [x] /api/ga4/cta — complete rewrite from stub to real endpoint querying analytics_events table
- [x] /api/ga4/report (videos) — added locale/country param reading
- [x] /api/ga4/top-videos — added locale/country param reading
- [x] /api/ga4/funnel — added locale/country param reading
- Notes: Video service layer doesn't accept locale/country params yet — params read at route level for future pass-through.

### Task 4: CTA Supabase Tracking — DONE
- [x] trackCtaClick() now sends to BOTH GA4 (gtag) and Supabase (/api/event)
- [x] /api/event POST handler persists cta_click events to analytics_events table
- [x] /api/ga4/cta endpoint returns real data from analytics_events
- Notes: Dual-path tracking with fire-and-forget Supabase call (no user-visible latency).

### Task 5: Fallback/Diagnostics Frontend — DONE
- [x] Created AnalyticsNewFallback.tsx with 4 status cards + cache stats
- [x] Wired into AnalyticsNewDashboard.tsx (replaced inline placeholder)
- Notes: Queries /api/health/detailed, /api/cache/breakdown, /api/analytics/health. Auto-refetch (health: 30s, cache: 60s). Refresh button works.

### Task 6: Cosmetic Fixes — DONE
- [x] Removed "Phase 1 Demo States" debug text from AnalyticsNewLoadingStates.tsx
- [x] Removed dead 'unfiltered' dataSource value from AnalyticsNewBlog.tsx and analyticsNewFilters.store.ts
- Notes: Removed Unfiltered button (had no server endpoints → would 404), cleaned type union in store.

### Task 7: Help Screens — DONE
- [x] Analytics Dashboard help (covers all 10 subtabs in one comprehensive screen)
- [x] SEO Management help
- [x] Video Gallery help
- [x] Partners Directory help
- [x] Hero Videos help
- [x] FAQ Management help
- [x] CTA Buttons help
- [x] Why MEMOPYK Cards help
- [x] Legal Documents help
- [x] Cache Management help
- [x] AI Context (Brand Brain) help
- [x] Travel Agencies help
- Notes: 12 new help screens inserted via Supabase REST API. Total: 21 screens (9 existing blog + 12 new). All admin sections now have help. HelpButton only reads `tab` param, so analytics subtabs share one screen.

### Task 8: Playwright Help Validation — DONE
- [x] Created tests/e2e/help-screens-validation.spec.ts
- Notes: Tests 13 admin tabs + 5 blog sub-tabs + drawer close. Uses loginToAdmin helper.

### Commits made:
- (see git log — commits created after all tasks complete)

### Issues encountered:
- Postgres MCP is read-only — used Supabase REST API for help screen inserts
- HelpButton.tsx only reads `tab` search param (not `an_tab`) — all analytics subtabs map to one help route `/admin?tab=analytics-new`. Created one comprehensive analytics help screen covering all 10 subtabs.
- Video analytics service layer doesn't accept locale/country params — filter pass-through deferred to future refactor

---

## Follow-up Fixes — Feb 11, 2026

### Fix 1: Video filter pass-through — DONE
- [x] Added `locale?` and `country?` params to getVideoStats, getTopVideos, getVideoEngagement, getVideoFunnel
- [x] Helper `getFilteredSessionIds()` queries analyticsSessions by language/countryCode
- [x] All 6 route handler call sites updated to pass locale/country through
- Commit: `0738767`

### Fix 2: Subtab-specific help for Analytics — DONE
- [x] HelpButton.tsx now includes `an_tab` in route when `tab=analytics-new`
- [x] Server-side fallback: strips `an_tab` and retries generic screen if subtab not found
- [x] 10 new help_screens rows inserted (overview, live, video, geo, cta, blog, trends, clarity, fallback, exclusions)
- [x] Playwright test updated with 10 analytics subtab tests
- Commit: `4855bc4`

### Fix 3: Blog analytics Drizzle rewrite — DONE
- [x] Replaced raw pg Pool with Drizzle ORM (db import + schema tables)
- [x] All 5 endpoints preserved: /popular, /trends, /topics, /keywords, /categories
- [x] Uses `sql` tagged templates for regex-based slug extraction JOINs
- [x] Same response shapes, same filtering (days, language, IP exclusion)
- Commit: `2603fa3`

### Fix 4: Clarity SDK installation — DONE
- [x] Created client/src/analytics/clarity.ts with dynamic script injection
- [x] Wired into App.tsx (public pages only, matching GA4 pattern)
- [x] Added VITE_CLARITY_PROJECT_ID to .env.example
- [x] ClarityRouteListener will now work once project ID is configured
- Commit: `a4c2c8a`

### Fix 5: Playwright help validation — DONE
- [x] Ran full suite against staging (28 tests)
- [x] Fixed 3 failures: Blog expectedTitle, Cache skip (pre-existing crash), Close drawer assertion, Posts redirect race
- [x] Final run: 28/28 passing (Cache skipped — pre-existing page crash)
- Commit: `b8569f4`

## Cache Management Fix — Feb 11

### Cache Tab Crash — DONE
- Root cause: property name mismatch (`heroVideos.count` vs actual `videos.fileCount`)
- Removed stub `/api/unified-cache/stats` query
- Added optional chaining + fallback defaults throughout
- Re-enabled Cache tab in Playwright test

### Cache Full Fix — DONE
- "All Media Cache" now dynamically queries DB for all hero + gallery videos (was hardcoded to 3)
- Orphaned images endpoint implemented (`POST /api/cache/cleanup-orphaned-static-images`)
- Gallery videos in UI now fetched dynamically from `/api/gallery`
- Fixed HeroVideo interface (`url_en` → `urlEn`)
- `.gitkeep` + `.gitignore` for cache directories

### Videos cached (7 total)
| Type | Filename |
|------|----------|
| Hero | VideoHero1.mp4, VideoHero2.mp4, VideoHero3.mp4 |
| Gallery EN | PomGalleryC_EN.mp4, VitaminSeaC.mp4, safari-1.mp4 |
| Gallery FR | PomGalleryC.mp4 (separate FR version) |

### Dynamic caching
New videos added to the database (hero_videos or gallery_items tables) automatically appear in the Cache Management UI. Clicking "All Media Cache" fetches the current list from DB, so new videos are always included. Caching is NOT automatic on upload — manual trigger via the Cache tab is required.

### Coolify Persistent Volume (required)
Without a persistent volume, cache is wiped on every deploy. Configuration:
- **Coolify path**: Project → Application → Configuration → Persistent Storage
- **Mount path in container**: `/app/server/cache`
- **Host path**: leave empty (Coolify creates a Docker volume)
- Must be configured for both staging and production applications
- Redeploy required after adding the volume
