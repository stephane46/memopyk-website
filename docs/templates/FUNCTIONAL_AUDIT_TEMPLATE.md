# MEMOPYK Functional Audit Template

**Last updated:** 2026-02-19

---

## 1. Purpose & Scope

A **functional audit** verifies that each feature **actually works end-to-end and produces correct data**. It is distinct from:

| Audit Type | Question It Answers |
|------------|-------------------|
| **Code audit** | Does the code look correct? (Static analysis, type checks, code review) |
| **QA flow test** | Does the UI respond correctly when clicked? (Button renders, modal opens) |
| **Functional audit** | Does the feature produce the intended real-world result? (DB row created, email sent, metric accurate) |

A QA test can pass while a functional audit fails. Example: the gallery video play button opens the overlay and the video plays (QA pass), but no row is written to `analytics_views` because a feature flag silently disables tracking (functional fail).

**When to run:** After any deployment that touches analytics, tracking, email, or data pipelines. Quarterly as a baseline health check. After any migration (hosting, database, CDN).

---

## 2. Audit Sections

### 2.1 Analytics Tracking

Verifies that user actions on the public site produce the expected rows in the database.

#### 2.1.1 Session Recording

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| New session created on page visit | Visit staging in incognito, then query `analytics_sessions` | New row with matching IP, `is_bot = false`, `is_test_data = false` |
| Session includes geo data | Check the new row | `country_code`, `country_name`, `city` populated |
| Session includes device data | Check the new row | `user_agent`, `device_category` populated |
| Bot sessions flagged | Visit with HeadlessChrome UA | Row has `is_bot = true` |

**Server endpoint:** `POST /api/analytics/session` (server/routes/analytics.routes.ts)
**DB table:** `analytics_sessions`
**Frontend caller:** `client/src/hooks/useVideoAnalytics.ts` → `trackSession` mutation

#### 2.1.2 Video Play Tracking

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Gallery video click creates view row | Click play button on gallery card, query `analytics_views WHERE video_id IS NOT NULL` | New row with correct `video_id`, `session_id`, `view_timestamp` |
| Hero videos excluded | Let hero video autoplay | No new row in `analytics_views` (hero videos filtered in hook) |
| Completion tracking works | Watch video to end | Row updated: `watched_to_end = true`, `completion_percentage = '100'` |
| Heartbeat updates realtime | Play video for 10+ seconds | Row in `realtime_visitors` with `is_active = true` |

**Server endpoint:** `POST /api/analytics/video-view` (server/routes/analytics.routes.ts)
**Heartbeat endpoint:** `POST /api/tracker/heartbeat` (server/routes/analytics.routes.ts)
**Event recorder:** `server/services/analytics/event-recorder.service.ts` → `recordVideoEvent()`
**DB table:** `analytics_views` (video_id NOT NULL), `realtime_visitors`
**Frontend caller:** `client/src/hooks/useVideoAnalytics.ts` → `trackVideoView`
**Frontend trigger:** `client/src/components/gallery/VideoOverlay.tsx` → `handlePlay()`
**Feature flag:** `VITE_VIDEO_ANALYTICS_ENABLED` — hook at `useVideoAnalytics.ts:6` (`|| true`)

#### 2.1.3 CTA Click Tracking

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| CTA button click creates event | Click a CTA button on the public site, query `analytics_events` | New row with `event_type = 'cta_click'` |
| Event includes session link | Check `session_id` on new row | Non-null, matches an `analytics_sessions` row |
| Bot clicks filtered | CTA click from bot session | Event recorder skips insert (bot session check) |

**Server endpoint:** `POST /api/analytics/event` (server/routes/analytics.routes.ts)
**DB table:** `analytics_events`
**Frontend caller:** CTA button components via fetch

