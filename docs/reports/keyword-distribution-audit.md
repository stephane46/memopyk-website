# Keyword Distribution Audit

**Date:** February 13, 2026
**Source:** `content_keywords` table (Supabase PostgreSQL)

## Summary

| Metric | Value |
|--------|-------|
| Total keywords | 107 |
| Markets | 2 (fr: 80, en: 27) |
| Tiers | 2 (Tier 1: 30, Tier 2: 77) |
| Clusters | 6 |
| Intent types | 3 |
| Competition levels | 3 |

> **Note:** CLAUDE.md references 12,501 keywords, but only 107 exist in the `content_keywords` table. The previous count may have included keywords that were subsequently cleaned up or moved to a different system.

## Distribution by Tier

| Tier | Count | % |
|------|-------|---|
| 1 (Priority) | 30 | 28.0% |
| 2 (Secondary) | 77 | 72.0% |

## Distribution by Intent

| Intent | Count | % |
|--------|-------|---|
| Commercial | 52 | 48.6% |
| Informational | 48 | 44.9% |
| Transactional | 7 | 6.5% |

Observation: Transactional keywords are underrepresented at only 6.5%. Consider adding more bottom-of-funnel keywords to improve conversion-oriented content.

## Distribution by Competition

| Competition | Count | % |
|-------------|-------|---|
| Low | 72 | 67.3% |
| Medium | 33 | 30.8% |
| High | 2 | 1.9% |

Good distribution -- heavily weighted toward low competition keywords, which is ideal for a newer site building domain authority.

## Distribution by Market

| Market | Count | % |
|--------|-------|---|
| FR (France) | 80 | 74.8% |
| EN (English) | 27 | 25.2% |

Aligns with primary market focus on French-speaking audiences.

## Top Clusters

| Cluster | Count | % |
|---------|-------|---|
| montage | 28 | 26.2% |
| gift_occasion | 21 | 19.6% |
| gift_retire | 20 | 18.7% |
| vhs | 17 | 15.9% |
| memorial | 11 | 10.3% |
| memory | 10 | 9.3% |

## Search Volume Distribution

| Volume Band | Count | % |
|-------------|-------|---|
| High (10K+) | 4 | 3.7% |
| Medium (1K-10K) | 41 | 38.3% |
| Low (100-1K) | 44 | 41.1% |
| Very Low (<100) | 18 | 16.8% |

All 107 keywords have monthly search volume data.

## Quick Filter Preset Counts

These correspond to the Blog Hub keyword filter presets:

| Preset | Filter Criteria | Count |
|--------|----------------|-------|
| Quick Wins | Low competition + Tier 1-2 | 72 |
| Traffic Drivers | Monthly searches >= 1,000 | 45 |
| Money Keywords | Transactional intent | 7 |
| France Priority | FR market | 80 |
| Blog Ideas | Informational intent | 48 |

## Recommendations

1. **Add transactional keywords** -- only 7 exist. Target keywords like "commander film souvenir", "prix montage video souvenir", "devis film famille".
2. **Expand EN market** -- only 27 keywords (25%). If English-Canadian market is a target, more EN keywords needed.
3. **Investigate keyword count discrepancy** -- 107 vs. 12,501 referenced in CLAUDE.md. Determine if keywords were lost during a cleanup or migration.
4. **Consider adding a "navigational" intent** -- currently only commercial/informational/transactional.
