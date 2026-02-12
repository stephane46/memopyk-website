# API Health Check Report

**Date:** 2026-02-12
**Target:** https://memopyk.memopyk.com (staging)
**Server version:** 2.0.0-clean-rebuild
**Uptime at test start:** ~416 seconds

## Summary

| Metric | Value |
|--------|-------|
| Total endpoints tested | 56 |
| Passed (expected status) | 54 |
| Failed (unexpected status) | 1 |
| Degraded (200 with error in body) | 1 |
| Overall pass rate | **96.4%** |

## Broken Endpoints (5xx Errors)

| Status | Method | Path | Notes |
|--------|--------|------|-------|
| 500 | GET | /api/ga4/realtime/top-videos | `Unexpected token 'e', "eyAKICAidH"... is not valid JSON` -- GA4 credentials JSON appears base64-encoded or malformed |

## Degraded Endpoints (200 but with error in body)

| Status | Method | Path | Notes |
|--------|--------|------|-------|
| 200 | GET | /api/ga4/realtime | Returns `activeUsers: 0` with error: `Unexpected token 'e', "eyAKICAidH"...` -- same GA4 credentials issue as realtime/top-videos, but this endpoint gracefully degrades to empty data |

## Full Results Table

### Health & Probes

| Status | Method | Path | Result | Notes |
|--------|--------|------|--------|-------|
| 200 | GET | /api/health | PASS | Valid JSON, version 2.0.0-clean-rebuild |
| 200 | GET | /api/health/detailed | PASS | DB connected, responseTime: 1ms |
| 200 | GET | /api/ready | PASS | `{"ready":true}` |
| 200 | GET | /api/live | PASS | `{"alive":true}` |

### Public Content Reading

| Status | Method | Path | Result | Notes |
|--------|--------|------|--------|-------|
| 200 | GET | /api/hero-videos | PASS | 3 videos returned |
| 200 | GET | /api/hero-text | PASS | 1 text config returned |
| 200 | GET | /api/gallery | PASS | 6 gallery items returned |
| 200 | GET | /api/faq-sections | PASS | 3 sections returned |
| 200 | GET | /api/faqs | PASS | 18 FAQs returned |
| 200 | GET | /api/faq | PASS | 18 FAQs returned (legacy alias) |
| 200 | GET | /api/contact | PASS | Contact entries returned |
| 200 | GET | /api/cta | PASS | 2 CTAs (book_call, quick_quote) |
| 200 | GET | /api/why-memopyk-cards | PASS | 5 cards returned |
| 200 | GET | /api/legal | PASS | Legal documents returned |
| 200 | GET | /api/seo | PASS | 2 SEO configs (homepage, home) |
| 200 | GET | /api/seo-config | PASS | Detailed SEO config with JSON-LD |
| 200 | GET | /api/partners | PASS | 11 partners, paginated |
| 200 | GET | /api/blog-tags | PASS | 4 tags returned |

### Blog (Public)

| Status | Method | Path | Result | Notes |
|--------|--------|------|--------|-------|
| 400 | GET | /api/blog/posts | PASS | Correctly requires `language` param |
| 200 | GET | /api/blog/posts?language=fr-FR | PASS | 1 published FR post |
| 400 | GET | /api/blog/featured | PASS | Correctly requires `language` param |
| 200 | GET | /api/blog/featured?language=fr-FR | PASS | 1 featured post |
| 400 | GET | /api/blog/posts/search | PASS | Correctly requires `q` param |
| 200 | GET | /api/blog/posts/search?q=test&language=fr-FR | PASS | Empty results (valid) |

### Analytics (Public)

| Status | Method | Path | Result | Notes |
|--------|--------|------|--------|-------|
| 200 | GET | /api/analytics/current-ip | PASS | Returns IP string |
| 200 | GET | /api/ga4/kpis | PASS | KPIs with period comparison |
| 200 | GET | /api/ga4/trend | PASS | 23 daily data points |
| 200 | GET | /api/ga4/realtime | DEGRADED | Returns 200 with error in body (GA4 JSON parse failure) |
| 500 | GET | /api/ga4/realtime/top-videos | FAIL | GA4 JSON parse error |
| 200 | GET | /api/ga4/top-videos | PASS | 4 videos with stats |
| 200 | GET | /api/ga4/videos | PASS | 4 videos with engagement data |
| 200 | GET | /api/ga4/geo | PASS | 9 countries |
| 200 | GET | /api/ga4/cta | PASS | CTA tracking data (0 clicks) |
| 200 | GET | /api/ga4/report?report=topVideos | PASS | Top videos report |
| 200 | GET | /api/ga4/report?report=trends | PASS | Trends report with 24 days |
| 200 | GET | /api/tracker/currently-watching | PASS | 0 active sessions |
| 200 | GET | /api/unified-cache/stats | PASS | Cache stub (not yet migrated) |
| 200 | GET | /api/conversions?start_date=2026-01-01&end_date=2026-02-12 | PASS | 0 conversions |

### Blog Analytics (Public)

