# Naive User Test V5 — Full Admin Help System Validation

**Prompt given to Claude Code on February 13, 2026**
**Context:** After major admin overhaul (AI Assist, Brand Brain, sitemap, FAQ schema, help updates). Previous "19/19 PASS" test was superficial — no detail per screen.

---

You are the Team Leader for this task. It involves updating documentation, building and running a test script, and producing a detailed report. Use Agent Teams as you see fit — suggested split:

- **doc-agent**: Updates the procedure documentation (Phase 0)
- **test-agent**: Builds the test script, runs it, captures all screenshots (Phases 1-3)
- **report-agent**: Analyzes screenshots and results, writes the final report (Phase 4)

Use Sonnet for all teammates. Track start time NOW (record it) — we need total elapsed time and token usage at the end.

---

## PHASE 0: UPDATE THE PROCEDURE DOC

Read `docs/help/NAIVE_USER_TEST_PROCEDURE.md` fully, then apply these changes. Keep all existing content that isn't contradicted.

### 0A. Add "## Admin UI Architecture" section BEFORE the "Test Structure" section:

```markdown
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

- **Analytics**: Clicking "Analytics" in the sidebar opens a section that has its own sub-tab bar (Overview, Blog, Clarity, CTA, Exclusions, Diagnostics, Geography, Live, Trends, Video). Each sub-tab is a separate screen with its own help content.

### Level 4: Modal/editor screens
Some screens are reached by clicking items within a list:

- **Blog Editor**: Reached by clicking an existing post in the Posts tab. Full editor screen with its own help content.
- **AI Creator**: May be reached via a button/link from the Blog Hub or may be a separate sidebar item — the tester must discover.

### Key principle
The tester should NEVER assume how many screens exist. They systematically click every sidebar item, every tab, every sub-tab. The total screen count is a DISCOVERY, not a given.
```

### 0B. Replace Phase 1 in the "Test Structure" section with:

```markdown
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
```

### 0C. Replace Phase 3 in the "Test Structure" section with:

```markdown
### Phase 3: Screen help accuracy (ALL discovered screens)
For EVERY screen discovered in Phase 1 (not a predetermined list):
1. Navigate to the screen via UI clicks (sidebar → tab → sub-tab)
2. Open the help panel
3. Wait for help content to load (`.w-80 .prose h3`, 5000ms timeout)
4. Screenshot both the help content AND the actual UI (TWO screenshots per screen)
5. Answer these questions:
   a. Does the help title match the screen?
   b. Does the help mention UI elements that actually exist?
   c. Does the help MISS any visible UI elements a user would need explained?
   d. Is the language plain or jargon-heavy?
   e. Is anything visibly broken on the screen itself?
   f. If help says "No help content available" — that's a BLOCKED finding
6. Rate: CLEAR / AMBIGUOUS / BLOCKED with specific justification
```

### 0D. Add Lesson Learned #3 after the existing two:

```markdown
### Lesson learned #3 (February 13, 2026) — Discovery vs Checklist
A previous test was given a hardcoded list of 31 screens and told to check each one. The test reported "19/19 PASS" — but it only tested 19 screens, skipping the rest without explanation, and provided zero detail per screen. The root cause: treating the test as a checklist to tick off rather than an exploration to document.

**Fix:** The naive user test is discovery-based. Phase 1 maps the entire admin by clicking everything. The total screen count is an OUTPUT of the test, not an INPUT. If the tester discovers 25 screens, they test 25. If they discover 35, they test 35. No screen is skipped.
```

### 0E. Add to the Version History table:

| V5 | 2026-02-13 | 2 flows + ALL discovered screens | Pending — discovery-based, full per-screen analysis |

### 0F. Add this bullet to "How Claude Chat Should Write the Prompt":

- **Never hardcode the screen list** — the prompt should instruct discovery, not enumerate screens. The tester counts screens as a finding.

Commit this doc update: `docs(help): update naive user procedure — discovery-based, architecture notes, lesson #3`

---

## PHASE 1-3: BUILD AND RUN THE TEST

### Before writing ANY code, read these files and internalize:
1. `docs/help/NAIVE_USER_TEST_PROCEDURE.md` (you just updated it — read it again)
2. `tests/e2e/naive-user-help-test-v3.ts` (base pattern — reuse utilities, types, report generator structure)
3. `tests/e2e/helpers/auth.ts` (loginToAdmin, navigateToBlogHub, clickBlogTab)
4. `playwright.config.ts` (viewport 2560x1440, staging URL)

### Create `tests/e2e/naive-user-help-test-v5.ts`
Standalone script — run with `npx tsx`, NOT `npx playwright test`.

