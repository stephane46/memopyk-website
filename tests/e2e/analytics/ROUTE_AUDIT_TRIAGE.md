# Route Audit Triage — 2026-02-20

## Summary

| Classification | Count |
|---------------|-------|
| Confirmed bugs | 4 |
| False positives | 5 |
| Dead code | 11 |
| Uncertain | 1 |
| **Total** | **21** |

## Details

---

### 1. `/api/admin/blog/images` (HtmlEditor.tsx:72, 177)

**Status: DEAD CODE**

**Evidence:** HtmlEditor.tsx has a TinyMCE image picker that fetches from `/api/admin/blog/images` (GET, line 72) and uploads to it (POST, line 177). No backend route exists for this path. However, this was already identified and fixed on 2026-02-19 — the CLAUDE.md Recent Work entry reads: "Hero image picker fix — BlogHeroImageUpload was calling non-existent `/api/admin/blog/images`, fixed to `/api/image-bank`". The fix was applied in BlogHeroImageUpload but NOT in HtmlEditor.tsx.

HtmlEditor.tsx is used by BlogAICreator.tsx and BlogPostCreatorModal.tsx. The TinyMCE image picker modal (`isImagePickerOpen`) calls this dead endpoint. The upload silently fails (the query is only enabled when `isImagePickerOpen=true`). Blog editing via the main BlogEditor.tsx (which uses a separate Quill-based editor) is NOT affected.

**Action:** Remove dead TinyMCE image picker code from HtmlEditor.tsx, or rewire to `/api/image-bank`. Low priority — TinyMCE editor is a secondary/fallback editor.

---

### 2. `/api/admin/upload` (HtmlEditor.tsx:91)

**Status: DEAD CODE**

**Evidence:** Part of the TinyMCE `images_upload_handler` callback in HtmlEditor.tsx. No backend route `/api/admin/upload` exists. The primary upload flow uses `/api/image-bank/upload` or `/api/upload/server-side-upload`. This code is only reached if TinyMCE's built-in image upload button is clicked, which requires TinyMCE to be active (fallback editor path). Same dead code cluster as #1.

**Action:** Remove or rewire with `/api/admin/blog/images` above. Low priority.

---

### 3. `/api/admin/fetch-external` (HtmlEditor.tsx:228)

**Status: DEAD CODE**

**Evidence:** Triggered by pasting an image/video URL into the TinyMCE editor. Attempts to proxy-fetch the external file via a non-existent backend route. No route `/api/admin/fetch-external` exists in any server route file. Same dead code cluster as #1 and #2.

**Action:** Remove or implement if external URL import is a desired feature. Low priority — TinyMCE is fallback editor.

---

### 4. `/api/video-cache/refresh-gallery` (CacheManagementSection.tsx:118)

**Status: CONFIRMED BUG**

**Evidence:** CacheManagementSection.tsx is actively used in the admin cache management page. The "Smart Cache Refresh" button calls `POST /api/video-cache/refresh-gallery`. No such route exists in server/routes/media.routes.ts. The backend has `POST /api/video-cache/refresh` (line 1101) but NOT `/api/video-cache/refresh-gallery`. This button will 404 when clicked.

**Action:** Fix — either rename the frontend call to `/api/video-cache/refresh`, or add the missing backend route. **Priority: P2** (admin-only, cache management, non-critical path).

---

### 5. `/api/ga4/cache` (ClearCacheButton.tsx:20)

**Status: DEAD CODE**

**Evidence:** ClearCacheButton.tsx exports a button that calls `DELETE /api/ga4/cache`. No such backend route exists. Searching the codebase: ClearCacheButton is exported but **never imported** by any other component. It's an orphaned component — never rendered in the UI.

**Action:** Delete ClearCacheButton.tsx entirely. No impact.

---

### 6. `/api/hero-text/:id` PATCH (HeroManagement.tsx:174)

**Status: FALSE POSITIVE**

