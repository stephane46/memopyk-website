# Blog Hub Automated QA — Implementation Plan

**Spec:** `docs/testing/BLOG_QA_SPEC.md`
**Status:** 🟡 In Progress
**Last Updated:** 2026-02-03
**Owner:** Claude Chat (planning) + Claude Code (execution)

---

## Context

### What exists today
- Playwright installed and configured (`playwright.config.ts`)
- 28 existing tests in `tests/e2e/admin-blog.spec.ts` across 9 groups
- `homepage.spec.ts` with basic public page tests
- `.env.e2e.example` template, npm scripts (`e2e`, `e2e:ui`, `e2e:report`)
- JSON + HTML reporters configured
- Tab-level `data-testid` attributes already present on all 5 Blog Hub tabs

### What's missing (from spec)
- Discovery Runner (auto-map UI on each run)
- Flow Tests with step-by-step screenshots + narrative
- QA Markdown Report generator (`qa-report.md`)
- `data-testid` audit on all interactive elements inside each tab
- AI Creator tests (Group 6 currently skipped — AI Creator not wired into Blog Hub)
- E2E cleanup (test data with `[E2E]` prefix)
- CI/Coolify integration

### Blog Hub Architecture (from code)
ContentProductionHub.tsx renders 5 tabs + 1 hidden editor:

| Tab | Component | data-testid |
|-----|-----------|-------------|
| Weekly Planner | ContentProductionPlanner.tsx (50KB) | `tab-planner` |
| Topics | ContentProductionTopics.tsx (27KB) | `tab-topics` |
| Keywords | ContentProductionKeywords.tsx (19KB) | `tab-keywords` |
| Posts | BlogManagePosts.tsx (23KB) | `tab-posts` |
| AI Creator | BlogAICreator.tsx (26KB) | `tab-ai-creator` |
| Image Bank | ImageBankManager.tsx (43KB) | `tab-images` |
| Blog Editor | BlogEditor.tsx (19KB) | URL-only (`?tab=blog-edit&id=X`) |

**AI Creator** was orphaned in old `BlogManagement.tsx`. M1.5 wired it into ContentProductionHub as 6th tab.

---

## Milestones

### M1: Code Understanding + data-testid Audit ✅
**Goal:** Map every interactive element across all 6 Blog Hub screens + AI Creator. Identify missing `data-testid` attributes.
**Duration:** ~2 hours
**Result:** 95 testids mapped across 8 screens. 7 new testids added. AI Creator confirmed orphaned.
**Commits:** `5a71c5d`, `96b9cee`

| Step | Task | Output | Status |
|------|------|--------|--------|
| M1.1 | Read all 7 component files (listed above) | Understanding of each screen's UI | ✅ |
| M1.2 | Map existing `data-testid` attributes per component | `tests/e2e/testid-map.json` | ✅ |
| M1.3 | Identify missing `data-testid` on key interactive elements | Gap list in testid-map.json | ✅ |
| M1.4 | Determine AI Creator accessibility (is it reachable? how?) | Finding documented here | ✅ |
| M1.5 | Add missing `data-testid` attributes to components | Code changes committed | ✅ |

**M1 Findings (2026-02-03):**
- 95 total data-testid attributes across 8 screens
- 7 new testids added (BlogManagePosts + ContentProductionHub)
- AI Creator: NOT accessible from current nav (BlogManagement.tsx orphaned)
- Commit: `5a71c5d` - "test: add data-testid attributes for E2E blog QA"

**Claude Code Prompt — M1:**
```
TASK: Blog Hub data-testid audit for E2E testing

### Context
We're building an automated QA system for the Blog Hub. Before writing tests, we need to map all existing data-testid attributes and add missing ones.

Spec: docs/testing/BLOG_QA_SPEC.md
Plan: docs/testing/BLOG_QA_PLAN.md

### Step 1: Read and analyze these files
Read each file completely. For each one, list ALL interactive elements (buttons, inputs, selects, links, toggles, modals):
1. client/src/components/admin/ContentProductionHub.tsx
2. client/src/components/admin/ContentProductionPlanner.tsx
3. client/src/components/admin/ContentProductionTopics.tsx
4. client/src/components/admin/ContentProductionKeywords.tsx
5. client/src/components/admin/ImageBankManager.tsx
6. client/src/admin/BlogManagePosts.tsx
7. client/src/admin/BlogEditor.tsx
8. client/src/admin/BlogAICreator.tsx
9. client/src/admin/BlogManagement.tsx (check if AI Creator is accessible from current nav)

### Step 2: Create testid-map.json
Create tests/e2e/testid-map.json with this structure:
{
  "screens": {
    "planner": {
      "component": "ContentProductionPlanner.tsx",
      "existingTestIds": ["tab-planner", ...],
      "missingTestIds": [
        { "element": "description of element", "suggestedId": "proposed-testid", "selector": "current CSS/text selector" }
      ]
    },
    // ... repeat for topics, keywords, posts, images, blog-editor, ai-creator
  },
  "aiCreatorAccessibility": {
    "isAccessibleFromNav": true/false,
    "howToReach": "description of navigation path",
    "recommendation": "what to do about it"
  }
}

### Step 3: Add missing data-testid attributes
For every interactive element that DOESN'T have a data-testid, add one following the naming convention:
- Buttons: `button-{action}` (e.g., `button-create-post`, `button-save`)
- Inputs: `input-{field}` (e.g., `input-search`, `input-title`)
- Selects: `select-{field}` (e.g., `select-status-filter`)
- Tabs: `tab-{name}` (already done)
- Modals: `modal-{name}`
- Switches: `switch-{name}`

Priority: focus on elements needed for the spec's flow tests (create post, set priority, set schedule, set hero image, save, filters).

### Step 4: Report findings
After analysis, report:
1. Total interactive elements found per screen
2. How many already have data-testid vs how many need one
3. AI Creator accessibility status
4. Any concerns for test stability

### Branch: staging
Commit message: "test: add data-testid attributes for E2E blog QA"
```

