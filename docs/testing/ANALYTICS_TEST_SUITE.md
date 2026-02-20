# Analytics End-to-End Test Suite

## Overview

A 7-layer test suite verifying the complete analytics pipeline: from browser events through backend processing, database storage, API responses, and UI display. Covers 9 regression tests for bugs fixed on 2026-02-20.

## Architecture

```
Layer 1: Event Tracking     — HTTP POST events, dedup logic, event classification
Layer 2: Storage            — DB schema verification, field normalization, bot flagging
Layer 3: API                — Response shapes, regression endpoints, data consistency
Layer 4: UI                 — Dashboard data display, format verification, tab navigation
Layer 5: Integration Chain  — Full browser→DB→API→UI chains with controlled fixtures
Layer 6: Route Audit        — Static route mapper + response shape validator
Layer 7: Performance        — Response time baselines with median/max thresholds
```

## Running Tests

All tests are standalone TypeScript scripts runnable with `npx tsx`:

```bash
# Individual layers
npx tsx tests/e2e/analytics/layer1-event-tracking.ts
npx tsx tests/e2e/analytics/layer2-storage.ts          # Requires DATABASE_URL
npx tsx tests/e2e/analytics/layer3-api.ts
npx tsx tests/e2e/analytics/layer4-ui.ts
npx tsx tests/e2e/analytics/layer5-integration.ts
npx tsx tests/e2e/analytics/layer6-route-audit.ts
npx tsx tests/e2e/analytics/layer7-performance.ts

# Override staging URL
E2E_BASE_URL=https://custom-staging.example.com npx tsx tests/e2e/analytics/layer1-event-tracking.ts
```

### Prerequisites

- **Node.js 18+** with native `fetch`
- **npx tsx** for TypeScript execution
- **DATABASE_URL** env var (Layer 2 only) — Supabase PostgreSQL connection string
- **Staging server** running at `https://memopyk.memopyk.com` (default)

### Rate Limiting

Staging enforces 60 req/min per IP. Tests include inter-request delays to stay within limits. If running multiple layers sequentially, wait 60s between layers or set `E2E_BYPASS_TOKEN` matching the server's token and pass `X-E2E-Token` header.

## Test Inventory

### Layer 1: Event Tracking (5 tests)

| ID | Test | Regression |
|----|------|------------|
| 1.1 | Video play event — POST /api/analytics/event returns 200 | — |
| 1.2 | Video completion — different session not blocked by 60s dedup | 60s dedup swallowing cross-session completions |
| 1.3 | Blog page view — second identical view deduplicated within 30s | Double-firing page views |
| 1.4 | CTA click event — POST /api/event returns 200 | — |
| 1.5 | Scroll engagement — classified as "logged" not pageview | Scroll events misclassified as page views |

### Layer 2: Storage (6 tests)

| ID | Test | Regression |
|----|------|------------|
| 2.1 | Video play stored correctly (all fields verified) | — |
| 2.2 | Blog page view stored as path only, not full URL | URL stored as full URL |
| 2.3 | Deduplication — no duplicate rows per session+video | — |
| 2.4 | Completion percentage stored for completed videos | Completions field never sent |
| 2.5 | Private IPs flagged as is_test_data=true | — |
| 2.6 | IP-excluded rows not in production analytics queries | — |

**Note:** Layer 2 requires DATABASE_URL for direct Postgres access. Tests can also be verified via Postgres MCP tool. See `BLOCKED.md` for manual verification results.

### Layer 3: API (6 tests)

| ID | Test | Regression |
|----|------|------------|
| 3.1 | Top videos — completion rate not 100% when plays=0 | Completion rate 100% when plays=0 |
| 3.2 | Blog popular posts — HTTP 200 (not 404) | Blog /ga4/ 404 path injection |
| 3.3 | Blog categories — linked posts not all "Uncategorized" | FR post uncategorized |
| 3.4 | Trends — periodAggregates has prevPeriodSessions | Trends comparative period flat |
| 3.5 | Analytics health — HTTP 200 with expected fields | — |
| 3.6 | Top videos — each item has completions field | Completions field missing |

### Layer 4: UI (8 tests)

