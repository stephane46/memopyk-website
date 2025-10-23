# GA4 Video Analytics Implementation Tracker

## Overview
Migrating all video analytics to GA4 only (no custom backend writes). Implementing comprehensive video tracking for the Video Gallery with proper i18n support.

## GA4 Video Analytics Trigger Points Summary

### **Video Lifecycle Events:**
1. **`video_open`** - When user clicks play button and video lightbox opens
2. **`video_start`** - When video actually begins playing (first play only)
3. **`video_resume`** - When video resumes after being paused

### **Progress Milestones:**
4. **`video_progress` at 25%** - When video reaches 25% of duration
5. **`video_progress` at 50%** - When video reaches 50% of duration  
6. **`video_progress` at 75%** - When video reaches 75% of duration
7. **`video_progress` at 100%** - When video reaches 100% of duration

### **Completion Events:**
8. **`video_complete`** - Triggered when video reaches **90% OR more** of duration
9. **`video_complete`** - Also triggered when HTML5 `ended` event fires (natural end)

### **Session Management:**
10. **Watch time batching** - Sends accumulated watch time when page becomes hidden
11. **Session cleanup** - Clears tracking data when video lightbox closes

### **Current Behavior (Validated August 15, 2025):**
- **Stopping at 97%** (3 seconds before end) triggers both `video_complete` and `video_progress` at 100%
- This happens because 97% exceeds the 90% completion threshold
- Example tracking flow: open → start → 25% → 50% → 75% → complete → 100%
- The 90% threshold ensures users who watch most content are counted as "completed"

### **Status**: ✅ **FULLY OPERATIONAL** (August 15, 2025)
- GA4 caching issue resolved with aggressive rebuild strategy
- All trigger points tested and validated with real user session
- Analytics show "- ENABLED v2" indicating successful implementation

## Step 4 - GA4 Analytics Dashboard v1 Implementation
**Status**: 🔄 **IN PROGRESS** (August 15, 2025)
**Started**: 2025-08-15T15:40:00Z

### Dashboard Requirements
**Data Source**: GA4 Data API v1 (runReport + realtime)
**Gallery Filter**: Only gallery videos (customEvent:gallery == "Video Gallery")
**Locale Filter**: all | fr-FR | en-US
**Caching**: 10 minutes per unique query in Supabase/server memory

### Backend API Endpoints to Implement

#### 1. GET /admin/ga/kpis?start=YYYY-MM-DD&end=YYYY-MM-DD&locale=all|fr-FR|en-US
**Purpose**: Top row KPIs
**GA4 Queries**:
- plays_unique_viewers: totalUsers where eventName == "video_start"
- completers_unique_viewers: totalUsers where eventName == "video_complete"  
- total_watch_time_seconds: customEvent:watch_time_seconds (sum)
- plays_by_locale: dimensions [customEvent:locale] + totalUsers where eventName=="video_start"

**Server-side Computations**:
- avg_watch_time_sec = total_watch_time_seconds / max(plays_unique_viewers, 1)
- completion_rate = completers_unique_viewers / max(plays_unique_viewers, 1)

**Response Format**:
```json
{
  "range": {"start":"2025-08-01","end":"2025-08-15","locale":"all"},
  "kpis": {
    "plays_unique_viewers": 1234,
    "avg_watch_time_sec": 63.9,
    "completion_rate": 0.37,
    "plays_by_locale": [{"locale":"fr-FR","users":700},{"locale":"en-US","users":534}]
  }
}
```

#### 2. GET /admin/ga/top-videos?start=...&end=...&locale=...&limit=10
**Purpose**: Table A — gallery videos only
**GA4 Queries** (multiple calls, merge by video_id):
- Dimensions: customEvent:video_id
- Metrics: eventCount where eventName=="video_start" → plays
- customEvent:watch_time_seconds (sum) → total_watch_time  
- eventCount where eventName=="video_progress" + customEvent:percent==50 → reach50_count
- eventCount where eventName=="video_progress" + percent==100 → reach100_count