---

### M1.5: Wire AI Creator into Blog Hub
**Goal:** Add BlogAICreator as 6th tab in ContentProductionHub so it's accessible from navigation.
**Duration:** ~30 min
**Depends on:** M1 complete

| Step | Task | Output | Status |
|------|------|--------|--------|
| M1.5.1 | Add AI Creator tab to ContentProductionHub.tsx (between Posts and Image Bank) | Code change | ✅ |
| M1.5.2 | Add `tab-ai-creator` testid + mobile variant | Consistent with other tabs | ✅ |
| M1.5.3 | Update URL param handling for `ai-creator` tab value | URL persistence | ✅ |
| M1.5.4 | Verify on staging: tab loads, AI Creator form renders | Visual check | ⏳ |
| M1.5.5 | Update testid-map.json with new tab testids | Updated map | ✅ |

**Claude Code Prompt — M1.5:**
```
TASK: Wire AI Creator into Blog Hub as 6th tab

### Context
BlogAICreator.tsx exists in client/src/admin/BlogAICreator.tsx with full data-testid coverage (12 testids), but it's orphaned — BlogManagement.tsx which contains it is never rendered. We need to add it directly into ContentProductionHub.tsx.

References:
- Plan: docs/testing/BLOG_QA_PLAN.md (M1.5)
- Testid map: tests/e2e/testid-map.json
- Current hub: client/src/components/admin/ContentProductionHub.tsx

### What to do

1. Read ContentProductionHub.tsx to understand the current tab pattern

2. Add AI Creator as the 6th tab (between Posts and Image Bank):
   - Import BlogAICreator: `import { BlogAICreator } from '@/admin/BlogAICreator';`
   - Check if BlogAICreator uses default export or named export — match the import accordingly
   - Add desktop tab trigger with:
     - value="ai-creator"
     - data-testid="tab-ai-creator"
     - Icon: Sparkles from lucide-react (or Wand2 if Sparkles unavailable)
     - Label: "AI Creator"
     - Same orange active styling as other tabs
   - Add mobile tab trigger with data-testid="tab-ai-creator-mobile"
   - Add TabsContent for value="ai-creator" wrapping BlogAICreator in ErrorBoundary
   - Update grid layout: md:grid-cols-5 → md:grid-cols-6

3. Update URL param handling:
   - Add 'ai-creator' to the valid tab values array in both useEffect hooks
   - Line with: `['planner', 'topics', 'keywords', 'posts', 'images'].includes(tabParam)` → add 'ai-creator'

4. Update testid-map.json:
   - Add "tab-ai-creator" and "tab-ai-creator-mobile" to hub.existingTestIds
   - Change ai-creator.route from "NOT ACCESSIBLE" to "/admin?tab=ai-creator"
   - Update aiCreatorAccessibility.isAccessibleFromNav to true

5. Verify BlogAICreator component doesn't depend on props from BlogManagement.tsx
   - Read BlogAICreator.tsx to check if it receives props or uses context from parent
   - If it needs props, adapt the integration

### Branch: staging
Commit message: "feat: add AI Creator as 6th tab in Blog Hub"
```

---

### M2: Discovery Runner
**Goal:** Automated script that navigates all Blog Hub tabs, screenshots each, lists interactive elements, and outputs `discovery.json` + `discovery.md`.
**Duration:** ~2 hours
**Depends on:** M1 complete

