# MEMOPYK Migration Progress Report

**Last Updated:** 2026-02-04
**Status:** Help System Blog section complete — AI integration & Contenu Site next

---

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| **Staging URL** | ✅ Live | https://memopyk.memopyk.com |
| **Production URL** | ✅ Live | https://memopyk.com |
| **Homepage** | ✅ Working | 67% faster than Replit |
| **Gallery** | ✅ Working | |
| **FAQ** | ✅ Working | |
| **Blog** | ✅ Working | |
| **Contact Form** | ✅ Working | |
| **Travel Upload Portal** | ✅ Working | Form submission + Nextcloud integration |
| **Partner Directory** | ✅ Working | Minimal map (Mapbox migration planned) |
| **Admin Panel** | ✅ Working | 6 categories, authentication fixed |
| **Partners API** | ✅ Working | Database queries implemented |
| **Analytics** | ✅ Functional | P1-P8 rebuild complete Jan 31, 2026 |
| **Help System — Blog** | ✅ Complete | 8 screens, 3 flows, visual badges, localStorage persistence |
| **Help System — Other** | 🔧 Not started | Partners, Contenu Site, System, Analytics, SEO |
| **Blog Status Model** | ✅ Complete | Draft / In Review / Published / Archived (4 statuses) |
| **E2E Tests** | ✅ Infrastructure complete | Rate limit bypass, 9 flows |
| **DNS** | ✅ Complete | Migrated to Coolify (82.29.168.136) |

---

## Help System Status (Feb 4, 2026)

### Help Screens: 8 total (Blog section complete)

| Screen | Route | Chars | Visual Badges |
|--------|-------|-------|---------------|
| Blog Hub | /admin?tab=blog | ~1,000 | ✅ |
| Posts (AI) | /admin?tab=ai-creator | ~2,400 | ✅ |
| Topics | /admin?tab=topics | ~1,300 | ✅ |
| Keywords | /admin?tab=keywords | ~900 | ✅ |
| Image Bank | /admin?tab=images | ~640 | ✅ |
| Weekly Planner | /admin?tab=planner | ~580 | ✅ |
| Posts (Manual) | /admin?tab=posts | ~3,000 | ✅ |
| Blog Editor | /admin?tab=blog-edit | ~4,700 | ✅ (includes Translation Assistant section) |

### Help Flows: 3 total

| Flow | Steps | Linked Screens |
|------|-------|----------------|
| Publish a blog article | 8 | Posts (Manual), Blog Editor |
| Create a Post with AI | 8 | Posts (AI), Blog Editor, Posts (Manual) |
| Translate a post | 9 | Posts (Manual), Blog Editor |

### Features Implemented
- ✅ localStorage persistence (help panel stays open across navigation)
- ✅ CSS badge classes: `.help-btn` (orange), `.help-tab` (blue), `.help-label` (gray), `.help-status` (green)
- ✅ Flow steps render HTML via `dangerouslySetInnerHTML`
- ✅ Route/location hidden from user-facing flow display
- ✅ All content uses visual badges for interactive elements

### Remaining Help Sections (not started)
- Partners (1-2 screens)
- Contenu Site (6 screens — screenshots captured in docs/screenshots/contenu-site/)
- System (TBD)
- Analytics (TBD)
- SEO (TBD)

---

## Active Work — Feb 4, 2026

### ✅ Completed: Brand Brain Foundation

**Commit:** (staging) — AI Context system fully operational

- `ai_context` Supabase table with 6 seed entries (brand identity, tone/voice, writing rules, target audience, SEO guidelines, translation rules)
- Admin screen: Système → AI Context (editable textarea per entry)
- API: CRUD endpoints + `/api/internal/ai-context/full` (returns brand data + published posts list)
- Drizzle schema updated

### ✅ Completed: Unified Post Creation (Phase 1)

**Commit:** (staging) — CreatePostLanding screen

- "New Post" button on Posts (Manual) now opens CreatePostLanding
- Two cards: "Write from scratch" → Blog Editor, "Generate with AI" → Posts (AI)
- Route: `/admin?tab=new-post` (not in tab bar)
- Zero logic duplication — reuses existing draft creation

### In Progress: Server-Side Translation via Claude API

**Goal:** Replace manual copy/paste in Translation Assistant with one-click AI translation.

- Server calls Claude API with extracted text + Brand Brain context
- User reviews before applying (no blind auto-insert)
- Manual fallback preserved ("Prefer to translate manually?" link)
- Requires ANTHROPIC_API_KEY on staging/production

### Planned: Naive-User Help Flow Testing

**Concept:** Claude Code reads ONLY help flow steps (no code knowledge) and follows them literally. Rates each step ✅ Clear / ⚠️ Ambiguous / ❌ Blocked. This is "doc QA" — validates clarity of help content, not business logic.

**Constraints (per IT manager review):**
- May only read help content + screenshots
- Must not open source files
- Must report ambiguity with justification instead of assuming
- Stop rule: if "click X" has 2 plausible matches → ⚠️ with justification
- Coverage score: % of steps ✅ vs ⚠️ vs ❌

