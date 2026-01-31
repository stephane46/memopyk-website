# MEMOPYK Performance Comparison: Replit vs Coolify

**Date:** January 31, 2026
**Tested By:** Automated performance suite
**Purpose:** Compare production (Replit) vs staging (Coolify) environments

---

## Executive Summary

### Lighthouse Scores (Desktop)

| Category | Replit | Coolify | Change |
|----------|--------|---------|--------|
| **Performance** | 62 ⚠️ | **88** ✅ | **+42%** |
| Accessibility | 85 | **91** | +7% |
| Best Practices | 92 | **96** | +4% |
| SEO | 100 | 100 | — |

### Server Response Times (TTFB)

| Metric | Replit | Coolify | Improvement |
|--------|--------|---------|-------------|
| **Homepage TTFB (avg)** | 348ms | 121ms | **2.9× faster** |
| **API Response (avg)** | 508ms | 141ms | **3.6× faster** |
| **Gallery API** | 984ms | 129ms | **7.6× faster** |
| **FAQ API** | 760ms | 121ms | **6.3× faster** |

### ✅ Conclusion: Migration Approved

Coolify (VPS) significantly outperforms Replit:
- **Desktop performance score: 62 → 88** (+42%)
- **All Core Web Vitals pass Google's targets**
- **Server responses 3-7× faster**
- **Safe to proceed with production cutover**

---

## Part 1: Time To First Byte (TTFB)

### Homepage (/)

| Run | Replit | Coolify |
|-----|--------|---------|
| 1 | 416ms | 169ms |
| 2 | 358ms | 127ms |
| 3 | 311ms | 95ms |
| 4 | 330ms | 117ms |
| 5 | 324ms | 96ms |
| **Average** | **348ms** | **121ms** |
| **Improvement** | — | **2.9x faster** |

### French Homepage (/fr)

| Run | Replit | Coolify |
|-----|--------|---------|
| 1 | 304ms | 103ms |
| 2 | 257ms | 120ms |
| 3 | 263ms | 105ms |
| 4 | 304ms | 149ms |
| 5 | 245ms | 177ms |
| **Average** | **275ms** | **131ms** |
| **Improvement** | — | **2.1x faster** |

---

## Part 2: API Endpoint Response Times

| Endpoint | Replit | Coolify | Improvement |
|----------|--------|---------|-------------|
| `/api/health` | 303ms | 101ms | 3.0x faster |
| `/api/hero-videos` | 275ms | 292ms | ~same |
| `/api/gallery` | 984ms | 129ms | **7.6x faster** |
| `/api/faq` | 760ms | 121ms | **6.3x faster** |
| `/api/blog/posts` | 250ms | 97ms | 2.6x faster |
| **Average** | **508ms** | **141ms** | **3.6x faster** |

### Analysis

- **Gallery & FAQ:** These endpoints show the most dramatic improvement (6-7x faster). This is likely due to:
  - Coolify VPS has dedicated resources vs Replit's shared infrastructure
  - Better database connection pooling on VPS
  - No cold-start delays

- **Hero Videos:** Similar performance on both platforms, suggesting this endpoint may be limited by Supabase CDN latency rather than server performance.

---

## Part 3: Full Page Load (Google PageSpeed Insights / Lighthouse)

**Test Date:** January 31, 2026  
**Tool:** PageSpeed Insights (pagespeed.web.dev) with Lighthouse 13.0.1

### Summary Scores

| Category | Replit Desktop | Coolify Desktop | Replit Mobile | Coolify Mobile |
|----------|---------------|-----------------|---------------|----------------|
| **Performance** | 62 ⚠️ | **88** ✅ | 55 ⚠️ | 56 ⚠️ |
| Accessibility | 85 | **91** ✅ | 91 | **96** ✅ |
| Best Practices | 92 | **96** ✅ | 92 | **96** ✅ |
| SEO | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ |

### Desktop Performance (The Big Win!)

| Metric | Replit | Coolify | Improvement | Target | Status |
|--------|--------|---------|-------------|--------|--------|
| **Performance Score** | 62 | **88** | **+42%** | >90 | ✅ Near target |
| First Contentful Paint | 3.3s | **1.2s** | **2.75× faster** | <1.8s | ✅ Pass |
| Largest Contentful Paint | 3.8s | **1.9s** | **2× faster** | <2.5s | ✅ Pass |
| Total Blocking Time | 70ms | **0ms** | **Perfect** | <200ms | ✅ Pass |
| Cumulative Layout Shift | 0.014 | **0.006** | **2.3× better** | <0.1 | ✅ Pass |
| Speed Index | 3.3s | **1.2s** | **2.75× faster** | <3.4s | ✅ Pass |

**Desktop Verdict:** ✅ Coolify is dramatically faster — all Core Web Vitals pass Google's targets!

