# MEMOPYK Website

## Current Status

**Last updated:** February 2, 2026
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
| Help System | ✅ Complete (5 screens + 1 flow, step progress dots working) |
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

- 2026-02-02: Help System complete — HelpDrawer, HelpFlowViewer with 4-step progress dots, 5 screens seeded
- 2026-02-02: Blog tabs renamed for clarity (Blog Hub, Topics, Posts)
- 2026-02-02: Admin menu restructured (3 direct links + 3 collapsible categories)
- 2026-02-02: 🎉 **PRODUCTION LIVE ON COOLIFY** — DNS switched from Replit to Coolify (82.29.168.136)
- 2026-02-02: Security fixes + blog gallery implementation merged to main
- 2026-02-01: Created content.routes.ts (17th route module) for Content Production Hub
- 2026-01-31: Staging/production branch workflow established

## Known Issues

- 67 client TS errors (non-blocking, admin analytics components)
- Mapbox GL JS migration planned for Partner Directory map
