# Analytics System Guide

**Last verified:** January 31, 2026
**Status:** GA4 active, custom analytics functional (P1-P8 rebuild complete)

---

## Overview

MEMOPYK uses a **dual-stream analytics architecture**:

| Service | Purpose | Data Location | Latency |
|---------|---------|---------------|---------|
| **Custom Supabase** | Video tracking, admin dashboard, IP exclusion | VPS PostgreSQL | Real-time |
| **Google Analytics 4** | Long-term trends, audience demographics, SEO | Google BigQuery | 24-48h delay |
| **Microsoft Clarity** | Session recordings, heatmaps, rage clicks | Microsoft cloud | Real-time |
| **OpenReplay** | Session replay, debugging | Self-hosted option | Real-time |

### When to Use Which

- **Custom Analytics**: Day-to-day monitoring, real-time visitors, video performance, IP exclusion accuracy
- **GA4**: Long-term trends, audience demographics, Google Ads integration, monthly reports
- **Clarity/OpenReplay**: UX debugging, identifying friction points

---

## Database Tables

Analytics data is stored in 8 Supabase tables:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `analytics_sessions` | Visitor sessions | session_id, ip_address, country_code, device_category, session_duration, is_bounce, is_returning |
| `analytics_views` | Page/video views | view_id, session_id, video_id, video_type, completion_percentage, watched_to_end |
| `realtime_visitors` | Currently active | session_id, current_page, last_seen, is_active |
| `performance_metrics` | Page/video load times | metric_type, metric_name, value, unit |
| `engagement_heatmap` | Click/scroll tracking | page_url, element_id, event_type, x_position, y_position |
| `conversion_funnel` | Funnel step completion | funnel_step, step_order, completed_at |
| `analytics_exclusions` | IP filtering rules | ip_cidr, label, active, applies_from |
| `blog_post_views` | Blog-specific tracking | post_slug, session_id, time_on_page |

**Note:** Legacy tables `analytics_events` (8,512 rows) and `analytics_conversions` (10 rows) exist in database but are NOT in schema.ts — these are from old Replit system and should eventually be dropped.

---

## Custom vs GA4 Comparison

| Feature | Custom Supabase | Google Analytics 4 |
|---------|-----------------|-------------------|
| Data ownership | 100% owned | Google-hosted |
| Real-time | Yes, instant | 24-48 hour delay |
| IP exclusion | Full control, immediate | Limited, delayed |
| Video watch duration | ✅ Seconds precision | ❌ Not tracked |
| Video completion % | ✅ Yes | ❌ Not tracked |
| Session deduplication | 30-second window | Google's algorithm |
| Admin interface | Integrated in /admin | Separate GA4 UI |

---

## Admin Dashboard

**Access:** `/admin` → Analytics section

### Time Period Filters
- **7d** / **30d** (default) / **90d**
- Active filter shows orange highlight

### Dashboard Sections

| Section | Data Source | Metrics |
|---------|-------------|---------|
| Overview | Custom + GA4 | Total views, unique visitors, new vs returning, bounce rate, avg session duration |
| Video Performance | Custom | Views per video, watch duration, completion %, hero vs gallery breakdown |
| Geographic | Custom | Country breakdown with flags, top countries |
| Trends | Custom | Traffic over time, patterns |
| Live Visitors | Custom | Real-time active users |
| Blog Analytics | Custom | Post views by language (FR/EN), popular posts |

---

## Video Tracking

### Tracked Events

| Event | Trigger | Data Captured |
|-------|---------|---------------|
| `video_play` | User clicks play | videoId, videoType, timestamp |
| `video_pause` | User pauses | videoId, currentTime |
| `video_progress` | 25%, 50%, 75%, 90% | videoId, percentage |
| `video_complete` | Video ends | videoId, watchDuration |

### Video Types

| Type | Location |
|------|----------|
| `hero` | Homepage hero section |
| `gallery` | Gallery section portfolio items |

---

## IP Exclusion System

Exclude internal traffic (developers, team, bots) from analytics.

### How It Works
1. IP addresses stored in `analytics_exclusions` table
2. Every analytics event checks against exclusion list before recording
3. Excluded IPs get "🟠 IP Filtered" badge in dashboard
4. Exclusions are complete — no partial data leaks

### Managing Exclusions (Admin Dashboard)
- **Add IP**: Enter IP address and optional comment
- **Edit**: Update comments for existing exclusions
- **Delete**: Remove exclusion to start tracking that IP

