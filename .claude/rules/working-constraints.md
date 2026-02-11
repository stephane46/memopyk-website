# Working Constraints

Rules for all Claude Code teammates working on MEMOPYK. These exist to prevent real incidents that cost hours of debugging.

---

## Rule 1: Verify Before Acting

Before creating, editing, or deleting files:
1. List the directory — see what exists
2. Read existing files that might be relevant
3. Check for duplicates or conflicts
4. Then act based on facts, not assumptions

Never create a file without checking if it already exists.

## Rule 2: Token Efficiency

- Execute, don't plan. 5% planning, 95% execution.
- Don't ask permission — just do it (unless destructive).
- Don't explain what you're about to do. Do it and show results.
- Keep communication direct and brief.

## Rule 3: Deployment Workflow

**All changes go to `staging` first. No exceptions.**

```
1. Work on staging branch
2. Push to staging → auto-deploys to memopyk.memopyk.com
3. Verify on staging site
4. Only merge to main with Stéphane's explicit approval
5. main → auto-deploys to memopyk.com (production)
```

Never push directly to main. "Not seen" ≠ "Not broken."

## Rule 4: Verify File Writes

After writing a file:
1. List the directory to confirm it appears
2. Read it back to verify content
3. Only then report success

Never claim success without verification.

## Rule 5: Diagnostic Protocol for Failures

When unexpected failures occur: STOP and diagnose before proceeding.

- Check for systemic patterns — many failures = systemic cause (rate limiting, auth, network)
- Get HTTP response codes and server logs before accepting any explanation
- Look for 429, 500, timeout patterns
- Don't build the next task on top of undiagnosed problems
- Don't accept "data missing" at face value — check API responses

Real incident: 7/9 E2E tests came back "degraded." Plausible explanation accepted. Real cause was HTTP 429 rate limiting — cost hours.

## Rule 6: Report Failures Immediately

When a tool or MCP fails:
1. Tell Stéphane with the exact error message
2. State what failed and what you were trying to do
3. Suggest alternatives
4. Never silently fall back to workarounds

## Rule 7: Use Existing Patterns

Before writing new code:
- Check package.json for installed dependencies
- Read existing test files for patterns (tests/e2e/)
- Use established helpers (tests/e2e/helpers/)
- Match existing code style and conventions
- Use npm (not yarn/pnpm), React 18 + Vite + Express (not Next.js), Playwright (not Puppeteer/Selenium for testing)

## Rule 8: Database Operations

- Use psql or Postgres MCP for database changes
- Always verify data after INSERT/UPDATE/DELETE
- No schema changes without Stéphane's approval

---

## Rule 9: Agent Teams Coordination

When working as a teammate in an Agent Team:

1. **Stay in your lane** — Only modify files in your assigned scope. If you need changes elsewhere, message the team lead.
2. **Claim tasks** — Check the shared task list. Claim before starting. Don't duplicate work.
3. **Report blockers immediately** — Message the team lead, don't silently wait.
4. **Don't broadcast** — Use direct messages to specific teammates. Broadcasting costs tokens for everyone.
5. **Commit your own work** — Each teammate commits to `staging` with descriptive messages: `feat(your-scope): description`.
6. **Don't run cleanup** — Only the team lead runs team cleanup. Teammates just shut down when asked.

---

These rules save time. The deployment rule prevents untested code in production. The diagnostic rule prevents hours of masked debugging. The verify rule prevents false success claims.