#### 2.1.4 Bot Filtering

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| HeadlessChrome flagged | Query `analytics_sessions WHERE is_bot = true` | Sessions with HeadlessChrome in `user_agent` are flagged |
| Bot sessions excluded from all dashboards | Compare dashboard count vs raw DB count | Dashboard count <= total rows (bot rows excluded) |
| All analytics queries filter bots | Grep for bot filtering pattern in all query files | Every query in `analytics.routes.ts`, `blog-analytics.routes.ts`, `video-analytics.service.ts`, `realtime.service.ts` filters bots |

**Bot detection:** `server/services/analytics/bot-detector.service.ts`
**Pattern to grep:** `is_bot` in WHERE clauses, `NOT EXISTS.*analytics_sessions.*is_bot`

#### 2.1.5 IP Exclusions

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Excluded IPs not in dashboard | Add test IP to `analytics_exclusions`, create session from that IP | Dashboard counts do not include the test session |
| Exclusion list is current | Query `analytics_exclusions WHERE active = true` | Only intentional IPs listed |

**DB table:** `analytics_exclusions`
**Admin UI:** Analytics > Exclusions tab

---

### 2.2 Analytics Dashboard

Verifies that each tab displays correct data matching the underlying DB tables.

#### 2.2.1 Overview Tab

| KPI Card | Data Source | Spot-Check Query |
|----------|-------------|------------------|
| Sessions | `analytics_sessions` | `SELECT count(*) FROM analytics_sessions WHERE is_bot = false AND is_test_data = false AND created_at >= NOW() - INTERVAL '7 days'` |
| Unique Visitors | `analytics_sessions` (distinct IP) | `SELECT count(DISTINCT ip_address) FROM analytics_sessions WHERE is_bot = false AND is_test_data = false AND created_at >= NOW() - INTERVAL '7 days'` |
| Return Visitors | `analytics_sessions` (IPs with >1 session) | `SELECT count(*) FROM (SELECT ip_address FROM analytics_sessions WHERE is_bot = false AND is_test_data = false AND created_at >= NOW() - INTERVAL '7 days' GROUP BY ip_address HAVING count(*) > 1) sub` |

**Component:** `client/src/admin/analyticsNew/AnalyticsNewOverview.tsx`
**Hook:** `client/src/admin/analyticsNew/hooks/useFilteredReports.ts`

#### 2.2.2 Each Tab Spot-Check

For each tab, verify at least one metric against a direct DB query:

| Tab | Component File | Metric to Spot-Check | Table |
|-----|---------------|---------------------|-------|
| Overview | `AnalyticsNewOverview.tsx` | Sessions count | `analytics_sessions` |
| Live View | `AnalyticsNewLive.tsx` | Active users (30 min) | `analytics_sessions WHERE created_at >= NOW() - INTERVAL '30 min'` |
| Trends | `AnalyticsNewTrends.tsx` | Daily sessions chart | `analytics_sessions GROUP BY DATE(created_at)` |
| Video | `AnalyticsNewVideo.tsx` | Total video views | `analytics_views WHERE video_id IS NOT NULL` |
| Geo | `AnalyticsNewGeo.tsx` | Top country | `analytics_sessions GROUP BY country_code ORDER BY count(*) DESC` |
| CTA | `AnalyticsNewCta.tsx` | Click count | `analytics_events WHERE event_type = 'cta_click'` |
| Blog | `AnalyticsNewBlog.tsx` | Popular post | `analytics_views WHERE page_url LIKE '%/blog/%' GROUP BY page_url` |
| Clarity | `AnalyticsNewClarity.tsx` | Clarity embed loads | External iframe renders (no DB check) |
| Diagnostics | `AnalyticsNewFallback.tsx` | GA4 connection status | API responds with data |
| Exclusions | `AnalyticsNewExclusions.tsx` | Exclusion count | `analytics_exclusions WHERE active = true` |

