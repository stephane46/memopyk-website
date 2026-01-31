# MEMOPYK Documentation

**Website:** [memopyk.com](https://memopyk.com)  
**Repository:** memopyk-clean  
**Last Updated:** January 2026

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development (Express + Vite)
npm run dev
# Server: http://localhost:5000
# Client: http://localhost:5173

# Production build
npm run build

# Start production server
npm run start
```

**Before running:** Copy `.env.example` to `.env` and configure all variables. See [ENVIRONMENT.md](deployment/ENVIRONMENT.md) for details.

---

## Documentation Index

### Architecture

| Document | Description |
|----------|-------------|
| [OVERVIEW.md](architecture/OVERVIEW.md) | System design, component diagram, data flow |
| [DATABASE.md](architecture/DATABASE.md) | 40-table schema reference with relationships |
| [API.md](architecture/API.md) | 16 route modules, all endpoints documented |
| [DECISIONS.md](architecture/DECISIONS.md) | Architecture Decision Records (ADRs) |

### Deployment

| Document | Description |
|----------|-------------|
| [ENVIRONMENT.md](deployment/ENVIRONMENT.md) | All environment variables explained |
| [DOCKER.md](deployment/DOCKER.md) | Dockerfile breakdown, build process |
| [COOLIFY.md](deployment/COOLIFY.md) | Production deployment on Coolify |

### Operational Guides

| Document | Description |
|----------|-------------|
| [ANALYTICS.md](guides/ANALYTICS.md) | Analytics dashboard usage guide |
| [BLOG_WORKFLOW.md](guides/BLOG_WORKFLOW.md) | Creating and managing blog posts |
| [TRAVEL_PORTAL.md](guides/TRAVEL_PORTAL.md) | Travel upload portal SOP |

### Migration History

| Document | Description |
|----------|-------------|
| [MIGRATION_PROGRESS.md](migration/MIGRATION_PROGRESS.md) | Overall migration status |
| [PERFORMANCE_COMPARISON.md](migration/PERFORMANCE_COMPARISON.md) | Replit vs Coolify benchmarks |
| [ANALYTICS_INVENTORY.md](migration/ANALYTICS_INVENTORY.md) | Analytics endpoints audit |
| [CUSTOM_ANALYTICS_REBUILD_PLAN.md](migration/CUSTOM_ANALYTICS_REBUILD_PLAN.md) | Analytics rebuild roadmap |

---

## Project Structure

```
memopyk-clean/
├── client/                 # React 18 frontend
│   ├── public/             # Static assets (flags/, images/)
│   └── src/
│       ├── components/     # UI components (shadcn/ui + custom)
│       ├── pages/          # Page components
│       ├── admin/          # Admin panel
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utilities
├── server/                 # Express.js backend
│   ├── routes/             # 16 route modules
│   ├── services/           # Business logic
│   ├── middleware/         # Express middleware
│   └── data/               # JSON backup files
├── shared/                 # Shared code
│   └── schema.ts           # Drizzle ORM schema (40 tables)
└── docs/                   # This documentation
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI Framework | Tailwind CSS + shadcn/ui (Radix) |
| Backend | Express.js + TypeScript |
| Database | Supabase PostgreSQL (self-hosted) |
| ORM | Drizzle |
| Storage | Supabase Storage CDN |
| Email | Resend |
| Analytics | Google Analytics 4 |
| Deployment | Docker + Coolify |

---

## Key Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | AI context file (Claude Code reads this first) |
| `.env.example` | Environment variable template |
| `Dockerfile` | Production container build |
| `shared/schema.ts` | Database schema (40 tables) |
| `server/routes.ts` | Route aggregator (mounts 16 modules) |

---

## External Services

| Service | Purpose | Documentation |
|---------|---------|---------------|
| Supabase | Database + Storage | [supabase.com/docs](https://supabase.com/docs) |
| Resend | Transactional email | [resend.com/docs](https://resend.com/docs) |
| Google Analytics 4 | Web analytics | [GA4 docs](https://developers.google.com/analytics) |
| Nextcloud | File sharing (Travel Portal) | Self-hosted |
| Zoho CRM | Customer management | Optional integration |

---

## Getting Help

1. **Start with CLAUDE.md** — Contains current work status and project context
2. **Check this docs/ folder** — Architecture, deployment, and operational guides
3. **Read migration history** — Explains why things are built this way

---

*This documentation was created January 2026 during the Replit → Coolify migration.*