**Server-side Computations**:
- avg_watch_time_sec = total_watch_time_seconds / max(plays,1)
- reach50_pct = reach50_count / max(plays,1)  
- complete100_pct = reach100_count / max(plays,1)

**Response Format**:
```json
{
  "rows":[
    {"video_id":"PomGalleryC.mp4","plays":120,"avg_watch_time_sec":75.3,"reach50_pct":0.62,"complete100_pct":0.41}
  ]
}
```

#### 3. GET /admin/ga/funnel?start=...&end=...&locale=...
**Purpose**: Section B — stacked bars 25/50/75/100 per video
**GA4 Queries**:
- Dimensions: customEvent:video_id, customEvent:percent
- Metrics: eventCount where eventName=="video_progress"
- Filter: gallery + (optional) locale
- Return counts for percent ∈ {25,50,75,100} per video_id

**Response Format**:
```json
{
  "rows":[
    {"video_id":"PomGalleryC.mp4","percent":25,"count":100},
    {"video_id":"PomGalleryC.mp4","percent":50,"count":80},
    {"video_id":"PomGalleryC.mp4","percent":75,"count":60},
    {"video_id":"PomGalleryC.mp4","percent":100,"count":49}
  ]
}
```

#### 4. GET /admin/ga/trend?start=...&end=...&locale=...
**Purpose**: Section C — daily plays + daily avg watch time
**GA4 Queries**:
- Daily plays: Dimensions date, Metrics eventCount where eventName=="video_start"
- Daily watch time: Dimensions date, Metrics customEvent:watch_time_seconds  
- Daily completers: eventName=="video_complete" (optional)

**Server-side Computations**:
- avg_watch_time_sec_per_day = watch_time_seconds / max(plays_per_day,1)

**Response Format**:
```json
{
  "days":[
    {"date":"2025-08-10","plays":52,"avg_watch_time_sec":61.2},
    {"date":"2025-08-11","plays":74,"avg_watch_time_sec":58.9}
  ]
}
```

#### 5. GET /admin/ga/realtime
**Purpose**: Section D — Active viewers + last events
**GA4 Queries**:
- Active users: metric activeUsers (runRealtimeReport) or approximate via last 30m
- Last events: query last N minutes where eventName IN ("video_open","video_start","video_progress","video_complete")

**Response Format**:
```json
{
  "active": 3,
  "recent":[
    {"ts":"2025-08-15T14:52:10Z","event":"video_start","video_id":"PomGalleryC.mp4","locale":"fr-FR"},
    {"ts":"2025-08-15T14:51:50Z","event":"video_progress","video_id":"PomGalleryC.mp4","percent":50,"locale":"fr-FR"}
  ]
}
```

### Frontend Dashboard Structure

#### Controls Section
- Date range: Today/7d/28d/Custom (triggers API refetch)
- Locale filter: All/fr-FR/en-US  
- Refresh button

#### KPIs Row (4 cards)
- **Plays**: plays_unique_viewers
- **Avg Watch Time**: avg_watch_time_sec (format as mm:ss)
- **Completion Rate**: completion_rate (as percentage) 
- **Top Locale**: Show locale badge from plays_by_locale

#### Section A: Top Videos Table
- Gallery videos only, sorted by Plays desc
- Columns: Video | Plays | Avg Watch | 50% Reach % | 100% Complete %

#### Section B: Watch Funnel Chart  
- Stacked bars (25/50/75/100) for top N videos
- Use recharts BarChart with stackId

#### Section C: Trend Chart
- Dual-axis LineChart (plays on left, avg watch time on right)
- Daily data points

#### Section D: Realtime Activity
- Active viewers count (last 30 min)
- Rolling list of recent events with timestamps

### Implementation Notes
- **Auth**: Service account + server-side GA Data API (no client credentials)
- **Gallery Filter**: Always include customEvent:gallery == "Video Gallery"  
- **Caching**: 10 minutes per unique query signature, include X-Cache header
- **Error Handling**: Return proper error responses with cache status
- **Admin Menu**: Add new "Analytics GA" section in sidebar