#### 2.2.3 Label Accuracy

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Every KPI label matches its data source | Read the label, trace the data path to the DB query | Label accurately describes what the number measures |
| No field-name aliasing hides meaning | Grep for field remapping in hooks | If `bounceRate` is displayed as "Video Engagement", flag it |

**Known issue (fixed Feb 2026):** Trends tab "Video Engagement" was displaying `bounceRate` from `analytics_sessions`. Verify this is resolved.

**How to trace a data path:**
1. Find the label text in the component TSX
2. Find the variable it renders (e.g., `metrics.completionRate.current`)
3. Trace that variable back through the hook to the API call
4. Find the server endpoint and trace to the SQL query
5. Verify the SQL column matches the UI label

#### 2.2.4 Date Filter

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Changing date range changes numbers | Switch from 7d to 30d | Numbers increase (assuming data exists in both ranges) |
| Custom date range works | Set specific from/to dates, query DB with same range | Numbers match |
| "Today" shows only today | Select Today, compare with `WHERE created_at >= CURRENT_DATE` | Exact match |

---

### 2.3 Blog Hub

5-tab workflow: Keywords -> Planned Posts -> Planner -> Posts -> Image Bank

**Hub component:** `client/src/components/admin/ContentProductionHub.tsx`
**Admin route:** `/admin?tab=blog` (renders ContentProductionHub)

#### 2.3.1 Keywords Tab

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Keyword list loads | Open tab, count items | Count matches `SELECT count(*) FROM content_keywords` |
| Filters work | Apply language filter (FR/EN) | Count changes, matches `WHERE language = 'fr'` |
| Cluster grouping works | View by cluster | Keywords grouped correctly per `cluster` column |

**DB table:** `content_keywords`
**Server route:** `server/routes/content.routes.ts`

#### 2.3.2 Planned Posts Tab (Topics)

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Topics list loads | Open tab | Count matches `SELECT count(*) FROM content_topics` |
| Create topic | Click create, fill form, save | New row in `content_topics` |
| Edit topic | Modify a topic, save | Row updated in DB |
| Delete topic | Delete a topic | Row removed from DB |

**DB table:** `content_topics`
**Server route:** `server/routes/content.routes.ts`

#### 2.3.3 Planner Tab

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Weekly plan loads | Open tab | Renders schedule grid |
| Assign post to day | Drag or select a topic for a day | Row in `content_daily_assignments` |

**DB tables:** `content_weekly_plans`, `content_daily_assignments`
**Server route:** `server/routes/content.routes.ts`

#### 2.3.4 Posts Tab

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Posts list loads | Open tab | Count matches `SELECT count(*) FROM blog_posts` |
| Create new post | Click "New Post", fill title + content, save as draft | New row in `blog_posts` with `status = 'draft'` |
| Publish post | Change status to published, save | Row updated: `status = 'published'`, `published_at` set |
| Delete post | Delete a post | Row removed from `blog_posts` |
| AI Creator fires API | Open AI Assist modal, submit prompt | POST to `/api/generate-content` returns generated text |

**DB table:** `blog_posts`
**Server routes:** `server/routes/blog-admin.routes.ts`, `server/routes/blog.routes.ts`
**AI endpoint:** `POST /api/generate-content` (server/routes/content.routes.ts)

#### 2.3.5 Image Bank Tab

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Images load | Open tab | Thumbnails render, count matches `SELECT count(*) FROM image_bank` |
| Upload image | Upload a test image | New row in `image_bank`, file in Supabase storage |
| Delete image | Delete a test image | Row removed, storage file deleted |

**DB table:** `image_bank`
**Server route:** `server/routes/image-bank.routes.ts`
**Storage:** Supabase Storage CDN

---

### 2.4 Public Website

#### 2.4.1 Contact Form

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Form submits | Fill and submit contact form | Row in `contacts` table, email delivered via Resend |
| Rate limiting works | Submit 4 times from same IP within 1 hour | 4th submission rejected (limit: 3/hr per IP) |
| Honeypot works | Submit with hidden honeypot field filled | Submission silently rejected |

