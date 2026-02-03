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
| Image Bank | ImageBankManager.tsx (43KB) | `tab-images` |
| Blog Editor | BlogEditor.tsx (19KB) | URL-only (`?tab=blog-edit&id=X`) |

**AI Creator** (BlogAICreator.tsx, 26KB) is in `BlogManagement.tsx` — NOT in ContentProductionHub. Accessibility TBD in M1.

---

## Milestones

### M1: Code Understanding + data-testid Audit
**Goal:** Map every interactive element across all 6 Blog Hub screens + AI Creator. Identify missing `data-testid` attributes.
**Duration:** ~2 hours

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

**Claude Code Prompt — M2:** *(will be written after M1 results, using testid-map.json)*

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
- AI Creator lives in old `BlogManagement.tsx`, not in Blog Hub — M1 will determine if/how to reach it
- Existing 28 tests in admin-blog.spec.ts will be kept alongside new tests (not replaced)
