# Analytics Dashboard Overview — Audit Report

---

## FIXES APPLIED — 2026-02-18

All critical issues (C1-C5), warnings (W1-W8), hardcoded risks (H1-H3), and recommendations (R1-R12) addressed.

### Additional Text Block Fixes (2026-02-18, commit 05912d0)

See `docs/audits/ANALYTICS_TEXT_BLOCKS_REVIEW.md` for full details.

- **DB fix:** "Capadenac" → "Capdenac" spelling, `appliesFrom` → 2025-11-04
- **Grammar:** Singular/plural for "session(s)", "visitor(s)", "This/These" in summary and Key Insight
- **Data source mixing:** Added amber note when GA4 selected, explaining breakdown data is from MEMOPYK (Option A)
- **Block 2 text:** Removed "Raw" from GA4 description, rewrote MEMOPYK description, fixed misleading bot claim, improved toggle instruction

| Item | Status | Notes |
|------|--------|-------|
| C1 | FIXED | `/analytics/recent-visitors` now accepts `dateFrom`, `dateTo`, `country` params. `getRecentVisitors()` extended to accept date range and country. |
| C2 | FIXED | Key Insight text is now data-source-aware: MEMOPYK shows "MEMOPYK local tracking logs (IP-filtered)", GA4 shows "tracked by Google Analytics 4". |
| C3 | FIXED | "First Visit" column label changed to "Last Seen" in Unique Visitors modal. |
| C4 | FIXED | `visitCount` replaced with real aggregation via grouped SQL `count(*)` per IP using `inArray` + `groupBy`. Return Visitors modal now shows real visit counts. |
| C5 | FIXED | Bot filtering claim changed to: "Known bots are automatically filtered by GA4, but some unrecognized automated traffic may still appear." |
| W1 | FIXED | Zero-change arrow: `change >= 0` changed to `change > 0` for up-arrow. When `change === 0`, shows neutral dash `—` and "No change vs previous period". |
| W2 | FIXED | Unique Visitors subtitle now conditional: "Distinct IP-filtered visitors from MEMOPYK" for MEMOPYK, "Distinct visitors (GA4 cookie-based)" for GA4. |
| W3 | FIXED | "includes cross-device returns" claim removed from both Unique Visitors and Return Visitors modal headers. |
| W4 | N/A | Confirmed correct — no bug (division-by-zero guard exists at both frontend and backend). No change needed. |
| W5 | FIXED | Badge terminology consolidated in Overview tab: "📊 GA4 Data" and "🟠 MEMOPYK Filtered" used consistently across AnalyticsNewOverview.tsx, VisitorFocusedKpis.tsx, and AnalyticsNewGlobalFilters.tsx tooltip. |
| W6 | N/A | DataSourceBadge is orphaned but not used in Overview tab. No change needed. |
| W7 | FIXED | MEMOPYK return visitors now counts unique returning IPs: `new Set(sessions.filter(s => s.isReturning).map(s => s.ipAddress).filter(Boolean)).size`. Previous period also fixed to use unique IP count. |
| W8 | FIXED | Dead `enrich-locations` fetch calls removed from all three modals. |
| H1 | FIXED | Exclusion date is now dynamic from `ipExclusions` table `appliesFrom` field, formatted with `toLocaleDateString`. |
| H2 | FIXED | "Capdenac home network" hardcoded name replaced with dynamic `activeExclusion.label` from `ipExclusions` table. |
| H3 | FIXED | Cross-device returns claim removed (see W3). |
| R1 | FIXED | Server route and service both updated (see C1). |
| R2 | FIXED | `visitCount` now real aggregation (see C4). |
| R3 | FIXED | Key Insight text is data-source-aware (see C2). |
| R4 | FIXED | Dead `enrich-locations` fetch calls removed (see W8). Endpoint not implemented — calls removed instead. |
| R5 | FIXED | "First Visit" → "Last Seen" (see C3). |
| R6 | FIXED | Bot filtering claim corrected (see C5). |
| R7 | FIXED | Zero-change neutral state added (see W1). |
| R8 | FIXED | Unique Visitors subtitle conditional on dataSource (see W2). |
| R9 | FIXED | GA4 exclusion date and network name now dynamic from ipExclusions table (see H1, H2). |
| R10 | FIXED | Cross-device returns claim removed (see H3, W3). |
| R11 | FIXED | Badge terminology consolidated in Overview tab (see W5). Note: other tabs (Trends, LiveView, Blog) retain their own labels — out of scope for Overview audit. |
| R12 | FIXED | MEMOPYK return visitors counts unique IPs (see W7). Previous period comparison also fixed. |

