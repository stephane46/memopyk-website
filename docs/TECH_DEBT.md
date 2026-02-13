# Technical Debt & Deferred Work

**Purpose**: Track technical improvements, skipped tests, and deferred tasks
**Last Updated**: 2026-02-13

---

## Active Items

### Puppy Post Image Alt Text + Internal Links
**Date Added**: 2026-02-13
**Severity**: Low
**Location**: blog_posts table (2 published puppy posts)
**Details**: 4 images have empty alt text, no internal links to /gallery or /faq. SQL fixes documented in docs/reports/puppy-posts-analysis.md.
**To Fix**: Run documented SQL UPDATE statements (DB write access needed).

### Mapbox GL JS Migration
**Date Added**: 2026-01-30
**Severity**: Medium
**Location**: Partner Directory map
**Details**: Current minimal map implementation works but Mapbox GL JS would improve UX with better interactivity, clustering, and mobile support.
**To Fix**: Dedicated Mapbox migration task.

### Analytics Dashboard Strategic Decision
**Date Added**: 2026-02-11
**Severity**: Medium
**Location**: Admin analytics section
**Details**: 8,000+ lines of analytics code. Decision needed: fix existing code vs. clean rebuild with custom business metrics that GA4 can't provide. Blog analytics endpoints (5 new) already built Feb 11.
**To Fix**: Strategic decision from Stéphane, then execute.

### E2E Tests — Skipped Suites
**Date Added**: 2026-02-02
**Severity**: Low
**Location**: `tests/e2e/admin-blog.spec.ts`
**Details**: AI Creator tests (4 skipped — tab not rendering in Playwright) and Post Actions tests (3 skipped — no posts in staging DB).
**To Fix**: Investigate AI Creator rendering; seed staging DB or create test fixtures.

---

## Resolved (Feb 2026)

| Date | Item | Solution |
|------|------|----------|
| Feb 13 | Disconnected Brand Brain | Enriched 6 entries (1900-2800 chars), connected to AI generation endpoint |
| Feb 13 | Hardcoded AI prompts | Removed 129-line MASTER_PROMPT_TEMPLATE, replaced with server-side Brand Brain endpoint |
| Feb 13 | Static sitemap | Dynamic /sitemap.xml from published blog posts, 1-hour cache |
| Feb 13 | Dead code (4 endpoints + 2 pages + seoRedirects) | Removed from analytics.routes.ts, AdminPage, schema.ts |
| Feb 13 | Blog editor missing AI integration | AI Assist button with modal, language selector, sitemap/FAQ toggles |
| Feb 13 | Missing WhatsApp share | Added WhatsApp button to BlogPostPage |
| Feb 13 | 13 draft articles with placeholder content | Regenerated with Brand Brain-powered AI (4-6 min reads, 5.5-6.5K chars) |
| Feb 13 | 36 client TS errors | Fixed (0 remaining, build passes clean) |
| Feb 12 | SEO service was a stub | Real implementation: bilingual settings, head preview, audit log, history |
| Feb 12 | Help content gaps (4 screens) | Image Bank, Partners, Travel Agencies expanded; Cache help fully rewritten (20/20 pass) |
| Feb 12 | 34K duplicate SEO rows | Cleaned to 2 rows; added unique constraint on seo_settings.page |
| Feb 11 | Help system for non-blog admin sections | 22 new help_screens added (31 total), all admin sections covered |
| Feb 9 | 48 dead files in codebase | Deleted (Phase 2: Dead Code Removal) |
| Feb 9 | ~12,000 lines of dead code | Removed across 46 components + 2 route files |
| Feb 9 | 5 unprotected admin routes | requireAdmin middleware added (Phase 1: Security) |
| Feb 9 | Hardcoded SEO token | Removed |
| Feb 9 | Missing database indexes | 9 indexes added on keywords, topics, assignments, posts |
| Feb 9 | Inconsistent fetch patterns | Standardized across 11 files, 1,195 lines removed |
| Feb 9 | AdminPage monolith | React.lazy code splitting, HeroManagement + CacheManagement extracted |
| Feb 9 | GalleryManagementNew (2,599 lines) | Split into 606-line parent + 5 sub-components |
| Feb 2 | BlogManagePosts.tsx (807 lines) | Extracted TagManagementModal (258 lines) |
| Feb 2 | Duplicate tag management code | Shared hooks in useTagMutations.ts |
| Feb 2 | No loading skeletons | Skeleton components created |
| Feb 2 | No error boundaries | ErrorBoundary.tsx wrapping all blog components |
| Feb 2 | BlogPost type duplicated | Shared types in shared/blogTypes.ts |

---

## How to Use This File

1. Add new items with date, severity, location, and fix approach
2. Move to Resolved when complete (keep for reference)
3. Review during planning to prioritize
