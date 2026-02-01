# MEMOPYK Website

## Current Status

**Last updated:** January 31, 2026
**Staging:** https://memopyk.memopyk.com (auto-deploys on push to `staging` branch)
**Production:** https://memopyk.com (auto-deploys on push to `main` branch)

**Branches:** `staging` → memopyk.memopyk.com | `main` → memopyk.com

| Component | Status |
|-----------|--------|
| Server | ✅ Running (port 5000) |
| Client | ✅ Running (Vite) |
| Database | ✅ Supabase PostgreSQL (40 tables) |
| Analytics | ✅ Functional (P1-P8 complete) |
| Partner Directory | ✅ Working (Mapbox GL JS upgrade planned) |
| Auto-deploy | ✅ Enabled (push → GitHub webhook → Coolify) |

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

- 2026-01-31: Staging/production branch workflow established
- 2026-01-31: Documentation restructure (roles, workflow, single source of truth)
- 2026-01-31: Analytics rebuild complete (P1-P8)
- 2026-01-31: Auto-deploy webhook configured
- 2026-01-30: Partner Directory Leaflet bug fixed
- 2026-01-30: CSS/Tailwind config fixed

## Known Issues

- 67 client TS errors (non-blocking, admin analytics components)
- Mapbox GL JS migration planned for Partner Directory map

<!-- Deploy test: main branch - attempt 2 -->