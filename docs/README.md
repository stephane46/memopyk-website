# MEMOPYK Documentation

Website: https://memopyk.com | Staging: https://memopyk.memopyk.com

---

## Quick Start

```
npm install          # Install dependencies
npm run dev          # Development (localhost:5000 + 5173)
npm run build        # Production build
npm run start        # Start production server
```

See deployment/ENVIRONMENT.md for required variables.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui (Radix) |
| Backend | Express.js + TypeScript |
| Database | Supabase PostgreSQL (40 tables) |
| ORM | Drizzle |
| Storage | Supabase Storage CDN |
| Email | Resend |
| Analytics | GA4 + Custom Supabase |
| Deployment | Docker + Coolify (auto-deploy) |

---

## Project Structure

```
memopyk-website/
├── CLAUDE.md           # Current status (Claude Code reads first)
├── client/             # React frontend
│   ├── public/         # Static assets
│   └── src/            # Components, pages, admin
├── server/             # Express backend
│   ├── routes/         # 16 route modules
│   └── services/       # Business logic
├── shared/             # Shared code
│   └── schema.ts       # Drizzle schema (40 tables)
└── docs/               # Documentation (you are here)
```

---

## Documentation Index

### How We Work
| Document | Description |
|----------|-------------|
| WORKING_WITH_CLAUDE.md | Start here — Roles, workflow, templates |

### Architecture
| Document | Description |
|----------|-------------|
| architecture/OVERVIEW.md | System design, data flow |
| architecture/DATABASE.md | 40-table schema reference |
| architecture/API.md | All endpoints documented |
| architecture/DECISIONS.md | Architecture Decision Records |

### Deployment
| Document | Description |
|----------|-------------|
| deployment/ENVIRONMENT.md | Environment variables |
| deployment/DOCKER.md | Container build process |
| deployment/COOLIFY.md | Production deployment |

### Guides
| Document | Description |
|----------|-------------|
| guides/ANALYTICS.md | Analytics system guide |
| guides/BLOG_WORKFLOW.md | Blog post management |
| guides/TRAVEL_PORTAL.md | Travel upload portal |
| guides/NEXTCLOUD_INTEGRATION.md | Nextcloud integration design (reference) |
| guides/PUPPETEER_SCREENSHOTS.md | Screenshot automation (Puppeteer, MCP tools) |

### Migration History
| Document | Description |
|----------|-------------|
| migration/MIGRATION_PROGRESS.md | Migration status |
| migration/PERFORMANCE_COMPARISON.md | Replit vs Coolify |

---

## Key Files

| File | Purpose |
|------|---------|
| CLAUDE.md | AI context (current status) |
| .env.example | Environment template |
| shared/schema.ts | Database schema |
| server/routes.ts | Route aggregator |

---

Documentation created January 2026