**Server endpoint:** `POST /api/contact` (server/routes/contact.routes.ts)
**DB table:** `contacts`
**Email service:** Resend (`RESEND_API_KEY`)

#### 2.4.2 Gallery Videos

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Video plays | Click play button on gallery card | Video overlay opens, video starts playing |
| Tracking fires | Check network tab for POST to `/api/analytics/video-view` | Request sent with correct `video_id` |
| Close overlay works | Click X button | Overlay closes, page returns to gallery |

**Component:** `client/src/components/gallery/VideoOverlay.tsx`
**Gallery data:** `gallery_items` table

#### 2.4.3 Hero Videos

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Hero video autoplays | Visit homepage | Background video plays automatically |
| Hero rotation works | Wait or click arrow | Next hero video loads |
| No tracking for hero | Check DB | No `analytics_views` rows for VideoHero*.mp4 |

**Component:** Hero section of homepage
**DB table:** `hero_videos`

#### 2.4.4 Partner Map

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Map loads | Navigate to Digitization Directory | Mapbox GL map renders with pins |
| Clustering works | Zoom out | Multiple pins merge into cluster circles |
| Pin click shows details | Click a pin | Partner details popup renders |
| Pin count matches DB | Count visible pins vs DB | Matches `SELECT count(*) FROM partners WHERE is_active = true` |

**Component:** `client/src/components/PartnerMapbox.tsx`
**DB table:** `partners`
**Required env var:** `VITE_MAPBOX_TOKEN`

#### 2.4.5 Blog Public Pages

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Blog list loads | Visit `/fr/blog` or `/en/blog` | Published posts render |
| Blog post page loads | Click a post | Full article renders with correct content |
| Language switch works | Switch language on a blog post | Redirects to correct language version |
| SEO meta tags present | View page source | `og:title`, `og:description`, JSON-LD present |

**Server route:** `server/routes/blog.routes.ts` (public)
**SSR meta injection:** `server/routes/sitemap.routes.ts`, main server file

---

### 2.5 Email Delivery

| Check | Method | Pass Criteria |
|-------|--------|---------------|
| Contact form email delivered | Submit contact form, check inbox | Email received at configured address |
| Resend API key valid | Check server logs for Resend errors | No 401/403 from Resend API |

**Service:** Resend (`RESEND_API_KEY` env var)
**Server route:** `server/routes/contact.routes.ts`

---

### 2.6 Feature Flags & Silent Disablers

Scan for patterns that can silently disable features without any visible error.

#### 2.6.1 Environment Variable Flags

| Variable | File | Current Default | Risk |
|----------|------|----------------|------|
| `VITE_VIDEO_ANALYTICS_ENABLED` | `client/src/hooks/useVideoAnalytics.ts:6` | `\|\| true` (always on) | If changed to `\|\| false`, all video tracking dies silently |
| `VITE_GA_MEASUREMENT_ID` | `client/src/config/ga4.config.ts:32` | Falls back to `G-JLRWHE1HV4` | If removed, GA4 stops collecting |
| `VITE_MAPBOX_TOKEN` | `client/src/components/PartnerMapbox.tsx:5` | `\|\| ''` (empty) | If missing, partner map renders blank |
| `VITE_USE_MOCK` | `AnalyticsNewOverview.tsx:109`, `VisitorFocusedKpis.tsx:1101`, `VideoFunnel.tsx:136`, `TopVideosTable.tsx:110` | Not set (uses real data) | If set to `true`, dashboard shows fake data |
| `VITE_EDITOR_ENGINE` | `client/src/admin/HtmlEditor.tsx:47` | `\|\| 'tinymce'` | Controls blog editor engine |
| `VITE_ADMIN_SECRET` | `client/src/lib/queryClient.ts:6` | `\|\| ''` | If empty on production, admin API calls fail silently |
| `RESEND_API_KEY` | Server env | Required | If missing, contact form submissions save to DB but no email sent |

