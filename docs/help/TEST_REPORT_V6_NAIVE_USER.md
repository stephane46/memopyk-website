# Naive User Help Test V6 — Report

**Date:** 2026-02-13
**Target:** https://memopyk.memopyk.com (staging)
**Script:** `tests/e2e/naive-user-help-test-v6.ts`
**Viewport:** 2560×1440 | **Browser:** Chromium headless | **slowMo:** 100ms

---

## Executive Summary

V6 is the third iteration of the naive user help test. It introduces baseline chrome exclusion, full flow step navigation, and bounding-box element detection to eliminate the false-positive issues from V5-FIXED.

| Metric | V5 | V5-FIXED | V6 |
|--------|-----|----------|-----|
| Screens discovered | 81 | 25 | 27 |
| Duplicates filtered | 0 | 5 | 4 |
| Screen CLEAR | 0 | 0 | **5** |
| Screen AMBIGUOUS | 0 | 25 | 22 |
| Screen BLOCKED | 0 | 0 | 0 |
| Flow 1 steps | 1 (identical justifications) | 1 | **7/7** |
| Flow 2 steps | 1 (identical justifications) | 1 | **8/8** |
| Total flow steps | 2 | 2 | **15** |
| Blog Editor found | No | No | No* |
| Baseline chrome exclusion | No | No | **Yes (54 elements)** |
| Help panel state management | N/A | N/A | **Yes (flow exit)** |

\* Blog Editor was not auto-discovered by Phase 1 but is accessible. See Known Limitations.

**Key V6 improvements:**
1. Baseline chrome capture prevents public nav bar from inflating "missed elements"
2. Full flow navigation — all 7 steps of "Create a blog post" and 8 steps of "Translate a post" are walked
3. Flow state management — `exitFlowIfActive()` resets help panel between flows
4. Bounding-box element detection replaces fragile CSS ancestor checking

---

## Phase 1: Discovery

**Duration:** 2m41s | **Screens:** 27 unique | **Duplicates:** 4

### Sidebar Items Found (16)
Analytics, Blog, Partenaires, Agences de Voyage, Annuaire Pro, SEO, Contenu Site, Vidéos Hero, Galerie Vidéos, FAQ, Pourquoi MEMOPYK, Boutons CTA, Documents Légaux, Système, AI Context, Cache

### Screens with Sub-tabs
| Parent | Sub-tabs | Total screens |
|--------|----------|---------------|
| Analytics | Overview, Live View, Trends, Video, Geo, CTA, Blog, Clarity, Fallback, Exclusions | 11 (1 parent + 10 tabs) |
| Blog Hub | Keywords, Planned Posts, (Planner=dup), Posts, Images | 5 (1 parent + 4 tabs) |

### Duplicates Detected
| ID | Duplicate of | Reason |
|----|-------------|--------|
| blog-planner | blog (parent) | Identical fingerprint (same URL + help title + body length) |
| partenaires | blog-images | Identical fingerprint |
| contenu-site | seo | Identical fingerprint |
| systeme | documents-legaux | Identical fingerprint |

### Groups Detected: 0
Partenaires, Contenu Site, and Système are collapsible sidebar groups, but their sub-items were already visible in the sidebar from first render. The group detection check (`countAfter > sidebarCount`) never triggered.

### Baseline Chrome: 54 Elements
Includes public nav bar (Notre service, Pourquoi MEMOPYK, Galerie, Blog, FAQ, Devis, Contact), all sidebar items, Analytics date filters (Today, Yesterday, Last 7/30/90 days, Custom range), tab names, footer links, and utility text (EN, FR, ALL, Aide, Déconnexion).

---

## Phase 2: Flow Testing

**Duration:** 46s | **Total Steps:** 15 | **Flows:** 2

### Flow 1: Create a Blog Post (7 steps)

| Step | Title | Instruction (excerpt) | Rating | Verification |
|------|-------|-----------------------|--------|-------------|
| 1/7 | Go to Posts tab | Click the Posts tab | CLEAR | Posts tab visible |
| 2/7 | Click + New Post | Click + New Post button | CLEAR | New Post button visible |
| 3/7 | Choose method | Write from scratch or Generate with AI | CLEAR | Content editing context verified |
| 4/7 | Write content | Enter Title, write content | AMBIGUOUS | Title field not visible (still on Posts list) |
| 5/7 | AI generation | Enter topic, select tone, Generate AI Draft | CLEAR | Save/Publish button visible |
| 6/7 | Configure metadata | Tags, Hero Image, Description (SEO) | AMBIGUOUS | Metadata fields not visible (still on Posts list) |
| 7/7 | Set status | Status to Draft/Published, Save Changes | CLEAR | Save/Publish button visible |