### THE NAIVE USER RULES (absolute, non-negotiable)
1. You know NOTHING about this admin panel.
2. Your ONLY info sources: what's on screen + what the help panel says.
3. NO reading source code (.tsx, .ts, .css). NO database queries. NO CLAUDE.md.
4. Navigate ONLY via UI clicks. NEVER type URLs after initial login.
5. After help drawer opens, wait for `.w-80 .prose h3` (5000ms timeout), fallback `.w-80 .prose` (3000ms).
6. Every screen = TWO screenshots (ui + help). Every flow step = TWO screenshots (help + action).

### PHASE 1: DISCOVERY

Login to admin (staging URL from playwright.config.ts, password from auth.ts).

Then SYSTEMATICALLY explore the entire admin:
1. Screenshot the full sidebar.
2. Click the FIRST sidebar item. Screenshot what loads.
3. Look for tab bars in the content area. If tabs exist, click EACH tab and screenshot.
4. For each tab, look for sub-tab bars INSIDE the content area. If sub-tabs exist, click EACH sub-tab and screenshot.
5. Return to sidebar, click the NEXT item. Repeat.
6. Continue until you've clicked EVERY sidebar item and EVERY tab/sub-tab within each.
7. Also check: can you reach the Blog Editor by clicking a post in the Posts list? Can you reach AI Creator from anywhere in the UI?

Build a navigation map:
```
Sidebar Item → Screen Name → [Tab1, Tab2, ...] → [SubTab1, SubTab2, ...]
```

