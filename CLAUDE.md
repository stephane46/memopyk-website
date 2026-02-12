# MEMOPYK Website

## What Is MEMOPYK?

MEMOPYK creates professional "Films Souvenirs" (souvenir/memory films) from clients' existing photos and videos. Target market: families aged 35-65, French and French-Canadian markets. This is a premium memory preservation service — NOT a productivity tool, NOT a SaaS app.

## Current Status

**Last updated:** February 12, 2026
**Staging:** https://memopyk.memopyk.com (auto-deploys on push to `staging`)
**Production:** https://memopyk.com (auto-deploys on push to `main`)

| Component | Status |
|-----------|--------|
| Server | ✅ Express.js (port 5000) |
| Client | ✅ React 18 + Vite |
| Database | ✅ Supabase PostgreSQL (85 tables) |
| Analytics | ✅ GA4 + custom Supabase (blog analytics endpoints added Feb 11) |
| Partner Directory | ✅ Working (Mapbox GL JS upgrade planned) |
| Auto-deploy | ✅ Push → GitHub webhook → Coolify |
| Help System | ✅ Complete (31 screens, 2 flows, 20/20 naive user pass) |
| Blog Hub | ✅ 5 workflow tabs, 12,501 keywords, 25 clusters |
| Production | ✅ Live on Coolify (Replit fully replaced Feb 2) |

## Quick Commands

```
npm install          # Install dependencies
npm run dev          # Development (Express + Vite)
npm run build        # Production build
npm run start        # Start production server
```

## Before You Code

READ THESE FIRST:
1. docs/WORKING_WITH_CLAUDE.md — Roles, workflow, how we work together
2. docs/README.md — Project structure, tech stack, documentation index
3. docs/TECH_DEBT.md — Known issues and deferred work

## Deployment

| Branch | Deploys To | URL |
|--------|------------|-----|
| `staging` | Staging | https://memopyk.memopyk.com |
| `main` | Production | https://memopyk.com |

**Always push to `staging` first. Only merge to `main` with Stéphane's approval.**

## Admin Panel Sections

| Section | Description |
|---------|-------------|
| Blog Hub | 5-tab content workflow: Keywords → Planned Posts → Planner → Posts → Image Bank |
| Partners | Partner directory management + map |
| Contenu Site | Homepage content, gallery, FAQ |
| Analytics | GA4 + custom dashboards |
| SEO | Meta tags, sitemap |
| System | Cache, health, configuration |

## Key Architecture

| Layer | Tech | Key Files |
|-------|------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui | `client/src/` |
| Backend | Express.js, TypeScript | `server/routes/` (22 route modules) |
| Database | Supabase PostgreSQL, Drizzle ORM | `shared/schema.ts` (85 app tables, 35 in Drizzle schema) |
| Deployment | Docker, Coolify | `Dockerfile`, `docker-compose.yml` |
| Email | Resend | Contact form, notifications |
| Storage | Supabase Storage CDN | Images, videos |

## Recent Work

- 2026-02-12: API health check (56 endpoints, 96.4% pass) — 1 GA4 realtime credential bug found
- 2026-02-12: E2E test suite expansion — 7 new spec files (blog-crud, seo, faq, gallery, partners, cache, hero), 1,603 lines
- 2026-02-12: Architecture doc fixes — route count consistency (22 files/23 groups), partners admin endpoints, content pipeline expanded to 21 endpoints
- 2026-02-12: Fix 36 TS errors (zero remaining), rewrite ANALYTICS.md, verify/update architecture docs
- 2026-02-12: Help content 20/20 — all admin screens pass naive user test, Cache help rewritten
- 2026-02-12: Production SEO values set — bilingual titles/descriptions, OG images, JSON-LD (Service+Organization), hreflang
- 2026-02-12: SEO bugs fixed — EN language switch blank page, server-side meta tag injection for crawlers
- 2026-02-12: DB cleanup — 34K duplicate SEO rows removed
- 2026-02-12: Overnight Agent Teams — doc fixes (table count, help screens, flagged items), help validation, SEO service implementation, naive-user help test
- 2026-02-11: Documentation audit — 107→33 files, 9.5MB→387KB (96% reduction). Updated README, MIGRATION_PROGRESS, TECH_DEBT, BLOG_WORKFLOW.
- 2026-02-11: Blog analytics endpoints (5 new: popular, trends, topics, keywords, categories)
- 2026-02-09: Architecture audit — security hardening, 48 dead files removed (~12K lines), 9 DB indexes, fetch pattern standardization, React.lazy code splitting
- 2026-02-06: Keyword management system — 12,501 FR+EN keywords, 25 clusters, multi-select filters, quick presets
- 2026-02-05: Topics CRUD, Blog Hub workflow tabs (numbered circles ①-⑤)
- 2026-02-04: AI translation, unified post creation, Brand Brain foundation
- 2026-02-02: Production live on Coolify, help system complete

## Known Issues

See docs/TECH_DEBT.md for full list. Key items:
- GA4 Realtime API: `/api/ga4/realtime/top-videos` returns 500 (credential JSON parse error — base64-encoded instead of raw JSON)
- Mapbox GL JS migration planned for Partner Directory
- Analytics dashboard rebuild decision pending

## Agent Teams

This project uses Claude Code Agent Teams for parallel development. If you're reading this as a teammate:

**Your scope:** Follow your spawn prompt. Only modify files in your assigned directories. If you need changes outside your scope, message the team lead — don't do it yourself.

**Coordination:**
- Check the shared task list before starting work
- Claim tasks, don't duplicate work another teammate is doing
- Message the team lead when you finish a task or hit a blocker
- Message other teammates directly if your work affects theirs

**Before coding:** Read `.claude/rules/working-constraints.md` and any path-scoped rules that match your files. Read `docs/README.md` for the documentation index.

**After coding:** Verify your changes (Rule 4), commit to `staging` branch (Rule 3), update relevant docs if architecture changed.
