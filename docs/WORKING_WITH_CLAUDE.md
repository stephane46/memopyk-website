# MEMOPYK: Working with Claude

How we develop MEMOPYK — roles, workflows, and rules of engagement.

---

## Three Roles

| Who | Role | Does | Does NOT |
|-----|------|------|----------|
| **Stéphane** | Orchestrator | Decides priorities, reviews results, approves deploys | — |
| **Claude Chat (Desktop)** | Advisor | Thinks, plans, writes Claude Code prompts | Touch files, open browsers, run tests, query databases |
| **Claude Code CLI** | Executor | Writes code, runs tests, reads/writes files, browser testing, database queries | Make strategic decisions without Stéphane |

---

## CRITICAL RULES FOR CLAUDE CHAT

Claude Chat (Desktop Project "memopyk.com") is an **advisor only**. These rules are absolute:

### You NEVER do these things:
- ❌ Open Puppeteer or any browser
- ❌ Read files via Filesystem MCP (you have the 3 knowledge files — that's enough)
- ❌ Query the database via Supabase MCP
- ❌ Run code, scripts, or commands
- ❌ Test staging or production
- ❌ Fix code yourself
- ❌ Make SQL updates
- ❌ Use GitHub MCP to read repo files

### You ALWAYS do these things:
- ✅ Think about strategy, priorities, and architecture
- ✅ Discuss findings, reports, and results with Stéphane
- ✅ Write detailed, ready-to-paste Claude Code prompts
- ✅ Help Stéphane decide (SEO values, content strategy, feature priorities)
- ✅ Review what Claude Code accomplished and suggest next steps
- ✅ Ask Stéphane to paste report contents if you need to review them

### How you get information:
- Stéphane tells you what happened or pastes report contents
- You read the 3 knowledge files (README.md, WORKING_WITH_CLAUDE.md, CLAUDE.md)
- You use web search for external research (SEO, competitors, market)
- You do NOT try to read the repo yourself — ask Stéphane or write a Claude Code prompt

### When you write Claude Code prompts:
- Put the prompt in a single code block
- Be specific: file paths, exact task, expected outcome
- Include "do NOT" instructions for things to avoid
- Separate the prompt from your explanation to Stéphane

### If you are tempted to execute something:
STOP. Write a Claude Code prompt instead. Every time.

---

## Roles & Ownership

| Who | Owns |
|-----|------|
| **Stéphane** | Decisions, approvals, production deploys, orchestration |
| **Claude Chat** | Strategy, prompt writing, advisory |
| **Claude Code** | All execution — code, tests, files, database, browser |

---

## Agent Teams Workflow

### Starting a Session

```bash
cd [memopyk-website directory]
claude
```

Claude Code reads CLAUDE.md automatically. Then describe what you need:

```
Create an agent team with 3 teammates:
1. "analytics-agent": Optimize Google API caching. Files: server/routes/analytics*
2. "ui-agent": Update admin dashboard components. Files: client/src/**/admin/**
3. "test-agent": Write Playwright tests for changes. Files: tests/e2e/
Use Sonnet for all teammates.
```

### During the Session

| Shortcut | Action |
|----------|--------|
| Shift+Up/Down | Select a teammate |
| Enter | View teammate's session |
| Ctrl+T | Toggle task list |
| Escape | Interrupt a teammate |
| Shift+Tab | Toggle delegate mode (lead coordinates only) |

### Ending a Session

```
Summarize what was accomplished. Update CLAUDE.md "Recent Work" section
and any relevant docs/. Then shut down all teammates and clean up.
```

---

## Single-Session Workflow (No Team Needed)

For simple tasks — bug fix, config change, small feature:

```bash
claude
```

Then just describe the task. No team overhead needed.

---

## Deployment

| Branch | Deploys To | URL |
|--------|------------|-----|
| `staging` | Staging | https://memopyk.memopyk.com |
| `main` | Production | https://memopyk.com |

**Always push to `staging` first. Only merge to `main` with Stéphane's approval.**

```bash
git checkout staging
git add . && git commit -m "feat(scope): description"
git push origin staging
# → Auto-deploys to staging (~1-2 min)
# → Test on staging
# → Only after approval:
git checkout main && git merge staging && git push origin main
```

---

## Help System

The admin has a contextual help sidebar. Content stored in Supabase:
- `help_screens` — per-screen help (HTML), 31 screens covering all admin sections
- `help_flows` — step-by-step guides (JSON), 2 flows

**Components:** HelpButton.tsx, HelpDrawer.tsx, HelpFlowViewer.tsx, HelpContext.tsx, useHelp.ts

**After admin UI changes:** Update help_screens via psql, then run:
```bash
npx playwright test tests/e2e/help-flow-validation.spec.ts
```

**31 help_screens (by route):**
- `/admin?tab=ai-context` — AI Context (Brand Brain)
- `/admin?tab=ai-creator` — AI Creator
- `/admin?tab=analytics-new` — Analytics Dashboard
- `/admin?tab=analytics-new&an_tab=blog` — Analytics — Blog
- `/admin?tab=analytics-new&an_tab=clarity` — Analytics — Clarity
- `/admin?tab=analytics-new&an_tab=cta` — Analytics — CTA
- `/admin?tab=analytics-new&an_tab=exclusions` — Analytics — Exclusions
- `/admin?tab=analytics-new&an_tab=fallback` — Analytics — Diagnostics
- `/admin?tab=analytics-new&an_tab=geo` — Analytics — Geography
- `/admin?tab=analytics-new&an_tab=live` — Analytics — Live
- `/admin?tab=analytics-new&an_tab=overview` — Analytics — Overview
- `/admin?tab=analytics-new&an_tab=trends` — Analytics — Trends
- `/admin?tab=analytics-new&an_tab=video` — Analytics — Video
- `/admin?tab=blog` — Blog Hub
- `/admin?tab=blog-edit` — Blog Editor
- `/admin?tab=cache` — Cache Management
- `/admin?tab=cta` — CTA Buttons
- `/admin?tab=faq` — FAQ Management
- `/admin?tab=gallery` — Video Gallery
- `/admin?tab=hero-management` — Hero Videos
- `/admin?tab=images` — Image Bank
- `/admin?tab=keywords` — Keywords
- `/admin?tab=legal-docs` — Legal Documents
- `/admin?tab=new-post` — New Post
- `/admin?tab=partners` — Partners Directory
- `/admin?tab=planner` — Planner
- `/admin?tab=posts` — Posts
- `/admin?tab=seo` — SEO Management
- `/admin?tab=topics` — Planned Posts
- `/admin?tab=travel-agencies` — Travel Agencies
- `/admin?tab=why-memopyk` — Why MEMOPYK Cards

**2 help_flows:**
- "Create a blog post" — Step-by-step guide to create a blog post, manually or with AI assistance
- "Translate a post" — Translate a post to another language using AI or manual tools

**CSS badge classes:** `.help-btn` (orange), `.help-tab` (blue), `.help-label` (gray), `.help-status` (green)

---

## Analytics Systems

The admin dashboard has 10 analytics tabs powered by two data sources:

**GA4** (Google Analytics 4): Client-side tracking via gtag.js. Powers Blog tab. Available as toggle for Overview and Trends.
**MEMOPYK** (Custom): Server-side session tracking in Supabase `analytics_sessions` table. Powers Video, CTA, Geo, Live tabs. Default for Overview and Trends.

Key rules:
- Blog tab = GA4 only (no toggle)
- Video/CTA = MEMOPYK only (server-side events)
- Overview/Trends = both sources available via toggle (MEMOPYK default)
- All MEMOPYK queries exclude bots, test data, and admin-excluded IPs
- Global filters (date, language, country) apply to ALL tabs via the centralized filter system in `analyticsNewFilters.store.ts`
- ALL analytics API requests must go through `buildAnalyticsParams()` in `data/analyticsFilters.ts` — no manual URL building

After analytics UI changes: verify the tab renders correctly on staging, check that data source badges match the actual source.

---

## Testing

| What | How |
|------|-----|
| Playwright specs | `npx playwright test tests/e2e/[test].spec.ts` |
| Standalone scripts | `npx tsx tests/e2e/[script].ts` |
| Auth helper | `tests/e2e/helpers/auth.ts` — `loginToAdmin()`, `navigateToBlogHub()` |
| Config | `playwright.config.ts` — viewport 2560x1440, staging URL |
| Screenshots | `tests/e2e/screenshots/` |

See docs/help/NAIVE_USER_TEST_PROCEDURE.md for help content testing methodology.

---

## Database

- 85 app tables (35 in Drizzle schema), Drizzle ORM, schema in `shared/schema.ts`
- For reads: Postgres MCP or psql
- For writes: psql via Claude Code (more reliable)
- No schema changes without Stéphane's approval

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