| Step | Task | Output | Status |
|------|------|--------|--------|
| M2.1 | Create `tests/e2e/discovery.spec.ts` | Test file | ⬜ |
| M2.2 | Login → navigate Blog Hub → iterate all tabs | Screenshots per tab | ⬜ |
| M2.3 | Collect visible headings, counters, interactive elements per tab | `discovery.json` | ⬜ |
| M2.4 | Generate `discovery.md` from JSON | Human-readable map | ⬜ |
| M2.5 | Run and validate against staging | Green run + artifacts | ⬜ |

**Claude Code Prompt — M2:**
```
TASK: Build Discovery Runner for Blog Hub E2E QA

### Context
We need an automated discovery script that navigates every Blog Hub tab, screenshots each, and produces a structured inventory of what exists. This runs before flow tests to confirm the UI is intact after deployments.

References:
- Plan: docs/testing/BLOG_QA_PLAN.md (M2)
- Spec: docs/testing/BLOG_QA_SPEC.md (Section 7, Deliverable 1)
- Testid map: tests/e2e/testid-map.json (use this as source of truth for expected testids)
- Existing tests: tests/e2e/admin-blog.spec.ts (reuse login pattern)

### Step 1: Create helpers/auth.ts
Extract the login helper from admin-blog.spec.ts into a shared module:
- File: tests/e2e/helpers/auth.ts
- Export: `loginToAdmin(page)` function
- Use env var for password: `process.env.E2E_ADMIN_PASSWORD || 'memopyk2025admin'`
- Use env var for URL: `process.env.E2E_BASE_URL || 'https://memopyk.memopyk.com'`
- Handle cookie consent banner

### Step 2: Create tests/e2e/discovery.spec.ts
Build a Playwright test file that:

1. Logs in and navigates to Blog Hub
2. For EACH of these 6 tabs (in order):
   - planner, topics, keywords, posts, ai-creator, images
   
   For each tab:
   a. Click the tab using data-testid (e.g., `tab-planner`)
   b. Wait for tab content to stabilize (no spinners, content visible)
   c. Take a full-page screenshot → save to `test-results/discovery/tab-{name}.png`
   d. Collect inventory by querying the DOM:
      - Page URL
      - Visible h1/h2/h3 headings (text content)
      - Count of visible interactive elements with data-testid
      - List of all visible data-testid values on the page
      - Any counter/badge numbers visible (like "12 posts", "5 topics")
      - Any error states or empty states visible
   e. Compare found testids against testid-map.json expected list
   f. Store results in a structured object

3. After all tabs:
   a. Write `test-results/discovery/discovery.json` with full structured output:
   {
     "timestamp": "ISO date",
     "baseUrl": "https://memopyk.memopyk.com",
     "tabs": {
       "planner": {
         "url": "full URL",
         "loaded": true/false,
         "screenshot": "tab-planner.png",
         "headings": ["text", ...],
         "counters": {"posts": 12, ...},
         "testidsFound": ["testid-1", ...],
         "testidsExpected": ["from testid-map.json"],
         "testidsMissing": ["expected but not found"],
         "errors": ["any error text visible"]
       }
     },
     "summary": {
       "tabsLoaded": 6,
       "tabsFailed": 0,
       "totalTestidsFound": N,
       "totalTestidsMissing": N
     }
   }

   b. Generate `test-results/discovery/discovery.md` from the JSON:
   ```
   # Blog Hub Discovery Report
   **Date:** 2026-02-03
   **URL:** https://memopyk.memopyk.com
   **Result:** 6/6 tabs loaded ✅

   ## Weekly Planner
   - **Status:** ✅ Loaded
   - **Screenshot:** tab-planner.png
   - **Headings:** Blog Hub, Weekly Planner
   - **Counters:** 3 assignments this week
   - **Test IDs:** 17/17 found ✅

   ## Topics
   ...(repeat for each tab)

   ## Summary
   | Tab | Status | TestIDs | Issues |
   |-----|--------|---------|--------|
   | Planner | ✅ | 17/17 | none |
   ...
   ```

### Step 3: Add npm script
Add to package.json:
"e2e:discovery": "npx playwright test discovery.spec.ts"

### Step 4: Run against staging and verify
- Run the discovery spec
- Verify all 6 tabs produce screenshots
- Verify discovery.json and discovery.md are generated
- Report: which tabs loaded, any missing testids, any errors

### Important notes
- Use data-testid selectors ONLY (from testid-map.json), never CSS classes
- Screenshots at 2560x1440 viewport (already in playwright.config.ts)
- The discovery spec should PASS even if some tabs have issues (report them, don't fail)
- Only FAIL if login fails or Blog Hub itself doesn't load
- Read testid-map.json at runtime to get expected testids per screen

### Branch: staging
Commit message: "test: add Blog Hub discovery runner for E2E QA"
```

---

### M3: Flow Tests (Blog Smoke Suite)
**Goal:** End-to-end flow tests with step screenshots and `[E2E]` test data, including AI Creator.
**Duration:** ~4 hours
**Depends on:** M1 + M2 complete

