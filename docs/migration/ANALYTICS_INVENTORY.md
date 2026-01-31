# Analytics Inventory Analysis

**Generated:** 2026-01-30
**Purpose:** Map all analytics-related code between source (memopyk-website) and target (memopyk-clean) projects.

---

## Part 1: Database Schema (Supabase PostgreSQL)

The following analytics-related tables are defined in `shared/schema.ts`:

### Core Analytics Tables

| Table | Lines | Key Columns |
|-------|-------|-------------|
| `analytics_sessions` | 287-319 | id (uuid), sessionId, userId, ipAddress, userAgent, referrer, language, countryCode, countryName, deviceCategory, screenResolution, timezone, firstSeenAt, lastSeenAt, sessionDuration, pageCount, isBounce, isReturning, country, countryIso2, countryIso3, city, endedAt, duration, pageViews, isBot, isTestData |
| `analytics_views` | 321-345 | id (uuid), viewId, sessionId, videoId, videoTitle, videoType, ctaId, pageUrl, pageTitle, viewTimestamp, timeOnPage, isBounceView, referrer, language, viewDuration, completionPercentage, watchedToEnd, ipAddress, userAgent, isTestData |
| `realtime_visitors` | 347-360 | id (uuid), sessionId, ipAddress, currentPage, userAgent, country, city, isActive, lastSeen, isTestData |
| `performance_metrics` | 362-375 | id (uuid), metricType, metricName, value, unit, sessionId, ipAddress, userAgent, metadata (jsonb), isTestData |
| `engagement_heatmap` | 377-391 | id (uuid), sessionId, pageUrl, elementId, eventType, xPosition, yPosition, viewportWidth, viewportHeight, timestamp, duration, isTestData |
| `conversion_funnel` | 393-401 | id (uuid), sessionId, funnelStep, stepOrder, completedAt, metadata (jsonb) |
| `analytics_exclusions` | 427-435 | id (uuid), ipCidr, label, active, appliesFrom |

### Supporting Tables

| Table | Lines | Purpose |
|-------|-------|---------|
| `country_names` | 417-425 | Localized country name lookup (iso3, displayNameEn, displayNameFr) |
| `blog_post_views` | 631-642 | Blog-specific analytics (postSlug, postTitle, sessionId, ipAddress, timeOnPage) |

---

## Part 2: Stubbed Endpoints in Clean Build

**File:** `server/routes/analytics-legacy.routes.ts` (387 lines)
**Mount point:** `/api/analytics/*`
**Status:** Returns stub/empty data with `{ stub: true, message: "Analytics not yet migrated" }`

### Core Analytics Routes (21 endpoints)

| Method | Path | Stub Response |
|--------|------|---------------|
| GET | `/` | emptyDashboard |
| POST | `/video-view` | `{ success: true }` |
| POST | `/session` | `{ sessionId: "stub-session" }` |
| GET | `/dashboard` | emptyDashboard |
| GET | `/time-series` | `{ labels: [], datasets: [] }` |
| GET | `/settings` | `{ excludedIps: [], timezone: "UTC", retentionDays: 90 }` |
| PUT | `/settings` | emptySettings |
| GET | `/current-ip` | Real IP from headers |
| GET | `/active-ips` | `{ ips: [] }` |
| GET | `/video-engagement` | `{ engagement: [] }` |
| GET | `/unique-views` | `{ count: 0 }` |
| GET | `/re-engagement` | `{ rate: 0 }` |
| GET | `/recent-visitors` | `{ visitors: [], total: 0 }` |
| GET | `/returning-visitors` | `{ visitors: [], total: 0 }` |
| POST | `/exclude-ip` | `{ success: true }` |
| PATCH | `/exclude-ip/:ipAddress/comment` | `{ success: true }` |
| DELETE | `/exclude-ip/:ipAddress` | `{ success: true }` |
| GET | `/exclude-ip` | `{ excluded: [] }` |
| POST | `/reset` | `{ success: true }` |
| POST | `/session-update` | `{ success: true }` |
| POST | `/session-page-view` | `{ success: true }` |

