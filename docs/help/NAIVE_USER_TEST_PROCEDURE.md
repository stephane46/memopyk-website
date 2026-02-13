# Naive User Test Procedure

**Purpose:** Validate that the help system can guide someone who has never used the MEMOPYK admin panel to complete tasks successfully.

**Last updated:** February 5, 2026

---

## What This Is

The naive user test is our custom methodology for help content quality assurance. Unlike unit tests or E2E specs that verify code works, this test verifies that **the documentation works** — that a real user can follow the help instructions and succeed.

The "naive user" is Claude Code acting as someone who has **never seen the admin panel before**. Its ONLY source of information is what appears on screen and what the help panel tells it.

---

## Why It Matters

The help system is the first thing a new user (or Stéphane after time away) will rely on. If the instructions say "click Generate" but the button says "Generate AI Prompt", the user is lost. Screenshots prove the match — or the mismatch.

---

## Tools & Infrastructure

| Tool | Purpose | Location |
|------|---------|----------|
| **Playwright** | Browser automation | `playwright.config.ts` (installed, configured) |
| Auth helper | Login to admin | `tests/e2e/helpers/auth.ts` |
| Password | `memopyk2025admin` | Set in `E2E_ADMIN_PASSWORD` env var |
| Staging URL | `https://memopyk.memopyk.com` | Set in `E2E_BASE_URL` env var |
| Screenshots | Proof of each step | `tests/e2e/screenshots/help-validation/` |
| Test scripts | Standalone `.ts` files | `tests/e2e/naive-user-help-test*.ts` |
| Reports | Markdown + HTML | `docs/help/TEST_REPORT_V*.md` |

### Running the test
```bash
npx tsx tests/e2e/naive-user-help-test-v3.ts
```

⚠️ **NOT** `npx playwright test` — naive user tests are standalone scripts, not spec files.

---

## The Rules

### What Claude Code CAN use:
- The browser (Playwright)
- What appears on screen
- The help panel content (as displayed in the UI)
- Postgres MCP to read help content **only as a last resort** if Playwright can't extract text

### What Claude Code CANNOT use:
- Source code files (.tsx, .ts, .css)
- Database queries to understand the UI
- Any prior knowledge of the admin panel structure
- The CLAUDE.md or MIGRATION_PROGRESS.md files

### The question being answered:
> "Can someone who knows nothing complete this task by following ONLY the help instructions?"

---

## CRITICAL: Navigation Method

**Always navigate like a real user — click through the UI, never use direct URLs.**

The MEMOPYK admin uses a tab-based architecture inside sections (Blog Hub, Content Site, etc.). Many screens are sub-tabs within a parent section. The help system matches content based on the **app's internal routing state**, which is only set correctly when you navigate through the UI.

### ❌ WRONG — Direct URL navigation
```typescript
// This bypasses the app's routing state!
await page.goto('/admin?tab=images');
// Result: help panel shows "No help content" even though content exists
// Result: data may not load because parent component didn't mount
```

### ✅ CORRECT — UI navigation (how a real user would)
```typescript
// 1. Click Blog in sidebar
await sidebar.getByText('Blog').click();
// 2. Wait for Blog Hub tabs
await page.waitForSelector('[data-testid="tab-images"]');
// 3. Click the Image Bank tab
await page.getByTestId('tab-images').click();
// 4. Wait for content to load
await page.waitForTimeout(2000);
// 5. Click "Aide" in sidebar to open help panel
await sidebar.getByText('Aide').click();
// 6. Wait for help drawer to appear
await page.waitForSelector('.w-80 h2:has-text("Help")');
// Result: correct route context, help content loads, data loads
```

### Why this matters
- **Help system route matching** depends on the app's internal state, not just the URL
- **Data fetching** in sub-tabs is triggered by the parent component mounting first
- **Direct URLs may load a different component** or leave the app in a partial state
- **A real user never types URLs** — they click sidebar links and tabs

### When direct URLs ARE valid
- **Phase 1 (Route Discovery)** — testing which URLs work is a valid finding
- **Documenting broken routes** — if `/admin?tab=image-bank` doesn't work, that's worth noting
- But after discovery, all subsequent phases MUST use UI navigation

### Lesson learned #1 (February 5, 2026) — Navigation
The Image Bank naive user test navigated via `page.goto('/admin?tab=images')`. This caused the help panel to show "No help content available" and the image grid to appear empty — both false negatives. The actual screen has rich help content and at least one image. Switching to sidebar → Blog → Image Bank tab click fixed the navigation context.

