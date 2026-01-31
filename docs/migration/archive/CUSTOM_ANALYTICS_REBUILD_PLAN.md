# ARCHIVED - Analytics rebuild completed January 31, 2026

> This document tracked the analytics rebuild work. The rebuild is complete.
> For current analytics documentation, see: `docs/guides/ANALYTICS.md`

---

# Custom Analytics Rebuild Plan

**Created:** January 31, 2026
**Status:** P1-P8 COMPLETE — Analytics rebuild finished
**Approach:** Incremental rebuild, one feature at a time  

---

## Philosophy

> "GA4 does give me enough for now. But there are specific analytics features I absolutely need for business decisions and that is why I run my own system side by side. I'm totally open to doing it step by step. As long as we track the plan, what we do, what works, and add to it. But in the end, I want something similar to what I built, except I need it to work."
> — Stéphane, January 30, 2026

**Guiding Principles:**
1. **Don't fix the mess** — The 8,295-line `hybrid-storage.ts` is too tangled. Extract what we need into clean, focused modules.
2. **One feature at a time** — Each feature gets built, tested, and verified before moving to the next.
3. **Track everything** — Every change logged in this document.
4. **GA4 is the fallback** — If custom analytics isn't ready, GA4 covers basic needs.

---

## Current State

### What Works Now
| Feature | Status | Notes |
|---------|--------|-------|
| GA4 client-side tracking | ✅ Working | Events fire to Google Analytics |
| Frontend analytics calls | ✅ Working | Components make API calls |
| Database tables | ✅ Exist | 7 tables ready in Supabase |

### What's Stubbed (58 Endpoints)
All endpoints in `analytics-legacy.routes.ts` return empty data:
- Sessions/views: `[]`
- Stats: `{ totalViews: 0, uniqueVisitors: 0, ... }`
- Realtime: `{ activeVisitors: 0, ... }`

### Database Schema (Ready to Use)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `analytics_sessions` | session_id, ip_address, country_code, device_category, session_duration, is_bounce | Visitor sessions |
| `analytics_views` | view_id, session_id, video_id, video_type, view_duration, completion_percentage | Page/video views |
| `realtime_visitors` | visitor_id, page_url, last_seen, is_active | Live visitors |
| `performance_metrics` | metric_id, lcp, fid, cls, ttfb | Core Web Vitals |
| `engagement_heatmap` | event_id, x_position, y_position, event_type | Click/scroll tracking |
| `conversion_funnel` | funnel_id, step_name, completed_at | Funnel tracking |
| `analytics_exclusions` | ip_address, reason, created_at | IP blocking |

---

## Priority Matrix

| Priority | Feature | Business Value | Complexity | Dependencies |
|----------|---------|----------------|------------|--------------|
| **P1** | IP Exclusion | Critical — affects ALL data accuracy | Low | None |
| **P2** | Event Recording | Critical — foundation for all tracking | Medium | P1 |
| **P3** | Session Tracking | High — visitor counts, bounce rates | Medium | P2 |
| **P4** | Video Analytics | High — watch time, completion % | Medium | P2, P3 |
| **P5** | Dashboard Stats | High — visual reporting | Low | P3, P4 |
| **P6** | Realtime Visitors | Medium — nice to have | Low | P3 |
| **P7** | GA4 Sync | Low — enhancement only | High | P5 |
| **P8** | Data Validation | Critical — verify numbers match reality | Medium | P1-P6 |

---

## P8: Data Validation Phase (After P1-P6)

**Business Need:** A dashboard that *looks* correct but shows wrong numbers is worse than no dashboard. Before trusting this data for business decisions, we must validate that what we see matches reality.

**The Risk:**
- Counting wrong (duplicates, missing data)
- Calculating wrong (wrong formula for bounce rate, session duration)
- Querying wrong (wrong date filters, wrong joins)
- Not matching reality (what GA4 shows vs what we show)

### Validation Tasks

**1. Cross-Reference with GA4**
- Compare our session count vs GA4 session count for same 7-day period
- Compare our unique visitors vs GA4 users
- Compare our bounce rate vs GA4 bounce rate
- Expected: Numbers should be in same ballpark (±20%), not exact match
- Document any significant discrepancies and why