### Location Enrichment Routes (2 endpoints)

| Method | Path | Stub Response |
|--------|------|---------------|
| GET | `/enrich-locations/status` | `{ status: "idle", processed: 0, total: 0 }` |
| POST | `/enrich-locations` | `{ status: "stub — not started" }` |

### Test Data Routes (4 endpoints)

| Method | Path | Stub Response |
|--------|------|---------------|
| GET | `/test-data/status` | `{ hasTestData: false }` |
| POST | `/clear/sessions` | `{ success: true, deleted: 0 }` |
| POST | `/clear/views` | `{ success: true, deleted: 0 }` |
| POST | `/clear/all` | `{ success: true, deleted: 0 }` |

### Legacy Routes (2 endpoints)

| Method | Path | Note |
|--------|------|------|
| POST | `/-session` | Unusual path from source extraction |
| POST | `/-view` | Unusual path from source extraction |

### Blog Analytics Routes (16 endpoints)

| Method | Path | Variant |
|--------|------|---------|
| POST | `/blog/view` | Core |
| GET | `/blog/popular` | Local DB |
| GET | `/blog/trends` | Local DB |
| GET | `/blog/topics` | Local DB |
| GET | `/blog/keywords` | Local DB |
| GET | `/blog/categories` | Local DB |
| GET | `/blog/ga4/popular` | GA4 source |
| GET | `/blog/ga4/trends` | GA4 source |
| GET | `/blog/ga4/topics` | GA4 source |
| GET | `/blog/ga4/keywords` | GA4 source |
| GET | `/blog/ga4/categories` | GA4 source |
| GET | `/blog/unfiltered/popular` | Unfiltered |
| GET | `/blog/unfiltered/trends` | Unfiltered |
| GET | `/blog/unfiltered/topics` | Unfiltered |
| GET | `/blog/unfiltered/keywords` | Unfiltered |
| GET | `/blog/unfiltered/categories` | Unfiltered |

### Advanced Analytics Routes (9 endpoints)

| Method | Path | Stub Response |
|--------|------|---------------|
| GET | `/video-performance` | `{ videos: [] }` |
| GET | `/cta-performance` | `{ ctas: [] }` |
| GET | `/geo` | `{ countries: [], cities: [] }` |
| GET | `/overview` | `{ totalViews: 0, uniqueVisitors: 0, sessions: 0, ... }` |
| GET | `/fresh-video-data` | `{ videos: [] }` |
| GET | `/recent-activity` | `{ activities: [] }` |
| GET | `/live-tracking` | `{ activeUsers: 0, sessions: [] }` |
| GET | `/sessions` | `{ sessions: [], total: 0 }` |
| POST | `/cleanup` | `{ success: true, cleaned: 0 }` |
| GET | `/cleanup/status` | `{ status: "idle", lastRun: null }` |

### Export Routes (3 endpoints)

| Method | Path | Stub Response |
|--------|------|---------------|
| GET | `/export/csv` | CSV file with stub message |
| GET | `/export/pdf` | 503 "PDF export not yet migrated" |
| GET | `/export/sql` | 503 "SQL export not yet migrated" |

### Event & Performance Routes (4 endpoints)

| Method | Path | Stub Response |
|--------|------|---------------|
| POST | `/event` | `{ success: true }` |
| GET | `/performance` | `{ lcp: null, fid: null, cls: null, ... }` |
| POST | `/performance` | `{ success: true }` |
| GET | `/conversions` | `{ conversions: [] }` |

**Total: 58 stubbed endpoints**

---

## Part 3: Source Analytics Files

**Location:** `memopyk-website/server/`

### Core Analytics Services

