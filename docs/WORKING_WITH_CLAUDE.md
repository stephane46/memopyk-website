# MEMOPYK: Working with Claude

Quick reference for reporting issues and requesting changes.

---

## Roles & Ownership

| Who | Owns | Responsibility |
|-----|------|----------------|
| **Stéphane** | Decisions | Makes decisions, approves plans, tests in browser |
| **Claude Chat** | Documentation (*.md) | Writes/updates all markdown files directly, planning, verification, **proposing UX/UI improvements** |
| **Claude Code** | Code + Commands + Database | Executes code changes, runs terminal commands (npm, git, psql, etc.), reports back |

**Key rules:**
- **Claude Chat writes documentation directly** — no prompts needed for .md files
- **Claude Code writes code** — Claude Chat creates prompts for code changes only
- **Claude Code handles ALL database operations** — Supabase MCP is unreliable for writes; use `psql` via Claude Code
- Claude Chat verifies Claude Code's work by reading files
- Claude Chat MUST put Claude Code prompts in a single code block (for easy copy-paste)
- **After admin UI changes** — Claude Chat updates help_screens content via Claude Code
- **Claude Chat proactively suggests UX/UI improvements** — don't hesitate, propose changes
- **Claude Chat MUST discuss ALL Claude Code findings** — when Claude Code reports audit results, caveats, suggestions, or improvement ideas, Claude Chat must raise each one with Stéphane for discussion. Never skip, summarize away, or move on without addressing them. Claude Code's observations are valuable input that deserve attention.

---

## UX/UI Improvements

Part of the Coolify migration is improving the user experience. Claude Chat should:

- **Proactively suggest improvements** — naming, layout, flow, clarity
- **Point out inconsistencies** — mismatched labels, confusing terminology, dev jargon
- **Propose before implementing** — explain the suggestion, get approval, then create prompt
- **Think like a user** — not a developer

Examples of what to look for:
- Unclear button/tab labels (e.g., "Backlog" → "Topics")
- Jargon that users won't understand
- Inconsistent naming across screens
- Missing feedback (loading states, success messages)
- Confusing navigation or flow

---

## Starting a Session

Always start by giving Claude Chat context:

```
MEMOPYK session.

Please read:
1. CLAUDE.md (current status)
2. docs/WORKING_WITH_CLAUDE.md (workflow)

[Then state what you want to work on]
```

After a long break (weeks/months), add:

```
It's been a while. Please also check:
- git log --oneline -10 (recent changes)
- docs/README.md (documentation index)
```

---

## The Workflow

**For Documentation (.md files):**
1. YOU         → Describe what docs need updating
2. CLAUDE CHAT → Writes/updates the .md files directly
3. CLAUDE CODE → Commits and pushes to `staging` (default)

**For Code Changes:**
1. YOU         → Describe request to Claude Chat
2. CLAUDE CHAT → Reads files, asks questions, creates Claude Code prompt
3. YOU         → Paste prompt to Claude Code
4. CLAUDE CODE → Executes, reports back
5. CLAUDE CHAT → Verifies by reading files
6. YOU         → Test in browser, confirm done
7. CLAUDE CODE → Commits and pushes to `staging` (default)

**For Database Changes (INSERT/UPDATE/DELETE/DDL):**
1. CLAUDE CHAT → Creates SQL in Claude Code prompt
2. CLAUDE CODE → Runs via `psql $DATABASE_URL -c "..."`
3. No commit needed for data-only changes

⚠️ **Deploy where?** Always push to `staging` first. Only push to `main` when Stéphane explicitly says to promote.

---

## Deployment

Two branches, two environments:

| Branch | Deploys To | URL |
|--------|------------|-----|
| `staging` | Staging site | https://memopyk.memopyk.com |
| `main` | Live site | https://memopyk.com |

**Daily workflow:**

```bash
# 1. Work on staging branch
git checkout staging
git add . && git commit -m "feat: description"
git push origin staging
# → Auto-deploys to memopyk.memopyk.com (~1-2 min)

# 2. Test on staging site

# 3. When ready, merge to main
git checkout main
git merge staging
git push origin main
# → Auto-deploys to memopyk.com (~1-2 min)

# 4. Return to staging
git checkout staging
```

---

## Help System

The admin has a built-in Help button ("Aide" in sidebar). Content is stored in Supabase tables:
- `help_screens` — contextual help per admin screen (HTML content)
- `help_flows` — step-by-step guides (JSON array of steps)

**Components:**
- `HelpButton.tsx` — sidebar button, detects current route
- `HelpDrawer.tsx` — right-side panel (320px), shows screen help + flow list
- `HelpFlowViewer.tsx` — step-by-step viewer with progress dots
- `HelpContext.tsx` — React context for help state
- `useHelp.ts` — data fetching hooks