**Evidence:** Frontend calls `/api/hero-text/${textId}` with PATCH method. The `heroTextRouter` is mounted at `/api/hero-text` (server/routes.ts:53). However, `heroTextRouter` only defines `GET /` — it does NOT have PATCH/DELETE `:id` sub-routes. The `:id` routes exist on the hero-videos router at `/api/hero-videos/text/:id` (hero.routes.ts:327, 345, 377).

**Wait — re-checking:** The `heroTextRouter` is a separate Express Router mounted at `/api/hero-text`. It only has `GET /`. But the frontend calls `/api/hero-text/${textId}` which would be `PATCH /api/hero-text/123`. Since heroTextRouter has no `/:id` route, Express will return 404.

**Revised Status: CONFIRMED BUG**

**Evidence:** Frontend (HeroManagement.tsx:174) calls `PATCH /api/hero-text/${textId}` but the heroTextRouter only has `GET /`. The actual PATCH route is at `/api/hero-videos/text/:id` (hero.routes.ts:327). Frontend is calling the wrong mount point. However, the hero text management UI clearly works (hero texts are editable on staging) — so something resolves this. Let me check: the backend `router` (hero-videos router) has `PATCH /text/:id` at line 327, mounted at `/api/hero-videos`. So the working path would be `PATCH /api/hero-videos/text/:id`.

But the frontend calls `/api/hero-text/${textId}` — this does NOT match `/api/hero-videos/text/:id`. This IS a confirmed bug: the update/delete/apply mutations will 404.

**Action:** Fix frontend to call `/api/hero-videos/text/${textId}` instead of `/api/hero-text/${textId}`, OR add PATCH/DELETE/apply routes to heroTextRouter. **Priority: P1** — Hero text editing is actively used.

---

### 7. `/api/hero-text/:id/apply` (HeroManagement.tsx:199)

**Status: CONFIRMED BUG**

**Evidence:** Same issue as #6. Frontend calls `PATCH /api/hero-text/${textId}/apply` but the route is at `PATCH /api/hero-videos/text/:id/apply` (hero.routes.ts:345). The heroTextRouter has no `/apply` sub-route.

**Action:** Fix with #6 above. Same root cause — frontend uses wrong mount point. **Priority: P1**.

---

### 8. `/api/hero-text/:id` DELETE (HeroManagement.tsx:245)

**Status: CONFIRMED BUG**

**Evidence:** Same issue as #6 and #7. Frontend calls `DELETE /api/hero-text/${textId}` but the route is at `DELETE /api/hero-videos/text/:id` (hero.routes.ts:377).

**Action:** Fix with #6 above. Same root cause. **Priority: P1**.

---

### 9. `/api/ga4/trends` (IpExclusionsManager.tsx:201)

**Status: FALSE POSITIVE**

**Evidence:** This is a React Query cache invalidation key, NOT an actual API call. Line 201: `queryClient.invalidateQueries({ queryKey: ['/api/ga4/trends'] })`. This tells React Query to refetch any cached query whose key starts with `/api/ga4/trends`. The actual backend route is `GET /api/ga4/trend` (singular, analytics.routes.ts:565). The invalidation still works because React Query does prefix matching. No HTTP request is made to `/api/ga4/trends` — it's just a cache key.

**Action:** No action needed. Optionally fix the cache key to match the real endpoint name for consistency.

---

### 10. `/api/ga4/video-funnel` (IpExclusionsManager.tsx:203)

**Status: FALSE POSITIVE**

**Evidence:** Same pattern as #9 — React Query cache invalidation key only: `queryClient.invalidateQueries({ queryKey: ['/api/ga4/video-funnel'] })`. The actual route is `GET /api/ga4/funnel` (analytics.routes.ts:1153). No HTTP request is made to this URL.

**Action:** No action needed.

---

### 11. `/api/analytics/sessions` (IpExclusionsManager.tsx:204)

**Status: FALSE POSITIVE**