| File | Lines | Description |
|------|-------|-------------|
| `hybrid-storage.ts` | 8,295 | **Main analytics data layer** - HybridStorage class with 100+ methods for CRUD operations on all tables including analytics |
| `ga4-service.ts` | 1,700 | **GA4 query functions** - BetaAnalyticsDataClient wrapper with 30+ query methods |
| `analytics-db-service.ts` | 341 | Database logging service for analytics events |
| `analytics-service.ts` | 260 | Analytics service wrapper for conversions |
| `analytics-sync.ts` | 310 | Synchronization service for analytics data |
| `location-service.ts` | 257 | IP geolocation with rate limiting and fallbacks |
| `services/location-enrichment.ts` | 257 | EnrichmentManager singleton for batch location enrichment |
| `services/ga4Client.ts` | 224 | GA4 client initialization and helpers |
| `routes/analytics-events.ts` | 202 | Analytics event API routes |

### Supporting Files

| File | Description |
|------|-------------|
| `routes-analytics-cache-cleanup.ts` | Cache cleanup routes |
| `routes/ga4Mp.ts` | GA4 Measurement Protocol routes |
| `routes/ga4Realtime.ts` | GA4 realtime data routes |
| `ga4-scheduler.mjs` | Scheduled GA4 data refresh |
| `ga4-sync-service.js` | GA4 data synchronization |

### Data Files (JSON backups)

| File | Description |
|------|-------------|
| `data/analytics-sessions.json` | Session data backup |
| `data/analytics-sessions-backup.json` | Session data backup (versioned) |
| `data/analytics-sessions-filtered.json` | Filtered session data |
| `data/analytics-settings.json` | Analytics configuration |
| `data/analytics-views.json` | View data backup |
| `data/analytics-sync-state.json` | Sync state tracking |
| `json-storage/analytics-views.json` | Alternative views storage |

### SQL Migrations

| File | Description |
|------|-------------|
| `migrations/analytics_tables.sql` | Analytics table creation DDL |
| `ga4-bigquery-schema.sql` | BigQuery schema for GA4 data |
| `ga4-dashboard-views.sql` | SQL views for dashboard |

---

## Part 4: Key Functions to Rebuild

### From `ga4-service.ts` (30 exported functions)

#### Session & User Queries
```typescript
qAllLocales(start, end)
qSessions(start, end, locale?, country?)
qTotalUsers(start, end, locale?, country?)
qReturningUsers(start, end, locale?, country?)
qUniqueUsers(start, end, locale?, country?)
qAverageSessionDuration(start, end, locale?, country?)
```

#### Video Analytics Queries
```typescript
qPlays(start, end, locale?, country?)
qCompletes(start, end, locale?, country?)
qWatchTimeTotal(start, end, locale?, country?, playsCount?, completesCount?)
qPlaysByVideo(start, end, locale?, country?)
qCompletesByVideo(start, end, locale?, country?)
qActualWatchTimeByVideo(start, end, locale?, country?)
qWatchTimeByVideo(start, end, locale?, country?)
qProgressByVideo(start, end, locale?, country?)
qVideoFunnel(start, end, videoId?, locale?, country?)
getTopVideosTable(start, end, locale?, country?)
```

#### Trend & Aggregation Queries
```typescript
qTrendDaily(start, end, locale?, country?)
qTrend(start, end, locale?, country?)
qSessionsTrend(start, end, locale?, country?)
qSessionsTrendWithComparison(start, end, locale?, country?)
qPageViews(start, end, locale?, country?)
```

#### Reference Data Queries
```typescript
qTopLanguages(start, end)
qTopReferrers(start, end)
qSiteLanguageChoice(start, end)
qTopCountries(start, end)
qAllEvents(start, end)
qRealtime()
```

#### Blog Analytics
```typescript
qBlogPageViews(start, end, locale?)
qBlogViewsByDate(start, end, locale?)
```