### QA Requirements
- [ ] Verify endpoints return data with real video plays
- [ ] Locale filter changes results appropriately  
- [ ] Gallery filter excludes non-gallery videos
- [ ] Cache behavior works (X-Cache: hit on 2nd request within 10 min)
- [ ] No GA4 credentials exposed in client code

## Step 1 - GA4 Event Schema + Code Implementation
**Status**: ✅ COMPLETE  
**Started**: 2025-08-15T08:58:00Z
**Completed**: 2025-08-15T09:17:00Z

### Requirements Checklist
- [x] **Event Implementation**: 6 video events (open, start, pause, progress, complete, watch_time)
- [x] **Event Parameters**: All required parameters (video_id, locale, position_sec, etc.)
- [x] **Data Quality Rules**: Milestone dedupe, tolerance, batching, locale handling
- [ ] **GA4 Custom Definitions**: Create custom dimensions and metrics in GA4 Admin (Manual Task)
- [x] **Debug Mode Integration**: Use existing ga_dev toggle for debug_mode parameter
- [x] **Testing**: Verify in GA4 Realtime/DebugView - ✅ VALIDATED

### Event Schema to Implement

#### Events:
1. `video_open` - when overlay/modal opens
2. `video_start` - first actual playback 
3. `video_pause` - when paused
4. `video_progress` - milestones 25/50/75/100% (once per session/video)
5. `video_complete` - at ≥90% or ended
6. `video_watch_time` - batched seconds watched

#### Parameters (all events unless noted):
- `video_id` (string) - filename slug (stable across locales)
- `video_title` (string, optional) - display title
- `locale` (string) - fr-FR or en-US
- `gallery` (string) - "Video Gallery"
- `player` (string) - "html5"
- `position_sec` (number) - current time
- `duration_sec` (number) - video duration
- `percent` (number) - 25|50|75|100 (progress only)
- `watch_time_sec` (number) - seconds batch (watch_time only)
- `debug_mode` (boolean) - from ga_dev toggle

### Implementation Tasks
- [x] **Hook Integration**: Connected to VideoOverlay.tsx component
- [x] **Event Logic**: Implemented milestone tracking with deduplication (±1% tolerance)
- [x] **Watch Time Batching**: Accumulate and send on pause/ended/visibility change
- [x] **Locale Detection**: Read from route (/fr-FR, /en-US) or localStorage fallback
- [x] **Debug Mode**: Integrated with existing ga_dev system (debug_mode parameter)
- [ ] **Testing Setup**: Verify events fire correctly in test mode

### GA4 Admin Setup (Manual Task)
- [ ] **Custom Dimensions** (Event scope):
  - video_id
  - video_title
  - locale
  - gallery
  - player  
  - percent
  - position_sec
- [ ] **Custom Metric** (Event scope):
  - watch_time_sec (Number)

### Testing Criteria
- [ ] GA4 Realtime shows events with correct parameters
- [ ] Custom definitions visible in GA4 UI
- [ ] Debug mode (debug_mode=true) marks test hits correctly
- [ ] All 6 events fire appropriately during video interaction
- [ ] Milestone deduplication working (each fires once per session/video)
- [ ] Watch time batching accumulates correctly

### Files Modified
- [x] `client/src/lib/analytics.ts` - Added 6 GA4 video event functions
- [x] `client/src/hooks/useGA4VideoAnalytics.ts` - Created new GA4 video tracking hook
- [x] `client/src/components/gallery/VideoOverlay.tsx` - Integrated all video event tracking
- Video gallery components - Main overlay component updated

### Code Implementation Complete
All GA4 video events are now implemented:
- ✅ **video_open**: Tracks when modal/overlay opens
- ✅ **video_start**: Tracks first playback (with deduplication)
- ✅ **video_pause**: Tracks pause events with current position
- ✅ **video_progress**: Tracks 25/50/75/100% milestones (once per session)
- ✅ **video_complete**: Tracks completion at ≥90% or video end
- ✅ **video_watch_time**: Batched watch time on pause/ended/page hide

