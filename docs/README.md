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
| Database | Supabase PostgreSQL (85 app tables, 35 in Drizzle schema) |
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
│   ├── routes/         # 24 route files (22 modules + 2 shared utilities)
│   └── services/       # Business logic
├── shared/             # Shared code
│   └── schema.ts       # Drizzle schema (35 tables)
└── docs/               # Documentation (you are here)
```

---

## Documentation Index

### How We Work
| Document | Description |
|----------|-------------|
| WORKING_WITH_CLAUDE.md | Roles, workflow, templates — start here |
| TECH_DEBT.md | Known technical debt and priorities |

### Analytics
| Document | Description |
|----------|-------------|
| analytics/ANALYTICS_AUDIT_REPORT.md | Full analytics system audit (Feb 2026) |
| guides/ANALYTICS.md | Analytics system guide and setup |
| OVERNIGHT_ANALYTICS_PLAN.md | Planned analytics rebuild strategy |

### Deployment
| Document | Description |
|----------|-------------|
| deployment/ENVIRONMENT.md | Environment variables |
| deployment/DOCKER.md | Container build process |
| deployment/COOLIFY.md | Production deployment |

### Guides
| Document | Description |
|----------|-------------|
| guides/BLOG_WORKFLOW.md | Blog post management |
| guides/TRAVEL_PORTAL.md | Travel upload portal |
| guides/NEXTCLOUD_INTEGRATION.md | Nextcloud integration design (reference) |
| guides/PUPPETEER_SCREENSHOTS.md | Screenshot automation |

### Content Strategy (Marketing/)
| Document | Description |
|----------|-------------|
| Marketing/KEYWORD_RESEARCH_COMPLETE.md | Master keyword research (12,501 keywords) |
| Marketing/INTENT_CLASSIFICATION_RULESETS.md | Keyword intent classification rules |
| Marketing/FR_CLUSTER_CLASSIFICATION_RULESET.md | French cluster classification rules |
| Marketing/KEYWORD_TO_TOPIC_FRAMEWORK_1.md | Framework: keywords → blog topics |
| Marketing/BLOG_TOPICS_STRATEGIC.md | Strategic blog topic list |
| Marketing/CONTENT_STRATEGY_PROGRESS.md | Content strategy progress tracker |
| Marketing/blog_topics.json | Topic data (machine-readable) |

### Help System
| Document | Description |
|----------|-------------|
| help/ADMIN_SCREEN_ROUTES.md | Admin screen route mapping (30 screens, 2 flows) |
| help/NAIVE_USER_TEST_PROCEDURE.md | Methodology for help content testing |
| help/TEST_REPORT_V6_NAIVE_USER.md | Latest test results (27 screens, 5 CLEAR → 22 enriched Feb 14) |
| help/TEST_REPORT_V5_NAIVE_USER.md | V5 test results (historical) |
| help/TEST_REPORT_V5_FIXED_NAIVE_USER.md | V5-fixed test results (historical) |

### Code Reviews & Audits
| Document | Description |
|----------|-------------|
| Code-Review/2026-02-01-BLOG-CONTENT-SYSTEM-REVIEW.md | Blog content system review |
| Code-Review/blog-frontend-admin-review.md | Blog frontend admin review |
| audits/TOPIC_FIELD_AUDIT.md | Topic field completeness audit |

### Testing
| Document | Description |
|----------|-------------|
| Testing/BLOG_QA_PLAN.md | Blog Hub QA test plan |
| Testing/BLOG_QA_SPEC.md | Blog Hub QA spec |
| Testing/STAGING_SEED_DATA.md | Staging environment seed data |

### Migration History
| Document | Description |
|----------|-------------|
| migration/MIGRATION_PROGRESS.md | Replit → Coolify migration status |
| migration/PERFORMANCE_COMPARISON.md | Replit vs Coolify benchmarks |

### Architecture
| Document | Description |
|----------|-------------|
| architecture/OVERVIEW.md | System design, data flow, folder structure |
| architecture/DATABASE.md | 85-table schema reference (35 in Drizzle) |
| architecture/API.md | All endpoints documented (~204 endpoints) |
| architecture/DECISIONS.md | Architecture Decision Records (11 ADRs) |

---

## Key Files

| File | Purpose |
|------|---------|
| CLAUDE.md | AI context — current status, recent work |
| .env.example | Environment template |
| shared/schema.ts | Database schema (Drizzle) |
| server/routes.ts | Route aggregator |

---

Documentation last updated: February 14, 2026
