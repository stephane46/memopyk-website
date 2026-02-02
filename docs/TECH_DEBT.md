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

## Code Quality Issues

### BlogManagePosts.tsx (807 lines)
**Date Added**: 2026-02-02  
**Issue**: File too large, TagManagementModal should be extracted  
**Priority**: Medium  
**Effort**: ~1 hour

---

### Duplicate Tag Management Code
**Date Added**: 2026-02-02  
**Issue**: Both BlogManagePosts and BlogTagManagement have tag CRUD  
**Priority**: Medium  
**Effort**: ~2 hours to consolidate

---

### No Loading Skeletons
**Date Added**: 2026-02-02  
**Issue**: Most components show simple spinners instead of skeleton loaders  
**Priority**: Low (UX polish)  
**Effort**: ~3 hours

---

### No Error Boundaries
**Date Added**: 2026-02-02  
**Issue**: Complex components lack error boundaries  
**Priority**: Medium (reliability)  
**Effort**: ~2 hours

---

### BlogPost Type Duplicated
**Date Added**: 2026-02-02  
**Issue**: BlogPost type defined in multiple files instead of shared  
**Location**: BlogManagePosts.tsx, BlogEditor.tsx, BlogAICreator.tsx  
**Priority**: High (maintainability)  
**Effort**: ~30 minutes

---

## How to Use This File

1. **Add new items** with date, reason, location, and fix approach
2. **Update status** when work begins or completes
3. **Review weekly** during planning to prioritize
4. **Remove items** once fully resolved (or move to a "Completed" section)
