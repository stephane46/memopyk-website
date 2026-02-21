# Cache Buttons Audit Report

**Date:** 2026-02-21
**Auditor:** Claude (end-to-end trace)
**Branch:** staging (3f98148)
**File:** `client/src/components/admin/CacheManagementSection.tsx`

---

## Button 1: All Media Cache (purple)

| Aspect | Details |
|--------|---------|
| **Label** | All Media Cache |
| **Subtitle** | "Cache tous les medias avec verification complete" |
| **Mechanism** | Dispatches `CustomEvent('triggerAllMediaCache')` on `window` |
| **Listener** | `VideoCacheStatus.tsx:50` — calls `forceAllMediaMutation.mutate()` |
| **API endpoint** | `POST /api/video-cache/force-all-media` |
| **Server handler** | `media.routes.ts:1061` — calls `collectAllMediaFiles()` then `videoCache.forceCacheAllMedia(media)` |
| **Actual behavior** | Downloads ALL hero videos + gallery videos + gallery images from Supabase CDN to server-side cache. Verifies each file. Returns stats (attempted/successful counts + processing time). |
| **Race condition risk** | Low — both `CacheManagementSection` and `VideoCacheStatus` are rendered together on the cache tab. The listener is attached in a `useEffect` on mount. |
| **Verdict** | **Works as labeled** |

### Notes
- The `CacheManagementSection` listens for `bulletproofCacheComplete` / `bulletproofCacheError` events dispatched by `VideoCacheStatus` on completion, to update the button's loading state.
- There are **2 instances** of `VideoCacheStatus` mounted (Hero + Gallery), so the event fires `forceAllMediaMutation` in **both** instances simultaneously. This means two concurrent `POST /api/video-cache/force-all-media` requests. Not ideal but harmless — the second request just re-downloads the same files.

---

## Button 2: Smart Cleanup (blue)

| Aspect | Details |
|--------|---------|
| **Label** | Smart Cleanup |
| **Subtitle** | "Supprime fichiers expires (>30j) + orphelins uniquement" |
| **Mechanism** | Dispatches `CustomEvent('triggerClearCache')` on `window` |
| **Listener** | `VideoCacheStatus.tsx:54` — calls `clearCacheMutation.mutate()` |
| **API endpoint** | `POST /api/video-cache/clear` |
| **Server handler** | `media.routes.ts:1089` — calls `videoCache.clearCacheCompletely()` |
| **Actual behavior** | `clearCacheCompletely()` calls `clearAll()` which calls `clearDir(videoCacheDir)` + `clearDir(imageCacheDir)` — **deletes ALL cached files unconditionally** |
| **Verdict** | **MISMATCH — label says "smart cleanup" but behavior is "delete everything"** |

### Severity: HIGH

The label explicitly promises selective deletion: "Supprime fichiers expires (>30j) + orphelins uniquement" (only removes expired files >30 days + orphans). But the actual code path is:

```
triggerClearCache event
  → VideoCacheStatus.clearCacheMutation
    → POST /api/video-cache/clear
      → videoCache.clearCacheCompletely()
        → videoCache.clearAll()
          → clearDir(videoCacheDir)  // deletes ALL videos
          → clearDir(imageCacheDir)  // deletes ALL images
```

There is **no age check, no orphan check** — it wipes everything. The `cleanup()` method in `video-cache.service.ts:153` does have age-based cleanup (`cleanupDir`), but **it is never called** by this button's code path.

### Additional issue: dual firing

Like Button 1, the event is received by **two** `VideoCacheStatus` instances (Hero + Gallery), causing two concurrent `POST /api/video-cache/clear` requests. Since the first one already deletes everything, the second is harmless but wasteful.

### Toast message is also misleading

The `clearCacheMutation.onSuccess` in `VideoCacheStatus.tsx:191` says "Removed X outdated videos and Y expired images. Active cache preserved." — but nothing is "preserved"; everything is deleted.

