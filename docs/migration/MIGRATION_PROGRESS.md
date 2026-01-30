# MEMOPYK Migration Progress Report

**Last Updated:** 2026-01-30
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

---

## Performance Comparison

| Metric | Replit | Coolify | Improvement |
|--------|--------|---------|-------------|
| Avg Response Time | 450ms | 150ms | **67% faster** |
| Some Endpoints | 600ms | 100ms | **6x faster** |

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
| `vite.config.ts` | Build configuration (aligned with working setup) |
| `Dockerfile` | Production container definition |

---

*Document maintained by Claude Chat + Claude Code CLI*
