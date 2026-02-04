# MEMOPYK — Blog Hub Automated QA (E2E) System
Owner: IT Manager  
Implementers: Coder(s)  
Environment: Staging first, then CI/Coolify after each deploy  
Tooling: Playwright (already installed by Claude Code)

## 1) Purpose
We have a complex Blog system (Blog Hub: Weekly Planner, Topics, Keywords, Posts, Image Bank).  
After server migration + code improvements, we no longer trust that all flows still work end-to-end.

We need an automated system that:
- behaves like a human tester (clicks through UI, tries actions)
- re-discovers the product flow (we don’t rely on memory)
- captures evidence (screenshots/video/trace)
- produces a readable report (what worked, what failed, where it failed)
- is safe (runs in staging with a test account and does not pollute production)

## 2) High-level approach
We implement a two-layer QA automation:

### Layer A — UI Discovery (Robot Eyes)
Objective: automatically map what exists on the screen today.
- Navigate to Blog Hub
- Click each primary tab (Weekly Planner, Topics, Keywords, Posts, Image Bank)
- For each tab: wait for stable UI, screenshot, list visible interactive elements
- Output a `discovery.md` and `discovery.json` as a “site map” of the Blog Hub

This provides confidence that:
- pages load
- menus/tabs exist
- key controls are present (filters, buttons, lists, counters)
- we can detect missing/broken UI after deployments

### Layer B — Flow Tests (Human-like tasks)
Objective: validate real user flows (create/edit/schedule/publish, etc.).
- Based on discovery output + product expectations
- Each flow test produces a step-by-step narrative + screenshots (like a mini SOP)
- Includes negative tests (validation errors, missing fields, file size limits)

## 3) Scope (Blog Hub areas)
Primary screens / tabs:
- Weekly Planner
- Topics
- Keywords
- Posts
- Image Bank

Core features to validate (flows):
- Navigation + page load stability (no blank content, no stuck loaders)
- Filters work (search + dropdowns)
- Open topic detail (if applicable)
- Create new post (draft) from Topic or Posts (depending on actual UX)
- Edit existing post
- Status transitions (Backlog → In Progress → Published)
- Priority assignment (e.g., P1/P3/P5 or High/Normal/Low)
- Calendar / schedule date selection and persistence
- Hero image selection from library + upload new image (Image Bank)
- Delete post (only in staging) OR soft-delete / archive (depending on actual behavior)
- Public blog page renders (if part of staging)

Inside of scope (for now):
- AI Creator 
- Heavy performance benchmarking 

## 4) Environments & Safety
### Environments
- Staging URL: https://memopyk.memopyk.com
- Production URL: https://memopyk.com (NOT for destructive tests)

### Test account
Create/confirm a dedicated staging admin user:
- Email: e2e_tester@memopyk.com (or similar)
- Role: minimum required permissions for Blog Hub
- Never used by humans

### Test data policy
- All created posts must be clearly labeled as test:
  - Title prefix: `[E2E]`
  - Tag: `e2e-test` (if tagging exists)
- Prefer cleaning up after test runs when possible:
  - Either delete created records
  - Or keep them in an `E2E` category for easy manual cleanup

## 5) Stability requirements (mandatory)
To avoid flaky tests, the UI must expose stable selectors.

### Add stable selectors (`data-testid`)
- Every major navigation item
- Every key action button (New, Save, Publish, Delete)
- Inputs (title/body/search)
- Dropdown triggers (status, category, type, priority)
- Date picker trigger and day cells (with `data-date="YYYY-MM-DD"`)
- Image picker open/confirm + upload input

Rule:
- Tests must NOT depend on fragile CSS selectors or translated UI text.

## 6) Reporting requirements (the “human QA report”)
Each run must produce:
- Playwright HTML report (standard)
- A Markdown report per run: `qa-report.md` that contains:
  - Summary: Pass/Fail + timestamp + base URL + git commit (if available)
  - Discovered tabs + screenshots links
  - Flow results: each step listed in human language
  - Failures: last successful step, error screenshot, trace link
- Attachments:
  - screenshots on each major step
  - video/trace on failure

## 7) Implementation plan (deliverables)
### Deliverable 1 — Discovery Runner
Output:
- `discovery.json`: structured list of pages/tabs and visible controls
- `discovery.md`: readable map (like “what exists” today)
- screenshots per tab

Behavior:
- login → open Blog Hub → iterate tabs → collect:
  - URL
  - visible heading(s)
  - key counters (numbers on screen)
  - list of interactive elements discovered:
    - buttons (label/testid)
    - inputs (placeholder/testid)
    - dropdowns
    - menus

### Deliverable 2 — Flow Runner (“Blog Smoke Suite”)
Minimum flows (first version):
1. Login and open Blog Hub
2. Topics: filters work (search changes results OR shows “no results”)
3. Posts: open editor for an existing post
4. Create draft post (wherever UX allows)
5. Set priority
6. Set schedule date
7. Set hero image (select from Image Bank)
8. Save → verify success toast → verify appears in list

Each flow must:
- generate `[E2E]` unique title
- output a step-by-step Markdown narrative with screenshots

### Deliverable 3 — CI / Coolify execution (after Step 1+2 are stable)
- On staging deploy from `staging` branch:
  - run discovery + smoke suite
  - store reports as build artifacts
  - optional: notify Slack/email with Pass/Fail + link to report

## 8) Acceptance criteria
Discovery:
- Can run unattended against staging
- Produces `discovery.md` + screenshots for each Blog Hub tab
- Fails with clear reason if a tab does not load or is missing

Smoke suite:
- Runs unattended against staging
- Creates a draft post and verifies it exists
- Sets priority + schedule + hero image and verifies values persisted after reload
- Produces `qa-report.md` with a readable step list and evidence screenshots
- On failure: report includes the last good step + screenshot + trace/video retained

CI:
- Runs automatically on staging deployments
- Test results visible to team (report artifact link)
- No secrets committed (credentials in env/secret store)

## 9) Operational usage
### When to run
- Every staging deploy (CI)
- On-demand locally for debugging
- Before production deploy (optional)

### What “good” looks like
- After any code change, we can answer:
  - “Does Blog Hub still load?”
  - “Can we still create and publish (or save) a post?”
  - “Are schedule/priority/images still functional?”

## 10) Notes / constraints to discuss
- Which exact UI path creates a new post? (from Topics vs Posts)
- Are deletes permanent or soft-delete?
- Are there rate limits or image upload limits in staging?
- Should tests use mocked external services (email, storage) or real staging services?

