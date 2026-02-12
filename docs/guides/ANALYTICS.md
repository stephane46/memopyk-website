# Analytics System Guide

**Last verified:** February 12, 2026
**Status:** Dual-stream analytics (Custom Supabase + GA4), Microsoft Clarity for session replay

---

## Architecture

MEMOPYK uses three analytics services in parallel:

| Service | Purpose | Data Store | Latency |
|---------|---------|------------|---------|
| **Custom Supabase** | Session tracking, video analytics, blog analytics, IP exclusion | Supabase PostgreSQL | Real-time |
| **Google Analytics 4** | Standard web analytics, KPIs, geographic data, video events | Google BigQuery | 24-48h delay |
| **Microsoft Clarity** | Session recordings, heatmaps, rage click detection | Microsoft cloud | Real-time |

The admin dashboard has a **data source toggle** — most tabs can switch between "memopyk" (custom) and "ga4" data sources. Custom analytics use first-party `/api/*` endpoints that bypass ad blockers.

### Client-Side Initialization

In `client/src/App.tsx`:
1. **GA4**: Loaded via `initGA4()` from `client/src/config/ga4.config.ts`. Measurement ID: `G-JLRWHE1HV4` (or `VITE_GA4_ID` / `VITE_GA_MEASUREMENT_ID` env var). Injects gtag.js, tracks page views, video events, conversions, language mismatches, and geographic behavior.
2. **Clarity**: Loaded via `initClarity()` from `client/src/analytics/clarity.ts`. Requires `VITE_CLARITY_PROJECT_ID` env var. Injects the Clarity tracking script.
3. **Custom tracker**: SPA page views and video events sent to `/api/analytics/*` endpoints via fetch.

### Server-Side GA4 Access

The server uses `@google-analytics/data` (BetaAnalyticsDataClient) to query GA4 Data API and Realtime API. Requires `GA4_SERVICE_ACCOUNT_KEY` (JSON) and `GA4_PROPERTY_ID` env vars. Helper functions in `server/services/analytics/ga4.service.ts`: `qSessions`, `qTotalUsers`, `qReturningUsers`, `qPlays`, `qWatchTimeTotal`, `qCompletes`, `qSessionsTrendWithComparison`.

### GA4 Measurement Protocol Relay

`POST /api/ga4/mp` relays video events (video_start, video_progress, video_complete) to Google's Measurement Protocol endpoint, bypassing client-side ad blockers. Requires `GA_API_SECRET` env var.

---

## Database Tables

| Table | In Drizzle | Purpose |
|-------|------------|---------|
| `analytics_sessions` | Yes | Visitor sessions: IP, country, device, duration, bounce, returning flags |
| `analytics_views` | Yes | Page/video views per session: URL, video ID, watch time, completion % |
| `analytics_exclusions` | Yes | IP/CIDR exclusion rules for filtering internal traffic |
| `realtime_visitors` | Yes | Currently active visitors (session, page, last_seen) |
| `performance_metrics` | Yes | Web Vitals (LCP, etc.) — DB schema wider than Drizzle definition |
| `analytics_events` | No (DB-only) | Legacy event store + CTA click events (event_name, cta_id, page_path) |
| `analytics_conversions` | No (DB-only) | Conversion tracking by type (legacy, mostly unused) |
| `conversion_funnel` | No (DB-only) | Funnel step tracking |
| `engagement_heatmap` | No (DB-only) | Click/scroll heatmap data |
| `blog_post_views` | No (DB-only) | Per-post view tracking |

---

## Admin Dashboard

**Access:** `/admin` → Analytics section (`?an_tab=<tab>`)

### Dashboard Tabs

| Tab | Component | Data Source | Description |
|-----|-----------|-------------|-------------|
| **Overview** | AnalyticsNewOverview | Memopyk or GA4 | KPI cards (sessions, unique visitors, returning visitors, bounce rate, avg watch time), period comparison |
| **Live View** | AnalyticsNewLiveView | GA4 Realtime API | Active users, by country, by device, currently-watching tracker |
| **Trends** | AnalyticsNewTrends | Memopyk or GA4 | Daily session/user charts with period-over-period comparison |
| **Video** | AnalyticsNewVideo | Memopyk or GA4 | Top videos by plays, watch time, completion rate; per-video funnel |
| **Geo** | AnalyticsNewGeo | Memopyk | Country breakdown with sessions, users, percentage |
| **CTA** | AnalyticsNewCta | analytics_events | CTA click tracking: book_call, quick_quote; by language, page, daily trend |
| **Blog** | AnalyticsNewBlog | Memopyk | Popular posts, daily view trends, topics, keywords, categories |
| **Clarity** | Placeholder | — | Placeholder for future Microsoft Clarity embed |
| **Fallback** | AnalyticsNewFallback | — | Error/fallback state display |
| **Exclusions** | IpExclusionsManager | Admin API | CRUD for IP exclusion rules; shows "Your IP" badge |

