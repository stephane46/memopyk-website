# Technical Debt & Deferred Work

**Purpose**: Track technical improvements, skipped tests, and deferred tasks
**Last Updated**: 2026-02-17

---

## Active Items

### Cookie Consent Banner (GDPR)
- The cookie consent banner is decorative — GA4 fires unconditionally regardless of user choice
- localStorage key `memopyk-consent-demo` stores preferences that nothing reads
- `analytics_storage` is hardcoded to `"granted"` in the GA4 initialization
- This is not GDPR-compliant for a French company targeting French consumers (CNIL risk)
- **Priority**: Address after analytics dashboard stabilization is complete
- **Files**: `client/src/App.tsx` (GA4 init), `client/src/components/ui/CookieBanner.tsx`, `client/src/analytics/ga.ts`

---

## Resolved (Feb 2026)

| Date | Item | Solution |
| Feb 17 | Schema alignment — 19 warnings → 0 | 15 text→varchar fixes + 4 nullable fixes in Drizzle schema. Audit now 0 CRITICAL / 0 WARNING / 0 INFO. |
| Feb 17 | Contact form rate limiting | Per-IP: 3/hr, 10/day. Global: 50/hr. Honeypot field catches bots silently. Middleware at `server/middleware/rate-limit.ts`. |
| Feb 17 | Web Vitals collection removed | Collection code removed (unnecessary DB writes with no UI). performance_metrics table retained (13,669 historical rows). |
| Feb 17 | Schema audit script | Automated script at `tests/e2e/schema-audit.ts` — compares 33 Drizzle tables (485 columns) against actual DB. Run with `npx tsx tests/e2e/schema-audit.ts`. |
| Feb 17 | Schema vs DB mismatches (Replit ghosts) | 5 total found and fixed: FAQ `titleEn`/`titleFr`→`nameEn`/`nameFr`, blog_tags phantom `createdAt`/`updatedAt`, performance_metrics completely wrong table, country_names table doesn't exist, gallery_items 3 missing columns |
| Feb 17 | Blog tags 500 error | Phantom `createdAt`/`updatedAt` columns in Drizzle schema — removed to match actual DB |
| Feb 17 | Contact page placeholder | Created ContactPage.tsx wrapping existing ContactForm, replaced "Coming Soon" divs in App.tsx |
| Feb 17 | Smoke test infrastructure | 51-screen automated smoke test (29 admin + 22 public). Reusable before staging→production merges. |
| Feb 17 | Smoke test false positives | Word-boundary regex for 500/404/NaN/null, font CORS filtering, resilient selectors |
|------|------|----------|
| Feb 15 | V8 naive user test 28/28 CLEAR | Strict UI-only retest, Blog Editor 11/11, 2 final fixes (Agences heading, Flow 2 Step 6) |
| Feb 14 | Analytics dashboard — not a rebuild | Audited: 9,379 lines all active, only 516 orphan lines deleted. Working code, no rebuild needed. |
| Feb 14 | Mapbox GL JS migration | Replaced Leaflet with Mapbox GL JS + GeoJSON clustering in PartnerMapbox.tsx, updated EN/FR directories |
| Feb 14 | 7 skipped E2E tests | Unskipped and fixed 4 AI Creator + 3 Post Actions tests in admin-blog.spec.ts |
| Feb 14 | 5 orphan analytics files (516 lines) | Deleted: useLocationEnrichment, ga4Report, mockReport (x2), phase3.json |
| Feb 14 | 3 junk "Untitled Post" drafts | Deleted from blog_posts table via API |
| Feb 14 | 22 AMBIGUOUS help screens | Enriched all to 800-4300 chars with specific control descriptions, CSS badge classes |
| Feb 14 | 3 AMBIGUOUS flow steps | Added screen context to Flow 1 steps 4/6 and Flow 2 step 7 |
| Feb 14 | Post titles not clickable in Blog Hub | Made titles navigate to Blog Editor (/admin?tab=blog-edit&id={uuid}) |
| Feb 14 | Travel Agency tabs unstyled | Applied proper tab styling matching other admin sections |
| Feb 14 | Help jargon (Supabase, API references) | Removed from 5 help screens, replaced with plain language |
| Feb 13 | Puppy post alt text + internal links | Fixed via API: alt text for 4 images, internal links to /gallery and /faq in both EN and FR posts |
| Feb 13 | Help content gaps (3 screens) | Keywords count 12,501→107, Blog Hub Brand Brain link, Posts share buttons + language dialog |
| Feb 13 | Keyword count discrepancy (12,501 vs 107) | Updated in CLAUDE.md, admin-rules.md, keywords help screen |
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