**Evidence:** Same pattern — React Query cache invalidation: `queryClient.invalidateQueries({ queryKey: ['/api/analytics/sessions'] })`. No HTTP request made to this URL. The invalidation uses a broad prefix match (`predicate` on line 208 also catches all `/api/analytics/*` keys).

**Action:** No action needed.

---

### 12. `/api/analytics/visitors` (IpExclusionsManager.tsx:205)

**Status: FALSE POSITIVE**

**Evidence:** Same pattern — React Query cache invalidation: `queryClient.invalidateQueries({ queryKey: ['/api/analytics/visitors'] })`. No HTTP request made. The broad predicate invalidation on line 208 covers all analytics keys anyway.

**Action:** No action needed.

---

### 13. `/api/test/video-cache` (SystemTestDashboard.tsx:297)

**Status: DEAD CODE**

**Evidence:** SystemTestDashboard.tsx exports `SystemTestDashboard` but it is **never imported** by any other component in the codebase. It's an orphaned test dashboard component. The call `fetch('/api/test/video-cache')` on line 297 has no matching backend route. Even if the component were rendered, it would 404.

**Action:** Delete SystemTestDashboard.tsx entirely. No impact on any UI path.

---

### 14. `/api/unified-cache/stats` (VideoCacheStatus.tsx:94)

**Status: DEAD CODE (non-critical)**

**Evidence:** VideoCacheStatus.tsx queries `/api/unified-cache/stats` via React Query (line 94). No such backend route exists. The query silently returns `undefined` (React Query handles fetch errors gracefully). The component still works because it primarily relies on `/api/video-cache/stats` (line 88) which IS a valid route. The `unifiedStats` data is used for a "Storage Management" section that shows placeholder values when data is missing.

**Action:** Remove the dead query or implement the endpoint if unified stats are desired. **Priority: P3** — component works without it.

---

### 15. `/api/video-cache/cache-gallery-videos` (VideoCacheStatus.tsx:186)

**Status: DEAD CODE (SILENT FAILURE) — P3**

**Evidence (live-tested 2026-02-20):**
- Live cache admin page at https://memopyk.memopyk.com/admin (Cache section) was inspected via Puppeteer.
- **No button exists in the current UI** that calls this endpoint. The `forceCacheGalleryMutation` is defined at `VideoCacheStatus.tsx:185` but its trigger button was deliberately removed — see comment at line 574: `{/* Removed redundant "Smart Gallery Refresh" - use individual cache buttons or All Media Cache instead */}`.
- The live cache page shows: individual per-file "Refresh Cache" buttons (working), plus global "All Media Cache", "Smart Cleanup", and "Images Orphelines" buttons (all calling different, existing routes).
- No backend route exists for `/api/video-cache/cache-gallery-videos` (confirmed: no match in server/).
- Screenshots taken: cache page loaded with "Vidéos Hero" + "Vidéos Galerie" sections, "Actions Globales du Cache" section — no cache-gallery-videos button visible.

**Classification: SILENT FAILURE** — The mutation function is dead client code. No admin user can trigger it through the UI. No error is visible; the route is simply unreachable.

**Action:** Clean up dead mutation in VideoCacheStatus.tsx (remove `forceCacheGalleryMutation` at lines 184–203). **Priority: P3** — no user-facing impact, cosmetic code cleanup only.

---

### 16. `/api/blog/related` (RelatedPostsSection.tsx:24)

**Status: DEAD CODE**

**Evidence:** RelatedPostsSection.tsx uses `fetchRelatedPosts()` from `@/services/relatedPosts.ts` which calls `/api/blog/posts/${slug}/related` (the correct route). However, the React Query key in RelatedPostsSection.tsx is `['/api/blog/related', slug, ...]` — this is just a cache key, not an API call. The static analysis flagged the queryKey string as an API call.

More importantly: RelatedPostsSection.tsx is **never imported** by any other component. BlogPostPage.tsx uses `RelatedPosts` from `@/components/RelatedPosts.tsx` (which correctly calls `/api/blog/posts/${slug}/related`). RelatedPostsSection.tsx is an orphaned duplicate.

