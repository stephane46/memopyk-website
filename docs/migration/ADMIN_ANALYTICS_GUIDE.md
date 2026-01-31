# MEMOPYK Admin Analytics Guide

## Overview

MEMOPYK uses a **dual-stream analytics architecture** that combines:
1. **Custom Supabase Analytics** - Real-time, self-hosted tracking stored directly in our database
2. **Google Analytics 4 (GA4)** - Industry-standard tracking with BigQuery export

This hybrid approach provides both immediate real-time data (Supabase) and long-term historical analysis (GA4).

---

## Custom Analytics vs Google Analytics 4

| Feature | Custom Supabase Analytics | Google Analytics 4 |
|---------|---------------------------|-------------------|
| **Data Location** | Supabase PostgreSQL (VPS) | Google BigQuery |
| **Real-time** | Yes, instant | 24-48 hour delay |
| **IP Exclusion** | Full control, immediate | Limited, delayed |
| **Video Tracking** | Granular (duration, completion %) | Event-based only |
| **Data Ownership** | 100% owned | Google-hosted |
| **Session Deduplication** | 30-second window | Google's algorithm |
| **Blog Analytics** | Built-in with language filter | Separate reports |
| **Admin Interface** | Integrated in Admin Dashboard | Separate GA4 UI |
| **Sync** | Automatic 5-minute sync | Daily BigQuery export |

### When to Use Which

- **Custom Analytics**: Day-to-day monitoring, real-time visitor counts, IP exclusion accuracy, video performance
- **GA4**: Long-term trends, audience demographics, Google Ads integration, SEO analysis

---

## Database Tables

### Core Analytics Tables

| Table | Purpose |
|-------|---------|
| `analytics_sessions` | Visitor sessions with country, device, duration |
| `analytics_views` | Page views and video views |
| `realtime_visitors` | Currently active visitors |
| `blog_post_views` | Blog-specific view tracking |
| `ip_exclusions` | IPs to exclude from analytics |

### Key Session Fields
```
session_id       - Unique session identifier
ip_address       - Visitor IP (for exclusion filtering)
user_agent       - Browser/device info
country_code     - ISO country code (e.g., FR, US)
device_category  - desktop, mobile, tablet
session_duration - Time in seconds
page_count       - Pages viewed in session
is_returning     - Whether visitor returned
is_bounce        - Single-page visit
```

### Key View Fields
```
view_id          - Unique view identifier
session_id       - Links to session
video_id         - Video watched (if applicable)
video_type       - "hero" or "gallery"
view_duration    - Watch time in seconds
completion_percentage - % of video watched
watched_to_end   - Boolean flag
```

---

## IP Exclusion System

### Purpose
Exclude internal traffic (developers, team, known bots) from analytics to ensure accurate visitor counts.

### How It Works
1. IP addresses are stored in `ip_exclusions` table with optional comments
2. Every analytics event checks against exclusion list before recording
3. Excluded IPs get the "🟠 IP Filtered" badge in the dashboard
4. Exclusions are **complete** - no partial data leaks

### Managing Exclusions
In Admin Dashboard → Analytics:
- **Add IP**: Enter IP address and optional comment (e.g., "Capdenac home network")
- **Edit**: Update comments for existing exclusions
- **Delete**: Remove exclusion to start tracking that IP

### Known Excluded IPs
| IP | Comment |
|----|---------|
| 109.17.150.48 | Capdenac home network |
| 0.0.0.0 | Local development traffic |

---

## Admin Dashboard Features

### Time Period Filters
Three filter buttons control the date range for all analytics:
- **7d** - Last 7 days
- **30d** - Last 30 days (default)
- **90d** - Last 90 days

Active filter shows **orange highlight**.

### Metrics Displayed

#### Overview Metrics
- **Total Views**: All page/video views
- **Unique Visitors**: Deduplicated by session
- **New vs Returning**: Visitor classification
- **Bounce Rate**: Single-page sessions %
- **Avg. Session Duration**: Time on site

#### Video Analytics
- Views per video
- Watch duration
- Completion percentage
- Hero vs Gallery breakdown

#### Geographic Data
- Country breakdown with flags
- Top countries by visits

#### Blog Analytics
- Post views by language (FR/EN)
- Popular posts ranking
- Time-filtered view counts

---

## GA4 Integration Details

### Configuration
- **Property ID**: 501023254
- **Measurement ID**: Stored in `GA4_MEASUREMENT_ID` secret
- **API Secret**: Stored in `GA4_API_SECRET` secret

### Data Flow
```
User Visit → Frontend tracks event → GA4 Measurement Protocol → BigQuery (daily)
                                  ↓
                           Supabase (instant)
```

