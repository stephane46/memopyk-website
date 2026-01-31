# System Architecture Overview

**Application:** MEMOPYK Website  
**Type:** Full-stack web application (React + Express)  
**Architecture:** Monolithic with modular structure

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           INTERNET                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      COOLIFY (Docker Host)                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    MEMOPYK Container                          │  │
│  │                                                               │  │
│  │  ┌─────────────────┐    ┌──────────────────────────────────┐  │  │
│  │  │   Express.js    │    │         React (Vite)             │  │  │
│  │  │   Server        │    │         Static Files             │  │  │
│  │  │   Port 5000     │───▶│         (dist/public/)           │  │  │
│  │  │                 │    │                                  │  │  │
│  │  │   /api/*        │    │   - index.html                   │  │  │
│  │  │   routes        │    │   - assets/*.js                  │  │  │
│  │  └────────┬────────┘    │   - assets/*.css                 │  │  │
│  │           │             └──────────────────────────────────┘  │  │
│  └───────────┼───────────────────────────────────────────────────┘  │
└──────────────┼──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                               │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  Supabase   │  │   Resend    │  │  Nextcloud  │  │    GA4     │  │
│  │  PostgreSQL │  │   Email     │  │   Files     │  │  Analytics │  │
│  │  + Storage  │  │             │  │             │  │            │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Frontend (React)

**Location:** `client/src/`  
**Build Output:** `dist/public/`  
**Framework:** React 18 + TypeScript + Vite

| Directory | Purpose |
|-----------|---------|
| `components/` | Reusable UI components (shadcn/ui + custom) |
| `pages/` | Page-level components (20 pages) |
| `admin/` | Admin panel (analytics, content management) |
| `hooks/` | Custom React hooks |
| `contexts/` | React context providers (Auth, Language) |
| `lib/` | Utilities, API client, analytics helpers |

**Key Features:**
- Single Page Application (SPA)
- Client-side routing (React Router)
- Bilingual support (EN/FR)
- TanStack Query for data fetching
- Tailwind CSS for styling

### Backend (Express)

**Location:** `server/`  
**Entry Point:** `server/index.ts`  
**Framework:** Express.js + TypeScript

| Directory | Purpose |
|-----------|---------|
| `routes/` | 16 modular route files |
| `services/` | Business logic layer |
| `middleware/` | Auth, caching, error handling |
| `config/` | Configuration and constants |
| `data/` | JSON backup files |

**Key Features:**
- RESTful API
- Session-based authentication
- Drizzle ORM for database
- JSON fallback for resilience

### Shared Code

**Location:** `shared/`

| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle ORM schema (40 tables) |
| `partnerFormats.ts` | Partner format definitions |
| `partnerSchema.ts` | Partner validation schemas |

---

## Data Flow

### Public Page Request

```
Browser                Express               Database
   │                      │                     │
   │  GET /               │                     │
   │─────────────────────▶│                     │
   │                      │                     │
   │  index.html          │                     │
   │◀─────────────────────│                     │
   │                      │                     │
   │  GET /api/gallery    │                     │
   │─────────────────────▶│                     │
   │                      │  SELECT * FROM      │
   │                      │  gallery_items      │
   │                      │────────────────────▶│
   │                      │                     │
   │                      │  [rows]             │
   │                      │◀────────────────────│
   │                      │                     │
   │  JSON response       │                     │
   │◀─────────────────────│                     │
```

### Admin Request (Authenticated)

```
Browser                Express               Database
   │                      │                     │
   │  POST /api/admin/login                     │
   │  {secret: "..."}     │                     │
   │─────────────────────▶│                     │
   │                      │                     │
   │                      │  Validate secret    │
   │                      │  Set session        │
   │                      │                     │
   │  Set-Cookie: session │                     │
   │◀─────────────────────│                     │
   │                      │                     │
   │  PUT /api/admin/gallery/:id               │
   │  Cookie: session     │                     │
   │  {title: "..."}      │                     │
   │─────────────────────▶│                     │
   │                      │                     │
   │                      │  Check session      │
   │                      │  UPDATE gallery_items│
   │                      │────────────────────▶│
   │                      │                     │
   │  200 OK              │                     │
   │◀─────────────────────│                     │
```

---

## Database Architecture

**Database:** Supabase PostgreSQL (self-hosted)  
**ORM:** Drizzle  
**Schema:** `shared/schema.ts` (40 tables)

### Table Categories

| Category | Tables | Purpose |
|----------|--------|---------|
| Content | `hero_videos`, `hero_text_settings`, `gallery_items` | Homepage content |
| FAQ | `faq_sections`, `faqs` | FAQ management |
| Blog | `blog_posts`, `tags`, `post_tags` | Blog system |
| Partners | `partners` | Partner directory |
| Legal | `legal_documents` | Legal pages |
| CMS | `cta_settings`, `why_memopyk_cards` | CMS content |
| SEO | `seo_settings`, `seo_redirects`, `seo_audit_log` | SEO management |
| Analytics | `analytics_sessions`, `analytics_views`, `realtime_visitors` | Custom analytics |
| Travel | `travel_agency_codes`, `travel_upload_submissions` | Travel portal |
| Content Planning | `content_topics`, `content_keywords`, `content_weekly_plans` | Blog planning |

**See [DATABASE.md](DATABASE.md) for complete schema documentation.**

---

## API Architecture

**Base URL:** `/api`  
**Authentication:** Session-based (cookie)  
**Format:** JSON

### Route Modules (16 total)

| Module | Mount Point | Auth | Purpose |
|--------|-------------|------|---------|
| health | `/api/health` | No | Health checks |
| hero | `/api/hero-videos`, `/api/hero-text` | Admin | Hero section |
| gallery | `/api/gallery` | Admin | Gallery CRUD |
| faq | `/api/faq` | Admin | FAQ management |
| blog | `/api/blog`, `/api/admin/blog` | Admin | Blog system |
| contact | `/api/contact` | No | Contact form |
| partners | `/api/partners` | Admin | Partner directory |
| legal | `/api/legal` | No | Legal documents |
| seo | `/api/seo` | Admin | SEO settings |
| cta | `/api/cta`, `/api/why-memopyk-cards` | Admin | CMS content |
| analytics | `/api/ga4`, `/api/event` | No | GA4 tracking |
| analytics-legacy | `/api/analytics` | Admin | Custom analytics (stubbed) |
| newsletter | `/api/newsletter` | No | Newsletter signup |
| admin | `/api/admin` | Yes | Admin operations |
| media | `/api/upload`, `/api/video-*` | Admin | Media uploads |
| travel-upload | `/api/travel` | No | Travel portal |

**See [API.md](API.md) for endpoint documentation.**

---

## Authentication

### Session-Based Auth

1. Admin enters `ADMIN_SECRET` at login
2. Server validates and creates session
3. Session stored in cookie (httpOnly, secure)
4. Subsequent requests include cookie
5. Middleware validates session

### Protected Routes

Routes requiring authentication:
- `/api/admin/*`
- `/api/seo/*` (write operations)
- All PUT/POST/DELETE on content routes

### Public Routes

Routes without authentication:
- `/api/health`
- `/api/gallery` (GET)
- `/api/faq` (GET)
- `/api/blog` (GET)
- `/api/contact` (POST)
- `/api/partners` (GET)

---

## External Integrations

### Supabase

- **PostgreSQL:** Primary database
- **Storage:** CDN for videos and images
- **Connection:** Direct via `DATABASE_URL`

### Resend

- **Purpose:** Transactional emails
- **Usage:** Contact form, travel portal confirmations
- **Integration:** REST API

### Nextcloud

- **Purpose:** File sharing for travel uploads
- **Usage:** Travel portal creates shared folders
- **Integration:** WebDAV + OCS Share API

### Google Analytics 4

- **Purpose:** Web analytics
- **Client:** gtag.js for pageviews, events
- **Server:** Data API for dashboard queries

---

## Caching Strategy

| Content Type | Cache Duration | Strategy |
|--------------|----------------|----------|
| Static assets | 1 year | Vite hash-based filenames |
| API responses | No cache | Fresh data always |
| Gallery items | 5 min (planned) | In-memory cache |
| Legal pages | 15 min (planned) | In-memory cache |

**Note:** Complex caching was removed during migration. Simple direct database queries are used. Caching can be reintroduced if needed.

---

## Error Handling

### Frontend

- TanStack Query handles API errors
- Error boundaries for component crashes
- User-friendly error messages

### Backend

- Error middleware catches exceptions
- Structured error responses:
  ```json
  {
    "error": "Not found",
    "message": "Gallery item not found",
    "statusCode": 404
  }
  ```
- Logging for debugging (console in dev, structured in prod)

---

## Deployment Architecture

See [COOLIFY.md](../deployment/COOLIFY.md) for details.

```
GitHub ──push──▶ Coolify ──build──▶ Docker ──deploy──▶ Container
                    │
                    ▼
              Let's Encrypt
              SSL Certificate
```

---

## Design Decisions

See [DECISIONS.md](DECISIONS.md) for Architecture Decision Records (ADRs).

Key decisions:
1. Monolithic vs microservices → Monolithic (simpler, sufficient scale)
2. ORM choice → Drizzle (lightweight, good TypeScript)
3. Removed hybrid-storage → Direct Drizzle queries (Coolify is single-server)
4. Session vs JWT → Sessions (simpler for admin-only auth)

---

*This overview is current as of January 2026. See CLAUDE.md for latest work status.*
