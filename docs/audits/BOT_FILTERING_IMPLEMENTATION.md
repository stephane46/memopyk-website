# Bot Filtering Implementation

**Date:** 2026-02-19
**Commits:** `c1ca22c` (text/docs), `b2d6715` (backend)
**Branch:** staging

---

## Changes Summary

### 1. GDPR Tech Debt Note

Added to `docs/TECH_DEBT.md`: Cookie consent banner is decorative — GA4 fires unconditionally regardless of user choice. Priority: deferred until after analytics stabilization.

### 2. Server-Side Bot Detection

**New file:** `server/utils/bot-detection.ts`
- `isBotUserAgent(userAgent)` function with 21 regex patterns
- Covers: search engines (Google, Bing, Yandex, Baidu, Apple), SEO tools (Ahrefs, Semrush, MJ12, DotBot), dev tools (Lighthouse, HeadlessChrome, PageSpeed), HTTP clients (curl, wget, python, Go, Java, axios, node-fetch)
- Empty/null user agents return `true`

**Schema:** `shared/schema.ts` — added `isBot: boolean("is_bot").default(false)` to analytics_sessions

**Session creation:** `server/services/analytics/session.service.ts:229` — calls `isBotUserAgent()` when creating new sessions

**Database backfill:** Ran `UPDATE analytics_sessions SET is_bot = true` matching bot patterns. Result: 43 bot sessions flagged out of 74 total (7-day window).

### 3. Bot Filtering in Dashboard Queries

Added `eq(analyticsSessions.isBot, false)` to **13 query locations**:

| File | Locations |
|------|-----------|
| `server/routes/analytics.routes.ts` | 6 queries (KPIs current/previous period, recent-visitors, geo, trends) |
| `server/services/analytics/realtime.service.ts` | 3 queries |
| `server/services/analytics/session.service.ts` | 3 queries (stats, filtered sessions) |
| `server/services/analytics/video-analytics.service.ts` | 2 queries |

### 4. Analytics Text Block Updates

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx`

- **GA4 description:** Now explains client-side JS tracking and browser privacy features that block it
- **MEMOPYK description:** Now emphasizes server-side tracking with automatic bot exclusion
- **"Why the difference?":** Rewritten to explain the gap as real visitors invisible to GA4, not a data problem
- Terms used: "browser privacy features", "tracking protection", "content blockers" (NOT "ad blockers")

### 5. Verification

- `npx tsc --noEmit`: Zero errors
- Backfill query result: 43 bot / 31 real browser sessions (7-day window)
- Dashboard will now show ~31 real sessions instead of 74 total