### Global Filters

- **Data source toggle**: Memopyk (custom) vs GA4
- **Date range**: Start/end date pickers
- **Since date**: Optional filter for "data since" cutoff
- **Locale filter**: All / fr-FR / en-US
- **Country filter**: All or specific country

---

## API Endpoints

### Session Recording (Custom Tracker)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/analytics/session` | None | Create/resume visitor session. Returns `session_id` for subsequent calls. Checks IP exclusion. |
| POST | `/api/analytics/session-update` | None | Update session duration (called periodically + on page hide) |
| POST | `/api/analytics/session-page-view` | None | Record SPA page navigation within session |
| POST | `/api/analytics/video-view` | None | Record video view with deduplication (same video+session updates existing row) |
| POST | `/api/analytics/event` | None | General event recording. Accepts `event_name` or `type`. Routes to video/pageview/generic handlers. |
| POST | `/api/analytics/performance` | None | Accept Web Vitals from frontend (logged, not persisted) |
| GET | `/api/analytics/current-ip` | None | Returns caller's IP address (for Exclusions tab badge) |

### GA4 Data Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ga4/mp` | None | Measurement Protocol relay (video_start, video_progress, video_complete only) |
| GET | `/api/ga4/report` | None | Unified report dispatcher. `?report=topVideos\|videoFunnel\|geo\|trends` |
| GET | `/api/ga4/kpis` | None | KPI summary: sessions, unique/returning visitors, plays, avg watch, completions. Supports `dataSource=ga4\|memopyk` |
| GET | `/api/ga4/trend` | None | Daily session/user/bounce data. Supports `dataSource=ga4\|memopyk`, date range, locale, country filters |
| GET | `/api/ga4/realtime` | None | GA4 Realtime: active users, by country, by device |
| GET | `/api/ga4/realtime/top-videos` | None | Realtime video plays from GA4 |
| GET | `/api/ga4/realtime/video-progress` | None | Realtime video progress funnel (10/25/50/75/90% buckets) for a specific videoId |
| GET | `/api/ga4/top-videos` | None | Top videos: plays, avgWatchSeconds, completionRate, reach50Pct |
| GET | `/api/ga4/videos` | None | Per-video stats + engagement metrics |
| GET | `/api/ga4/funnel` | None | Video progress funnel for a specific videoId |
| GET | `/api/ga4/geo` | None | Geographic breakdown from Supabase sessions (country, sessions, users, percentage) |
| GET | `/api/ga4/cta` | None | CTA click analytics from `analytics_events` table (by CTA ID, language, page, daily) |

### Blog Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analytics/blog/popular` | None | Posts ranked by view count. Params: `days`, `language` |
| GET | `/api/analytics/blog/trends` | None | Daily blog view counts. Params: `days`, `language` |
| GET | `/api/analytics/blog/topics` | None | Topics ranked by views from linked posts |
| GET | `/api/analytics/blog/keywords` | None | Keywords ranked by traffic from posts using them |
| GET | `/api/analytics/blog/categories` | None | Category performance breakdown |

All blog analytics endpoints join `analytics_views.page_url` to `blog_posts.slug` via `SUBSTRING(page_url FROM '/blog/([^/?#]+)')`. All filter excluded IPs.

### Frontend Event Logging

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/event` | None | Frontend event logging. CTA clicks (`event_name: 'cta_click'`) are persisted to `analytics_events` table. |
| POST | `/api/performance` | None | Performance metrics logging (logged only) |
| GET | `/api/conversions` | None | Conversion data (stub — returns `{ total: 0 }`) |

### Utility

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/unified-cache/stats` | None | Cache statistics (stub) |
| GET | `/api/tracker/currently-watching` | None | Live video viewers from realtime service |

### IP Exclusions (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/analytics/exclusions` | Admin | List all IP exclusions |
| POST | `/api/admin/analytics/exclusions` | Admin | Create exclusion `{ ip_cidr, label, active }` |
| PUT | `/api/admin/analytics/exclusions/:id` | Admin | Update exclusion |
| DELETE | `/api/admin/analytics/exclusions/:id` | Admin | Delete exclusion |

---

## Server Services