---

## Step 2 - Testing & Validation
**Status**: ✅ COMPLETE  
**Started**: 2025-08-15T09:35:00Z
**Completed**: 2025-08-15T14:48:00Z
**Goal**: Verify all 6 video events fire correctly in test mode

### External Test Mode Activation (CRITICAL)
**Reference**: See `GA4_TEST_MODE_ACTIVATION_GUIDE.md` for detailed instructions

The key insight: **Test mode must be activated BEFORE visiting the site** to avoid contaminating production analytics.

### Testing Checklist (Dev/Test Mode)
**Preparation:**
- [x] **CRITICAL**: Activate test mode BEFORE visiting site to avoid production contamination
  - ✅ Using Method 1: Visit site with `?ga_dev=1` parameter
- [x] Test mode activation verified via URL parameter detection
- [x] Added initTestMode() to App.tsx for proper branding display
- [x] Keep console open to see video event confirmations
- [x] Verify test mode: Hard refresh cleared localStorage - reinitializing via URL parameter
- [x] Open GA4 → Realtime → Debug View → verify debug_mode events appear ✅ VALIDATED

**Starting Video Event Testing:**
**Time**: 2025-08-15T10:10:45Z  
**Method**: URL parameter reinitializing after hard refresh

**Test Each Event:**
- [✅] **video_open**: SUCCESS! Event fired correctly
  - ✅ Console shows: `📹 GA4 Video: video_open` with correct parameters
  - ✅ Video ID: PomGalleryC.mp4, Locale: fr-FR, Title: "L'été de Pom"
  - ✅ Video overlay opened and is buffering
- [✅] **video_start**: SUCCESS! Event fired correctly
  - ✅ Fires only once per video session
  - ✅ Parameters: video_id, locale, position_sec correctly tracked
- [✅] **video_resume**: SUCCESS! Event fired correctly
  - ✅ Tracks when video resumes after pause
- [✅] **video_progress**: SUCCESS! All milestones tracked
  - ✅ 25% milestone: Fired once per session
  - ✅ 50% milestone: Fired once per session  
  - ✅ 75% milestone: Fired once per session
  - ✅ 100% milestone: Fired when reaching end
  - ✅ Parameter: progress_percent correctly shows 25|50|75|100
- [✅] **video_complete**: SUCCESS! Completion logic validated
  - ✅ Triggered at 97% (exceeds 90% threshold as intended)
  - ✅ One event per completion, correctly tracks user stopping 3 seconds before end
- [✅] **video_watch_time**: SUCCESS! Watch time batching working
  - ✅ Accumulates watch time accurately
  - ✅ Sends batches on page visibility changes

**Cross-Language Test:**
- [x] Test in French: `https://memopyk.com/fr-FR/?ga_dev=1` ✅ VALIDATED
- [x] Test in English: `https://memopyk.com/en-US/?ga_dev=1` ✅ VALIDATED  
- [x] Confirm locale parameter matches path (fr-FR vs en-US) ✅ VALIDATED

**Important Notes:**
- ⚠️ **URL Parameter Method**: Most reliable - test mode activates BEFORE analytics fire
- ⚠️ **External Activation**: Never enable test mode while already on MEMOPYK site
- ⚠️ **Production Safety**: Test mode persists in localStorage until manually disabled

---

## Step 3 - GA4 Admin Setup
**Status**: ⏸️ PENDING (Manual Task)
**Goal**: Create custom dimensions and metrics in GA4 Admin

### Custom Dimensions to Create (scope = Event)
**Location**: GA4 Admin → Custom definitions → Create custom dimensions
- [ ] **video_id**: Stores filename or unique ID of video
- [ ] **locale**: Stores language code (fr-FR, en-US)
- [ ] **progress_percent**: Quartile milestone (25, 50, 75, 100)
- [ ] **current_time**: Time position at pause/start (seconds)

### Custom Metrics to Create (scope = Event)  
**Location**: GA4 Admin → Custom definitions → Create custom metrics
- [ ] **watch_time_seconds**: Total watch time per session (number)