#### 2.6.2 How to Scan for New Flags

```bash
# Find all VITE_ env references in client code
grep -r "import.meta.env" client/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Find || false patterns (potential silent disablers)
grep -rn "|| false" client/src/ --include="*.ts" --include="*.tsx"

# Find === 'true' patterns (flags that default off when env var missing)
grep -rn "=== ['\"]true['\"]" client/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Find all server-side env references
grep -rn "process.env\." server/ --include="*.ts" | grep -v node_modules
```

#### 2.6.3 Flag Audit Checklist

For each flag found:

| # | Question | Answer |
|---|----------|--------|
| 1 | What feature does this flag control? | |
| 2 | What is the default when the env var is not set? | |
| 3 | Is the env var set in the Coolify deployment? | |
| 4 | Is the env var set in the local `.env`? | |
| 5 | Do any other files define the same flag with a different default? | |
| 6 | If the flag is off, does the feature fail visibly or silently? | |

---

## 3. Verification Methods

### 3.1 Puppeteer (Browser Automation)

Use for: clicking buttons, filling forms, verifying UI responses.

```
Puppeteer MCP tools:
- puppeteer_navigate(url) — load a page
- puppeteer_click(selector) — click an element
- puppeteer_fill(selector, value) — fill an input
- puppeteer_screenshot(name) — capture current state
- puppeteer_evaluate(script) — run JS in browser console
```

**Gallery video test pattern:**
1. `puppeteer_navigate` to staging homepage
2. Click Gallery nav button
3. `puppeteer_click('.w-14.h-14.rounded-full')` — first play button
4. `puppeteer_screenshot` — verify overlay opened
5. Query DB for new `analytics_views` row

### 3.2 Direct DB Query (Postgres MCP)

Use for: verifying rows were created/updated, spot-checking dashboard numbers.

```sql
-- Always filter test data and bots for production counts
WHERE is_test_data = false AND is_bot = false
```

### 3.3 Network Tab / Fetch Intercept

Use for: verifying API calls are actually sent from the browser.

```javascript
// Puppeteer evaluate — intercept fetch calls to a specific endpoint
window.__apiCalls = [];
const origFetch = window.fetch;
window.fetch = function(url, opts) {
  if (typeof url === 'string' && url.includes('TARGET_ENDPOINT')) {
    window.__apiCalls.push({ url, method: opts?.method, body: opts?.body });
  }
  return origFetch.apply(this, arguments);
};
```

Then after the action:
```javascript
JSON.stringify(window.__apiCalls);
```

### 3.4 Server Logs

Use for: verifying server-side processing (event recorded, email sent, AI API called).

Check Coolify container logs for emoji-prefixed log lines:
- `[Session]` — session recording
- `[Video View]` — video tracking
- `[Heartbeat]` — heartbeat processing
- `[Contact]` — contact form submission

---

## 4. DB Spot-Check Queries

Ready-to-run SQL queries to verify each feature has live data.

### Sessions

```sql
-- Sessions recorded today
SELECT count(*) FROM analytics_sessions
WHERE created_at >= CURRENT_DATE AND is_test_data = false AND is_bot = false;

-- Sessions by country (last 7 days)
SELECT country_name, count(*) FROM analytics_sessions
WHERE created_at >= NOW() - INTERVAL '7 days' AND is_test_data = false AND is_bot = false
GROUP BY country_name ORDER BY count(*) DESC LIMIT 10;

-- Bot sessions (last 7 days)
SELECT count(*) FROM analytics_sessions
WHERE created_at >= NOW() - INTERVAL '7 days' AND is_bot = true;
```

### Video Views