### Current Exclusions

| IP | Label |
|----|-------|
| 109.17.150.48 | Capdenac home network |
| 0.0.0.0 | Local development traffic |

### SQL Example
```sql
-- Add exclusion
INSERT INTO analytics_exclusions (ip_cidr, label, active)
VALUES ('192.168.1.0/24', 'Office network', true);

-- View active exclusions
SELECT * FROM analytics_exclusions WHERE active = true;
```

---

## API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/track` | POST | Track page view/event |
| `/api/analytics/video-event` | POST | Track video interaction |

### Admin Endpoints (authenticated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/overview` | GET | Dashboard overview stats |
| `/api/analytics/sessions` | GET | Session list |
| `/api/analytics/video-stats` | GET | Video performance data |
| `/api/analytics/geographic` | GET | Geographic breakdown |
| `/api/analytics/realtime` | GET | Current active visitors |
| `/api/analytics/trends` | GET | Traffic trends |

### IP Exclusions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ip-exclusions` | GET | List all excluded IPs |
| `/api/ip-exclusions` | POST | Add new exclusion |
| `/api/ip-exclusions/:ip` | PATCH | Update exclusion comment |
| `/api/ip-exclusions/:ip` | DELETE | Remove exclusion |

### GA4 Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ga4/kpis` | GET | Key performance indicators |
| `/api/ga4/top-videos` | GET | Top performing videos |
| `/api/ga4/countries` | GET | Geographic breakdown |

---

## Configuration

### Environment Variables
```env
# GA4
GA4_API_SECRET=your-ga4-secret
GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# Microsoft Clarity
CLARITY_PROJECT_ID=your-clarity-id

# OpenReplay (optional)
OPENREPLAY_PROJECT_KEY=your-project-key
```

### GA4 Property
- **Property ID**: 501023254
- **Measurement ID**: Stored in `GA4_MEASUREMENT_ID` secret

---

## Data Retention

| Data Type | Retention | Notes |
|-----------|-----------|-------|
| Sessions | 90 days | Auto-cleanup recommended |
| Video events | 90 days | Aggregated stats preserved |
| Realtime visitors | 24 hours | Short-lived by design |
| Performance metrics | 30 days | Sampled for trends |

### Cleanup Query
```sql
-- Remove old sessions
DELETE FROM analytics_sessions
WHERE created_at < NOW() - INTERVAL '90 days';

-- Remove old video views
DELETE FROM analytics_views
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Historical Data Quality

**Important:** Analytics data collected before January 31, 2026 has known quality issues from old Replit `hybrid-storage.ts` bugs:

| Metric | Pre-2026 Status | Notes |
|--------|-----------------|-------|
| Sessions | ✅ Reliable | 9,018 sessions since Aug 2025 |
| Unique Visitors | ✅ Reliable | Based on IP address |
| Page Views | ❌ Unreliable | Only 71 records vs 9,018 sessions |
| Session Duration | ❌ Unreliable | 94% show 0 seconds |
| Bounce Rate | ❌ Unreliable | Logic was broken |
| Video Analytics | ❌ Unreliable | Sparse data |

**Recommendation:** Use GA4 for pre-2026 historical analysis. New system (rebuilt Jan 31, 2026) properly tracks all metrics.

---

## Troubleshooting

### No Data in Dashboard
1. Check date range filter (try 30d)
2. Verify your IP is not excluded
3. Check browser console for API errors
4. Verify Supabase connection is healthy

### IP Exclusion Not Working
1. Verify IP format (e.g., `109.17.150.48`)
2. Check if using VPN/proxy
3. Clear browser cache and reload
4. Verify exclusion exists in admin panel

### Video Events Not Tracking
1. Check browser console for errors
2. Verify video elements have correct data attributes
3. Test in incognito mode (no ad blockers)

### GA4 Data Delayed
- Normal: GA4 has 24-48 hour processing delay
- Check Realtime report in GA4 dashboard for immediate data
- Custom analytics provides instant data

---

## Files Reference

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Database table definitions |
| `server/routes/analytics.routes.ts` | Analytics API routes |
| `server/services/analytics/` | Analytics service modules |
| `client/src/admin/analyticsNew/AnalyticsNewDashboard.tsx` | Admin analytics dashboard |
| `client/src/admin/analyticsNew/AnalyticsNewOverview.tsx` | Overview tab component |

---

*Last updated: January 31, 2026*