| Service | File | Purpose |
|---------|------|---------|
| `ga4.service.ts` | `server/services/analytics/` | GA4 Data API query functions (sessions, users, trends with comparison) |
| `session.service.ts` | `server/services/analytics/` | Session creation/resumption, IP exclusion check, duration tracking |
| `event-recorder.service.ts` | `server/services/analytics/` | Record page views and video events to `analytics_views`, IP extraction |
| `video-analytics.service.ts` | `server/services/analytics/` | Video stats aggregation, top videos, engagement, funnel data |
| `realtime.service.ts` | `server/services/analytics/` | Currently-watching tracker |
| `ip-exclusion.service.ts` | `server/services/analytics/` | IP exclusion CRUD and checking |
| `geo.service.ts` | `server/services/analytics/` | Geographic data helpers |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_GA4_ID` or `VITE_GA_MEASUREMENT_ID` | GA4 Measurement ID (client-side). Fallback: `G-JLRWHE1HV4` |
| `GA4_PROPERTY_ID` | GA4 Property ID for Data API (server-side). Value: `501023254` |
| `GA4_SERVICE_ACCOUNT_KEY` | Service account JSON for GA4 Data API |
| `GA_API_SECRET` | GA4 Measurement Protocol API secret |
| `VITE_CLARITY_PROJECT_ID` | Microsoft Clarity project ID (client-side) |
| `DATABASE_URL` | PostgreSQL connection (used by all custom analytics) |

---

## IP Exclusion System

Filters internal/developer traffic from analytics.

1. **Tracking layer**: `session.service.ts` checks IP against `analytics_exclusions` before creating sessions. Excluded IPs get a `{ filtered: 'ip_excluded' }` response.
2. **Query layer**: All analytics endpoints call `getExcludedIPs()` and add `NOT IN` filters. CIDR suffixes are stripped (e.g., `/32` removed).
3. **Admin UI**: Exclusions tab shows current rules, "Your IP" badge, and CRUD controls.

---

## Data Flow Summary

```
Browser
  ├── gtag.js → Google Analytics 4 (client-side)
  ├── Clarity script → Microsoft Clarity (session replay)
  └── fetch() → /api/analytics/* (first-party, custom)
        │
        ├── /analytics/session → getOrCreateSession() → analytics_sessions
        ├── /analytics/session-page-view → recordPageView() → analytics_views
        ├── /analytics/video-view → recordVideoEvent() → analytics_views (deduped)
        ├── /event (cta_click) → analytics_events
        └── /ga4/mp → Google MP endpoint (ad-blocker bypass)

Admin Dashboard
  ├── /ga4/kpis → memopyk: analytics_sessions | ga4: GA4 Data API
  ├── /ga4/trend → memopyk: analytics_sessions | ga4: qSessionsTrendWithComparison
  ├── /ga4/realtime → GA4 Realtime API (active users, country, device)
  ├── /ga4/top-videos → video-analytics.service → analytics_views
  ├── /ga4/geo → analytics_sessions (country aggregation)
  ├── /ga4/cta → analytics_events (CTA clicks)
  ├── /analytics/blog/* → analytics_views JOIN blog_posts
  └── /admin/analytics/exclusions → analytics_exclusions (CRUD)
```

---

## Historical Data Quality

Data collected before January 31, 2026 has known quality issues from old Replit-era bugs:

| Metric | Pre-2026 | Post-2026 |
|--------|----------|-----------|
| Sessions | Reliable | Reliable |
| Unique Visitors | Reliable | Reliable |
| Page Views | Unreliable (71 records vs 9K sessions) | Reliable |
| Session Duration | 94% show 0 seconds | Reliable |
| Bounce Rate | Logic was broken | Reliable |
| Video Analytics | Sparse | Full (deduped, progress, completion) |

Use GA4 for pre-2026 historical analysis.

---

## Files Reference

| File | Purpose |
|------|---------|
| `server/routes/analytics.routes.ts` | All analytics + GA4 API endpoints (21 routes) |
| `server/routes/blog-analytics.routes.ts` | Blog-specific analytics (5 routes) |
| `server/routes/admin.routes.ts` | IP exclusion CRUD (4 routes) |
| `server/services/analytics/*.ts` | 7 service modules (GA4, session, events, video, realtime, IP, geo) |
| `client/src/admin/analyticsNew/*.tsx` | 13 dashboard components (tabs, filters, charts) |
| `client/src/config/ga4.config.ts` | GA4 client-side config and event helpers |
| `client/src/analytics/clarity.ts` | Clarity initialization |
| `client/src/analytics/ga.ts` | Advanced GA4 tracking (video, geo, language mismatch) |
| `shared/schema.ts` | Drizzle table definitions (analytics_sessions, analytics_views, analytics_exclusions, etc.) |

---

*Last updated: February 12, 2026*