```sql
-- Video views in last 30 days
SELECT count(*) FROM analytics_views
WHERE video_id IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days' AND is_test_data = false;

-- Most recent video view (detect tracking gaps)
SELECT video_id, video_title, created_at FROM analytics_views
WHERE video_id IS NOT NULL ORDER BY created_at DESC LIMIT 1;

-- Video views by video (all time)
SELECT video_id, count(*) as views FROM analytics_views
WHERE video_id IS NOT NULL AND is_test_data = false
GROUP BY video_id ORDER BY views DESC;
```

### CTA Events

```sql
-- CTA clicks in last 7 days
SELECT count(*) FROM analytics_events
WHERE event_type = 'cta_click' AND created_at >= NOW() - INTERVAL '7 days';

-- CTA clicks by button (last 30 days)
SELECT event_data->>'buttonId' as button, count(*) FROM analytics_events
WHERE event_type = 'cta_click' AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY button ORDER BY count(*) DESC;
```

### Blog Posts

```sql
-- Published posts count
SELECT count(*) FROM blog_posts WHERE status = 'published';

-- Most recently created/updated posts
SELECT id, title, language, status, updated_at FROM blog_posts
ORDER BY updated_at DESC LIMIT 5;

-- Blog page views (last 30 days)
SELECT count(*) FROM analytics_views
WHERE page_url LIKE '%/blog/%' AND is_test_data = false
AND created_at >= NOW() - INTERVAL '30 days';
```

### Partners

```sql
-- Active partners with coordinates (for map)
SELECT count(*) FROM partners WHERE is_active = true AND latitude IS NOT NULL;
```

### Contact Form

```sql
-- Recent contact submissions
SELECT id, name, email, created_at FROM contacts ORDER BY created_at DESC LIMIT 5;

-- Submissions today
SELECT count(*) FROM contacts WHERE created_at >= CURRENT_DATE;
```

### Content Pipeline

```sql
-- Keywords count by language
SELECT language, count(*) FROM content_keywords GROUP BY language;

-- Topics count
SELECT count(*) FROM content_topics;

-- Weekly plans
SELECT count(*) FROM content_weekly_plans;
```

### IP Exclusions

```sql
-- Active exclusions
SELECT ip_cidr, label FROM analytics_exclusions WHERE active = true;
```

### Feature Health

```sql
-- Last data point per feature (detect silent breakages)
SELECT 'Sessions' as feature, max(created_at) as last_data FROM analytics_sessions WHERE is_test_data = false
UNION ALL
SELECT 'Video Views', max(created_at) FROM analytics_views WHERE video_id IS NOT NULL AND is_test_data = false
UNION ALL
SELECT 'Page Views', max(created_at) FROM analytics_views WHERE video_id IS NULL AND is_test_data = false
UNION ALL
SELECT 'CTA Events', max(created_at) FROM analytics_events WHERE event_type = 'cta_click'
UNION ALL
SELECT 'Contact Submissions', max(created_at) FROM contacts
ORDER BY last_data DESC;
```

---

## 5. Red Flags Checklist

Things that indicate silent breakage. Check every one during an audit.

### Data Gaps

- [ ] A metric shows data on the dashboard but the underlying table has **zero rows in the relevant time range**
- [ ] A feature exists in the UI but has produced **zero DB rows since a specific date** (compare `max(created_at)` with known deploy dates)
- [ ] A tracking feature has a **sudden cliff** in data volume (e.g., 50 views/day drops to 0) without a corresponding traffic change

### Metric Contradictions

- [ ] Two dashboard metrics show **different values for the same concept** (e.g., Trends shows "42% Video Engagement" but Video tab shows "No videos found")
- [ ] A percentage metric is **above 100%** or **negative**
- [ ] A count metric shows data but the **detail view is empty** (aggregation bug)

### Feature Flags

- [ ] A flag defaults to `|| false` with **no env var set** in the deployment environment
- [ ] A hook and a component **define the same flag with different defaults** (one `|| true`, one `|| false`)
- [ ] An env var is set in `.env` (local) but **not in Coolify** (production/staging)
- [ ] `VITE_USE_MOCK === "true"` is set — dashboard shows **fake data**