**2. Manual Database Audit**
- Run raw SQL queries to verify dashboard numbers
- Example checks:
  - Dashboard says "X sessions" → `SELECT COUNT(*) FROM analytics_sessions WHERE date_range`
  - Dashboard says "Y unique visitors" → `SELECT COUNT(DISTINCT ip_address) FROM analytics_sessions`
  - Dashboard says "Z% bounce rate" → Manual calculation from raw data

**3. Document the Formulas**
Create clear documentation of what each metric means IN OUR SYSTEM:

| Metric | Our Definition | GA4 Definition | Notes |
|--------|----------------|----------------|-------|
| Session | 30-min inactivity timeout | Similar | Should match closely |
| Unique Visitor | Distinct IP per period | User ID / Client ID | Will differ |
| Bounce Rate | Sessions with 1 page view / total | Engaged sessions metric | Different formula |
| Session Duration | Last event - first event | Time on page sum | May differ |
| Video Completion | watch_duration / video_length | Event-based | Ours more accurate |

**4. Test with Known Data**
- Visit site from known IP (not excluded)
- Record: time, pages visited, videos watched, duration
- Verify this visit appears correctly in dashboard
- Verify counts increase by 1
- Then add IP to exclusion list
- Visit again — verify this visit is NOT counted

**5. Edge Case Testing**
- What happens with very short sessions (<5 seconds)?
- What happens with very long sessions (>1 hour)?
- What happens with rapid page refreshes?
- What happens with bot traffic (if any gets through)?

### Acceptance Criteria for P8

- [ ] GA4 comparison document created with findings
- [ ] All dashboard metrics verified against raw SQL
- [ ] Formula documentation complete
- [ ] Manual visit test passed
- [ ] IP exclusion test passed
- [ ] Any discrepancies explained or fixed
- [ ] Stéphane confident the numbers are trustworthy

---

## Feature Specifications

### P1: IP Exclusion System

**Business Need:** Exclude Stéphane, developers, and bots from analytics to get accurate visitor counts.

**Endpoints to Implement:**
```
GET    /api/ip-exclusions         → List all excluded IPs
POST   /api/ip-exclusions         → Add new exclusion
PATCH  /api/ip-exclusions/:ip     → Update exclusion comment  
DELETE /api/ip-exclusions/:ip     → Remove exclusion
```

**Database Table:** `analytics_exclusions`
```sql
ip_address  VARCHAR PRIMARY KEY
reason      TEXT
created_at  TIMESTAMP DEFAULT NOW()
```

**Implementation:**
1. Create `server/services/analytics/ip-exclusion.service.ts` (~50 lines)
2. Update `analytics-legacy.routes.ts` to use real service
3. Export `isExcludedIP(ip: string): Promise<boolean>` for use by other services

**Source Reference:** `hybrid-storage.ts` lines containing "exclusion" or "ip_exclus"

**Acceptance Criteria:**
- [ ] Can add IP via admin panel
- [ ] Can remove IP via admin panel
- [ ] `isExcludedIP()` returns true for excluded IPs
- [ ] Dashboard shows "🟠 IP Filtered" badge for excluded traffic

---

### P2: Event Recording

**Business Need:** Record page views and video plays to the database.

**Endpoints to Implement:**
```
POST /api/analytics/event         → Record any analytics event
POST /api/analytics/performance   → Record Core Web Vitals
```

**Implementation:**
1. Create `server/services/analytics/event-recorder.service.ts` (~100 lines)
2. Check IP exclusion before recording
3. Deduplicate events within 30-second window
4. Insert to appropriate table based on event type

**Key Logic:**
```typescript
async function recordEvent(event: AnalyticsEvent): Promise<void> {
  // 1. Check IP exclusion
  if (await isExcludedIP(event.ip)) return;
  
  // 2. Deduplicate (30-second window)
  if (await isDuplicate(event)) return;
  
  // 3. Insert to database
  await db.insert(analyticsViews).values(event);
}
```

**Source Reference:** `analytics-service.ts` (260 lines)

**Acceptance Criteria:**
- [ ] Page view events recorded to `analytics_views`
- [ ] Video play events recorded with duration
- [ ] Excluded IPs not recorded
- [ ] No duplicate events within 30 seconds

---

### P3: Session Tracking

**Business Need:** Group events into sessions, calculate bounce rate, session duration.