### From `hybrid-storage.ts` (HybridStorage class methods)

#### Core Analytics Methods
```typescript
getAnalyticsSessions(dateFrom?, dateTo?, language?, includeProduction?, country?, bypassIpFilter?)
getAnalyticsViews(options?: { dateFrom?, dateTo?, videoId?, session_id? })
getAnalyticsSettings()
createAnalyticsSession(sessionData)
createAnalyticsView(viewData)
updateAnalyticsSettings(settings)
getAnalyticsDashboard(dateFrom?, dateTo?)
```

#### Session Management
```typescript
updateSessionDuration(sessionId, duration)
updateSessionLocation(ipAddress, locationData)
```

#### Video Analytics
```typescript
getVideoEngagementMetrics(videoId?, dateFrom?, dateTo?)
getUniqueVideoViews(dateFrom?, dateTo?)
getVideoReEngagementAnalytics(dateFrom?, dateTo?)
```

#### IP Management
```typescript
getActiveViewerIps()
getIpExclusions()
createIpExclusion(exclusionData)
updateIpExclusion(id, updates)
deleteIpExclusion(id)
```

#### Realtime & Performance
```typescript
getRealtimeVisitors()
updateVisitorActivity(sessionId, currentPage)
createRealtimeVisitor(visitorData)
getPerformanceMetrics(metricType?, timeRange?)
getSystemHealth()
```

#### Blog Analytics
```typescript
createBlogPostView(viewData)
getBlogPostViews(options?: { dateFrom?, dateTo?, postSlug? })
getPopularBlogPosts(dateFrom?, dateTo?, language?)
getBlogViewTrends(dateFrom?, dateTo?, language?)
```

#### Other Analytics
```typescript
getTimeSeriesData(dateFrom?, dateTo?)
getEngagementHeatmap(pageUrl, timeRange?)
getConversionFunnel(timeRange?)
getFunnelAnalytics(timeRange?)
getTestDataStatus()
```

### From `location-service.ts` (LocationService class)

```typescript
class LocationService {
  getLocationData(ip: string): Promise<EnrichedLocationData | null>
  // Uses ipapi.co with fallback to ip-api.com
  // Includes rate limiting (3s delay) and caching (24h TTL)
}
```

### From `services/location-enrichment.ts` (EnrichmentManager class)

```typescript
class EnrichmentManager {
  static getInstance(storage, locationService): EnrichmentManager
  // Singleton pattern for job deduplication
  // Circuit breaker pattern for API protection
  // Batch processing (5 IPs at a time)
}
```

---

## Migration Priority

### High Priority (Required for functional analytics)
1. **hybrid-storage.ts** (8,295 lines) - Core data layer
2. **ga4-service.ts** (1,700 lines) - GA4 queries
3. **location-service.ts** (257 lines) - IP geolocation

### Medium Priority (Enhanced features)
4. **analytics-db-service.ts** (341 lines) - Event logging
5. **analytics-service.ts** (260 lines) - Conversion tracking
6. **services/location-enrichment.ts** (257 lines) - Batch enrichment

### Low Priority (Optional/Legacy)
7. **analytics-sync.ts** (310 lines) - Data sync
8. **ga4-sync-service.js** - GA4 sync
9. **ga4-scheduler.mjs** - Scheduled refresh

---

## Recommended Approach

1. **Extract analytics-specific methods** from `hybrid-storage.ts` into a dedicated `analytics-storage.ts` file (~2,000 lines of the 8,295)

2. **Copy `ga4-service.ts` directly** - Well-isolated, no dependencies on other source files

3. **Copy `location-service.ts` directly** - Only depends on HybridStorage type

4. **Update analytics-legacy.routes.ts** to import and use the migrated services instead of returning stubs

5. **Test each endpoint category** separately:
   - Core analytics (dashboard, sessions)
   - Video analytics
   - Blog analytics
   - Location enrichment
   - Export functions