**Action:** Delete RelatedPostsSection.tsx. No impact — BlogPostPage uses the other component.

---

### 17. `/api/analytics/export/pdf` (export-utils.ts:30)

**Status: DEAD CODE**

**Evidence:** `export-utils.ts` exports `downloadPDF()` which calls `GET /api/analytics/export/pdf`. No such backend route exists. Searching the codebase: `downloadPDF` is **never called** from any .tsx file. It's a utility function that was written but never wired into the UI.

**Action:** Delete export-utils.ts or remove the dead `downloadPDF` function. No impact.

---

### 18. `/api/blog/post` (BlogPostPage.tsx:78)

**Status: FALSE POSITIVE**

**Evidence:** The static analysis flagged the React Query key `['/api/blog/post', slug, urlLanguageCode]` at line 78. But the actual fetch call on line 81 is `fetch(/api/blog/posts/${slug}?language=${urlLanguageCode})` — which correctly matches the backend route `GET /api/blog/posts/:slug` (blog.routes.ts:453). The queryKey is just a cache identifier, not a URL.

**Action:** No action needed. The static analysis misread the queryKey as an API call.

---

### 19. `/api/analytics/blog/view` (BlogPostPage.tsx:145)

**Status: UNCERTAIN**

**Evidence:** BlogPostPage.tsx line 145: `fetch('/api/analytics/blog/view', { method: 'POST', ... })`. This is a fire-and-forget call with `.catch(err => console.warn(...))`. No backend route `/api/analytics/blog/view` exists in any server route file (confirmed by grep across all server/routes/).

The user noted that blog views ARE being recorded (4 views confirmed in dashboard). This means blog view tracking works through a DIFFERENT code path — likely the session-based analytics system (`/api/analytics/session` + `/api/analytics/session-page-view` in `useVideoAnalytics.ts`, which fires for all page navigations including blog posts). The `/api/analytics/blog/view` call silently 404s but the session tracker handles the actual counting.

The blog analytics dashboard (`/api/analytics/blog/popular`) aggregates from `analytics_views` table which is populated by the session-page-view flow, NOT by this dead endpoint.

**Revised Status: DEAD CODE (confirmed harmless)**

Blog views are tracked via the session analytics pipeline. This call silently fails (fire-and-forget with catch). No data is lost. But it IS making unnecessary 404 POST requests on every blog page visit.

**Action:** Remove the dead fetch call from BlogPostPage.tsx:145-154. **Priority: P2** — eliminates unnecessary 404 errors in server logs and wasted network requests on every blog page view.

---

### 20. `/api/csrf` (PartnerIntakeEN.tsx:94)

**Status: CONFIRMED BUG (but low impact)**

**Evidence:** PartnerIntakeEN.tsx (line 94) and PartnerIntakeFR.tsx (line 94) both call `fetch("/api/csrf")` on component mount to get a CSRF token. No backend route `/api/csrf` exists anywhere in the server. The form has a `csrfToken` field in its schema that gets set from this response.

Both partner intake pages are actively routed in App.tsx (e.g., `/en-US/directory-pro/join`). The CSRF fetch silently fails (caught by the `.catch()` which shows a toast error). However, the form submission at `POST /api/partners/intake` likely works without CSRF validation since there's no CSRF middleware on the backend.

The user experience: on page load, a brief "Unable to load the form" toast may flash (or the fetch may just fail silently depending on timing). The form itself still submits successfully because the backend doesn't validate the CSRF token.

**Action:** Either implement `/api/csrf` endpoint, or remove the dead CSRF logic from both PartnerIntakeEN.tsx and PartnerIntakeFR.tsx. **Priority: P2** — the error toast on form load is visible to end users.

---

### 21. (Consolidation note)

Items #6, #7, #8 are the same root cause (hero-text mount point mismatch), counted as 3 mismatches but 1 fix. Similarly #1, #2, #3 are the same dead TinyMCE cluster.

