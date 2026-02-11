# MEMOPYK: Working with Claude

How we develop MEMOPYK — roles, workflows, and rules of engagement.

---

## Two Systems, Two Roles

| System | Role | Best For |
|--------|------|----------|
| **Claude Project "memopyk.com"** | Strategic advisor | Planning priorities, reviewing progress, SEO research, big-picture decisions |
| **Claude Code (Agent Teams)** | Execution team | Writing code, fixing bugs, running tests, building features, updating docs |

### When to Use the Claude Project
- "What should I work on next?"
- "Review this week's progress"
- "Help me plan the analytics rebuild strategy"
- Web research, competitive analysis, content strategy

### When to Use Claude Code Agent Teams
- "Build the caching layer for analytics API calls"
- "Fix the sidebar help for the new blog tab"
- "Run Playwright tests on admin sections"
- Any task that touches code, database, or deployment

---

## Roles & Ownership

| Who | Owns |
|-----|------|
| **Stéphane** | Decisions, approvals, browser testing, production deploys |
| **Claude Code Team Lead** | Coordination, task assignment, quality synthesis |
| **Claude Code Teammates** | Focused execution within their assigned scope |

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