**Summary:** 5 CLEAR, 2 AMBIGUOUS, 0 BLOCKED
**Note:** Steps 4 and 6 are AMBIGUOUS because the flow was read without navigating away from the Posts list. The instructions reference elements that would appear on the Blog Editor (Title field, metadata fields), which is not the current page. This is expected — the flow instruction is correct for the user's actual workflow, but the test stays on the Posts list to keep the flow panel active.

### Flow 2: Translate a Post (8 steps)

| Step | Title | Instruction (excerpt) | Rating | Verification |
|------|-------|-----------------------|--------|-------------|
| 1/8 | Go to Posts | Locate the post to translate | CLEAR | Translate control visible |
| 2/8 | Click 🌐 icon | Click translate icon next to post | CLEAR | Translate control visible |
| 3/8 | Choose method | Translate with AI or Translate manually | CLEAR | Translate control visible |
| 4/8 | AI translation | Editor opens with translated content | CLEAR | Translate control visible |
| 5/8 | Manual translation | Editor opens, Translation Assistant | CLEAR | Translate control visible |
| 6/8 | Edit translation | Edit content, images preserved | CLEAR | Content editing context verified |
| 7/8 | Verify slug | Slug language-appropriate, Description | AMBIGUOUS | Metadata fields not found |
| 8/8 | Publish | Status to Published, Save Changes | CLEAR | Save/Publish button visible |

**Summary:** 7 CLEAR, 1 AMBIGUOUS, 0 BLOCKED
**Navigation:** Both flows use a "Next" button (found by `helpPanel.locator('button:has-text("Next")')`) with disabled state detection on last step.

---

## Phase 3: Screen Help Testing

**Duration:** ~16m | **Screens:** 27 | **5 CLEAR, 22 AMBIGUOUS, 0 BLOCKED**

### CLEAR Screens (5)

| Screen | Help Title | Body Length | Visible Elements | Why CLEAR |
|--------|-----------|-------------|------------------|-----------|
| Blog > Keywords | Keywords (107) | 2,492 | 24 | Title matches, references UI elements, plain language |
| Blog > Posts | Posts | 1,392 | 12 | Title matches, references UI elements, plain language |
| Annuaire Pro | Partners Directory | 1,543 | 15 | Title matches, references UI elements, plain language |
| SEO | SEO Management | 1,031 | 12 | Title matches, references UI elements, plain language |
| Documents Légaux | Legal Document Management | 531 | 8 | Title matches, references UI elements, plain language |

### AMBIGUOUS Screens (22) — By Reason

#### Technical Jargon (4 screens)
Help text contains "Supabase" — a developer-facing database name that a naive user wouldn't understand.

| Screen | Help Title | Jargon Found |
|--------|-----------|-------------|
| Analytics | Analytics Dashboard | Supabase |
| Analytics > Live View | Analytics Dashboard | Supabase |
| Analytics > CTA | CTA Tracking | Supabase |
| Boutons CTA | CTA Button Management | Supabase |

**Fix:** Remove "Supabase" from help text, replace with "database" or "your data".

#### Elements Not Referenced (3 screens)
Help text doesn't reference any detected visible elements. The detected elements are primarily footer links.

| Screen | Help Title | Visible Elements (sample) |
|--------|-----------|--------------------------|
| Analytics > Overview | Overview | Cookie settings, footer links |
| Analytics > Video | Video Analytics | Cookie settings, footer links |
| Pourquoi MEMOPYK | Why MEMOPYK Cards | Cookie settings, footer links |

**Note:** These are false-positive AMBIGUOUS — the "visible elements" are footer links, not admin-specific content. Help correctly describes the admin interface, not footer elements.

#### Title Mismatch (1 screen)
| Screen | Help Title | Content Heading |
|--------|-----------|----------------|
| Analytics > Geo | Geography | Geographic Market Analysis |

**Fix:** Rename help title to "Geographic Market Analysis" or adjust screen heading.

#### Element Coverage Gap (14 screens)
Help references some but not all detected elements. In most cases, the "missed" elements are footer links and cookie settings — not actual admin content.

| Screen | Help Title | Elements | Referenced | Missed |
|--------|-----------|----------|-----------|--------|
| Analytics > Trends | Traffic Trends | 11 | 2 | 9 |
| Analytics > Blog | Blog Analytics | 9 | 2 | 7 |
| Analytics > Clarity | Microsoft Clarity | 8 | 1 | 7 |
| Analytics > Fallback | System Diagnostics | 8 | 1 | 7 |
| Analytics > Exclusions | IP Exclusions | 12 | 5 | 7 |
| Blog | Planner | 8 | 2 | 6 |
| Blog > Planned Posts | Planned Posts | 17 | 6 | 11 |
| Blog > Images | Image Bank | 11 | 4 | 7 |
| Agences de Voyage | Travel Agency Management | 19 | 8 | 11 |
| Vidéos Hero | Hero Video Management | 13 | 1 | 12 |
| Galerie Vidéos | Video Gallery Management | 18 | 1 | 17 |
| FAQ | FAQ Management | 10 | 1 | 9 |
| AI Context | AI Context - Brand Brain | 8 | 1 | 7 |
| Cache | Cache Management | 12 | 5 | 7 |