| ID | Test | Regression |
|----|------|------------|
| 4.1 | Video tab — friendly names (no raw .mp4 filenames) | — |
| 4.2 | Video tab — completion rate consistency | Completion rate 100% when plays=0 |
| 4.3 | Blog tab — no error state (all 5 endpoints return 200) | Blog /ga4/ 404 |
| 4.4 | Diagnostics — DB ON, GA4 ON, Healthy, Connected | — |
| 4.5 | Date format on diagnostics — DD MMM YYYY, HH:mm:ss | — |
| 4.6 | Calendar picker — Monday start + all headers | — |
| 4.7 | Timezone indicator — GMT+1 or GMT+2 for Europe/Paris | — |
| 4.8 | Diagnostics not in analytics tab bar | — |

### Layer 5: Integration Chain (3 tests)

| ID | Test | Regression |
|----|------|------------|
| 5.1 | Full video play chain — seed→process→API verify | — |
| 5.2 | Full blog view chain — dedup on second view | Double-firing page views |
| 5.3 | Scroll does not pollute page views | Scroll misclassified as pageview |

### Layer 6: Route Audit (static analysis + 5 shape validations)

Scans `server/routes/` for backend route definitions and `client/src/` for frontend API calls. Reports:
- **Matched routes**: Frontend calls that match a backend route
- **Mismatches**: Frontend calls with no matching backend route (potential 404s)
- **Unused routes**: Backend routes with no frontend caller (dead code candidates)
- **Shape validations**: Live HTTP calls to verify response JSON structure

Output: `tests/e2e/analytics/route-audit-report.md`

### Layer 7: Performance (5 endpoints)

| Endpoint | Threshold | 2x Max |
|----------|-----------|--------|
| Analytics Health | 5000ms | 10000ms |
| GA4 Top Videos (30d) | 2000ms | 4000ms |
| Blog Popular Posts (30d) | 2000ms | 4000ms |
| Blog Categories (30d) | 2000ms | 4000ms |
| GA4 Trend (Feb 2026) | 3000ms | 6000ms |

Each endpoint sampled 3 times. Median and max must stay under thresholds.

## Regressions Covered

All 9 regressions from the 2026-02-20 fixes:

| # | Regression | Layer(s) | Test ID(s) |
|---|-----------|----------|------------|
| 1 | Video completions never sent (completions field missing) | L3, L4 | 3.6, 4.2 |
| 2 | 60s dedup swallowing cross-session completions | L1 | 1.2 |
| 3 | Blog /ga4/ 404 path injection | L3, L4 | 3.2, 4.3 |
| 4 | Double-firing page views | L1, L5 | 1.3, 5.2 |
| 5 | Scroll events misclassified as page views | L1, L5 | 1.5, 5.3 |
| 6 | FR post with topic appearing as "Uncategorized" | L3 | 3.3 |
| 7 | Trends comparative period flat (missing prevPeriodSessions) | L3 | 3.4 |
| 8 | Completion rate 100% when plays=0 | L3, L4 | 3.1, 4.2 |
| 9 | URL stored as full URL instead of path only | L2 | 2.2 |

## File Structure

```
tests/e2e/analytics/
├── helpers/
│   └── seed-analytics.ts        # Shared seeding + query helpers
├── layer1-event-tracking.ts     # Event POST + dedup + classification
├── layer2-storage.ts            # Direct DB verification (needs DATABASE_URL)
├── layer3-api.ts                # API response shapes + regression checks
├── layer4-ui.ts                 # UI data display verification
├── layer5-integration.ts        # Full chain tests
├── layer6-route-audit.ts        # Static route mapper + shape validator
├── layer7-performance.ts        # Response time baselines
├── route-audit-report.md        # Generated by Layer 6
├── BLOCKED.md                   # Tests that can't run + manual verification
└── TEST_RUN_REPORT_2026-02-20.md  # First run results
```

## CI Integration

`.github/workflows/route-audit.yml` runs Layer 6 on every push to staging/main. Failed route audits block the build.

## Known Limitations

1. **Layer 2 requires DATABASE_URL** — Direct Postgres access needed because our test IP is in `analytics_exclusions`. Alternative: verify via Postgres MCP tool interactively.
2. **Layer 4 tests 4.6-4.8 are config-based** — Calendar/timezone/tab verification uses expected config values rather than Puppeteer DOM inspection. Visual verification done separately during QC.
3. **Rate limiting** — Running all layers sequentially may hit 60 req/min. Space test runs 60s apart or use bypass token.
4. **Test data isolation** — All test sessions use `e2e-test-` or `e2e-layer*-` prefix. Layer 2 test rows need manual cleanup: `DELETE FROM analytics_views WHERE session_id LIKE 'e2e-layer2-%'`.