**Endpoints to Implement:**
```
GET /api/analytics/sessions       → List sessions with filters
GET /api/analytics/stats          → Aggregated statistics
```

**Implementation:**
1. Create `server/services/analytics/session.service.ts` (~150 lines)
2. Session creation on first event from IP
3. Session update on subsequent events
4. 30-minute timeout = new session

**Key Metrics:**
- Total sessions
- Unique visitors (by IP)
- Bounce rate (single-page sessions)
- Avg session duration
- New vs returning visitors

**Source Reference:** `analytics-db-service.ts` (341 lines)

**Acceptance Criteria:**
- [ ] Sessions created automatically from events
- [ ] Session duration calculated correctly
- [ ] Bounce rate accurate
- [ ] Stats endpoint returns real data

---

### P4: Video Analytics

**Business Need:** Track which videos are watched, for how long, and completion rates.

**Endpoints to Implement:**
```
GET /api/analytics/video-stats    → Video performance metrics
GET /api/analytics/top-videos     → Ranking by views/completion
```

**Key Metrics:**
- Views per video
- Average watch duration
- Completion percentage
- Hero vs Gallery breakdown

**Implementation:**
1. Create `server/services/analytics/video-analytics.service.ts` (~100 lines)
2. Aggregate from `analytics_views` where `video_id IS NOT NULL`
3. Calculate completion % from `view_duration / video_length`

**Source Reference:** Video tracking logic in `hybrid-storage.ts`

**Acceptance Criteria:**
- [ ] Video views counted correctly
- [ ] Watch duration tracked
- [ ] Completion % calculated
- [ ] Hero/Gallery breakdown available

---

### P5: Dashboard Stats

**Business Need:** Display all metrics in admin dashboard.

**Endpoints to Implement:**
```
GET /api/analytics/dashboard      → All dashboard data in one call
```

**Response Structure:**
```typescript
{
  period: "7d" | "30d" | "90d",
  overview: {
    totalViews: number,
    uniqueVisitors: number,
    bounceRate: number,
    avgSessionDuration: number,
    newVsReturning: { new: number, returning: number }
  },
  videos: {
    totalPlays: number,
    avgCompletion: number,
    topVideos: Array<{ id, title, views, completion }>
  },
  geography: {
    countries: Array<{ code, name, visits }>
  },
  timeline: {
    daily: Array<{ date, views, visitors }>
  }
}
```

**Implementation:**
1. Create `server/services/analytics/dashboard.service.ts` (~200 lines)
2. Single endpoint aggregates all stats
3. Support period filter (7d, 30d, 90d)

**Acceptance Criteria:**
- [ ] Dashboard shows real data
- [ ] Period filters work
- [ ] All cards populated
- [ ] No "0" values when data exists

---

### P6: Realtime Visitors

**Business Need:** Show currently active visitors on site.

**Endpoints:**
```
GET /api/analytics/realtime       → Current active visitors
```

**Implementation:**
1. Create `server/services/analytics/realtime.service.ts` (~50 lines)
2. Track via `realtime_visitors` table
3. Consider "active" = last_seen within 5 minutes
4. Cleanup old entries periodically

**Acceptance Criteria:**
- [ ] Shows count of active visitors
- [ ] Updates within 30 seconds
- [ ] Excludes filtered IPs

---

### P7: GA4 Sync (Deferred)

**Business Need:** Sync GA4 BigQuery data to local database for unified reporting.

**Complexity:** High — requires BigQuery credentials, scheduled jobs, data mapping

**Decision:** Defer until P1-P6 complete. GA4 dashboard available separately.

---

## Source File Reference

| Source File | Lines | Extract For |
|-------------|-------|-------------|
| `hybrid-storage.ts` | 8,295 | ~2,000 lines of analytics methods |
| `ga4-service.ts` | 1,700 | P7 only — copy when needed |
| `location-service.ts` | 257 | IP geolocation (P3 enhancement) |
| `analytics-db-service.ts` | 341 | P3 session queries |
| `analytics-service.ts` | 260 | P2 event recording |
| `location-enrichment.ts` | 257 | Country detection |

---

## Implementation Approach

### For Each Priority:

1. **Read source** — Find relevant code in source files
2. **Extract minimal** — Only what's needed, no extra complexity
3. **Write clean** — New file in `server/services/analytics/`
4. **Update routes** — Replace stub with real implementation
5. **Test endpoint** — Verify with curl or browser
6. **Test dashboard** — Verify admin panel shows data
7. **Document** — Update this file with completion status