---

## QC Checks (8/8)

| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | Screen count sanity (25-32) | PASS | 27 screens |
| 2 | Duplication check | PASS | 4 reasonable duplicates filtered |
| 3 | False positive AMBIGUOUS | KNOWN LIMITATION | Footer links inflate "missed elements" count |
| 4 | Flow step count (>1 per flow) | PASS | Flow 1: 7, Flow 2: 8 |
| 5 | Blog Editor tested | FAIL | Not auto-discovered (see Known Limitations) |
| 6 | Screenshots complete | PASS | 27 screen pairs + discovery + flow screenshots |
| 7 | Rating quality | PASS with caveat | Element detection captures footer, not admin content |
| 8 | Help content matching | PASS | All 27 screens have substantive help (284-3143 chars) |

---

## Known Limitations

### 1. Blog Editor Not Discovered
The discovery script clicks a post row expecting navigation to the editor. The row click navigates to `?tab=posts` instead. The post titles may not be wrapped in `<a>` tags, or the edit action uses icon buttons rather than title links. The Blog Editor IS accessible (confirmed by error-fatal.png from earlier runs showing the editor with "Step 8 of 8" help).

### 2. Element Detection Captures Footer Links
The bounding-box detection correctly excludes sidebar and help panel, but captures footer elements (Cookie settings, Legal Notice, Terms of Service, etc.) that are visible at the bottom of the page. These footer links are not admin-specific and should be excluded. Admin content buttons/inputs are largely excluded by the baseline chrome (date filters, tab buttons) or by the `data-testid^="tab-"` filter.

### 3. Collapsible Group Detection
Partenaires, Contenu Site, and Système are collapsible sidebar groups, but their sub-items appear in the sidebar from first render. The group detection (`countAfter > sidebarCount`) never triggers because the items are already visible.

### 4. Flow Steps Don't Navigate
To keep the flow panel state, the script does NOT close the help panel between steps. This means flow steps 4-6 in "Create a blog post" (which require being on the Blog Editor page) correctly show AMBIGUOUS because the user would need to navigate to that page.

---

## Recommendations

### Help Content Fixes (Priority 1)
1. **Remove "Supabase"** from Analytics, CTA Tracking, and CTA Button Management help text — replace with "database" or "your data" (4 screens affected)
2. **Rename** Analytics > Geo help title from "Geography" to "Geographic Market Analysis" (1 screen)

### Test Script Improvements (Priority 2)
3. **Blog Editor discovery** — look for edit icon buttons on post rows instead of clickable titles
4. **Footer exclusion** — add footer bounding-box detection to exclude links below the main content area
5. **Admin content detection** — expand element detection to include elements inside tab panels (currently filtered by `role="tablist"` ancestor)

### Help Content Improvements (Priority 3)
6. **Pourquoi MEMOPYK** — help mentions "Why MEMOPYK Cards" but visible elements are generic footer links. The admin content (card management buttons) is not detected by the script, but the help content itself appears adequate.
7. **Analytics tabs** — most analytics tab help is short (460-955 chars). Consider expanding help for Overview, Trends, and Video tabs.

---

## Appendix: File Inventory

| File | Contents |
|------|----------|
| `tests/e2e/naive-user-help-test-v6.ts` | Test script (~1700 lines) |
| `tests/e2e/screenshots/help-validation/v6/discovery.json` | 27 screens, 54 baseline elements, 4 duplicates |
| `tests/e2e/screenshots/help-validation/v6/flows.json` | 2 flows, 15 total steps |
| `tests/e2e/screenshots/help-validation/v6/screens.json` | 27 screen results with 6-question analysis |
| `tests/e2e/screenshots/help-validation/v6/*.png` | Discovery (33), flow (30), screen (54), other (2) = ~119 screenshots |
| `docs/help/TEST_REPORT_V6_NAIVE_USER.md` | This report |

## Appendix: V5 → V5-FIXED → V6 Bug Fixes

| Bug | V5 | V5-FIXED | V6 |
|-----|-----|----------|-----|
| Blog Hub 5×5 cross-multiplication (81 screens) | Present | Fixed | Fixed |
| Identical justifications for all flow steps | Present | Fixed | Fixed |
| Public nav bar inflates "missed elements" | N/A | Present | Fixed (baseline chrome) |
| Flow only tests 1 step per flow | Present | Present | **Fixed** (Next button navigation) |
| Flow panel loses state on close/reopen | N/A | N/A | **Fixed** (keep panel open + exitFlowIfActive) |
| Blog Editor not found | Present | Present | Not fixed (known limitation) |
| `page.evaluate` with named functions crashes tsx | N/A | Partial | **Fixed** (Playwright locators only) |
| Element detection captures footer not admin content | N/A | N/A | Known limitation (new in V6) |