### Sequence (remaining today)
1. ~~Brand Brain~~ ✅
2. ~~CreatePostLanding~~ ✅
3. Translation API wiring (in progress)
4. Naive-user test on all 3 help flows
5. Help content for CreatePostLanding screen + flow updates

---

## Recent Commits (Feb 3-4, 2026)

| Commit | Description | Date |
|--------|-------------|------|
| (staging) | CreatePostLanding + help flow renames | 2026-02-04 |
| (staging) | Brand Brain: ai_context table + admin screen + API | 2026-02-04 |
| eceba65 | feat: add Archived status + help content updates + Translation flow | 2026-02-04 |
| 6ab3418 | rename blog tabs, AI navigation fix, help flows, Contenu Site discovery | 2026-02-04 |
| aead5de | help system visual badges, hide route display, render HTML in flow steps | 2026-02-04 |
| 914456a | persist help panel state + add help content CSS badges | 2026-02-04 |
| 3a776e0 | fix published_at blog post bug | 2026-02-03 |
| 3721f90 | Add tinymce dependency for Coolify build | 2026-02-03 |
| 659930b | Add 9 flow tests for Blog Hub E2E QA (M3) | 2026-02-03 |

---

## Important Process Rules

### Deployment Protocol
- **Claude Code pushes to staging only** — never merges to main or pushes to production
- **Merging staging → main requires Stéphane's explicit approval**
- Incident: Feb 4 — Claude Code merged to main without approval. Rule reinforced.

### Help Content Workflow
1. **Write** help content with visual badges
2. **Validate** against screenshots/Playwright (exact label matching)
3. **Refine** based on validation results
- Badge labels must EXACTLY match screen labels
- Use semantic CSS classes for formatting

### Three-Way Workflow
- **Stéphane** → strategic decisions, approval authority
- **Claude Chat** → planning, verification, prompts for Claude Code
- **Claude Code** → file execution, no deployment decisions

---

## Performance Comparison

**Full Report:** `docs/migration/PERFORMANCE_COMPARISON.md`

| Metric | Replit | Coolify | Improvement |
|--------|--------|---------|-------------|
| Homepage TTFB (avg) | 348ms | 121ms | **2.9x faster** |
| Gallery API | 984ms | 129ms | **7.6x faster** |
| FAQ API | 760ms | 121ms | **6.3x faster** |
| Blog Posts API | 250ms | 97ms | **2.6x faster** |

---

## Backlog

| Item | Priority | Notes |
|------|----------|-------|
| ~~Brand Brain~~ | ✅ Done | ai_context table + admin screen + API |
| ~~CreatePostLanding~~ | ✅ Done | Unified post creation entry point |
| Translation API wiring | ✅ Done | Claude API replaces copy/paste (code deployed) |
| ⚠️ Add ANTHROPIC_API_KEY to Coolify | 🔴 Blocked | Console down — retry at platform.claude.com, buy $5 credits, add key to staging env vars |
| Naive-user help flow testing | 🔴 Active | Doc QA for 3 flows |
| Help content: CreatePostLanding screen | 🔴 Active | New screen needs help entry |
| Help flow updates (new entry point) | 🔴 Active | Flows reference CreatePostLanding |
| Unified creation Phase 2 (partial unification) | 🟡 Next | AI stays in same flow, reuse components |
| Contenu Site help content (6 screens) | 🟡 Next | Screenshots already captured |
| Analytics rebuild | 🟡 Next | 300+ lines of docs prepared |
| Unified creation Phase 3 (true unification) | 🟢 Later | AI becomes panel inside Blog Editor |
| Mapbox GL JS migration | 🟢 Later | Replace Leaflet for Partner Directory |
| Image Bank rendering bug | 🟢 Later | Tab renders blank |
| Date picker UI language | 🟢 Later | Blog Editor date picker shows French ("Choisir une date", "Définir maintenant"). Decide whether to translate to English or keep French. Help content matches French UI. |
| Decommission Replit | 🟢 Later | After full confidence in Coolify |

---

## Architecture Decisions

Full ADR log: `docs/architecture/DECISIONS.md`

| ADR | Decision | Date |
|-----|----------|------|
| ADR-013 | Database-Driven Help System | Feb 2026 |
| ADR-014 | E2E Test Rate Limit Bypass | Feb 2026 |
| ADR-015 | 4-Status Blog Post Model (Draft/In Review/Published/Archived) | Feb 2026 |
| ADR-016 | AI Brand Brain + Server-Side Claude API | Feb 2026 (proposed) |

---

## Files Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project context for Claude Code sessions |
| `docs/WORKING_WITH_CLAUDE.md` | Three-way workflow guide |
| `docs/migration/MIGRATION_PROGRESS.md` | This file |
| `docs/migration/PERFORMANCE_COMPARISON.md` | Replit vs Coolify benchmarks |
| `docs/architecture/DECISIONS.md` | Architecture Decision Records |
| `docs/help/TEST_REPORT.md` | Help content verification results |
| `docs/help/SCREENSHOT_INDEX.md` | Screenshot organization |
| `docs/testing/BLOG_QA_PLAN.md` | Blog E2E QA plan |

---

*Document maintained by Claude Chat + Claude Code CLI*