| Step | Task | Output | Status |
|------|------|--------|--------|
| M3.1 | Create `tests/e2e/blog-flows.spec.ts` | Test file | ⬜ |
| M3.2 | Flow 1: Login + open Blog Hub + verify all tabs load | Test + screenshots | ⬜ |
| M3.3 | Flow 2: Topics — search filter changes results | Test + screenshots | ⬜ |
| M3.4 | Flow 3: Posts — open editor for existing post | Test + screenshots | ⬜ |
| M3.5 | Flow 4: Create draft post (`[E2E]` prefix) | Test + screenshots | ⬜ |
| M3.6 | Flow 5: Set priority on post | Test + screenshots | ⬜ |
| M3.7 | Flow 6: Set schedule date | Test + screenshots | ⬜ |
| M3.8 | Flow 7: Set hero image from Image Bank | Test + screenshots | ⬜ |
| M3.9 | Flow 8: Save + verify toast + verify in list | Test + screenshots | ⬜ |
| M3.10 | Flow 9: AI Creator — generate prompt, copy, validate JSON | Test + screenshots | ⬜ |
| M3.11 | Cleanup: delete `[E2E]` test posts after run | Teardown logic | ⬜ |
| M3.12 | Each flow outputs step-by-step narrative | Markdown narratives | ⬜ |

**Claude Code Prompt — M3:** *(will be written after M2, based on actual discovery output)*

---

### M4: QA Report Generator + CI
**Goal:** Auto-generate `qa-report.md` after each run. Hook into Coolify staging deploys.
**Duration:** ~2 hours
**Depends on:** M3 complete

| Step | Task | Output | Status |
|------|------|--------|--------|
| M4.1 | Create `tests/e2e/generate-report.ts` script | Report generator | ⬜ |
| M4.2 | Parse `playwright-report/results.json` → markdown | `qa-report.md` | ⬜ |
| M4.3 | Include: summary, screenshots links, flow narratives, failures | Complete report | ⬜ |
| M4.4 | Add npm script: `npm run e2e:report-md` | Package.json update | ⬜ |
| M4.5 | GitHub Actions workflow for staging deploys | `.github/workflows/e2e.yml` | ⬜ |
| M4.6 | Store report as build artifact | CI artifacts | ⬜ |

**Claude Code Prompt — M4:** *(will be written after M3)*

---

## Acceptance Criteria (from spec)

| Criteria | Milestone | Status |
|----------|-----------|--------|
| Runs unattended against staging | M2 | ⬜ |
| Produces discovery.md + screenshots per tab | M2 | ⬜ |
| Fails with clear reason if tab missing/broken | M2 | ⬜ |
| Creates draft post + verifies it exists | M3 | ⬜ |
| Sets priority + schedule + hero image, verifies persistence | M3 | ⬜ |
| Produces qa-report.md with step list + evidence | M4 | ⬜ |
| On failure: last good step + screenshot + trace | M3+M4 | ⬜ |
| Runs automatically on staging deploy | M4 | ⬜ |
| No secrets committed | Already done | ✅ |
| Tests use data-testid, not fragile selectors | M1 | ✅ |
| AI Creator validated | M3 | ⬜ |

---

## File Structure (target)

```
tests/
└── e2e/
    ├── admin-blog.spec.ts        # Existing 28 tests (keep)
    ├── homepage.spec.ts           # Existing (keep)
    ├── discovery.spec.ts          # NEW — M2
    ├── blog-flows.spec.ts         # NEW — M3
    ├── testid-map.json            # NEW — M1
    ├── helpers/
    │   ├── auth.ts                # Login helper (extracted)
    │   └── cleanup.ts             # E2E data cleanup
    └── generate-report.ts         # NEW — M4

playwright-report/
├── results.json                   # Auto-generated
├── qa-report.md                   # NEW — M4
└── discovery/
    ├── discovery.json             # NEW — M2
    ├── discovery.md               # NEW — M2
    └── screenshots/               # NEW — M2
```

---

## How to run (once complete)

```bash
# Full QA suite
npm run e2e

# Discovery only
npx playwright test discovery.spec.ts

# Flow tests only
npx playwright test blog-flows.spec.ts

# Generate markdown report
npm run e2e:report-md

# Interactive debug mode
npm run e2e:ui
```

---

## Notes

- Blog deletes are **permanent** (not soft-delete) — cleanup must use API/DB delete
- Existing admin credentials reused (from `.env.e2e`)
- Keywords is a **separate tab** in ContentProductionHub (confirmed from code)
- AI Creator wired into Blog Hub as 6th tab in M1.5 (was orphaned in old BlogManagement.tsx)
- Existing 28 tests in admin-blog.spec.ts will be kept alongside new tests (not replaced)
