# MEMOPYK Migration Progress Report

**Last Updated:** 2026-01-31
**Status:** Staging Live - Ready for Production Cutover

---

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| **Staging URL** | ✅ Live | https://memopyk.memopyk.com |
| **Homepage** | ✅ Working | 67% faster than Replit |
| **Gallery** | ✅ Working | |
| **FAQ** | ✅ Working | |
| **Blog** | ✅ Working | |
| **Contact Form** | ✅ Working | |
| **Travel Upload Portal** | ✅ Working | Form submission + Nextcloud integration |
| **Partner Directory** | ✅ Working | Minimal map (see Lessons Learned) |
| **Admin Panel** | ✅ Working | Authentication fixed |
| **Partners API** | ✅ Working | Database queries implemented |
| **Analytics** | ✅ Functional | P1-P8 rebuild complete Jan 31, 2026 |

---

## Performance Comparison

**Full Report:** `docs/migration/PERFORMANCE_COMPARISON.md`

| Metric | Replit | Coolify | Improvement |
|--------|--------|---------|-------------|
| Homepage TTFB (avg) | 348ms | 121ms | **2.9x faster** |
| French Page TTFB | 275ms | 131ms | **2.1x faster** |
| API Response (avg) | 508ms | 141ms | **3.6x faster** |
| Gallery API | 984ms | 129ms | **7.6x faster** |
| FAQ API | 760ms | 121ms | **6.3x faster** |
| Blog Posts API | 250ms | 97ms | **2.6x faster** |

*Tested 2026-01-31 with 5 runs per endpoint*

---

## Completed Work

### Phase 1-4: Database & Schema
- ✅ Supabase PostgreSQL (17 tables, 12,000+ records)
- ✅ Drizzle ORM schema (shared/schema.ts)
- ✅ Direct database access (no hybrid-storage complexity)

### Phase 5-8: Code Migration
- ✅ 15 route modules extracted from monolithic routes.ts
- ✅ Service layer implemented
- ✅ Frontend migrated (React 18 + Vite)
- ✅ Admin panel functional

### Phase 9: Deployment
- ✅ Coolify Docker deployment
- ✅ Staging environment live
- ✅ SSL certificates active
- ✅ All critical pages functional

---

## Lessons Learned

### Leaflet Map Crash (2026-01-30)

**Problem:** Partner Directory page crashed with "Maximum call stack size exceeded" in Leaflet. 8 different code fixes attempted over 3+ hours, all failed.

**Investigation:** Same component code worked on Replit but crashed on Coolify.

**Root Cause:** NOT the component code — it was an incompatibility between:
- Leaflet 1.9.4's class extension system
- react-leaflet hooks (`useMap()`, `useMapEvents()`)
- Vite production build configuration

Any component using `useMap()` or `useMapEvents()` triggered infinite recursion in Leaflet's class initialization.

**Resolution:** Deployed minimal working configuration:
- Removed: MapBoundsTracker, MapFitBounds, MapZoomController, MapAutoZoomToSearch, ClusterClickHandler, MarkerClusterGroup
- Kept: MapContainer, TileLayer, Markers, Tooltips
- Added: MapErrorBoundary (graceful error handling)

**Key Insight:** When identical code works in one environment but crashes in another, compare BUILD CONFIGURATION before modifying component code.

**Full Report:** `/PARTNER_DIRECTORY_LEAFLET_BUG_REPORT.md`

### vite.config.ts Alignment (2026-01-30)

**Problem:** Build output path mismatch caused deployment failures.

**Changes Made:**
- Aligned vite.config.ts with Replit's working configuration
- Changed path resolution from `__dirname` to `process.cwd()`
- Updated build output from `dist/client` to `dist/public`
- Updated Dockerfile and server static paths to match

**Key Insight:** When changing Vite's `outDir`, must also update:
1. Dockerfile verification commands
2. Server static file serving paths

### CSS Architecture Fix (2026-01-30)

**Problem:** Multiple invisible UI elements on staging — submit buttons, homepage banner, gallery card-back buttons. Elements were functional (clickable) but not visible.

**Root Cause:** `tailwind.config.ts` used `hsl(var(--xxx))` color format, but CSS variables contained hex values (e.g., `#D67C4A`). This produced invalid CSS like `hsl(#D67C4A)` → browser renders as transparent.

**Additional Issues Found:**
- Missing MEMOPYK brand colors (`bg-memopyk-orange`, `text-navy`)
- Missing `@tailwindcss/typography` plugin
- Wrong default font (Inter instead of Poppins)

**Resolution:**
1. Replaced `tailwind.config.ts` with source version (commit 1d0ffe8)
2. Installed `@tailwindcss/typography` plugin
3. Added `card-back-gradient` class to gallery flip cards
4. Added CSS exception for buttons on dark backgrounds
5. Styled Retour button with `rounded-full` + `hover:scale-105`

**Key Insight:** When identical code displays correctly in one environment but has invisible elements in another, compare CSS/Tailwind configuration before modifying component code.

---

## Planned Work

### Next Sprint: Mapbox GL JS Migration

**Decision:** Replace Leaflet with Mapbox GL JS for Partner Directory maps.

**Why:**
- Modern API with native React hooks that work
- No class extension system bugs
- Better performance
- Cleaner developer experience
- Free tier: 50K map loads/month

**Scope:**
- Replace MapContainer with Mapbox Map component
- Implement clustering natively
- Add auto-fit bounds on load
- Add search-to-zoom functionality

**Estimated Effort:** 4-8 hours

### Production Cutover

**Remaining Steps:**
1. Final stakeholder review of staging
2. DNS cutover (memopyk.com → Coolify VPS)
3. Monitor for 72 hours
4. Decommission Replit

---

## Key Commits (Recent)

| Commit | Description | Date |
|--------|-------------|------|
| (latest) | Style gallery card-back button | 2026-01-30 |
| (latest) | CSS exception for buttons on dark backgrounds | 2026-01-30 |
| (latest) | Add card-back-gradient to gallery flip cards | 2026-01-30 |
| 1d0ffe8 | Replace tailwind.config.ts - fixes invisible elements | 2026-01-30 |
| 7dfd312 | Minimal working Partner Directory map | 2026-01-30 |
| 1e368b6 | Server serves from dist/public | 2026-01-30 |
| 81210ee | Align vite.config.ts with Replit | 2026-01-30 |
| cea63aa | Fix partners transform camelCase | 2026-01-29 |
| 5763d1e | Implement partners service | 2026-01-29 |

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Direct Supabase** | Eliminates hybrid-storage complexity |
| **No JSON sync** | Coolify single-server = no data sync issues |
| **Mapbox GL JS** | Modern, stable, better React integration than Leaflet |
| **Clean slate** | Don't chase Replit spaghetti code for bug fixes |

---

## Files Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project context for Claude Code sessions |
| `PARTNER_DIRECTORY_LEAFLET_BUG_REPORT.md` | Full Leaflet crash diagnostic |
| `docs/migration/MIGRATION_PROGRESS.md` | This file |
| `docs/migration/PERFORMANCE_COMPARISON.md` | Detailed Replit vs Coolify benchmarks |
| `docs/guides/ANALYTICS.md` | Analytics system documentation |
| `vite.config.ts` | Build configuration (aligned with working setup) |
| `Dockerfile` | Production container definition |

---

*Document maintained by Claude Chat + Claude Code CLI*