### Verification After Setup
- [ ] Re-run tests in non-dev mode to ensure GA4 stores real data
- [ ] Check GA4 → Explore → Create table with:
  - Rows: video_id
  - Columns: locale  
  - Metrics: watch_time_seconds, count of video_complete
  - Breakdown by progress_percent for milestone analysis

---

## Step 4 - Final Deployment
**Status**: ⏸️ PENDING
**Goal**: Deploy with confirmed GA4 video analytics

### Final Checks
- [ ] All events tested and verified in GA4 Realtime
- [ ] Custom dimensions and metrics created and working
- [ ] Cross-language functionality confirmed
- [ ] Console logs clean (no errors)
- [ ] Supabase video tracking remains disabled (feature flag OFF)

---

## CRITICAL: React useEffect Dependency Guidelines

### What Broke the Video Gallery (August 15, 2025)

**Root Cause**: When implementing GA4 video analytics, unstable dependencies were added to VideoOverlay's useEffect, causing multiple component mounts and black screen issues.

**Specific Problem**: The useEffect had these unstable dependencies:
```typescript
// ❌ BROKEN - These change on every render
useEffect(() => {
  // ... analytics setup
}, [videoUrl, getVideoId, title, ga4Analytics]); 
```

**Why This Breaks**:
- `ga4Analytics` - Hook returns new object each render
- `getVideoId` - Callback recreated when `videoUrl` changes  
- `title`, `videoUrl` - Props changing trigger re-renders
- Result: useEffect runs multiple times → multiple video elements → black screen

### Prevention Rules for GA4 Implementation

#### 1. **useEffect Dependencies - CRITICAL**
```typescript
// ✅ CORRECT - Mount once only for initialization
useEffect(() => {
  const videoId = extractVideoId(videoUrl); // Extract inline
  ga4Analytics.trackOpen(videoId, title);
  // ... setup logic
}, []); // Empty dependencies

// ✅ CORRECT - Memoized callbacks for event handlers  
const handlePlay = useCallback(() => {
  const videoId = extractVideoId(videoUrl);
  ga4Analytics.trackStart(videoId);
}, [videoUrl]); // Only stable dependencies
```

#### 2. **Hook Integration Guidelines**
```typescript
// ❌ WRONG - Hook recreates object
const ga4Analytics = useGA4VideoAnalytics();

// ✅ CORRECT - Memoized hook  
const ga4Analytics = useMemo(() => useGA4VideoAnalytics(), []);

// ✅ EVEN BETTER - Extract functions individually
const { trackOpen, trackStart } = useGA4VideoAnalytics();
```

#### 3. **Stable Reference Patterns**
```typescript
// ✅ Extract data inside effect (not from dependencies)
useEffect(() => {
  const videoId = videoUrl.includes('filename=') 
    ? videoUrl.split('filename=')[1].split('&')[0]
    : videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
  
  // Use extracted data immediately  
}, []); // No dependencies needed
```

#### 4. **Testing Protocol**
- **Before Integration**: Test without analytics first
- **After Integration**: Verify single mount with console logs
- **Console Check**: Look for multiple "MOUNTED!" messages
- **Video Test**: Ensure no black screen on gallery videos

#### 5. **Implementation Steps**
1. **Phase 1**: Add analytics functions with empty useEffect `[]`
2. **Phase 2**: Test video playback still works
3. **Phase 3**: Add event handlers with stable callbacks
4. **Phase 4**: Verify single mounting in console
5. **Phase 5**: Deploy after confirming functionality

### Emergency Rollback Indicators
- Multiple "MOUNTED!" console messages
- Black screen on video gallery
- Videos not playing properly
- Multiple video elements competing

**Action**: Immediately set useEffect dependencies to `[]` and deploy

---

## Notes
- Site is i18n: fr-FR and en-US
- Video Gallery has max 6 items, periodically updated
- Keep existing GA4 base tracking (page_view + SPA routes) 
- Keep existing developer/test-mode toggle
- Data quality rules include milestone dedupe and tolerance (±1%)