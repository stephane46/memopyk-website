# Analytics Overview Text Blocks — Fix Review

**Date:** 2026-02-18
**Commit:** 05912d0
**Branch:** staging

---

## Changes Applied

### Part 1: Database Fix

**Table:** `analytics_exclusions`
**Record ID:** `192ed3d4-f936-44b6-8ce4-ef0e02702fca`

| Field | Before | After |
|-------|--------|-------|
| `label` | "Capadenac home network" (misspelled) | "Capdenac home network" |
| `applies_from` | 2023-12-31T23:00:00.000Z (Jan 1, 2024) | 2025-11-03T23:00:00.000Z (Nov 4, 2025 CET) |

**Verification:** Read-back confirmed both values updated correctly. The `toLocaleDateString('fr-FR', ...)` rendering in the user's CET browser will display "4 novembre 2025".

---

### Part 2: Grammar — Singular/Plural Handling

| Location | Before | After |
|----------|--------|-------|
| Summary sentence — sessions | "1 visitor sessions" | "1 visitor session" / "2 visitor sessions" |
| Summary sentence — unique visitors | "1 unique visitors" | "1 unique visitor" / "2 unique visitors" |
| Key Insight (MEMOPYK) | "These 1 sessions are from" | "This 1 session is from" / "These N sessions are from" |
| Key Insight (GA4) | "These 1 sessions are tracked by" | "This 1 session is tracked by" / "These N sessions are tracked by" |
| Data source note (new) | N/A | "1 session" / "N sessions" |

**Already correct (no changes needed):**
- Top Countries: `{item.count === 1 ? 'visitor' : 'visitors'}` — already had singular/plural
- Top Cities: same — already had singular/plural
- Visitor Languages: same — already had singular/plural
- Last 24 hours: `{visitorInsights.last24Hours === 1 ? 'visitor' : 'visitors'}` — already had singular/plural

---

### Part 3: Data Source Mixing Fix

**Choice: Option A** — Add a data source indicator.

**Reasoning:**
- Option B (make all sections use same data source) would require building a parallel GA4 path for country/language/city breakdowns. While GA4 does expose country data via `/ga4/geo`, it doesn't provide the same city/language granularity through the existing endpoints. The refactoring cost is high for an admin-only dashboard.
- Option A accurately labels the data source discrepancy with a single visible note.

**Implementation:**
When `dataSource === 'ga4'`, an amber-highlighted note appears before the breakdown sections:
> **Note:** Geographic, language, and behavioral breakdowns below are from MEMOPYK local tracking logs (N sessions) and may show different totals than the GA4 figures above.

When `dataSource === 'memopyk'`, no note is shown (all data is consistent).

**Date filter investigation:**
The MEMOPYK breakdown data (`fetchVisitorInsights`) passes `dateFrom` and `dateTo` from the global store to `/api/analytics/recent-visitors`. The server-side `getRecentVisitors()` respects these parameters when provided. The high MEMOPYK numbers (27 US visitors, 45 fr-FR) are legitimate for the 7-day period — they simply differ from GA4 because GA4 counts sessions differently (cookie-based) and has its own bot filtering. **No date filter bypass bug found** — the C1 fix from the previous audit resolved this.

---

### Part 4: Block 2 Text Improvements

| # | Before | After | Reason |
|---|--------|-------|--------|
| 1 | "Raw data from Google's tracking system. Includes all visitor traffic." | "Data from Google's tracking system." | "Raw data" implies unprocessed; GA4 processes/samples/applies thresholds. "Includes all visitor traffic" was redundant given the next sentence about bots. |
| 2 | "IP filters configured in your GA4 settings only apply to new data going forward, not historical data." | Unchanged | Accurate |
| 3 | Dynamic exclusion date/label | Unchanged (DB values fixed in Part 1) | Now renders "Capdenac home network was excluded from GA4 starting 4 novembre 2025." |
| 4 | "Only counts sessions with valid IP addresses and filters out traffic from your excluded IPs" | "Tracks sessions on your website with IP exclusions applied. Filters out traffic from your excluded IPs" | Previous text was inaccurate — null-IP sessions ARE counted in session totals. |
| 5 | "Excludes your configured IP addresses (your office, home, etc.)" | Unchanged | Accurate |
| 6 | "Filters out sessions with invalid/missing IP addresses from unique visitor counts. Session totals may include some null-IP entries." | Unchanged | Accurate after previous audit fix |
| 7 | "Only counts legitimate production traffic with valid IPs" | "Focuses on production traffic — excludes your own visits and invalid IPs, but cannot detect all automated traffic" | Previous text was misleading — MEMOPYK has no bot detection |
| 8 | "Toggle the data source switch above to compare GA4 (all traffic) vs MEMOPYK (filtered, valid IPs only)." | "Toggle the data source switch above to compare GA4 (Google's tracking) vs MEMOPYK (your local filtered logs)." | "all traffic" was inaccurate for GA4 (GA4 filters bots); new wording is neutral and clear |