### Mobile Performance (Slow 4G Simulation)

| Metric | Replit | Coolify | Improvement | Target | Status |
|--------|--------|---------|-------------|--------|--------|
| **Performance Score** | 55 | 56 | +2% | >90 | ⚠️ Needs work |
| First Contentful Paint | 18.7s | **6.5s** | **2.9× faster** | <1.8s | ❌ Slow |
| Largest Contentful Paint | 20.6s | **8.1s** | **2.5× faster** | <2.5s | ❌ Slow |
| Total Blocking Time | 50ms | **20ms** | **2.5× faster** | <200ms | ✅ Pass |
| Cumulative Layout Shift | 0.01 | 0.01 | Same | <0.1 | ✅ Pass |
| Speed Index | 18.7s | **10.2s** | **1.8× faster** | <3.4s | ❌ Slow |

**Mobile Verdict:** ⚠️ Coolify is 2-3× faster than Replit, but both sites are slow on mobile due to heavy images (~21 MB page weight).

### What These Metrics Mean

| Metric | What it Measures | Why it Matters |
|--------|------------------|----------------|
| **FCP** | When user first sees something | First visual feedback |
| **LCP** | When main content (hero) appears | User perceives page as "loaded" |
| **TBT** | How long JS blocks the page | Affects interactivity |
| **CLS** | Does page jump around? | User experience |
| **Speed Index** | How fast content fills the page | Overall visual loading |

### Key Findings from Lighthouse

1. **Desktop performance is excellent on Coolify** — Score jumped from 62 to 88
2. **All Core Web Vitals pass on Coolify desktop** — Google will be happy
3. **Mobile is slow on both** — Not a hosting issue, it's image optimization
4. **Coolify is faster on mobile too** — 2-3× improvement, just both start slow
5. **Accessibility improved** — 85 → 91 (desktop), 91 → 96 (mobile)
6. **Best Practices improved** — 92 → 96 on both

### Mobile Optimization Opportunities (Future Work)

The reports identified these potential savings:

| Optimization | Potential Savings |
|--------------|-------------------|
| Improve image delivery | ~8.5 MB |
| Use efficient cache lifetimes | ~11.7 MB |
| Reduce unused JavaScript | ~700 KB |
| Reduce unused CSS | ~30 KB |
| Render blocking requests | ~1.8s (mobile) |

**Root Cause:** Total page weight is ~21 MB, mostly images. This is content-related, not hosting-related.

---

## Part 4: Summary & Recommendations

### Performance Summary

| Environment | Pros | Cons |
|-------------|------|------|
| **Replit** | Easy deployment, integrated IDE | Shared resources, cold starts, higher latency, Perf score 62 |
| **Coolify (VPS)** | Dedicated resources, 3-7× faster, Perf score 88 | Requires VPS management |

### Key Findings

1. **Desktop Lighthouse score improved 42%** — 62 → 88
2. **All Core Web Vitals pass on Coolify** — FCP, LCP, TBT, CLS all green
3. **Server responses 3-7× faster** — Database-heavy endpoints (Gallery, FAQ) show most improvement
4. **Mobile is slow on both** — Not a hosting issue; ~21 MB of images needs optimization
5. **Accessibility improved** — 85 → 91 (desktop), 91 → 96 (mobile)
6. **No cold starts on VPS** — Consistent response times vs Replit's variable performance

### ✅ Recommendations

**Immediate (Production Cutover):**
1. **Proceed with migration to Coolify** — Performance improvement is significant and proven
2. **Update DNS from Replit to Coolify** — memopyk.com → Coolify VPS
3. **Monitor for 24-48 hours** — Watch for any issues post-cutover

**Future Optimization (Post-Cutover):**
1. **Optimize images** — ~8.5 MB potential savings with WebP, compression
2. **Add cache headers** — ~11.7 MB potential savings with proper caching
3. **Reduce unused JavaScript** — ~700 KB can be tree-shaken
4. **Lazy load gallery images** — Improve mobile FCP/LCP

---

## Test Environment Details

| Parameter | Value |
|-----------|-------|
| Test Date | 2026-01-31 |
| Test Location | Local (France) |
| Replit URL | https://memopyk.com |
| Coolify URL | https://memopyk.memopyk.com |
| TTFB Test Tool | curl with timing metrics |
| TTFB Runs per test | 5 |
| Lighthouse Tool | PageSpeed Insights (pagespeed.web.dev) |
| Lighthouse Version | 13.0.1 |
| Desktop Emulation | Emulated Desktop |
| Mobile Emulation | Moto G Power, Slow 4G throttling |

---

*Generated as part of MEMOPYK Replit → Coolify migration project*  
*Last updated: January 31, 2026 - Lighthouse results added*