---

## Button 3: Images Orphelines (orange outline)

| Aspect | Details |
|--------|---------|
| **Label** | Images Orphelines |
| **Subtitle** | "Supprime images inutilisees uniquement" |
| **Mechanism** | Direct `apiRequest('/api/cache/cleanup-orphaned-static-images', 'POST')` |
| **API endpoint** | `POST /api/cache/cleanup-orphaned-static-images` |
| **Server handler** | `media.routes.ts:1126` |
| **Actual behavior** | Fetches all gallery items from DB, builds a set of referenced image filenames, calls `videoCache.cleanupOrphanedImages(referenced)` which removes only cached images NOT in the referenced set. |
| **Verdict** | **Works as labeled** |

### Notes
- Only operates on images, not videos. Label is accurate.
- Compares cached image filenames against gallery items' `staticImageUrlEn` and `staticImageUrlFr` fields.
- Returns count of cleaned files and list of referenced images.
- No dual-firing issue — this button calls the API directly, not via CustomEvent.

---

## Contenu Footer Display

| Aspect | Details |
|--------|---------|
| **Display** | "Contenu: 7 Videos + 6 Images (~303.9MB total)" |
| **API endpoint** | `GET /api/cache/breakdown` |
| **Server handler** | `media.routes.ts:967` — calls `videoCache.getDetailedCacheBreakdown()` |
| **Data** | Returns real filesystem stats: 7 video files (300.8MB) + 6 image files (3.1MB) = 13 files, 303.9MB |
| **Refresh** | Polled every 5 seconds (`refetchInterval: 5000`) |
| **Verdict** | **Works correctly — real data** |

### Actual breakdown (from live API):
- Videos: VideoHero1.mp4, VideoHero2.mp4, VideoHero3.mp4, PomGalleryC.mp4, PomGalleryC_EN.mp4, VitaminSeaC.mp4, safari-1.mp4
- Images: AAA_002_0000014-C.jpg, VitaminSeaC-C.jpg, 4x static_auto_*.jpg
- All files last modified 2026-02-11

---

## Summary of Issues

| # | Severity | Issue | Affected |
|---|----------|-------|----------|
| **1** | **HIGH** | Button 2 "Smart Cleanup" deletes ALL cache, not just expired/orphaned files. Label and behavior are contradictory. | Button 2 label, subtitle, toast message |
| **2** | LOW | Buttons 1 and 2 fire via CustomEvent received by 2 `VideoCacheStatus` instances, causing duplicate API calls | Buttons 1 & 2 |
| **3** | LOW | `CacheManagementSection` also declares `refreshCacheMutation`, `smartCacheRefreshMutation`, and `clearCacheMutation` that are never used (dead code — the buttons use CustomEvents instead) | `CacheManagementSection.tsx:98-158` |

---

## Recommended Fixes

### Issue 1 (HIGH) — Button 2 label/behavior mismatch

**Option A: Fix the label to match the behavior**
Change the button label from "Smart Cleanup" to "Clear All Cache" and subtitle from "Supprime fichiers expires (>30j) + orphelins uniquement" to "Supprime tous les fichiers en cache (videos + images)". This is the simplest fix.

**Option B: Fix the behavior to match the label**
Change the event handler to call a real smart cleanup that only removes files older than 30 days. The `cleanup()` method already exists in `video-cache.service.ts:153` but would need to be exposed via a new endpoint or the existing `/api/video-cache/clear` would need to be changed.

### Issue 2 (LOW) — Duplicate API calls
Could be fixed by having only one `VideoCacheStatus` instance listen for global events, or by moving the event listeners to `CacheManagementSection` itself.

### Issue 3 (LOW) — Dead mutations
The 3 unused mutations in `CacheManagementSection.tsx` (lines 98-158) can be deleted. The component doesn't use them — it relies on CustomEvents to trigger mutations in `VideoCacheStatus`.
