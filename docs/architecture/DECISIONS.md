# Architecture Decision Records (ADRs)

This document records significant architectural decisions made during the MEMOPYK website development and migration.

---

## ADR-001: Monolithic Architecture

**Date:** November 2025  
**Status:** Accepted

### Context

MEMOPYK is a business website with admin functionality. Expected traffic is moderate (< 10k visits/month). Development is done by one person with AI assistance.

### Decision

Use a monolithic architecture with a single Express server serving both API and static files.

### Rationale

- **Simplicity:** One codebase, one deployment, one server
- **Sufficient scale:** Monolith handles expected load easily
- **Development speed:** No service coordination overhead
- **Cost:** Single container is cheaper than multiple services

### Consequences

- All code deploys together (no independent scaling)
- Must be careful about code organization to avoid mess
- If traffic explodes, may need to revisit

---

## ADR-002: Drizzle ORM over Prisma

**Date:** November 2025  
**Status:** Accepted

### Context

Need an ORM for PostgreSQL database. Options considered:
- Prisma (most popular)
- Drizzle (newer, TypeScript-first)
- Raw SQL with pg

### Decision

Use Drizzle ORM.

### Rationale

- **TypeScript inference:** Better type inference than Prisma
- **Lightweight:** Smaller bundle, faster cold starts
- **No code generation:** Schema is just TypeScript
- **SQL-like:** Queries feel familiar to SQL users

### Consequences

- Smaller community than Prisma
- Fewer tutorials/examples available
- Some features less mature

---

## ADR-003: Supabase for Database and Storage

**Date:** November 2025  
**Status:** Accepted

### Context

Need hosted database and file storage. Options:
- Firebase (Google)
- Supabase (Postgres-based)
- PlanetScale (MySQL)
- Self-hosted Postgres

### Decision

Use Supabase (self-hosted on VPS) for database, Supabase hosted for Storage CDN.

### Rationale

- **PostgreSQL:** Industry standard, powerful features
- **Self-hosting:** Full control, no vendor lock-in
- **Storage CDN:** Handles video delivery without custom infrastructure
- **Good DX:** Dashboard, auto-generated APIs (though we use Drizzle)

### Consequences

- Must maintain Supabase on VPS
- Dependent on Supabase Storage for media
- Good PostgreSQL knowledge required

---

## ADR-004: Remove Hybrid Storage System

**Date:** January 2026  
**Status:** Accepted

### Context

The Replit codebase had a 298KB `hybrid-storage.ts` file that:
- Synced data between Replit development and production servers
- Maintained JSON fallback files
- Handled complex caching logic

This was necessary because Replit has separate dev/prod servers with no shared state.

### Decision

Remove hybrid-storage entirely. Use direct Drizzle queries.

### Rationale

- **Coolify is single-server:** No dev/prod sync needed
- **Complexity removed:** 8,000+ lines of sync code deleted
- **Direct queries:** Simpler, faster, easier to debug
- **JSON files optional:** Keep for disaster recovery only

### Consequences

- JSON sync jobs removed
- Caching must be reimplemented if needed (simpler approach)
- Legacy hybrid-storage code cannot be reused

---

## ADR-005: Session-Based Authentication

**Date:** November 2025  
**Status:** Accepted

### Context

Need authentication for admin panel. Options:
- JWT tokens
- Session cookies
- OAuth (Google, GitHub)

### Decision

Use session-based authentication with cookies.

### Rationale

- **Simple:** No token refresh logic
- **Secure:** HttpOnly cookies prevent XSS token theft
- **Admin-only:** No need for complex auth (no user accounts)
- **Works with Express:** express-session is mature

### Consequences

- Sessions stored in memory (fine for single server)
- If scaling horizontally, need shared session store
- Single admin secret (no user management)

---

## ADR-006: Bilingual Content Structure

**Date:** November 2025  
**Status:** Accepted

### Context

MEMOPYK serves English and French markets. Content must be bilingual.

### Decision

Store both languages in single records with `En`/`Fr` suffixed columns.

**Example:**
```typescript
titleEn: text("title_en").notNull(),
titleFr: text("title_fr").notNull(),
```

### Rationale

- **Simplicity:** One row per content item
- **Atomic updates:** Both languages update together
- **No join overhead:** Language switching is column selection
- **Admin UX:** Edit both languages on same form

### Consequences

- Schema has many columns (2x for each text field)
- Cannot add new languages without schema change
- Translation completeness must be enforced in code

---

## ADR-007: Vite over Create React App

**Date:** November 2025  
**Status:** Accepted

### Context

Need build tool for React frontend. Options:
- Create React App (CRA)
- Vite
- Next.js
- Remix

### Decision

