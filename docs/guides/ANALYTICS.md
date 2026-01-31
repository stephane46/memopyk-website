# Analytics System Guide

**Last verified:** January 31, 2026  
**Status:** GA4 active, custom analytics functional

---

## Current Analytics Stack

| Service | Purpose | Status |
|---------|---------|--------|
| **Google Analytics 4** | Primary web analytics | ✅ Active |
| **Microsoft Clarity** | Session recordings, heatmaps | ✅ Active |
| **OpenReplay** | Session replay, debugging | ✅ Active |
| **Custom Analytics** | Video tracking, admin dashboard | ✅ Functional |

---

## Admin Dashboard

Access: `/admin` → Analytics section

### Dashboard Sections

| Section | Data Source | Description |
|---------|-------------|-------------|
| Overview | Custom + GA4 | Visitors, sessions, page views |
| Video Performance | Custom | Play counts, completion rates, engagement |
| Geographic | Custom | Visitor locations, country breakdown |
| Trends | Custom | Traffic over time, patterns |
| Live Visitors | Custom | Real-time active users |

---

## Video Tracking

The custom analytics system tracks video interactions throughout the site.

### Tracked Events

| Event | Trigger | Data Captured |
|-------|---------|---------------|
| `video_play` | User clicks play | videoId, videoType, timestamp |
| `video_pause` | User pauses | videoId, currentTime |
| `video_progress` | 25%, 50%, 75%, 90% | videoId, percentage |
| `video_complete` | Video ends | videoId, watchDuration |

### Video Types

| Type | Location | Purpose |
|------|----------|---------|
| `hero` | Homepage hero section | Showcase videos |
| `gallery` | Gallery section | Portfolio items |

---

## Database Tables

Analytics data is stored across several tables:

| Table | Purpose |
|-------|---------|
| `analytics_sessions` | Session tracking with device/geo data |
| `analytics_views` | Page and video view events |
| `realtime_visitors` | Currently active visitors |
| `performance_metrics` | Page load, video load times |
| `engagement_heatmap` | Click/scroll tracking |
| `conversion_funnel` | Funnel step completion |
| `analytics_exclusions` | IP/visitor filtering rules |
| `blog_post_views` | Blog-specific view tracking |

---

## GA4 Configuration

### Environment Variables

```env
GA4_API_SECRET=your-ga4-secret
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Tracked Events (GA4)

| Event | Category | Description |
|-------|----------|-------------|
| `page_view` | Navigation | All page loads |
| `video_start` | Engagement | Video play initiated |
| `video_complete` | Engagement | Video watched to end |
| `form_submit` | Conversion | Contact form submission |
| `cta_click` | Engagement | CTA button clicks |

---

## Microsoft Clarity

Provides session recordings and heatmaps.

### Configuration

```env
CLARITY_PROJECT_ID=your-clarity-id
```

### Features Used

- Session recordings
- Heatmaps (click, scroll)
- Rage click detection
- Dead click detection

---

## OpenReplay

Session replay for debugging and UX analysis.

### Configuration

```env
OPENREPLAY_PROJECT_KEY=your-project-key
```

---

## IP Exclusions

Filter out internal traffic from analytics.

### Managing Exclusions

Exclusions are stored in `analytics_exclusions` table:

| Column | Type | Description |
|--------|------|-------------|
| `ip_cidr` | TEXT | IP address or CIDR range |
| `label` | TEXT | Human-readable reason |
| `active` | BOOLEAN | Whether exclusion is active |
| `applies_from` | TIMESTAMP | When exclusion takes effect |

### Adding Exclusions

```sql
INSERT INTO analytics_exclusions (ip_cidr, label, active)
VALUES ('192.168.1.0/24', 'Office network', true);
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

---

## Troubleshooting

### No Data Appearing

1. **Check GA4 configuration:**
   ```bash
   echo $GA4_MEASUREMENT_ID
   echo $GA4_API_SECRET
   ```

2. **Verify tracking script loads:**
   - Open browser DevTools → Network
   - Filter by "analytics" or "gtag"
   - Check for successful requests

3. **Check for IP exclusions:**
   ```sql
   SELECT * FROM analytics_exclusions WHERE active = true;
   ```

### Video Events Not Tracking

1. Check browser console for errors
2. Verify video elements have correct data attributes
3. Test in incognito mode (no ad blockers)

### GA4 Data Delayed

GA4 data can be delayed up to 24-48 hours. Check:
- Realtime report in GA4 dashboard for immediate data
- Custom analytics tables for instant data

### Session Not Creating

1. Check session cookie settings
2. Verify `SESSION_SECRET` environment variable is set
3. Check server logs for session errors

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

## Future Enhancements

Planned improvements:

- [ ] A/B testing integration
- [ ] Custom funnel builder
- [ ] Automated reports
- [ ] Cohort analysis
- [ ] Attribution modeling

---

*Last updated: January 31, 2026*