### Lesson learned #2 (February 5, 2026) — Async Timing
Even after fixing navigation, the test still reported "No help content" — a false negative. The help system fetches content **asynchronously** after the drawer opens. Playwright read the drawer before the fetch completed and got the fallback message ("No help content available for this screen yet.").

**Fix:** After opening the help drawer, don't just wait for the drawer container — wait for **actual content** to appear:
```typescript
// ❌ WRONG — drawer is open but content hasn't loaded yet
await page.waitForSelector('.w-80 h2:has-text("Help")');
const text = await page.locator('.w-80 .prose').textContent(); // Gets fallback!

// ✅ CORRECT — wait for real content (h3 = screen title inside help)
await page.waitForSelector('.w-80 .prose h3', { timeout: 5000 }).catch(() => null);
const text = await page.locator('.w-80 .prose').textContent(); // Gets actual content
```

**Rule:** Any element that loads data asynchronously (help content, image grids, post lists) needs an explicit wait for the **data indicator**, not just the **container**. The container appears instantly; the data arrives later.

### Lesson learned #3 (February 13, 2026) — Discovery vs Checklist
A previous test was given a hardcoded list of 31 screens and told to check each one. The test reported "19/19 PASS" — but it only tested 19 screens, skipping the rest without explanation, and provided zero detail per screen. The root cause: treating the test as a checklist to tick off rather than an exploration to document.

**Fix:** The naive user test is discovery-based. Phase 1 maps the entire admin by clicking everything. The total screen count is an OUTPUT of the test, not an INPUT. If the tester discovers 25 screens, they test 25. If they discover 35, they test 35. No screen is skipped.

---

## Admin UI Architecture

The MEMOPYK admin uses a multi-level navigation structure. The naive user tester MUST understand this to avoid missing screens.

### Level 1: Sidebar sections
The dark sidebar (.bg-gray-900) contains top-level section links. Each click loads a different admin area. The tester must click EVERY sidebar item to discover all sections.

### Level 2: Tab bars within sections
Some sections contain a horizontal tab bar at the top of the content area:

- **Blog Hub**: Has numbered tabs ①-⑤ (Keywords, Planned Posts, Planner, Posts, Image Bank). Clicking "Blog" in the sidebar lands on the Blog Hub, then you click each numbered tab.
- **Contenu Site**: May have tabs for different content types (Hero, Gallery, FAQ, etc.) OR these may be separate sidebar items — the tester must discover which.
- **Système**: Groups system tools — may contain AI Context, Cache, and other items as tabs or sidebar sub-items.

### Level 3: Sub-tabs within tabs
Some tabs contain a SECOND level of tabs:

- **Analytics**: Clicking "Analytics" in the sidebar opens a section that has its own sub-tab bar (Overview, Blog, Clarity, CTA, Exclusions, Diagnostics, Geography, Live, Trends, Video). Each sub-tab is a separate screen with its own help content — treat each as a separate screen.

### Level 4: Modal/editor screens
Some screens are reached by clicking items within a list:

- **Blog Editor**: Reached by clicking an existing post in the Posts tab. Full editor screen with its own help content.
- **AI Creator**: May be reached via a button/link from the Blog Hub or may be a separate sidebar item — the tester must discover.

### Key principle
The tester should NEVER assume how many screens exist. They systematically click every sidebar item, every tab, every sub-tab. The total screen count is a DISCOVERY, not a given.

---

## Test Structure

### Phase 1: Full Discovery
1. Login to admin
2. Screenshot the sidebar in its entirety
3. Click EVERY item in the sidebar, one by one
4. For each sidebar item:
   a. Screenshot the screen that loads
   b. Look for tab bars — if present, click EVERY tab and screenshot each
   c. For each tab, look for sub-tab bars — if present, click EVERY sub-tab and screenshot each
   d. Record: sidebar item name → what loaded → any tabs found → any sub-tabs found
5. Build a COMPLETE navigation map from what you discovered
6. Count total unique screens — this number is a finding, not predetermined
7. Find the help button and verify it's discoverable without instructions

### Phase 2: Flow walkthroughs
For each help flow (currently 2: "Create a blog post", "Translate a post"):
1. Open the flow in the help panel
2. For **each step**:
   a. Screenshot the help instruction
   b. Read the instruction text
   c. Attempt to perform exactly what it says
   d. Screenshot the result
   e. Rate the step (see Rating System below)
   f. Advance to next step
3. DO NOT save/publish real content — we're testing navigation and labels