### File Structure (Target)
```
memopyk-clean/server/services/analytics/
├── ip-exclusion.service.ts      # P1
├── event-recorder.service.ts    # P2
├── session.service.ts           # P3
├── video-analytics.service.ts   # P4
├── dashboard.service.ts         # P5
├── realtime.service.ts          # P6
└── index.ts                     # Re-exports all services
```

---

## Progress Log

### Phase: Planning
| Date | Action | Result |
|------|--------|--------|
| Jan 30 | Created ADMIN_ANALYTICS_GUIDE.md | ✅ Requirements documented (merged into docs/guides/ANALYTICS.md) |
| Jan 31 | Claude Code inventory analysis | ✅ 7 tables, 58 endpoints, source files identified |
| Jan 31 | Created this rebuild plan | ✅ Priorities defined |

### Phase: P1 - IP Exclusion ✅ COMPLETE
| Date | Action | Result |
|------|--------|--------|
| Jan 31 | Created ip-exclusion.service.ts | 109 lines, CIDR support |
| Jan 31 | Updated analytics-legacy.routes.ts | 4 endpoints implemented |
| Jan 31 | Tested all CRUD operations | All passing |
| Jan 31 | Committed | `6f39c6f` |

### Phase: P2 - Event Recording ✅ COMPLETE
| Date | Action | Result |
|------|--------|--------|
| Jan 31 | Created event-recorder.service.ts | 267 lines, IP check + dedup |
| Jan 31 | Updated analytics-legacy.routes.ts | 2 endpoints implemented |
| Jan 31 | Tested page view + video events | All passing |
| Jan 31 | Tested IP exclusion integration | Working |
| Jan 31 | Tested deduplication | Working |
| Jan 31 | Note: performance_metrics table missing | Deferred |
| Jan 31 | Committed | `3bcb6fd` |

### Phase: P3 - Session Tracking ✅ COMPLETE
| Date | Action | Result |
|------|--------|--------|
| Jan 31 | Created session.service.ts | 320 lines, 30-min timeout, cache |
| Jan 31 | Updated event-recorder.service.ts | Links views to sessions |
| Jan 31 | Updated analytics-legacy.routes.ts | 2 endpoints implemented |
| Jan 31 | Tested session creation/reuse | Working |
| Jan 31 | Tested stats aggregation | 91 sessions (7d), stats correct |
| Jan 31 | Committed (with dashboard endpoints) | `2cf575b` |

### Phase: P4 - Video Analytics ✅ COMPLETE
| Date | Action | Result |
|------|--------|--------|
| Jan 31 | Created video-analytics.service.ts | 290 lines |
| Jan 31 | Added /api/ga4/top-videos, /videos, /funnel | Working |
| Jan 31 | Added unified /api/ga4/report endpoint | Routes by report type |
| Jan 31 | Tested Video tab on staging | Data loads ✅ |
| Jan 31 | Committed | `1d5ab90`, `52e257b` |

### Phase: P5 - Dashboard Stats ✅ COMPLETE
| Date | Action | Result |
|------|--------|--------|
| Jan 31 | Added /api/ga4/trend endpoint | analytics.routes.ts, daily aggregates |
| Jan 31 | Fixed Trends tab loading error | Returns dailyData + periodAggregates |
| Jan 31 | Tested with 322 sessions in January | Working, 31 days of data |
| Jan 31 | Added /api/ga4/geo endpoint | Real data from analytics_sessions |
| Jan 31 | Added /api/ga4/cta endpoint | Stub (CTA tracking not implemented) |
| Jan 31 | Added /api/tracker/currently-watching | Stub (awaiting P6) |
| Jan 31 | Fixed 16 blog/visitor endpoints | Return arrays not objects |
| Jan 31 | Committed | `ad446ec`, `fb753e1` |

**All Dashboard Tabs Status:**
| Tab | Status | Data Source |
|-----|--------|-------------|
| Overview | ✅ | Real (KPIs, sessions) |
| Live View | ✅ | Stub (awaiting P6) |
| Trends | ✅ | Real (analytics_sessions) |
| Video | ✅ | Real (analytics_views) |
| Geo | ✅ | Real (analytics_sessions) |
| CTA | ✅ | Stub |
| Blog | ✅ | Stub |
| Clarity | ✅ | Placeholder |
| Fallback | ✅ | Placeholder |
| Exclusions | ✅ | Real (analytics_exclusions) |

