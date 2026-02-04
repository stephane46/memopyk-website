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

**Update (Jan 31, 2026):** Analytics rebuild completed (P1-P8). See `docs/guides/ANALYTICS.md`.

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

## ADR-013: Database-Driven Help System

**Date:** February 2026
**Status:** Accepted

### Context

The admin panel needed contextual help for each section. Options:
- Hardcoded help content in React components
- External documentation (Notion, Confluence)
- Database-driven help with admin editing

### Decision

Use database tables (`help_screens`, `help_flows`) to store help content, served via API endpoints, with HelpDrawer UI that pushes main content.

### Rationale

- **Admin-editable:** Non-developers can update help content
- **Consistent UI:** HelpDrawer appears in-context, not a separate page
- **Structured:** Screens have title/description/tips/resources; Flows have ordered steps
- **Versioned:** Changes tracked in database
- **Push layout:** Content shrinks to make room for help panel (no modal overlay)

### Consequences

- Requires seeding initial help content
- Database dependency for help display
- Must maintain consistency between UI updates and help content

**Tables:**
- `help_screens`: Screen-specific help (title, description, tips, related_resources)
- `help_flows`: Multi-step flows with ordered steps

**Components:**
- `HelpDrawer`: Push-style panel
- `HelpFlowViewer`: Steps with progress dots
- `HelpButton`: Trigger in admin header
- `HelpContext`: Global state management

---

## ADR-014: E2E Test Rate Limit Bypass

**Date:** February 2026
**Status:** Accepted

### Context

E2E tests running against staging environment hit rate limits (429 errors), causing test flakiness. Tests would retry with exponential backoff, but this:
- Made tests slow and non-deterministic
- Led to "post deleted" errors when rate limiting caused timing issues
- Made it hard to distinguish real failures from rate limit failures

### Decision

Implement header-based bypass for E2E tests:
- Server checks `X-E2E-Token` header against `E2E_BYPASS_TOKEN` env var
- Playwright configured to send this header in all requests
- Bypass only applies when token matches (production has no token set)

### Rationale

- **Deterministic tests:** No rate limit variability
- **Secure:** Token required, not present in production
- **Simple:** Single header check at top of rate limit middleware
- **Transparent:** Bypass is explicit, not hidden

### Consequences

- Must set `E2E_BYPASS_TOKEN` in staging environment
- Must configure Playwright `extraHTTPHeaders` with token
- Tests now run faster (no retry delays)
- Real rate limit bugs would not be caught by E2E tests

**Implementation:**
- `server/middleware/security.middleware.ts`: Bypass check
- `playwright.config.ts`: `extraHTTPHeaders` configuration
- `.env.e2e`: Token storage

---

## ADR-015: 4-Status Blog Post Model

**Date:** February 2026  
**Status:** Accepted

### Context

Blog posts had inconsistent status options across the application. AI Creator offered Draft/Published/Archived while Blog Editor offered Draft/In Review/Published. There was no unified model.

### Decision

Standardize on 4 statuses everywhere: **Draft → In Review → Published → Archived**.

- Draft: work in progress
- In Review: ready for approval (can be same person or another)
- Published: live on the website
- Archived: retired, no longer relevant (distinct from Draft — finished but hidden)

### Rationale

- **Editorial workflow:** "In Review" supports an approval step before publishing
- **Lifecycle completeness:** "Archived" captures posts that are done but shouldn't be on the site (rejected content, outdated articles)
- **Consistency:** All entry points (Manual, AI, Editor) show the same options

### Consequences

- Database constraint updated to accept all 4 values
- StatusSelector component, Posts filter, and Posts list badges all updated
- All help content updated to reference 4 statuses with visual badges

---

## ADR-016: AI Context System ("Brand Brain")

**Date:** February 2026  
**Status:** Accepted

### Context

Multiple features need Claude API integration (translation, AI post generation). Each call needs consistent brand voice, writing rules, and awareness of existing content to avoid redundancy.

### Decision

Create a centralized `ai_context` table in Supabase with admin-editable brand guidelines. A server-side endpoint (`/api/internal/ai-context/full`) assembles the complete context — brand guide entries plus a list of all published posts — for injection into every Claude API call.

### Rationale

- **Single source of truth:** Brand voice defined once, used everywhere
- **Admin-editable:** No code deployment needed to update tone, rules, or guidelines
- **Content-aware:** Claude sees existing posts, avoids redundancy, can cross-link
- **Server-side:** API keys stay on the server, never exposed to client