### GA4 Sync Service
Located in `server/ga4-sync-service.js`:
- Runs daily at 00:15 Paris time
- Syncs BigQuery data to local cache
- Updates `ga4-analytics-cache.json`

### GA4 vs Custom - Feature Comparison

| Metric | Custom | GA4 |
|--------|--------|-----|
| Page views | ✅ Real-time | ✅ 24h delay |
| Video plays | ✅ Detailed | ✅ Events only |
| Watch duration | ✅ Seconds | ❌ Not tracked |
| Completion % | ✅ Yes | ❌ Not tracked |
| Country | ✅ IP-based | ✅ IP-based |
| Device type | ✅ Yes | ✅ Yes |
| Bounce rate | ✅ Custom logic | ✅ GA algorithm |
| Session duration | ✅ Precise | ✅ Estimated |

---

## API Endpoints

### Custom Analytics
```
GET  /api/analytics/sessions      - All sessions with filters
GET  /api/analytics/views         - Page and video views
GET  /api/analytics/stats         - Aggregated statistics
GET  /api/analytics/realtime      - Current active visitors
POST /api/analytics/event         - Track new event
POST /api/analytics/performance   - Track performance metrics
```

### IP Exclusions
```
GET    /api/ip-exclusions         - List all excluded IPs
POST   /api/ip-exclusions         - Add new exclusion
PATCH  /api/ip-exclusions/:ip     - Update exclusion comment
DELETE /api/ip-exclusions/:ip     - Remove exclusion
```

### GA4 Data
```
GET /api/ga4/kpis                 - Key performance indicators
GET /api/ga4/top-videos           - Top performing videos
GET /api/ga4/countries            - Geographic breakdown
```

---

## Automatic Sync Services

### Analytics Sync (every 5 minutes)
- Syncs sessions from JSON fallback to Supabase
- Updates `data/analytics-sync-state.json`
- Logs sync results to console

### Universal Sync (every 5 minutes)
- Syncs all hybrid storage tables
- Covers 17 tables including analytics
- Updates `data/universal-sync-state.json`

### GA4 Scheduler (daily at 00:15 Paris)
- Fetches previous day's GA4 data from BigQuery
- Updates local cache files
- Logs to `server/ga4-scheduler.mjs`

---

## Troubleshooting

### No data showing in dashboard
1. Check date range filter (try 30d)
2. Verify IP not excluded
3. Check browser console for API errors
4. Ensure Supabase connection is healthy

### IP exclusion not working
1. Verify IP format is correct (e.g., 109.17.150.48)
2. Check if using VPN/proxy
3. Clear browser cache and reload
4. Verify exclusion exists in admin panel

### GA4 data delayed
- Normal: GA4 has 24-48 hour processing delay
- Check `ga4-scheduler.mjs` logs for sync errors
- Verify BigQuery credentials are valid

### Session deduplication
- Sessions within 30 seconds of each other are merged
- This prevents refresh-spam from inflating counts

---

## Files Reference

| File | Purpose |
|------|---------|
| `client/src/components/admin/GA4AnalyticsSection.tsx` | Admin GA4 dashboard component |
| `server/analytics-service.ts` | Backend analytics service |
| `server/analytics-db-service.ts` | Database operations for analytics |
| `server/ga4-sync-service.js` | GA4 to local sync service |
| `server/ga4-scheduler.mjs` | Daily GA4 sync scheduler |
| `server/routes/analytics-events.ts` | Analytics API routes |
| `shared/schema.ts` | Database table definitions |
| `data/analytics-sync-state.json` | Sync state tracking |

---

## Historical Data Quality (Pre-January 31, 2026)

**Important:** Analytics data collected before January 31, 2026 has known quality issues due to bugs in the old Replit `hybrid-storage.ts` system:

| Metric | Status | Notes |
|--------|--------|-------|
| Sessions | ✅ Reliable | 9,018 sessions since Aug 2025 |
| Unique Visitors | ✅ Reliable | Based on IP address |
| Page Views | ❌ Unreliable | Only 71 records vs 9,018 sessions |
| Session Duration | ❌ Unreliable | 94% show 0 seconds |
| Bounce Rate | ❌ Unreliable | Logic was broken |
| Video Analytics | ❌ Unreliable | Sparse data |

**For historical analysis:** Use GA4 for pre-2026 data.

**For current analysis:** The new analytics system (rebuilt Jan 31, 2026) properly tracks all metrics.

---

## Best Practices

1. **Regular IP Exclusion Review**: Add new team members' IPs promptly
2. **Monitor Both Systems**: Use custom for daily, GA4 for monthly reports
3. **Check Sync Status**: Verify sync services running in server logs
4. **Filter by Language**: Use FR/EN filters for accurate regional data
5. **Video Tracking**: Custom analytics gives more granular video data than GA4

---

*Last Updated: January 31, 2026*