---

### Part 5: Verification

**TypeScript:** Zero errors (`npx tsc --noEmit` clean).
**Commits:** `05912d0` (main fixes) + `0eaaa90` (exclusion `.find()` fix + docs) pushed to `staging`.
**Deployment:** Auto-deploy via Coolify to https://memopyk.memopyk.com.

**Additional fix (commit 0eaaa90):** The `.find()` for the GA4 exclusion sentence was picking "Local development traffic" (0.0.0.0/32) instead of "Capdenac home network". Fixed by adding `e.ipCidr !== '0.0.0.0/32'` filter — 0.0.0.0 is a MEMOPYK-only exclusion, not a GA4 IP filter.

**Staging verification (2026-02-19):** All fixes confirmed live:
- "1 visitor session" / "1 unique visitor" (singular ✓)
- Amber note visible in GA4 mode: "Note: Geographic, language, and behavioral breakdowns below are from MEMOPYK local tracking logs (50 sessions)..." ✓
- "Capdenac home network was excluded from GA4 starting 4 novembre 2025." ✓
- All Block 2 text improvements rendering correctly ✓

---

## Line-by-Line Accuracy Table

### Block 1: Analytics Report for Current View

| Line | Text | Data Source | Accurate? | Notes |
|------|------|-------------|-----------|-------|
| Summary | "Your site received N visitor session(s) in the last 7 days" | KPI (GA4 or MEMOPYK per toggle) | ✅ | Singular/plural now correct |
| Summary | "with N unique visitor(s)" | KPI (GA4 or MEMOPYK per toggle) | ✅ | Singular/plural now correct |
| Summary | "(X% returning visitors)" | KPI (GA4 or MEMOPYK per toggle) | ✅ | Only shown when both > 0 |
| Active Filters | "N IP address(es) excluded (affects MEMOPYK logs only, not GA4 data shown above)" | Dynamic from ipExclusions | ✅ | Clear source attribution |
| GA4 Note | "Geographic, language, and behavioral breakdowns below are from MEMOPYK local tracking logs..." | Static (shown only when GA4 selected) | ✅ NEW | Resolves data source confusion |
| Top Countries | "#1 Country — N visitor(s) (X%)" | MEMOPYK `/recent-visitors` | ✅ | Date-range filtered, singular/plural correct |
| Top Cities | "#1 City, Country — N visitor(s)" | MEMOPYK `/recent-visitors` | ✅ | Date-range filtered |
| Visitor Languages | "lang — N visitor(s) (X%)" | MEMOPYK `/recent-visitors` | ✅ | Date-range filtered |
| Visitor Behavior | "Last 24 hours: N visitor(s)" | MEMOPYK `/recent-visitors` | ✅ | Client-side 24h filter on date-filtered results |
| Key Insight (GA4) | "This/These N session(s) is/are tracked by Google Analytics 4..." | KPI (GA4) | ✅ | Data-source-aware, singular/plural correct |
| Key Insight (MEMOPYK) | "This/These N session(s) is/are from MEMOPYK local tracking logs (IP-filtered)." | KPI (MEMOPYK) | ✅ | Data-source-aware, singular/plural correct |

### Block 2: Understanding GA4 vs MEMOPYK Data Sources

| Line | Text | Accurate? | Notes |
|------|------|-----------|-------|
| GA4 description | "Data from Google's tracking system." | ✅ | Removed misleading "Raw" |
| GA4 bots | "Known bots are automatically filtered by GA4, but some unrecognized automated traffic may still appear." | ✅ | Factually correct |
| GA4 IP filters | "IP filters configured in your GA4 settings only apply to new data going forward, not historical data." | ✅ | Correct |
| GA4 exclusion | "Capdenac home network was excluded from GA4 starting 4 novembre 2025." | ✅ | Dynamic from DB, spelling fixed |
| MEMOPYK description | "Tracks sessions on your website with IP exclusions applied. Filters out traffic from your excluded IPs (currently 2 IP addresses excluded)." | ✅ | No longer claims "only valid IPs" |
| Bullet 1 | "Excludes your configured IP addresses (your office, home, etc.)" | ✅ | Correct |
| Bullet 2 | "Filters out sessions with invalid/missing IP addresses from unique visitor counts. Session totals may include some null-IP entries." | ✅ | Accurately describes the behavior |
| Bullet 3 | "Focuses on production traffic — excludes your own visits and invalid IPs, but cannot detect all automated traffic" | ✅ | Honest about bot detection limitations |
| Toggle instruction | "Toggle the data source switch above to compare GA4 (Google's tracking) vs MEMOPYK (your local filtered logs)." | ✅ | Neutral, accurate labels |