### Phase 3: Screen help accuracy (ALL discovered screens)
For EVERY screen discovered in Phase 1 (not a predetermined list):
1. Navigate to the screen via UI clicks (sidebar → tab → sub-tab)
2. Open the help panel
3. Wait for help content to load (`.w-80 .prose h3`, 5000ms timeout)
4. Screenshot both the help content AND the actual UI (TWO screenshots per screen)
5. Answer these questions:
   a. Does the help title match the screen you're on?
   b. Does the help content mention UI elements that actually exist on screen?
   c. Does the help content MISS any visible UI elements a user would need explained?
   d. Is the language plain or jargon-heavy? Any unclear terms?
   e. Is anything visibly broken on the screen itself (errors, missing data, broken layout, console errors)?
   f. Does help say "No help content available for this screen yet"? → automatic BLOCKED
6. Rate: CLEAR / AMBIGUOUS / BLOCKED with specific justification

---

## Rating System

| Rating | Meaning | Action needed |
|--------|---------|---------------|
| **CLEAR** | Instruction exactly matches the UI. User could follow it without guessing. | None |
| **AMBIGUOUS** | User can figure it out, but wording is confusing or slightly inaccurate. | Fix wording |
| **BLOCKED** | User CANNOT complete the step based on the instruction alone. | Rewrite instruction |

---

## Screenshot Requirements

Every step needs TWO screenshots:
1. **Help screenshot** — what the help panel says (`flow{N}-step{M}-help.png`)
2. **Action screenshot** — what the UI looks like when following the instruction (`flow{N}-step{M}-action.png`)

Screen help needs TWO screenshots:
1. **Help screenshot** — the help drawer content (`screen-{name}-help.png`)
2. **UI screenshot** — the actual page (`screen-{name}-ui.png`)

Screenshots are **evidence**. Without them, the test is just an opinion.

---

## Report Format

The report must include:

1. **Summary table** — CLEAR/AMBIGUOUS/BLOCKED counts per category
2. **Step-by-step details** — for each step:
   - Help instruction (quoted from help panel)
   - What was actually visible on screen
   - What the tester did
   - Rating with justification
   - Screenshot filenames
3. **Screen accuracy table** — title match, content match, missing/extra elements
4. **Recommendations** — prioritized list of what to fix

Both Markdown and HTML versions should be generated. The HTML version should embed or reference screenshots for visual review.

---

## Version History

| Version | Date | Flows Tested | Result |
|---------|------|-------------|--------|
| V1 | 2026-02-03 | 3 flows (old names) | Outdated — tested pre-unification tab structure |
| V2 | 2026-02-04 | 2 flows (DB audit only) | Not a real naive test — compared DB strings vs code, no browser |
| V3 | 2026-02-04 | 2 flows + 9 screens | Pending — first real browser walkthrough with screenshots |
| V5 | 2026-02-13 | 2 flows + ALL discovered screens | Pending — discovery-based, full per-screen analysis |

### Lessons Learned
- **V1** was a good pattern (Playwright, screenshots, ratings) but tested stale flow content
- **V2** was useful as a content cleanup pass (found 11 mismatches) but was NOT a naive user test — it was a database audit. No browser, no screenshots, no user perspective.
- **V3** combines V1's browser approach with V2's thoroughness, on the current (post-unification) help content
- **V4** added real navigation for flow steps but still used direct URLs for screen tests — caused false negatives on Image Bank
- **Image Bank test** (Feb 5, 2026): Direct URL navigation bypasses app routing state → help shows empty, data doesn't load. Fix: always navigate via sidebar → section → tab clicks.

---

## How Claude Chat Should Write the Prompt

Before writing a naive-user test prompt, Claude Chat MUST:

1. Read `tests/e2e/naive-user-help-test.ts` (the V1 script) to understand the pattern
2. Read `tests/e2e/helpers/auth.ts` for login/navigation helpers
3. Read `playwright.config.ts` for viewport, URL, and reporter config
4. Read `docs/help/ADMIN_SCREEN_ROUTES.md` for current screen routes
5. Check `MIGRATION_PROGRESS.md` for current flow/screen counts
6. **Never suggest Puppeteer, Selenium, or any tool other than Playwright**

The prompt should:
- Reference the existing V1 script as the base pattern
- Specify the exact flows and screens to test (with current names)
- Include the constraints (no source code, no DB queries)
- Specify screenshot naming convention
- Specify report output location and format
- Include the rating system (CLEAR / AMBIGUOUS / BLOCKED)
- **Never hardcode the screen list** — the prompt should instruct discovery, not enumerate screens. The tester counts screens as a finding.

---

*This procedure is part of the MEMOPYK help system QA process. Maintained by Claude Chat.*
