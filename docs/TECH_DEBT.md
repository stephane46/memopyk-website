# Technical Debt & Deferred Work

**Purpose**: Track technical improvements, skipped tests, and deferred tasks  
**Last Updated**: 2026-02-02

---

## E2E Tests - Skipped / Incomplete

### AI Creator Tests (4 tests skipped)
**Date Added**: 2026-02-02  
**Reason**: UI not accessible during E2E test run  
**Location**: `tests/e2e/admin-blog.spec.ts`  
**Tests**:
- AI Creator tab loads with form fields
- "Generate Prompt" creates prompt text
- Can paste JSON and validate
- "Create Post" creates new draft post

**To Fix**: Investigate why AI Creator tab is not rendering in Playwright. May need:
- Check if tab is conditionally rendered
- Verify correct navigation path
- Check for JavaScript errors blocking render

---

### Post Actions Tests (3 tests skipped)
**Date Added**: 2026-02-02  
**Reason**: No posts available in staging database  
**Location**: `tests/e2e/admin-blog.spec.ts`  
**Tests**:
- View button opens public post in new tab
- Translate button creates duplicate in other language
- Delete button shows confirmation, then deletes

**To Fix**: Either:
1. Seed staging DB with test posts before running E2E
2. Create a test fixture that creates a post at test start
3. Use existing posts if available (query first)

---

## Code Quality Issues - RESOLVED 2026-02-02

### ~~BlogManagePosts.tsx (807 lines)~~ ✅ RESOLVED
**Resolved**: 2026-02-02  
**Solution**: Extracted TagManagementModal.tsx (258 lines). BlogManagePosts reduced to 555 lines.

---

### ~~Duplicate Tag Management Code~~ ✅ RESOLVED
**Resolved**: 2026-02-02  
**Solution**: Created `client/src/admin/hooks/useTagMutations.ts` with shared hooks (useTagsQuery, useCreateTag, useUpdateTag, useDeleteTag). Both TagManagementModal and BlogTagManagement now use shared hooks.

---

### ~~No Loading Skeletons~~ ✅ RESOLVED
**Resolved**: 2026-02-02  
**Solution**: Created skeleton components in `client/src/admin/skeletons/`:
- BlogPostSkeleton.tsx - Post list loading
- BlogEditorSkeleton.tsx - Editor loading
Updated BlogManagePosts.tsx and BlogEditor.tsx to use skeletons.

---

### ~~No Error Boundaries~~ ✅ RESOLVED
**Resolved**: 2026-02-02  
**Solution**: Created `client/src/components/ErrorBoundary.tsx`. Wrapped all blog components in BlogManagement.tsx and ContentProductionHub.tsx with error boundaries.

---

### ~~BlogPost Type Duplicated~~ ✅ RESOLVED
**Resolved**: 2026-02-02  
**Solution**: Created `shared/blogTypes.ts` with shared BlogPost and BlogPostStatus types. Updated BlogManagePosts.tsx and BlogEditor.tsx to import from shared location.

---

## How to Use This File

1. **Add new items** with date, reason, location, and fix approach
2. **Update status** when work begins or completes
3. **Review weekly** during planning to prioritize
4. **Mark resolved** with date and solution summary (keep for reference)
5. **Archive** old resolved items periodically to keep file manageable
