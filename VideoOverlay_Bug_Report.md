# VideoOverlay Remounting Bug - Technical Report

## CRITICAL ISSUE SUMMARY
VideoOverlay component constantly remounts during video playback (~every 250ms), preventing GA4 video analytics events (video_progress, video_complete) from firing properly.

## EVIDENCE
- Console logs show pattern: `🎬🎬🎬 VideoOverlay MOUNTED` on every timeupdate event
- Video plays for 32 seconds → 150+ component remounts
- GA4 events: video_start ✅ | video_progress ❌ | video_complete ❌
- Issue confirmed across multiple testing sessions

## ROOT CAUSE ANALYSIS
The VideoOverlay component is being completely unmounted and remounted by its parent (GallerySection) on every video timeupdate event. This destroys all internal state, refs, and event listeners, preventing milestone tracking.

### What Triggers the Remounting
1. Video timeupdate event fires (~250ms intervals)
2. Something in GallerySection re-renders 
3. VideoOverlay gets completely recreated
4. All progress tracking state is lost

## ATTEMPTED FIXES & RESULTS

### ✅ SUCCESSFUL FIXES
1. **CTA Button Text Update** - Changed to emphasize "free" services
2. **Prop Memoization** - Used useCallback for functions passed to VideoOverlay
3. **Resize Effect Stabilization** - Fixed unstable dependencies in resize handler

### ❌ FAILED FIXES
1. **getVideoDimensions useCallback** - Didn't prevent remounting
2. **Resize effect dependency fix** - Reduced some re-renders but core issue persists
3. **VideoOverlay internal optimizations** - Component-level fixes can't solve parent-caused remounting

## CURRENT STATE
- VideoOverlay still remounts on every timeupdate
- GA4 video analytics broken
- Video playback works but no progress tracking
- Analytics New dashboard missing video KPIs

## TECHNICAL INVESTIGATION NEEDED

### Priority 1: Find Parent Re-render Cause
The issue is in GallerySection component causing VideoOverlay to remount. Need to investigate:

1. **State Updates**: What state changes are triggered by video timeupdate?
2. **Effect Dependencies**: Are there unstable dependencies causing re-renders?
3. **Context Changes**: Is there a context provider causing cascading updates?
4. **Query Invalidation**: Are TanStack Query updates triggering re-renders?

### Priority 2: React DevTools Analysis
Use React DevTools Profiler to:
- Record component re-renders during video playback
- Identify what props/state are changing in GallerySection
- Find the exact trigger causing VideoOverlay remount

### Priority 3: Component Architecture Review
Consider if VideoOverlay should be:
- Moved outside of GallerySection's render tree
- Rendered at a higher level (App component)
- Implemented as a portal to avoid parent re-renders

## AFFECTED FILES
- `client/src/components/gallery/VideoOverlay.tsx` - Main video component
- `client/src/components/sections/GallerySection.tsx` - Parent component causing remounts
- `client/src/lib/analytics.ts` - GA4 event firing logic
- `client/src/hooks/useVideoAnalytics.ts` - Local analytics tracking
- `client/src/components/debug/GaDebugHud.tsx` - Debug interface

## GA4 EVENTS STATUS
- `video_start`: ✅ Fires correctly on first mount
- `video_progress`: ❌ Never fires (component remounts before milestones)
- `video_complete`: ❌ Never fires (component remounts constantly)

## RECOMMENDED INVESTIGATION APPROACH
1. Add detailed logging to GallerySection render method
2. Use React DevTools to track re-render causes
3. Consider moving VideoOverlay outside current render tree
4. Implement stable references for all VideoOverlay props
5. Review if any context providers are causing updates

## BUSINESS IMPACT
- Analytics New dashboard incomplete
- Video engagement metrics unavailable
- GA4 video tracking non-functional
- Cannot measure video performance or user behavior

---
*Report generated: 2025-09-05*
*Issue Duration: 2+ days*
*Status: UNRESOLVED - Requires architectural investigation*