**When Claude Code changes admin UI:**
1. Claude Chat creates SQL to update the relevant help_screens entry
2. Claude Code runs via psql (or Postgres MCP)
3. Help stays in sync with UI automatically

**Current help_screens (9 screens):**
- `/admin?tab=blog` — Blog Hub (5 tabs overview)
- `/admin?tab=posts` — Posts (list, filters, actions)
- `/admin?tab=new-post` — New Post (CreatePostLanding choices)
- `/admin?tab=ai-creator` — AI Creator
- `/admin?tab=blog-edit` — Blog Editor (includes Translation Assistant)
- `/admin?tab=planner` — Weekly Planner
- `/admin?tab=keywords` — Keywords
- `/admin?tab=topics` — Topics
- `/admin?tab=images` — Image Bank

**Current help_flows (2 flows):**
- "Create a blog post" — 7 steps (Posts → New Post → Write/AI → Editor → Save)
- "Translate a post" — 8 steps (Posts → Translate icon → AI/Manual → Editor → Save)

**Visual badge CSS classes:**
- `.help-btn` — orange (buttons: Save Changes, Generate AI Prompt)
- `.help-tab` — blue (tabs: Posts, AI Creator)
- `.help-label` — gray (field names: Title, Tags)
- `.help-status` — green (statuses: Published, Draft)

---

## Before Writing Claude Code Prompts — Mandatory Checklist

Claude Chat is the orchestrator. Before writing ANY prompt for Claude Code, Claude Chat MUST:

1. **Check existing infrastructure** — Read relevant files to understand what tools, patterns, and code already exist. Never assume.
2. **Check recent work** — Read MIGRATION_PROGRESS.md and recent commits to understand current state.
3. **Use the right tools** — The project uses specific technologies. Check before suggesting alternatives:
   - Browser testing: **Playwright** (not Puppeteer, not Selenium)
   - Database: **Supabase PostgreSQL** via `psql` or Postgres MCP
   - Package manager: **npm** (not yarn, not pnpm)
   - Framework: **React 18 + Vite + Express** (not Next.js)
4. **Read existing test files** — Before writing a test prompt, read `tests/e2e/` to see patterns, helpers, and naming conventions.
5. **Reference existing helpers** — Use `tests/e2e/helpers/auth.ts` for login, existing config from `playwright.config.ts`, etc.
6. **Never hallucinate tools** — If unsure whether a library is installed, check `package.json` first.

**Why this matters:** A wrong prompt wastes Stéphane's time and Claude Code's context. Getting it right the first time is the orchestrator's core job.

---

## Testing Infrastructure

The project has established testing patterns. Claude Chat must know these before writing test-related prompts.

| Component | Location | Notes |
|-----------|----------|-------|
| Playwright config | `playwright.config.ts` | Viewport 2560x1440, staging URL, HTML+JSON reporters |
| Auth helper | `tests/e2e/helpers/auth.ts` | `loginToAdmin()`, `navigateToBlogHub()`, `clickBlogTab()` |
| E2E tests | `tests/e2e/*.spec.ts` | Standard Playwright test format |
| Standalone scripts | `tests/e2e/*.ts` (non-spec) | Run with `npx tsx`, use Playwright directly |
| Screenshots | `tests/e2e/screenshots/` | Organized by test type (help-validation/, etc.) |
| Naive user test | `tests/e2e/naive-user-help-test.ts` | V1 pattern — Playwright browser walkthrough |
| Help flow test | `tests/e2e/help-flow-validation.spec.ts` | Spec-based help validation |
| Cleanup helper | `tests/e2e/helpers/cleanup.ts` | Post-test cleanup utilities |

### Running Tests
```bash
# Standard Playwright spec tests
npx playwright test tests/e2e/homepage.spec.ts

# Standalone scripts (naive-user tests, discovery)
npx tsx tests/e2e/naive-user-help-test.ts
```

### Naive User Testing (see docs/help/NAIVE_USER_TEST_PROCEDURE.md)
This is our custom methodology for validating help content. Claude Chat must read the full procedure before writing any naive-user test prompts.

---

## Templates

### Bug Report
```
BUG: [Short description]
Where: [Page URL or admin section]
What happens:
Expected:
```

### Feature Request
```
FEATURE: [Short description]
Goal:
Where: [Which page/section]
Priority: [Nice-to-have / Important / Critical]
```

---

## End of Session

Claude Chat updates CLAUDE.md "Recent Work" section with what was accomplished.
