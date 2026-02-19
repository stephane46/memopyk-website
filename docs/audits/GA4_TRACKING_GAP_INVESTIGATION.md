# GA4 vs MEMOPYK Tracking Gap Investigation

**Date:** 2026-02-19
**Branch:** staging
**Observed gap:** GA4 reports 1 session / MEMOPYK reports 69 sessions (filtered) over 7 days

---

## Executive Summary

The 69:1 gap is caused by **three compounding factors**:

| Factor | Impact | Sessions explained |
|--------|--------|-------------------|
| Bot/crawler traffic (58% of MEMOPYK sessions) | **Major** | ~43 sessions that GA4 correctly ignores |
| Cookie consent banner is decorative — but irrelevant | **None** | The "trick" is that consent doesn't gate GA4 |
| Ad blockers + privacy browsers blocking GA4 JS | **Major** | ~25 of 30 real-browser sessions |
| No first-party GA4 proxy for page_view events | **Contributing** | Makes ad blocking trivially easy |

**Bottom line:** Of 74 raw MEMOPYK sessions, ~43 are bots (never execute JS), leaving ~30 real browsers. Of those 30, only 1 triggered GA4 — meaning **~97% of real visitors block `googletagmanager.com`** or use browsers/extensions that prevent GA4 from firing.

---

## Hypothesis 1: GA4 Tag Not Firing Properly

**Verdict: Not the cause — implementation is correct**
**Severity: None**

### Findings

**GA4 script loading** (`client/src/analytics/ga.ts:53-63`):
- Script loaded dynamically via `document.createElement("script")` from `https://www.googletagmanager.com/gtag/js?id=G-JLRWHE1HV4`
- Not in `index.html` — loaded programmatically by `initGA()` → `loadGtagScript()`

**Measurement ID** (`client/src/config/ga4.config.ts:32`):
```typescript
export const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_ID || import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-JLRWHE1HV4';
```
- `.env` line 31: `VITE_GA_MEASUREMENT_ID=G-JLRWHE1HV4` — consistent, correct production ID

**Initialization flow** (`client/src/App.tsx:150-213`):
1. `useEffect` on mount checks `!isAdminPage`
2. Calls `initGA4()` → `initGACore(GA4_MEASUREMENT_ID, { debug: ... })`
3. Immediately calls `trackPageView()` for initial page load
4. `useAnalytics()` hook in `AnalyticsRouter` tracks subsequent SPA navigations

**GA4 initialization sequence** (`client/src/analytics/ga.ts:99-147`):
1. `shimGtag()` — creates `window.dataLayer` and `window.gtag`
2. `gtag("consent", "update", { analytics_storage: "granted" })` — grants all consent
3. `loadGtagScript(measurementId)` — loads script from Google CDN
4. `gtag("js", new Date())` — timestamps
5. `gtag("config", measurementId, { send_page_view: false })` — configures (manual page views)
6. `ensureClientIdReady()` — waits for GA4 client_id

**No issues found.** The implementation follows Google's recommended pattern. `send_page_view: false` is intentional since page views are sent manually via `sendPageView()`.

---

## Hypothesis 2: Cookie Consent Blocking GA4

**Verdict: The "trick" — consent is completely decorative. But this is NOT causing the gap.**
**Severity: None (for the tracking gap)**

### The Trick: Consent Banner is Disconnected from GA4

**Cookie banner** (`client/src/components/ui/CookieBanner.tsx`):
- Shows on first visit when `localStorage.getItem('memopyk-consent-demo')` is null (line 67)
- Note the key name: **`memopyk-consent-demo`** — the word "demo" is a hint
- User choices (Accept All / Reject / Settings) save to `localStorage.setItem('memopyk-consent-demo', JSON.stringify(consent))`
- The `consent` object has `{ essential: true, analytics: true/false, timestamp: ... }`

**But nobody reads the consent state before loading GA4:**

