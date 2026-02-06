# MEMOPYK Website

## Current Status

**Last updated:** February 6, 2026
**Staging:** https://memopyk.memopyk.com (auto-deploys on push to `staging` branch)
**Production:** https://memopyk.com (auto-deploys on push to `main` branch)

**Branches:** `staging` → memopyk.memopyk.com | `main` → memopyk.com

| Component | Status |
|-----------|--------|
| Server | ✅ Running (port 5000) |
| Client | ✅ Running (Vite) |
| Database | ✅ Supabase PostgreSQL (42 tables) |
| Analytics | ✅ Functional (P1-P8 complete) |
| Partner Directory | ✅ Working (Mapbox GL JS upgrade planned) |
| Auto-deploy | ✅ Enabled (push → GitHub webhook → Coolify) |
| Help System | ✅ Complete (9 screens + 2 flows, visual badges, localStorage persistence) |
| Blog Hub | ✅ Workflow tabs with numbered steps (①②③④⑤) |
| **Production** | ✅ **LIVE on Coolify** (Replit replaced) |

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

## Recent Work

- 2026-02-06: Keywords CRUD — KeywordFormModal + KeywordDeleteDialog, New/Edit/Delete buttons, API endpoints (POST/PATCH/DELETE)
- 2026-02-06: French keyword import — 2,605 keywords imported from GKP CSV with tier (1-3) and intent classification, 805 Tier 4 skipped
- 2026-02-05: Topic form UX polish — Competition/Search Intent as dropdowns, ✨ AI indicators on 7 fields, collapsible SEO Research + Images sections
- 2026-02-05: Topic form audit — removed slug from form, added helper text to 12 fields, wired content_angle/description/search_intent into AI prompts
- 2026-02-05: Topics expanded UX — orange left accent border, gray background, grouped action buttons (Edit/Delete/Create Post), consistent bold labels, primary keyword pill
- 2026-02-05: Topics CRUD (create/edit/delete) + TopicFormModal, TopicDeleteDialog components
- 2026-02-05: Pill consistency — getCategoryShortLabel() for compact category pills (Photo, Video, Family, Digital, Crafts, Seasonal)
- 2026-02-05: DELETE endpoint changed from blocking to unlinking posts (sets source_topic_id = null)
- 2026-02-05: apiRequest parameter order audit — fixed reversed args in TopicDeleteDialog.tsx + 5 calls in SeoManagement.tsx
- 2026-02-05: Blog Hub tabs merged with workflow — numbered circles (①-⑤), arrow separators, subtitles, full-width grid matching SEO pattern
- 2026-02-05: Blog Hub tab order changed to workflow order: Topics → Keywords → Planner → Posts → Image Bank (Planner remains default)
- 2026-02-05: Removed separate workflow bar — tabs ARE the workflow now
- 2026-02-04: Server-side translation via Claude API (one-click AI translation from Posts list)
- 2026-02-04: Unified post creation (CreatePostLanding: "Write from scratch" or "Generate with AI")
- 2026-02-04: Brand Brain foundation (ai_context table + admin screen + API)
- 2026-02-04: Tab unification — merged Posts (Manual) and Posts (AI) into single Posts tab
- 2026-02-04: Help flows merged (2 creation flows → 1 unified 7-step flow)
- 2026-02-03: Blog Hub E2E QA (9 flow tests)
- 2026-02-02: Help System complete — 9 screens, 2 flows, visual badges, localStorage persistence
- 2026-02-02: Admin menu restructured (3 direct links + 3 collapsible categories)
- 2026-02-02: 🎉 **PRODUCTION LIVE ON COOLIFY** — DNS switched from Replit to Coolify
- 2026-02-01: Staging/production branch workflow established

## Known Issues

- 67 client TS errors (non-blocking, admin analytics components)
- Mapbox GL JS migration planned for Partner Directory map
- Blog Hub help content updated Feb 5 (workflow diagram removed, clean numbered list, Topic vs Post explanation added)