### Consequences

- Requires ANTHROPIC_API_KEY environment variable
- New admin screen under Système → AI Context
- All AI features must fetch context before calling Claude
- Published posts list grows over time — may need pagination or summarization eventually

**Tables:** `ai_context` (key, title, content, category, sort_order)

**Endpoints:**
- Admin CRUD: `/api/admin/ai-context`
- Internal full context: `/api/internal/ai-context/full`

---

## ADR-017: Unified Post Creation (CreatePostLanding)

**Date:** February 2026  
**Status:** Accepted

### Context

Blog post creation had two separate entry points with no connection: Posts (Manual) for direct writing and Posts (AI) for AI-assisted generation. Users had to know which tab to use. The mental model was fragmented.

### Decision

Add a CreatePostLanding screen as a unified entry point. The "New Post" button on Posts (Manual) navigates here instead of directly creating a draft. Two cards offer the choice:
- "Write from scratch" → creates draft, opens Blog Editor
- "Generate with AI" → navigates to Posts (AI) tab

Both paths end at the Blog Editor. The landing screen is not a tab — it's an action screen reached via the button.

### Rationale

- **One flow, two methods:** Creating a post is the goal, AI is a method
- **No code duplication:** Reuses existing draft creation logic and AI Creator components
- **Non-destructive:** Posts (Manual) and Posts (AI) tabs continue to work as before
- **Progressive unification:** Phase 1 of 3 (landing → partial unification → true unification)

### Consequences

- New component: `CreatePostLanding.tsx`
- Route: `/admin?tab=new-post` (not visible in tab bar)
- Existing tabs unchanged — advanced users can still go directly to Posts (AI)
- Help flows updated to reflect new entry point
- Future phases will progressively merge AI into the Blog Editor itself

---

## ADR-018: Server-Side Translation via Claude API

**Date:** February 2026
**Status:** Accepted

### Context

The Translation Assistant required users to manually copy a prompt, paste into an external AI (ChatGPT/Claude), copy the result, and paste it back. This 6-step workflow had high friction and discouraged use.

### Decision

Implement one-click AI translation directly from the Posts list:

1. **Translation choice dialog:** Click translate icon → choice dialog appears with two options:
   - "Translate with AI" (primary) — server-side Claude translation
   - "Translate manually" — creates draft for manual translation

2. **Server-side translation:** When AI is chosen, the server:
   - Duplicates the post to the target language
   - Extracts images as `[IMAGE X]` placeholders
   - Calls Claude API with text + Brand Brain context
   - Parses response (TITLE, SLUG, DESCRIPTION, CONTENT)
   - Re-inserts images into translated content
   - Updates the duplicate with translated content (removes `[TRANSLATE TO...]` prefix)

3. **Graceful fallback:** If AI translation fails (no API key, API error, parsing error):
   - Duplicate is kept with `[TRANSLATE TO...]` prefix
   - Response includes `translationError` message
   - User can use Translation Assistant dialog manually

4. **Shared translation service:** `server/routes/translation-service.ts` provides reusable functions:
   - `translateContent()` — Claude API call with Brand Brain context
   - `fetchAIContext()` — loads brand/translation rules from Supabase
   - `extractImagesFromContent()` — image placeholder extraction
   - `reinsertImages()` — restore images after translation

### Rationale

- **UX improvement:** 7 clicks becomes 2 clicks (translate icon → "Translate with AI")
- **Brand consistency:** Every translation uses the same brand voice and rules
- **Content-aware:** Claude sees existing posts, can adapt references
- **Secure:** API key stays server-side
- **Fallback preserved:** Manual option available in both dialog and Translation Assistant
- **Reusable:** Shared service for future AI features

### Consequences

- Requires ANTHROPIC_API_KEY on staging and production
- Translation cost: ~$0.01-0.03 per post (2,000-3,000 tokens)
- Dependency on Claude API availability (fallback mitigates this)
- Model choice: claude-sonnet-4-20250514 for speed/quality balance
- Translation Assistant dialog still useful for re-translating or manual preference

**Files:**
- `server/routes/translation-service.ts` — shared translation logic
- `server/routes/blog-admin.routes.ts` — enhanced translate endpoint
- `client/src/admin/BlogManagePosts.tsx` — translation choice dialog
- `client/src/admin/TranslationAssistant.tsx` — simplified 2-step UI

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
