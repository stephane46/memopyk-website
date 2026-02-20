# Blocked Tests

Tests that could not be implemented as specified, with reasons and unblocking requirements.

| Test ID | Reason | What Would Unblock It |
|---------|--------|-----------------------|
| 2.* (npx tsx) | Layer 2 storage tests require DATABASE_URL for direct DB access via `npx tsx`. Our test IP (109.17.150.48) is in `analytics_exclusions`, so API-based event seeding is blocked. | Set `DATABASE_URL` env var pointing to Supabase PostgreSQL, or run via Postgres MCP (verified manually — all 6 assertions pass). |
| 3.3 (partial) | Without DATABASE_URL, test 3.3 falls back to API shape validation only (cannot verify linked-post category assignment). | Set `DATABASE_URL` for full DB-level assertion. |

## Layer 2 Manual Verification (2026-02-20)

All Layer 2 storage assertions were verified via Postgres MCP (`mcp__postgres__query`):

| Test | Assertion | Result |
|------|-----------|--------|
| 2.1 | Video play row exists with correct fields | PASS — session_id, video_id, view_duration=15 confirmed |
| 2.2 | Blog page view stored as path only (not full URL) | PASS — `/fr/blog/test-storage-*` stored, not `https://...` |
| 2.3 | Deduplication — 1 row per session+video | PASS — row_count=1 after update |
| 2.4 | completion_percentage stored for completed videos | PASS — completion_percentage="100", watched_to_end=true |
| 2.5 | Private IP flagged as is_test_data=true | PASS — 10.0.0.1 has is_test_data=true |
| 2.6 | IP exclusion list active | PASS — 3 active exclusions confirmed |

---
Last updated: 2026-02-20