**CRITICAL about the admin architecture (so you're not surprised):**
- Blog Hub has a horizontal tab bar with numbered circles (①②③④⑤). Each circle is a sub-screen.
- The Analytics section has its OWN internal sub-tab bar (may show as text tabs like Overview, Blog, Clarity, CTA, etc.). Each sub-tab has separate help content — treat each as a separate screen.
- Some sidebar sections may be grouped under collapsible headers (like "Système" or "Contenu Site") — click any expand arrows or chevrons you see.
- The Blog Editor is reached by clicking an existing post title in the Posts tab list — it's a separate screen, not a modal.

At the end of Phase 1, record:
- Total sidebar items found
- Total unique screens found (including all tabs and sub-tabs)
- The complete navigation map
- Anything that looked clickable but didn't work or errored

### PHASE 2: FLOW WALKTHROUGHS

Navigate to the Blog section. Open the help panel (look for "Aide" button in the sidebar).

**Flow 1: "Create a blog post"**
- Find and click this flow in the help panel's "How do I..." section
- For EACH step in the flow:
  - Screenshot the help instruction (`flow1-step{M}-help.png`)
  - Copy the EXACT instruction text verbatim into your notes
  - Look at the actual UI — does the instruction match what you see?
  - Try to identify every UI element the instruction references — is it there? Does it have the exact label mentioned?
  - Screenshot the UI state (`flow1-step{M}-action.png`)
  - Rate: CLEAR / AMBIGUOUS / BLOCKED
  - Write SPECIFIC notes like: "Help says 'click Generate', actual button says 'AI Assist'" or "Help says 'select language at bottom', language selector is actually at top"
  - DO NOT actually save, publish, or delete any content
- When the flow ends, click Back to return to help panel home

**Flow 2: "Translate a post"**
- Same process, navigate to Posts tab first, then open help panel and find this flow

### PHASE 3: SCREEN HELP VALIDATION

For EVERY screen discovered in Phase 1 — NO exceptions, NO skipping:

1. Navigate to it via UI clicks (retrace the discovery path: sidebar → tab → sub-tab)
2. Open the help panel (click "Aide")
3. Wait for content to load (follow rule 5 above)
4. Take `screen-{kebab-name}-help.png`
5. Close help panel, take `screen-{kebab-name}-ui.png`
6. In your notes, answer ALL 6 of these questions:
   a. Does the help panel title match the screen you're on?
   b. Does the help content mention UI elements that actually exist on screen?
   c. Does the help content MISS any visible UI elements that a user would need explained?
   d. Is the language plain or jargon-heavy? Any unclear terms?
   e. Is anything visibly broken on the screen itself (errors, missing data, broken layout, console errors)?
   f. Does help say "No help content available for this screen yet"? → automatic BLOCKED
7. Rate: CLEAR / AMBIGUOUS / BLOCKED with SPECIFIC justification (not just "looks fine")

Even screens rated CLEAR get the full 6-question analysis. "CLEAR" means "I checked everything and it all matched" — prove it.

---

## PHASE 4: REPORT

### Screenshots directory
`tests/e2e/screenshots/help-validation/v5/`

Naming:
- Discovery: `discovery-sidebar.png`, `discovery-{section}.png`, `discovery-{section}-{tab}.png`
- Screens: `screen-{kebab-name}-ui.png`, `screen-{kebab-name}-help.png`
- Flows: `flow{N}-step{M}-help.png`, `flow{N}-step{M}-action.png`
- Errors: `error-{description}.png`

### Main report: `docs/help/TEST_REPORT_V5_NAIVE_USER.md`

This is the primary deliverable. It must contain:

**1. Metadata**
- Date, environment (staging URL), viewport, Playwright version
- Total elapsed time for the test run
- Total screens discovered, total flow steps tested

**2. Discovery Results**
- Full navigation map (sidebar → tabs → sub-tabs)
- Total unique screens found
- Surprises: screens you didn't expect, screens unreachable via UI, broken navigation

**3. Executive Summary Table**

| Category     | CLEAR | AMBIGUOUS | BLOCKED | Total |
|-------------|-------|-----------|---------|-------|
| Flow Steps  |       |           |         |       |
| Screens     |       |           |         |       |
| TOTAL       |       |           |         |       |

**4. Flow Detail Sections**
For each flow, for each step:
- Step number and title
- Help instruction (VERBATIM quote from the help panel)
- What was actually visible on screen
- What the tester attempted to do
- Rating + specific justification
- Screenshot filenames (both help and action)

**5. Screen Detail Sections**
For each discovered screen:
- Screen name, route, navigation path used (e.g., "Sidebar → Blog → Tab ④ Posts")
- Help panel title vs actual screen title
- 6-question analysis (all 6, answered explicitly):
  a. Does the help title match the screen?
  b. Does the help mention UI elements that actually exist?
  c. Does the help MISS any visible UI elements that need explanation?
  d. Is the language plain or jargon-heavy?
  e. Is anything visibly broken on the screen?
  f. Does help say "No help content available"? → BLOCKED
- Missing elements, extra elements, outdated references
- Rating + specific justification
- Screenshot filenames (both ui and help)

**6. Recommendations**
Grouped by severity:
- **BLOCKED** — must fix (help is wrong or missing, user cannot proceed)
- **AMBIGUOUS** — should fix (wording confusing, labels don't match exactly)
- **Observations** — nice-to-fix (minor polish, suggestions)

The report must be at least 300 lines. If it's shorter, you haven't analyzed deeply enough. Every screen gets real analysis — no "looks good" placeholders.

### Machine-readable results: `tests/e2e/screenshots/help-validation/v5/test-results.json`
```json
{
  "metadata": { "date": "...", "environment": "...", "viewport": "...", "elapsed_ms": ... },
  "discovery": { "sidebar_items": [...], "total_screens": N, "navigation_map": {...} },
  "flows": [{ "name": "...", "steps": [...], "summary": {...} }],
  "screens": [{ "name": "...", "route": "...", "rating": "...", "analysis": {...} }],
  "summary": { "flow_clear": N, "flow_ambiguous": N, "flow_blocked": N, "screen_clear": N, "screen_ambiguous": N, "screen_blocked": N }
}
```

---

## PHASE 5: WRAP-UP

After the report is complete:

1. **Commit everything** to staging branch:
   - Updated `docs/help/NAIVE_USER_TEST_PROCEDURE.md`
   - New `tests/e2e/naive-user-help-test-v5.ts`
   - New `docs/help/TEST_REPORT_V5_NAIVE_USER.md`
   - All screenshots in `tests/e2e/screenshots/help-validation/v5/`
   - JSON results file
   - Commit message: `test(help): naive user test V5 — discovery-based full admin validation`

2. **Push to staging** (auto-deploys, but we're not changing code — just adding test artifacts)

3. **Print a final summary** to the console that includes:
   - Total elapsed time (wall clock from start to finish)
   - Total screens discovered
   - Executive summary (CLEAR/AMBIGUOUS/BLOCKED counts)
   - Top 3 most critical findings
   - Token usage: total tokens used, broken down by Opus and Sonnet if available (check your session stats)

---

## HARD RULES — DO NOT VIOLATE
- Do NOT hardcode a screen list — discover screens by clicking
- Do NOT read source code (.tsx, .ts, .css) to understand the UI
- Do NOT query the database to understand what screens exist
- Do NOT use direct URL navigation after initial login
- Do NOT skip any discovered screen in Phase 3
- Do NOT produce a pass/fail table without per-screen detail
- Do NOT modify any admin content (no saving, publishing, deleting)
- Do NOT rate anything CLEAR without the 6-question analysis proving it
- Do NOT rate anything BLOCKED without explaining what went wrong
- Do NOT assume the screen count — count what you find
- Do NOT forget to record start/end time and report token usage

## TECHNICAL SETUP
- Playwright chromium, headless: true
- Viewport: 2560x1440 (match playwright.config.ts)
- slowMo: 100 (give async content time to load)
- After EVERY navigation or tab click: wait 2000ms minimum
- After opening help drawer: wait for `.w-80 .prose h3` (5000ms), fallback `.w-80 .prose` (3000ms)
- Staging URL: https://memopyk.memopyk.com
- Password: memopyk2025admin
- Reuse auth patterns from tests/e2e/helpers/auth.ts (adapt for standalone script)