**TypeScript:** Zero errors (`npx tsc --noEmit` clean).

**Additional fix by qc-agent:** `prevReturnVisitors` was still counting sessions (`.length`) while current period was counting unique IPs. Fixed to be consistent: `new Set(prevSessions.filter(s => s.isReturning).map(s => s.ipAddress).filter(Boolean)).size`.

Verified by qc-agent on 2026-02-18 with zero TypeScript errors.

---

**Date:** 2026-02-18
**Audited by:** QC cross-verification (independent re-read of all source files; no Playwright; code-only)
**Prior work incorporated:** audit-agent (Task #1 code audit), static-text-agent (Task #2 text audit)
**Files audited:** 15 source files across frontend, backend, and services

---

## SUMMARY

| Category | Count |
|----------|-------|
| Total items verified | 47 |
| Correct / accurate | 29 |
| Critical issues | 5 |
| Warnings | 8 |
| Hardcoded risks | 3 |
| Items needing clarification | 5 |

---

## CRITICAL ISSUES

### C1. Modal parameters ignored by server — date filter bypass

**Severity:** CRITICAL
**Files:** `server/routes/analytics.routes.ts:1426-1439`, `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:244-252`

The frontend modals call `/api/analytics/recent-visitors` with parameters:
- `dateFrom`, `dateTo` (exact date range from global store)
- `uniqueOnly=true` (Unique Visitors modal only)
- `skipEnrichment=true`
- `country` (country filter)

The server route **ignores all of these**. It only reads `datePreset` (defaulting to `'today'`) and `limit`:

```typescript
// server/routes/analytics.routes.ts:1428-1430
const datePreset = String(req.query.datePreset || 'today');
const limit = parseInt(String(req.query.limit || '50'), 10);
const visitors = await realtimeService.getRecentVisitors(datePreset, limit);
```

`getRecentVisitors()` in `server/services/analytics/realtime.service.ts:175` only handles `today`, `7d`, `30d` presets — no custom date ranges.

**Impact:** When user selects "Last 30 days" or a custom date range, modal detail records always default to "today" regardless of the dashboard date filter. The country filter is also silently ignored. The `uniqueOnly` parameter is not processed server-side (client does its own dedup at `VisitorFocusedKpis.tsx:300-311`, but it only deduplicates whatever today's records were returned).

---

### C2. Key Insight text hardcoded to "Google Analytics 4" — wrong when MEMOPYK mode active

**Severity:** CRITICAL
**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:623`

The Sessions KPI card label correctly changes based on `dataSource`:
```typescript
// VisitorFocusedKpis.tsx:422-434
label={dataSource === 'memopyk' ? 'Sessions (MEMOPYK)' : 'Sessions (GA4)'}
description={
  dataSource === 'memopyk'
    ? 'Visitor sessions from MEMOPYK logs (IP-filtered)'
    : 'Visitor sessions from Google Analytics'
}
```

However, the Key Insight static text at line 623 always says "Google Analytics 4" regardless of the toggle:
```typescript
// VisitorFocusedKpis.tsx:623
<span className="font-medium">Key Insight:</span> These {totalViews?.value || 0} sessions are tracked by Google Analytics 4.
```

When `dataSource === 'memopyk'`, this is factually wrong — the sessions are from MEMOPYK logs, not GA4.

---

### C3. Unique Visitors modal: "First Visit" column label shows `lastVisit` data

**Severity:** CRITICAL (misleading label)
**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:895-902`

The Unique Visitors modal column is labeled "First Visit" but renders `visitor.lastVisit || visitor.createdAt`:
```typescript
// VisitorFocusedKpis.tsx:895-901
<span className="text-xs text-gray-600">First Visit</span>
...
{getRelativeTime(visitor.lastVisit || visitor.createdAt)}
```

`lastVisit` is the **most recent** visit time from the session record (`lastSeenAt`). Neither `lastVisit` nor `createdAt` is the "first ever visit" of the visitor — they are timestamps of the most recent session. This misleads users into thinking they see when a visitor first came to the site, when actually they see the most recent session time.

---

### C4. Return Visitors modal: `visitCount` hardcoded as 1 — modal always empty

**Severity:** CRITICAL (broken feature)
**File:** `server/services/analytics/realtime.service.ts:241`

```typescript
// realtime.service.ts:241
visitCount: 1, // Would need aggregation for accurate count
```

The Return Visitors modal filters records by `visitor.visitCount > 1` (`VisitorFocusedKpis.tsx:355-357`):
```typescript
const returningData = allVisitors.filter((visitor: any) =>
  visitor.visitCount > 1
);
```

Since the server always returns `visitCount: 1`, **the Return Visitors modal will always show 0 records**, regardless of how many actual returning visitors exist. The modal will always display "No returning visitors found." This is a completely non-functional feature.

---

### C5. GA4 bot filtering claim is factually wrong

**Severity:** CRITICAL (factual error in published UI)
**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:656`

```
"Includes all visitors, bots, and traffic"
```

GA4 automatically filters known bot and spider traffic using the IAB/ABC International Spiders & Bots List (enabled by default in all GA4 properties). The claim that GA4 "includes all visitors, bots, and traffic" is factually incorrect. It should say something like: "Includes most visitors; known bots are filtered automatically by GA4, but some unrecognized bot traffic may still appear."

---

## WARNINGS

### W1. Percentage change arrow shows for change=0 (prior agent finding corrected)

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:1158-1161`

```typescript
{change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs previous period
```

When `change === 0`, the arrow shows "▲ 0% vs previous period" (green up-arrow with 0%). The prior audit-agent reported the arrow is "hidden for 0" — this is **incorrect**. The code uses `change >= 0` (not `change > 0`), so `▲` is shown for `change === 0`.

---

### W2. Unique Visitors subtitle misleading when GA4 source is active

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:444-448`

When `dataSource === 'ga4'`, the Unique Visitors description says:
```
'Distinct visitors (IP-based)'
```

GA4 uses cookie-based/device-ID identification (`totalUsers` metric), not IP addresses. The label "IP-based" is only accurate for MEMOPYK source. For GA4, it should say "Distinct visitors (cookie/device-based)."

---

### W3. "cross-device returns" claim is unverifiable

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:847,974`

```
"GA4 reports {n} total (includes cross-device returns)"
```

Cross-device tracking requires Google Signals to be enabled in the GA4 property. Without Google Signals, GA4 uses per-device cookies. This claim appears in both the Unique Visitors and Return Visitors modal headers and cannot be verified at runtime.

---

### W4. Prior agent finding corrected: division-by-zero edge case does NOT exist

**File:** `client/src/admin/analyticsNew/AnalyticsNewOverview.tsx:35-38`

The prior audit-agent claimed a "EDGE CASE BUG: When `previous === 0`, divides by zero → shows `Infinity%` or `NaN%`." This is **incorrect**. The code explicitly handles this:

```typescript
// AnalyticsNewOverview.tsx:35-38
const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};
```

The backend in `analytics.routes.ts:755-758` has the identical guard. No division-by-zero bug exists.

---

### W5. Data source badge labels inconsistent across UI contexts

**Files:** `AnalyticsNewOverview.tsx:337-339`, `VisitorFocusedKpis.tsx:698-699`, `AnalyticsNewGlobalFilters.tsx:449-452`

| Location | GA4 label | MEMOPYK label |
|----------|-----------|---------------|
| Header toggle | "📊 Unfiltered" | "🟠 IP Filtered" |
| Sessions modal badge | "📊 Google Analytics Data" | "🟠 MEMOPYK Logs" |
| Global filters tooltip | "No badge = Raw GA4 data" | "🟠 IP Filtered = Supabase analytics" |

Three different label formulations for the same underlying concepts create terminology confusion.

---

### W6. `DataSourceBadge.tsx` component is orphaned — prior agent finding was incorrect

**File:** `client/src/admin/analyticsNew/components/DataSourceBadge.tsx`

The prior audit-agent described this component as having badge labels "Google Analytics Data" (green) for ga4, "MEMOPYK Logs" (blue) for memopyk, "IP Filtered" (orange) for filtered views. This is **incorrect**. The actual component reads from `data/dataSource.ts` which tracks `"live" | "mock" | "unknown"` state, and renders labels `"Live GA4"` / `"Mock data"`. This is a completely different state system from the `'ga4' | 'memopyk'` toggle in `analyticsNewFilters.store.ts`. The `DataSourceBadge` component is not used anywhere in the Overview tab.

---

### W7. MEMOPYK Return Visitors: counts sessions, not unique IPs — inconsistency with Unique Visitors

**File:** `server/routes/analytics.routes.ts:861`

```typescript
const returnVisitors = sessions.filter(s => s.isReturning).length;
```

`isReturning` is a boolean flag set at session creation (session.service.ts:196) — it is true if the IP has any previous sessions. This means `returnVisitors` counts **sessions** where the IP was seen before, not **unique returning IPs**. If one returning IP creates 3 sessions, it counts as 3 return visitors.

`uniqueVisitors` at line 860 uses `new Set(sessions.map(s => s.ipAddress).filter(Boolean)).size` — counting unique IPs.

This inconsistency means the "X% returning visitors" report text (`VisitorFocusedKpis.tsx:492`) can mathematically exceed 100% in edge cases (e.g., returnVisitors=3 sessions from 1 unique returning IP, uniqueVisitors=2 unique IPs → 150%).

---

### W8. `enrich-locations` endpoint called but does not exist server-side

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:234-239,276-281,333-338`

All three modals trigger a background POST to `/api/analytics/enrich-locations`:
```typescript
fetch(`/api/analytics/enrich-locations?startDate=...&endDate=...`, { method: 'POST' })
```

This endpoint does not exist anywhere in `server/routes/analytics.routes.ts` or any other server route file (grep confirmed 0 matches). The call silently fails (a `.catch()` suppresses the error) meaning location enrichment is never performed. Location data in modals may be incomplete.

---

## HARDCODED RISKS

### H1. GA4 exclusion date hardcoded as string literal

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:656`

```
"Capdenac home network was excluded from GA4 starting November 4, 2025."
```

This date is a string literal in JSX. If the exclusion date changes, code must be manually updated. Should be data-driven from the `analyticsExclusions` table's `appliesFrom` field.

---

### H2. Home network location name hardcoded

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:656`

```
"Capdenac home network"
```

"Capdenac" is hardcoded. The exclusion record's `label` field in `analyticsExclusions` table would be the appropriate dynamic source.

---

### H3. Cross-device returns capability claim hardcoded

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:847,974`

```
"GA4 reports {n} total (includes cross-device returns)"
```

This claim appears in both Unique Visitors and Return Visitors modal headers. It asserts a GA4 property capability (Google Signals) that is hardcoded regardless of whether that feature is actually enabled.

---

## DATA SOURCE CONFUSION

### DC1. Sessions modal: GA4 count in header, MEMOPYK records in body — partially documented

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:714-719`

When `dataSource === 'ga4'`, the Sessions modal shows:
- Header number: GA4 sessions count from `totalViews?.value`
- Badge: "📊 Google Analytics Data"
- Explanation: "Detail records below from MEMOPYK logs (GA4 does not provide individual session details)"

The explanation is accurate and visible. **VERIFIED CORRECT** (prior agent finding confirmed).

---

### DC2. Unique Visitors panel: GA4 count vs MEMOPYK records — correctly disclosed

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:843-848`

The panel shows:
```
"Showing {uniqueVisitorsData.length} detailed records from MEMOPYK logs"
"GA4 reports {uniqueVisitors.value} total (includes cross-device returns)"
```

The disclosure is present. **VERIFIED CORRECT** (prior agent finding confirmed).

---

### DC3. Prior agent finding corrected: GA4 returning users uses dimension filter, not subtraction

**File:** `server/services/analytics/ga4.service.ts:250-268`

The prior audit-agent stated "GA4: from `ga4Data.returningVisitors` (GA4 metric: `newUsers` subtracted from `totalUsers`)." This is **incorrect**. The actual code uses:

```typescript
export async function qReturningUsers(start, end, locale?, country?) {
  const [res] = await client.runReport({
    ...
    metrics: [{ name: "activeUsers" }],
    dimensions: [{ name: "newVsReturning" }],
    ...
  });
  for (const row of res.rows ?? []) {
    if (row.dimensionValues?.[0]?.value === "returning") {
      return Number(row.metricValues?.[0]?.value ?? 0);
    }
  }
```

GA4 metric: `activeUsers` filtered by `newVsReturning === "returning"` dimension. No subtraction.

---

### DC4. Active Filters section correctly clarifies IP exclusions affect MEMOPYK only

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:521`

```
"(affects MEMOPYK logs only, not GA4 data shown above)"
```

**VERIFIED CORRECT** (prior agent finding confirmed).

---

### DC5. MEMOPYK `avgWatch` is session duration, not video watch time

**File:** `server/routes/analytics.routes.ts:900`

```typescript
avgWatch: { value: totalViews > 0 ? Math.round(totalDuration / totalViews) : 0, trend: [], change: 0 },
```

`totalDuration` is the sum of `session.sessionDuration` values — this is **average session duration** in seconds, not video watch time. The GA4 path correctly computes `watchTime / plays` (actual video watch time). This discrepancy is harmless for now since `avgWatch` is only used in the hidden legacy card grid (`display: 'none'`), but would be misleading if that grid is ever re-enabled.

---

## CALCULATION VERIFICATION

### KV1. Sessions KPI percentage change — CORRECT, zero division handled

**Backend:** `analytics.routes.ts:755-758`
```typescript
const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};
```

Formula: `Math.round(((current - previous) / previous) * 100)`. Zero guard: when `previous === 0`, returns 100 (if current > 0) or 0. **CORRECT.**

---

### KV2. Returning visitors % in report text — safe from division by zero

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:490-494`

```typescript
{uniqueVisitors?.value > 0 && returnVisitors?.value > 0 && (
  <span>
    {' '}({Math.round((returnVisitors.value / uniqueVisitors.value) * 100)}% returning visitors)
  </span>
)}
```

The condition `uniqueVisitors?.value > 0 && returnVisitors?.value > 0` prevents rendering when either is 0. **SAFE from division by zero.** However, see W7 — the ratio can exceed 100% if MEMOPYK source is used.

---

### KV3. Country percentages — safe from division by zero

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:541,554-556`

```typescript
{!visitorInsights.loading && visitorInsights.recentVisitors > 0 && (
  ...
  ({Math.round((item.count / visitorInsights.recentVisitors) * 100)}%)
)}
```

`visitorInsights.recentVisitors > 0` guards against division by zero. **SAFE.**

---

### KV4. GA4 KPIs: `totalViews` and `sessions` both equal `sessions` value

**Backend:** `analytics.routes.ts:796,799`

```typescript
totalViews: { value: sessions, trend: [], change: calculateChange(sessions, prevSessionsCount) },
sessions: { value: sessions, trend: [], change: calculateChange(sessions, prevSessionsCount) },
```

Both fields are set to the same `sessions` variable from `qSessions()`. The Sessions KPI card reads `kpis.totalViews.value`. By design, consistent but redundant.

---

### KV5. MEMOPYK return visitors count may exceed unique visitors count

**Backend:** `analytics.routes.ts:860-861`

```typescript
const uniqueVisitors = new Set(sessions.map(s => s.ipAddress).filter(Boolean)).size;  // unique IPs
const returnVisitors = sessions.filter(s => s.isReturning).length;  // sessions flagged returning
```

`uniqueVisitors` = unique IP count. `returnVisitors` = session count (not unique IPs) with `isReturning=true`.

Example edge case: IP `1.2.3.4` (returning) creates 5 sessions in period. Another IP `5.6.7.8` (new) creates 1 session. Result: `uniqueVisitors=2`, `returnVisitors=5`. Report text would show "250% returning visitors."

**ARITHMETIC BUG** — low probability in practice but theoretically possible.

---

## EDGE CASES

### EC1. Custom date range in modal — date filter silently ignored (see C1)

When user selects a 30-day range, modal detail records always show today's data because `dateFrom`/`dateTo` params are ignored by the server. User has no indication this is happening.

---

### EC2. Empty data state — handled

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:198-208`

When `!data || !data.kpis`, renders `AnalyticsNewLoadingStates mode="empty"` with "No visitor data available / No visitor analytics data found for the selected period." **HANDLED.**

---

### EC3. Loading state — handled

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:177-183`

Renders `AnalyticsNewLoadingStates mode="loading"`. **HANDLED.**

---

### EC4. Error state — handled

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:185-195`

Renders `AnalyticsNewLoadingStates mode="error"` with "Error loading visitor metrics / Unable to fetch visitor analytics data" plus retry button. **HANDLED.**

---

### EC5. GA4 realtime API failure — handled gracefully

**File:** `client/src/admin/analyticsNew/AnalyticsNewOverview.tsx:56-67`

Uses `retry: failureCount < 3` with special case to not retry on `RESOURCE_EXHAUSTED` (GA4 quota). Falls back to `0 active users`. **HANDLED.**

---

### EC6. Session duration "Unknown" for zero-duration sessions

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:400-416`

```typescript
if (!durationSeconds || durationSeconds <= 0) {
  return 'Unknown';
}
```

Shows "Unknown" when `sessionDuration` is null, 0, or undefined. Single-pageview bounce sessions have no measurable duration and correctly show "Unknown." **ACCEPTABLE BEHAVIOR.**

---

### EC7. Sessions modal shows up to 50 records (not 10 as prior agent stated)

**File:** `client/src/admin/analyticsNew/components/VisitorFocusedKpis.tsx:733`

```typescript
{totalViewsData.slice(0, 50).map(...)}
```

The Sessions modal shows up to 50 records. The server-side `getRecentVisitors` limit defaults to 50 (`analytics.routes.ts:1429`). The prior audit-agent's finding of "limited to 10" was **incorrect**.

---

## STATIC TEXT FACTUAL ACCURACY

| # | Text | File:Line | Verdict |
|---|------|-----------|---------|
| 1 | "Includes all visitors, bots, and traffic" | VisitorFocusedKpis.tsx:656 | **WRONG** — GA4 auto-filters known bots via IAB list |
| 2 | "IP filters configured in your GA4 settings only apply to new data going forward" | VisitorFocusedKpis.tsx:656 | CORRECT — GA4 data filters are collection-time only |
| 3 | "Capdenac home network was excluded from GA4 starting November 4, 2025" | VisitorFocusedKpis.tsx:656 | HARDCODED — may be accurate but not data-driven |
| 4 | "currently X IP addresses excluded" | VisitorFocusedKpis.tsx:660 | CORRECT — dynamic: `ipExclusions.filter(e => e.active).length` |
| 5 | "Excludes your configured IP addresses" | VisitorFocusedKpis.tsx:666 | CORRECT — verified in `ip-exclusion.service.ts` and `getExcludedIPs()` |
| 6 | "Filters out sessions with invalid/missing IP addresses" | VisitorFocusedKpis.tsx:667 | PARTIALLY CORRECT — null IPs excluded from unique visitor count via `.filter(Boolean)`, but null-IP sessions still counted in `totalViews` (session count) |
| 7 | "Only counts legitimate production traffic with valid IPs" | VisitorFocusedKpis.tsx:668 | PARTIALLY MISLEADING — `isTestData` flag filters private/loopback IPs; public-IP bot traffic may still appear |
| 8 | "Toggle the data source switch above to compare" | VisitorFocusedKpis.tsx:673 | CORRECT — toggle exists at AnalyticsNewOverview.tsx:324-329 |
| 9 | "These X sessions are tracked by Google Analytics 4" | VisitorFocusedKpis.tsx:623 | **WRONG when MEMOPYK selected** — sessions come from MEMOPYK, not GA4 |
| 10 | "GA4 reports X total (includes cross-device returns)" | VisitorFocusedKpis.tsx:847,974 | UNVERIFIABLE — cross-device requires Google Signals |
| 11 | "Showing X detailed records from MEMOPYK logs" | VisitorFocusedKpis.tsx:843,971 | CORRECT |
| 12 | "No returning visitors found" (empty state) | VisitorFocusedKpis.tsx:1068 | MISLEADING — always shows this because visitCount hardcoded to 1 (see C4) |

---

## CROSS-CONSISTENCY CHECK

### CC1. KPI card values vs modal header values — CONSISTENT

- Sessions KPI: `data.kpis.totalViews.value` → Sessions modal header: `totalViews?.value` (same binding) ✓
- Unique Visitors KPI: `data.kpis.uniqueVisitors.value` → Unique modal header: `uniqueVisitors?.value` (same binding) ✓
- Return Visitors KPI: `data.kpis.returnVisitors.value` → Return modal header: `returnVisitors?.value` (same binding) ✓

---

### CC2. KPI values vs report text — CONSISTENT

Report text at `VisitorFocusedKpis.tsx:481-494` uses `totalViews?.value`, `uniqueVisitors?.value`, `returnVisitors?.value` — the same React state bindings as the KPI cards. ✓

---

### CC3. Date range: store vs API call — CONSISTENT

`getDateRange()` from `useAnalyticsNewFilters` is called consistently in both `VisitorFocusedKpis.tsx` (for modal date params) and `useFilteredAnalytics.ts` (for KPI query). Both compute the same date range from the same Zustand store. ✓

---

### CC4. Active exclusions count: data source explanation vs Active Filters section — CONSISTENT

Both sections use `ipExclusions.filter((e: any) => e.active).length` from the same `useQuery` result (`/api/admin/analytics/exclusions`). ✓

---

### CC5. KPI modal detail records vs KPI count — NOT CONSISTENT (server bug)

When date filter is "Last 30 days", KPI card shows 30-day GA4/MEMOPYK count. But modal detail records always show today's MEMOPYK data (C1). The Sessions modal text partially discloses this ("Detail records below from MEMOPYK logs") but does not disclose that the date range is forced to today.

---

## CORRECTIONS TO PRIOR AGENT FINDINGS

| Prior agent claim | Correct finding |
|-------------------|----------------|
| "Edge case bug: previous === 0 → shows Infinity% or NaN%" | **WRONG.** Guard exists at AnalyticsNewOverview.tsx:35-38 AND analytics.routes.ts:755-758. No bug. |
| "Arrow: hidden for 0" | **WRONG.** Code uses `change >= 0` so arrow shows for change=0. |
| "GA4 returning users = newUsers subtracted from totalUsers" | **WRONG.** Uses `activeUsers` with `newVsReturning=returning` dimension (ga4.service.ts:250-268). |
| "DataSourceBadge shows 'Google Analytics Data'/'MEMOPYK Logs'/'IP Filtered'" | **WRONG.** Component shows "Live GA4"/"Mock data" from a different data source system. Not used in Overview. |
| "Detail records limited to 10, sorted DESC" | **WRONG.** Modals use `.slice(0, 50)` — up to 50 records. |

---

## RECOMMENDATIONS

Prioritized by impact:

### Priority 1 — Fix (broken functionality)

**R1. Fix `/analytics/recent-visitors` server route to respect date range parameters** (C1)
- `server/routes/analytics.routes.ts:1426-1439`: Add `dateFrom`, `dateTo`, `country` parameter handling
- `server/services/analytics/realtime.service.ts:175`: Extend `getRecentVisitors()` to accept date range
- Ensures modal detail records match the selected dashboard date range

**R2. Fix `visitCount` hardcoded to 1** (C4)
- `server/services/analytics/realtime.service.ts:241`: Replace `visitCount: 1` with real aggregation
- Query: count sessions per IP for the date range, use that count as `visitCount`
- Without this fix, the Return Visitors modal is permanently non-functional

**R3. Fix Key Insight text to be data-source-aware** (C2)
- `VisitorFocusedKpis.tsx:623`: Add conditional text based on `dataSource` value

**R4. Remove or implement `/api/analytics/enrich-locations` endpoint** (W8)
- Either implement the endpoint in the server routes, or remove the three dead `fetch()` calls from the modals

### Priority 2 — Fix (misleading to users)

**R5. Fix "First Visit" column label in Unique Visitors modal** (C3)
- `VisitorFocusedKpis.tsx:895`: Change to "Last Seen" or "Most Recent Visit"

**R6. Fix bot filtering claim** (C5)
- `VisitorFocusedKpis.tsx:656`: Change to "Includes most visitors; known bots filtered by GA4 automatically"

**R7. Fix zero-change shows up-arrow** (W1)
- `VisitorFocusedKpis.tsx:1158`: Change `change >= 0` to `change > 0` for up-arrow, or hide arrow when `change === 0`

**R8. Fix Unique Visitors description for GA4 source** (W2)
- `VisitorFocusedKpis.tsx:447`: Change "Distinct visitors (IP-based)" to "Distinct visitors (cookie/device-based)" when GA4

### Priority 3 — Improve (accuracy and clarity)

**R9. Make GA4 exclusion date and network name dynamic** (H1, H2)
- Source from `analyticsExclusions` table `appliesFrom` and `label` fields instead of hardcoded strings

**R10. Remove or conditionally show cross-device returns claim** (H3, W3)
- Remove "includes cross-device returns" or flag it as dependent on Google Signals configuration

**R11. Consolidate data source badge terminology** (W5)
- Choose one label scheme: "GA4 / MEMOPYK" is sufficient; "Unfiltered / Google Analytics Data / IP Filtered / MEMOPYK Logs" variants create confusion

**R12. Fix MEMOPYK return visitors to count unique IPs** (W7, KV5)
- `analytics.routes.ts:861`: Count unique returning IPs instead of sessions with `isReturning=true`
- Prevents the edge case where returning % exceeds 100%

---

*All findings verified against source code on 2026-02-18. Line numbers reference the current state of files. No source code was modified during this audit.*