Use Vite.

### Rationale

- **Speed:** Much faster dev server and builds than CRA
- **Modern:** ES modules, native TypeScript
- **Simple:** No SSR complexity (not needed)
- **Active:** CRA is deprecated

### Consequences

- Different config than CRA (vite.config.ts)
- Some CRA-specific libraries may need adjustment
- Need to handle SPA routing in production

---

## ADR-008: shadcn/ui Component Library

**Date:** November 2025  
**Status:** Accepted

### Context

Need UI components. Options:
- Material UI
- Chakra UI
- shadcn/ui (Radix primitives + Tailwind)
- Build from scratch

### Decision

Use shadcn/ui.

### Rationale

- **Ownership:** Components copied into codebase (not npm dependency)
- **Customizable:** Easy to modify
- **Accessible:** Built on Radix primitives
- **Tailwind integration:** Matches our styling approach

### Consequences

- Must maintain copied components
- Updates require manual merging
- Some components may be over-engineered for our needs

---

## ADR-009: Coolify over Vercel/Railway

**Date:** January 2026  
**Status:** Accepted

### Context

Migrating from Replit. Need new hosting. Options:
- Vercel (frontend-focused)
- Railway (simple PaaS)
- Fly.io (edge deployment)
- Coolify (self-hosted PaaS)
- Raw Docker on VPS

### Decision

Use Coolify on existing VPS.

### Rationale

- **Existing VPS:** Already have infrastructure
- **Cost:** No additional hosting fees
- **Control:** Full access to server
- **Features:** Git deploy, SSL, easy rollback
- **Docker:** Standard container deployment

### Consequences

- Must maintain Coolify and VPS
- No global edge network (single region)
- Responsible for backups, security, updates

---

## ADR-010: Stub Analytics Endpoints

**Date:** January 2026  
**Status:** Accepted (temporary)

### Context

Original codebase had 8,000+ lines of custom analytics code deeply intertwined with hybrid-storage. Options:
- Port all analytics code (high effort, carries tech debt)
- Stub endpoints, rebuild later (defer complexity)
- Remove analytics entirely

### Decision

Stub all 58 analytics endpoints to return empty data. Rebuild analytics from scratch in a future phase.

### Rationale

- **Ship faster:** Unblocks production deployment
- **Clean slate:** Rebuild without legacy patterns
- **GA4 baseline:** Google Analytics provides basic metrics
- **Manageable scope:** Analytics is separate concern

### Consequences

- Custom analytics dashboard shows no data temporarily
- Must track analytics rebuild as priority work
- Need to document what analytics features are needed

**Follow-up:** See `docs/migration/CUSTOM_ANALYTICS_REBUILD_PLAN.md`

---

## ADR-011: Minimal Leaflet Map Implementation

**Date:** January 2026  
**Status:** Accepted (workaround)

### Context

Partner Directory map using Leaflet + react-leaflet crashed in Coolify production with "Maximum call stack size exceeded". Same code worked on Replit.

### Decision

Deploy minimal map configuration without advanced features (clustering, auto-zoom, bounds tracking). Plan migration to Mapbox GL JS.

### Rationale

- **Works:** Basic map with markers functions correctly
- **Ships:** Unblocks deployment
- **Root cause:** Leaflet class system incompatible with Vite production build
- **Better solution:** Mapbox GL JS doesn't have this architecture

### Consequences

- Map lacks clustering (markers overlap at low zoom)
- No auto-fit to markers on load
- Future work: Migrate to Mapbox GL JS

**Details:** See `/PARTNER_DIRECTORY_LEAFLET_BUG_REPORT.md`

---

## ADR-012: Express Serves Static Files

**Date:** January 2026  
**Status:** Accepted

### Context

Options for serving frontend:
- Separate nginx container
- CDN (Cloudflare, Vercel)
- Express serves static files

### Decision

Express serves static files from `dist/public/`.

### Rationale

- **Simplicity:** Single container
- **SPA routing:** Express handles fallback to index.html
- **Performance:** Good enough for expected traffic
- **No extra config:** Works out of the box

### Consequences

- Express handles both API and static requests
- May want CDN in front for caching (future optimization)
- Static file performance depends on Node.js

---

## Template for New ADRs

```markdown
## ADR-XXX: [Title]

**Date:** [Date]  
**Status:** [Proposed | Accepted | Deprecated | Superseded]

### Context

[What is the issue that we're seeing that motivates this decision?]

### Decision

[What is the change that we're proposing and/or doing?]

### Rationale

[Why is this the best choice?]

### Consequences

[What are the results of the decision?]
```

---

*ADRs should be updated when decisions change. Mark old ADRs as Deprecated or Superseded rather than deleting them.*