### Phase: P6 - Realtime Visitors ✅ COMPLETE
| Date | Action | Result |
|------|--------|--------|
| Jan 31 | Created realtime.service.ts | 270 lines |
| Jan 31 | getLiveTracking() | Active users by country/device |
| Jan 31 | getRecentVisitors() | Visitor list with location |
| Jan 31 | getCurrentlyWatching() | Active video sessions |
| Jan 31 | Updated 3 endpoints | Real data, IP exclusion applied |
| Jan 31 | Tested Live View tab | Working ✅ |
| Jan 31 | Committed | `68f5f9a` |
| | | |

### Phase: P7 - GA4 Comparison ✅ COMPLETE (Documented)
| Date | Action | Result |
|------|--------|--------|
| Jan 31 | Queried custom analytics for Jan 22-28 | 37 sessions, 31 visitors |
| Jan 31 | Found data quality issues | See findings below |
| Jan 31 | Decision: Compare after production cutover | Old data unreliable |

**P7 Findings: Old System Had Broken Tracking**

| Table | Records | Issue |
|-------|---------|-------|
| analytics_sessions | 9,018 | ✅ Sessions recorded correctly |
| analytics_views | 71 | ❌ Only 0.8% of sessions have views |

| Metric | Distribution | Status |
|--------|--------------|--------|
| Session Duration | 94% are 0 sec | ❌ Not tracked |
| Bounce Rate | 82% true but data unreliable | ❌ Logic broken |
| Page Count | Most = 1 | ❌ Not updated |

**Root Cause:** The old Replit `hybrid-storage.ts` system:
- Created sessions but didn't record page views to `analytics_views`
- Never updated `session_duration` after session start
- Set `is_bounce` inconsistently

**Conclusion:** 
- GA4 comparison with old data is meaningless
- New P1-P6 services fix all these issues
- Compare GA4 vs MEMOPYK after 48+ hours of production traffic on new system

**Metrics safe to compare (old data):** Sessions, Unique Visitors only
**Metrics NOT reliable (old data):** Page views, bounce rate, session duration, video analytics

### Phase: P8 - Data Validation ✅ COMPLETE
| Date | Action | Result |
|------|--------|--------|
| Jan 31 | Ran internal consistency check | SQL vs Dashboard comparison |
| Jan 31 | Found: Stats endpoints match raw SQL | ✅ 91 sessions, 22 visitors |
| Jan 31 | Found: Video analytics match | ✅ 0 views (correct) |
| Jan 31 | Found: IP exclusion gap | ⚠️ Stats/KPIs didn't filter excluded IPs |
| Jan 31 | Fixed: Added IP exclusion to all endpoints | session.service.ts, analytics.routes.ts |
| Jan 31 | Added 0.0.0.0/32 exclusion | Local dev traffic (66 sessions) |
| Jan 31 | Committed | `2bc7fa8` |
| | | |

---

## Estimated Effort

| Priority | Feature | Estimated Time | Cumulative |
|----------|---------|----------------|------------|
| P1 | IP Exclusion | 1-2 hours | 2 hours |
| P2 | Event Recording | 2-3 hours | 5 hours |
| P3 | Session Tracking | 3-4 hours | 9 hours |
| P4 | Video Analytics | 2-3 hours | 12 hours |
| P5 | Dashboard Stats | 2-3 hours | 15 hours |
| P6 | Realtime Visitors | 1-2 hours | 17 hours |
| P7 | GA4 Sync | 4-6 hours | 23 hours |
| P8 | Data Validation | 2-4 hours | 27 hours |

**Total (P1-P6):** ~15-17 hours of focused work  
**Total (P1-P8):** ~25-27 hours including validation  
**Total (all with GA4 sync):** ~30 hours

---

## Notes

- **Don't block production cutover** — Analytics rebuild happens AFTER cutover
- **GA4 covers basics** — Custom analytics is enhancement, not requirement
- **Test with real traffic** — Best testing is on production after cutover
- **Iterate based on need** — If P1-P3 covers 80% of needs, defer P4-P7

---

*Last Updated: January 31, 2026*