### Code Patterns

- [ ] An API endpoint exists on the server but **no frontend code calls it**
- [ ] A frontend component sends a POST but **the server endpoint 404s** (missing route)
- [ ] A tracking call is wrapped in `if (FLAG)` but the flag is **always false**
- [ ] A `try/catch` silently returns success on error (`catch { return { success: true } }`) — real failures are hidden

### Deployment

- [ ] `VITE_*` env vars in Coolify **don't match** `.env` or `.env.example`
- [ ] A feature works on staging but **fails on production** (different env vars, different Coolify config)
- [ ] The Coolify build log shows warnings that **didn't exist in the previous deploy**

---

## 6. Audit Log

Fill in after each audit run. Keep this as a permanent record.

### Template Row

| Feature | Status | Last Verified | Finding | Action Taken |
|---------|--------|---------------|---------|-------------|
| _Feature name_ | PASS / FAIL / DEGRADED | _YYYY-MM-DD_ | _What was found_ | _Fix commit or N/A_ |

### Audit Run: ___YYYY-MM-DD___

**Auditor:** ___name___
**Environment:** staging / production
**Commit:** ___hash___

| Feature | Status | Last Verified | Finding | Action Taken |
|---------|--------|---------------|---------|-------------|
| Session recording | | | | |
| Video play tracking | | | | |
| CTA click tracking | | | | |
| Bot filtering | | | | |
| IP exclusions | | | | |
| Overview tab KPIs | | | | |
| Live View tab | | | | |
| Trends tab | | | | |
| Video tab | | | | |
| Geo tab | | | | |
| CTA tab | | | | |
| Blog tab | | | | |
| Clarity tab | | | | |
| Diagnostics tab | | | | |
| Exclusions tab | | | | |
| Label accuracy | | | | |
| Date filter | | | | |
| Keywords tab | | | | |
| Planned Posts tab | | | | |
| Planner tab | | | | |
| Posts tab (CRUD) | | | | |
| AI Creator | | | | |
| Image Bank | | | | |
| Contact form | | | | |
| Gallery videos | | | | |
| Hero videos | | | | |
| Partner map | | | | |
| Blog public pages | | | | |
| Email delivery | | | | |
| Feature flags scan | | | | |
| Data gap check | | | | |

### Summary

- **Total checks:** ___/31___
- **PASS:** ___
- **FAIL:** ___
- **DEGRADED:** ___
- **Critical findings:** ___

---

## Appendix: File Reference

| System | Key Files |
|--------|-----------|
| Analytics routes | `server/routes/analytics.routes.ts` (main), `server/routes/blog-analytics.routes.ts` (blog) |
| Analytics services | `server/services/analytics/event-recorder.service.ts`, `video-analytics.service.ts`, `realtime.service.ts`, `bot-detector.service.ts`, `ip-exclusion.service.ts` |
| Analytics dashboard | `client/src/admin/analyticsNew/AnalyticsNewDashboard.tsx` + per-tab components |
| Analytics hooks | `client/src/admin/analyticsNew/hooks/useFilteredReports.ts` |
| Video tracking | `client/src/hooks/useVideoAnalytics.ts`, `client/src/components/gallery/VideoOverlay.tsx` |
| Blog Hub | `client/src/components/admin/ContentProductionHub.tsx` |
| Blog admin | `server/routes/blog-admin.routes.ts`, `server/routes/content.routes.ts` |
| Blog public | `server/routes/blog.routes.ts` |
| Contact | `server/routes/contact.routes.ts` |
| Partners | `server/routes/partners.routes.ts`, `client/src/components/PartnerMapbox.tsx` |
| Schema | `shared/schema.ts` (35 tables) |
| Env vars | `.env`, `.env.example`, Coolify dashboard |