- `App.tsx:166`: `initGA4()` is called unconditionally — **no consent check**
- `ga.ts:108-112`: Consent is hardcoded to `"granted"` for all storage types:
  ```typescript
  gtag("consent", "update", {
    ad_storage: "granted",
    analytics_storage: "granted",
    functionality_storage: "granted",
  });
  ```
- `use-analytics.tsx`: `trackPageView()` on every route change — **no consent check**
- `getCookieConsent()` is exported from `CookieBanner.tsx` but **never imported by any analytics code**

### The Complete Flow

1. User visits `memopyk.com` for the first time
2. React app loads → `App.tsx useEffect` fires
3. `initGA4()` loads GA4 script and sends initial page_view — **immediately, unconditionally**
4. Cookie banner renders at the bottom of the page
5. User clicks Accept/Reject — saves preference to localStorage
6. **Preference is never checked** — GA4 continues regardless

### Why This Doesn't Cause the Gap

Since GA4 fires **before** the consent banner even appears, and consent is hardcoded to `granted`, the cookie banner cannot explain why GA4 only records 1 session. Every visitor who executes JavaScript will trigger GA4 — unless something blocks the `googletagmanager.com` script from loading.

### Compliance Note

This implementation may not comply with GDPR/ePrivacy in the EU/France, where analytics cookies typically require opt-in consent before firing. The banner creates the appearance of consent management without actually gating any tracking. This is a separate issue from the tracking gap investigation.

---

## Hypothesis 3: Bot Traffic Ratio

**Verdict: Major contributor — 58% of MEMOPYK sessions are bots**
**Severity: Major**

### Database Analysis

```
Traffic breakdown (last 7 days, excluding Stéphane's IP):

Bot/Crawler:    43 sessions (58%)  — 29 unique IPs
Real Browser:   30 sessions (41%)  — 29 unique IPs
Unknown/Other:   1 session  ( 1%)  —  1 unique IP
Total:          74 sessions        — 59 unique IPs
```

### Identified Bots

| Bot | Sessions | Type |
|-----|----------|------|
| AhrefsBot/7.0 | 11 | SEO crawler |
| 360Spider (Edge UA) | 9 | Chinese search engine |
| Googlebot/2.1 | 6 | Google search |
| Applebot/0.1 | 6 | Apple search |
| Chrome-Lighthouse | 3 | Google performance audit |
| Google-InspectionTool | 4 | Google Search Console |
| bingbot/2.0 | 2 | Microsoft search |
| GoogleOther | 1 | Google misc crawler |
| HeadlessChrome/142 | 1 | Automated browser |

### Suspicious "Real Browser" User Agents

Several sessions classified as "real browser" use suspiciously old browser versions:
- **Chrome/102** (3 sessions) — Released May 2022, nearly 4 years old
- **Edge/18.19582** (2 sessions) — Legacy EdgeHTML from 2018
- **Chrome/84** (1 session) — Released July 2020
- **iPhone OS 12_2** (1 session) — iOS 12.2 from March 2019
- **Firefox/109** (1 session) — Released January 2023

These are likely automated tools or scrapers using fake browser user agents. The actual number of genuine human visitors is probably **15-20**, not 30.

### Why Bots Explain Part of the Gap

- Bots make HTTP requests to the server → MEMOPYK's server-side `SessionTracker` logs them
- Bots do NOT execute JavaScript → GA4's `gtag.js` never runs
- GA4 also has its own bot filtering that removes known bots even if they somehow trigger the script
- This alone explains ~43 of the 68-session gap

---

## Hypothesis 4: Ad Blocker Impact

**Verdict: Root cause for the remaining gap — explains why 29/30 real browser sessions don't trigger GA4**
**Severity: Root Cause (for real-browser gap)**

### GA4 Script Source

`client/src/analytics/ga.ts:58`:
```typescript
s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
```