| Status | Method | Path | Result | Notes |
|--------|--------|------|--------|-------|
| 200 | GET | /api/analytics/blog/popular | PASS | Empty array (no data yet) |
| 200 | GET | /api/analytics/blog/trends | PASS | Empty array |
| 200 | GET | /api/analytics/blog/topics | PASS | Empty array |
| 200 | GET | /api/analytics/blog/keywords | PASS | Empty array |
| 200 | GET | /api/analytics/blog/categories | PASS | Empty array |

### Help (Mixed Auth)

| Status | Method | Path | Result | Notes |
|--------|--------|------|--------|-------|
| 401 | GET | /api/help/screens | PASS | Admin-only list, correctly rejects |
| 200 | GET | /api/help/screens (with auth) | PASS | 31+ help screens returned |
| 200 | GET | /api/help/flows | PASS | 2 flows (public endpoint) |

### Edge Cases

| Status | Method | Path | Result | Notes |
|--------|--------|------|--------|-------|
| 404 | GET | /api/blog/posts/nonexistent-slug?language=fr-FR | PASS | `Post not found or not published` |
| 400 | GET | /api/ga4/report?report=invalid | PASS | `Invalid report type` with valid types listed |
| 400 | GET | /api/ga4/funnel | PASS | `Missing videoId parameter` |

### Admin Endpoints (Auth Testing)

| Status | Method | Path | Auth | Result | Notes |
|--------|--------|------|------|--------|-------|
| 401 | GET | /api/admin/analytics/exclusions | None | PASS | Correctly rejects |
| 200 | GET | /api/admin/analytics/exclusions | Bearer | PASS | 2 exclusions returned |
| 401 | GET | /api/admin/blog/posts | None | PASS | Correctly rejects |
| 200 | GET | /api/admin/blog/posts | Bearer | PASS | Blog posts with drafts |
| 401 | GET | /api/admin/ai-context | None | PASS | Correctly rejects |
| 200 | GET | /api/admin/ai-context | Bearer | PASS | 6 brand brain entries |
| 401 | GET | /api/admin/content/keywords/stats | None | PASS | Correctly rejects |
| 200 | GET | /api/admin/content/keywords/stats | Bearer | PASS | 12,501 keywords, 25 clusters |
| 401 | GET | /api/admin/content/topics | None | PASS | Correctly rejects |
| 200 | GET | /api/admin/content/topics | Bearer | PASS | Topics list returned |
| 401 | GET | /api/admin/content/plans | None | PASS | Correctly rejects |
| 200 | GET | /api/admin/content/plans | Bearer | PASS | Empty array (no plans) |

### POST Endpoints

| Status | Method | Path | Result | Notes |
|--------|--------|------|--------|-------|
| 200 | POST | /api/analytics/session | PASS | `filtered: ip_excluded` (test IP in exclusion list) |
| 200 | POST | /api/analytics/event | PASS | `type: logged` |
| 200 | POST | /api/analytics/performance | PASS | `success: true` |
| 200 | POST | /api/event | PASS | `success: true` |
| 200 | POST | /api/performance | PASS | `success: true` |

## Observations

### GA4 Realtime Credential Issue
Both `/api/ga4/realtime` and `/api/ga4/realtime/top-videos` fail with the same JSON parse error: `Unexpected token 'e', "eyAKICAidH"...`. The token `eyAKICAidH` looks like a base64-encoded string (starts with `ey` which is typical of base64-encoded JSON, like a JWT or service account key). This suggests the GA4 service account credentials JSON file may be stored as a base64-encoded string rather than raw JSON, or the credentials environment variable is being read incorrectly. Other GA4 endpoints (kpis, trend, top-videos, videos, geo, cta, reports) work correctly, so the issue is isolated to the realtime API path which may use a different authentication flow.

### Blog Endpoints Require Language Parameter
`/api/blog/posts`, `/api/blog/featured`, and `/api/blog/posts/search` all return 400 without a `language` query parameter. This is by design (bilingual content), but the error message is clear: `Invalid or missing language parameter. Must be en-US or fr-FR`.

### Cache Service Stub
`/api/unified-cache/stats` returns a stub response with `message: "Cache service not yet migrated"`. This is functional but indicates incomplete migration.

### Blog Analytics Empty
All 5 blog analytics endpoints return empty arrays. This is expected if the IP exclusion filter is excluding all traffic, or if there is insufficient blog view data.

### Analytics IP Exclusion Working
`POST /api/analytics/session` returns `filtered: ip_excluded`, confirming the IP exclusion system works correctly for the test source IP (109.17.150.48).

## Auth Security Summary

All 7 admin endpoint groups correctly return 401 without authentication and 200 with valid Bearer token. No auth bypass vulnerabilities detected.

| Admin Endpoint Group | Without Auth | With Auth |
|---------------------|-------------|-----------|
| /api/admin/analytics/exclusions | 401 | 200 |
| /api/admin/blog/posts | 401 | 200 |
| /api/admin/ai-context | 401 | 200 |
| /api/help/screens (list) | 401 | 200 |
| /api/admin/content/keywords/stats | 401 | 200 |
| /api/admin/content/topics | 401 | 200 |
| /api/admin/content/plans | 401 | 200 |
