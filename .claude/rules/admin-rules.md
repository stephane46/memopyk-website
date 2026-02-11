---
paths:
  - server/routes/admin*
  - server/routes/analytics*
  - server/routes/ai-context*
  - server/routes/help*
  - server/routes/blog-admin*
  - server/routes/blog-analytics*
  - server/routes/image-bank*
  - client/src/**/admin/**
---

# Admin Panel Rules

## Analytics (Google API)
- Analytics routes use Google API with rate limiting — NEVER remove or bypass the throttle
- Cache API responses in Supabase where possible to reduce Google API costs
- BigQuery integration exists — check docs/guides/ANALYTICS.md before modifying

## AI Block Generator
- AI API calls have token cost implications — log all calls
- Check existing AI context routes (ai-context.routes.ts) before creating new ones

## Help Sidebar System
- After ANY admin UI change (labels, buttons, tabs, navigation), the help content must be updated
- Help content is stored in Supabase: `help_screens` table (HTML) and `help_flows` table (JSON)
- Update help via psql through Claude Code — see docs/WORKING_WITH_CLAUDE.md Help System section
- Run Playwright tests after help updates: `npx playwright test tests/e2e/help-flow-validation.spec.ts`
- Current coverage: 9 screens, 2 flows (see WORKING_WITH_CLAUDE.md for full list)

## Blog Admin
- Blog Hub has 5 workflow tabs: Keywords → Topics → Planner → Posts → Image Bank
- 12,501 keywords in database across 25 clusters
- See docs/guides/BLOG_WORKFLOW.md for the full content pipeline

## Database
- 42 tables in Supabase PostgreSQL, schema in shared/schema.ts (Drizzle ORM)
- For writes: use psql via Claude Code (more reliable than MCP for INSERT/UPDATE/DELETE)
- No schema changes without Stéphane's approval