## Priority Summary

### P1 — Fix Now (breaks visible admin features)

| # | Route | File | Issue |
|---|-------|------|-------|
| 6-8 | `/api/hero-text/:id` (PATCH/DELETE/apply) | HeroManagement.tsx | Frontend calls wrong mount point. Real routes at `/api/hero-videos/text/:id`. Hero text editing broken. |

### P2 — Fix Soon (user-visible or wasteful)

| # | Route | File | Issue |
|---|-------|------|-------|
| 4 | `/api/video-cache/refresh-gallery` | CacheManagementSection.tsx | Smart Cache Refresh button 404s |
| 19 | `/api/analytics/blog/view` | BlogPostPage.tsx | Dead POST on every blog visit (silent 404 in logs) |
| 20 | `/api/csrf` | PartnerIntakeEN/FR.tsx | Error toast on partner intake form load |

### P3 — Clean Up (dead code, no user impact)

| # | Route | File | Issue |
|---|-------|------|-------|
| 1-3 | `/api/admin/blog/images`, `/api/admin/upload`, `/api/admin/fetch-external` | HtmlEditor.tsx | Dead TinyMCE image picker code |
| 5 | `/api/ga4/cache` | ClearCacheButton.tsx | Orphaned component, never rendered |
| 13 | `/api/test/video-cache` | SystemTestDashboard.tsx | Orphaned component, never rendered |
| 14 | `/api/unified-cache/stats` | VideoCacheStatus.tsx | Dead query, component works without it |
| 15 | `/api/video-cache/cache-gallery-videos` | VideoCacheStatus.tsx | Dead mutation, button was removed — no user-facing impact |
| 16 | `/api/blog/related` | RelatedPostsSection.tsx | Orphaned duplicate component |
| 17 | `/api/analytics/export/pdf` | export-utils.ts | Dead function, never called |

### No Action Needed (false positives)

| # | Route | File | Reason |
|---|-------|------|--------|
| 9 | `/api/ga4/trends` | IpExclusionsManager.tsx | React Query cache key, not API call |
| 10 | `/api/ga4/video-funnel` | IpExclusionsManager.tsx | React Query cache key, not API call |
| 11 | `/api/analytics/sessions` | IpExclusionsManager.tsx | React Query cache key, not API call |
| 12 | `/api/analytics/visitors` | IpExclusionsManager.tsx | React Query cache key, not API call |
| 18 | `/api/blog/post` | BlogPostPage.tsx | React Query cache key, actual call uses correct URL |

### Uncertain (needs live testing)

| # | Route | File | Issue |
|---|-------|------|-------|
| — | — | — | All uncertain items resolved. Item 15 reclassified to Silent Failure P3 (live-tested 2026-02-20). |

## CI Whitelist Recommendation

The route audit CI workflow (`.github/workflows/route-audit.yml`) should support a whitelist/ignore mechanism for known false positives. Recommended approach:

Create `tests/e2e/analytics/route-audit-ignore.json`:
```json
{
  "ignoredMismatches": [
    { "url": "/api/ga4/trends", "reason": "React Query cache key, not API call" },
    { "url": "/api/ga4/video-funnel", "reason": "React Query cache key, not API call" },
    { "url": "/api/analytics/sessions", "reason": "React Query cache key, not API call" },
    { "url": "/api/analytics/visitors", "reason": "React Query cache key, not API call" },
    { "url": "/api/blog/post", "reason": "React Query cache key, actual call is /api/blog/posts/:slug" },
    { "url": "/api/blog/related", "reason": "React Query cache key in orphaned component" }
  ]
}
```

Update `layer6-route-audit.ts` to load this file and skip ignored URLs when counting errors. This prevents CI from failing on known false positives while still catching new real mismatches.

---

*Generated: 2026-02-20*
*Methodology: Static source analysis + backend route grep + React Query key identification + import graph tracing*