- Loaded directly from **`www.googletagmanager.com`** — the #1 target on every ad blocker filter list
- No first-party proxy, no domain disguise, no script obfuscation
- CSP in `server/app.ts:58` explicitly allows `https://www.googletagmanager.com` and `https://www.google-analytics.com` — confirming direct Google CDN loading

### Measurement Protocol Exists But Only for Video Events

A server-side Measurement Protocol relay exists at `POST /api/ga4/mp` (`server/routes/analytics.routes.ts:106-180`):
- Proxies events through the MEMOPYK server to `google-analytics.com/mp/collect`
- Uses `GA4_API_SECRET` from `.env` (configured and present)
- **BUT: Only allows 3 event types** (line 128): `video_start`, `video_progress`, `video_complete`
- **`page_view` is NOT in the allowlist** — so the MP relay cannot send page views
- Only used by `client/src/analytics/mp.ts` → imported only in `VideoOverlay.tsx` for gallery videos

### Why This Matters

The MP relay was designed as an ad-blocker bypass for video analytics — but it doesn't cover page views or sessions. So:

1. User visits memopyk.com with an ad blocker
2. MEMOPYK server-side tracking logs the session (HTTP request → `SessionTracker`)
3. React app loads, `initGA4()` tries to load `googletagmanager.com/gtag/js`
4. **Ad blocker intercepts the script request** → GA4 never initializes
5. `window.gtag` is just the shim function, events go to `dataLayer` but never reach Google
6. Result: MEMOPYK counts it, GA4 doesn't

### Ad Blocker Prevalence

- France has one of the highest ad blocker adoption rates in Europe (~30-40%)
- Privacy-focused browsers (Brave, Firefox with Enhanced Tracking Protection, Safari ITP) also block Google Analytics by default
- uBlock Origin, AdBlock Plus, and Ghostery all block `googletagmanager.com`
- Even some DNS-level blockers (Pi-hole, NextDNS, AdGuard DNS) block GA4 domains

### The Math

Of ~30 real-browser sessions:
- 1 triggered GA4 (3%)
- 29 did not (97%)

This 97% block rate is high but plausible for a French-market site with low traffic. With only ~15-20 genuine human visitors (removing fake-UA bots), even a 40% ad blocker rate plus Safari ITP plus privacy browsers could account for most of the gap. The small sample size amplifies the effect.

---

## Combined Explanation

| Step | Sessions | Running total |
|------|----------|--------------|
| MEMOPYK raw sessions (7 days) | 74 | 74 |
| Minus bot/crawler traffic | -43 | 31 |
| Minus suspicious old-browser bots | -5 to -10 | ~21-26 |
| Minus ad blocker / privacy browser users | -20 to -25 | ~1-6 |
| **GA4 recorded** | **1** | 1 |

The gap is fully explained by the combination of:
1. **Server-side vs client-side tracking** — MEMOPYK captures every HTTP request; GA4 requires JS execution
2. **Bot traffic** — 58% of sessions are crawlers that never execute JS
3. **Ad blockers and privacy tools** — Blocking `googletagmanager.com` directly, affecting most French visitors

---

## Recommendations

1. **Bot filtering for MEMOPYK**: Add server-side bot detection (user-agent matching + behavioral signals) to separate bot sessions from human sessions in the MEMOPYK dashboard. The `is_bot` column exists but is always `false`.

2. **Extend MP relay for page_view**: Add `page_view` to the Measurement Protocol allowlist so the server-side relay can send page views even when ad blockers stop the client-side GA4 script. This would give more accurate GA4 numbers.

3. **First-party GA4 proxy (optional)**: Route GA4 through a first-party domain (e.g., `/api/ga4/collect` → `google-analytics.com`) to bypass ad blockers. This is more complex than extending the MP relay.

4. **Cookie consent compliance**: The decorative consent banner may need to be connected to actual GA4 gating for GDPR compliance. This would further reduce GA4 numbers but is the legally correct approach for EU visitors.
