# Content Production Workflow Map

**Generated:** 2026-02-09
**Branch:** staging
**Method:** Automated code analysis of the end-to-end content pipeline

---

## Pipeline Overview

```
Keywords (12,501)  →  Topics  →  Planner (12-week calendar)  →  Posts  →  Public Blog
   CSV import          CRUD        Drag-and-drop scheduling       Dual path:       7 endpoints
   CRUD API            AI fields   Assignment ↔ Topic sync        • Manual         SEO + Gallery
   Classification      Hub/Spoke   Status color-coding            • AI (Claude)    Reading progress
   25 clusters         primary_kw  Topics + Posts views            Translation      Share buttons
```

**Status Cascade:** `blog_posts.status` → `content_topics.status` → `content_daily_assignments.status`

---

## Quick Reference

| Stage | Component | Route File | DB Tables | Key Features |
|-------|-----------|------------|-----------|--------------|
| Keywords | `admin/ContentProductionKeywords.tsx` | `content.routes.ts` | content_keywords | 12,501 keywords, 25 clusters, multi-select filters, quick presets |
| Topics | `admin/ContentProductionHub.tsx` (Topics tab) | `content.routes.ts` | content_topics | Hub/spoke structure, AI field indicators, CRUD modal |
| Planner | `admin/ContentProductionPlanner.tsx` | `content.routes.ts` | content_daily_assignments | 12-week calendar, drag-drop, dual view (topics/posts) |
| Posts | `admin/BlogEditor.tsx`, `admin/CreatePostLanding.tsx` | `blog-admin.routes.ts` | blog_posts, blog_galleries, blog_post_tags, blog_tags | TinyMCE, AI generation, translation |
| Images | `admin/ImageBankManager.tsx` | `image-bank.routes.ts` | imageBank, imageLabels, imageLabelLinks | Upload, labels, usage tracking |
| SEO | `admin/SeoManagement.tsx` | `seo.routes.ts` | seo_settings | Bilingual, version history, JSON-LD |
| AI Context | `admin/AIContextManager.tsx` | `ai-context.routes.ts` | ai_context | Brand Brain, feeds Claude API |
| Public | `pages/BlogIndexPage.tsx`, `pages/BlogPostPage.tsx` | `blog.routes.ts` | (reads blog_posts, blog_galleries, blog_tags) | 7 endpoints, gallery, reading progress |

> All component paths relative to `client/src/components/` unless prefixed with `admin/` (meaning `client/src/admin/`) or `pages/` (meaning `client/src/pages/`).

---

## 1. Keyword Ingestion

### 1.1 Schema: `content_keywords`

**File:** `shared/schema.ts` (lines 803–831)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| keyword | text | Required, 1–500 chars |
| monthly_searches | integer | Nullable |
| competition | text | Low / Medium / High / Unknown |
| difficulty_score | integer | 0–100, unused in current UI |
| intent | text | high / medium / low |
| tier | integer | 1–4 |
| market | text | `'fr'` or `'en'`, default `'fr'` |
| seasonal | boolean | Default false |
| seasonal_months | text[] | Array of month names |
| cluster | text | Snake_case grouping (e.g., `gift_retirement`) |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

**Constraints:** Composite unique on `(keyword, market)` — same keyword can exist in both FR and EN.

**No foreign keys** — keywords are independent seed data. Topics reference keywords by text match on `primary_keyword` + `market`.

### 1.2 CSV Import Scripts

#### French Import: `scripts/import-keywords.ts`

- **Source:** `docs/data/Keyword_Stats_merged.csv` (ISO-8859-1 encoding)
- **Result:** 2,605 keywords (Tier 1: 51, Tier 2: 1,597, Tier 3: 957)
- **Runtime classification** — tier/intent assigned by regex rules during import
- **Tier 4 excluded** (physical products: mugs, frames, t-shirts)
- **Deletes existing FR keywords** before import (`DELETE WHERE market != 'en'`)
- **Batch insert:** 100 keywords per batch

#### English Import: `scripts/import-keywords-en.ts`

- **Source:** `docs/Marketing/EN_keywords_merged_classified.csv` (UTF-8)
- **Result:** 9,896 keywords (Tier 1: 385, Tier 2: 5,072, Tier 3: 4,439)
- **Pre-classified** — CSV already contains tier, intent, cluster columns
- **Market-specific deletion** (`DELETE WHERE market = 'en'`, preserves FR)

### 1.3 Tier Classification Rules

Implemented in `scripts/import-keywords.ts` (lines 114–237).

| Tier | Category | Criteria | Examples |
|------|----------|----------|----------|
| 1 | Direct Service | Exact/near-exact match for MEMOPYK offerings | `diaporama anniversaire`, `montage vidéo mariage` |
| 2 | High Relevance | Traffic magnets, high commercial intent | VHS: `numérisation cassette vhs`, Gift: `cadeau retraite personnalisé` |
| 3 | Secondary | Broader relevance, lower intent | `montage photo`, `cadeau original` |
| 4 | Excluded | Physical products unrelated to MEMOPYK | `coque téléphone`, `mug personnalisé` |

**Tier 2 sub-categories:** VHS/Legacy Media, Gift Personalized, Gift Occasion, Retirement, Baby/Wedding/Family, Tribute — each with regex patterns.

### 1.4 Intent Classification Rules

Implemented in `scripts/import-keywords.ts` (lines 34–108). **5-layer cascade** (first match wins).

| Layer | Intent | % of FR | Signal Examples |
|-------|--------|---------|-----------------|
| 1 | LOW (Informational) | 1.3% | `gratuit`, `tutoriel`, `comment...`, `soi-même` |
| 2 | HIGH (Transactional) | 3.5% | `prix`, `tarif`, `acheter`, `pas cher`, `professionnel` |
| 3 | MEDIUM (Comparison) | — | `meilleur`, `comparatif`, `avis`, `(quel) choisir` |
| 4 | MEDIUM (Structural) | — | `idée`, `cadeau`, `original`, `personnalisé` |
| 5 | MEDIUM (Default) | 95.2% | Catch-all for GKP commercial keywords |

Full ruleset documented in `docs/Marketing/INTENT_CLASSIFICATION_RULESETS.md`.

### 1.5 Cluster Taxonomy (25 clusters)

Top clusters by keyword count:

| Cluster | Count | Definition |
|---------|-------|------------|
| other | 2,697 | Uncategorized |
| vhs_digitization_info | 1,292 | How-to, DIY VHS (top-funnel) |
| gift_graduation | 1,087 | Graduation gifts |
| gift_anniversary_wedding | 667 | Wedding anniversaries |
| gift_anniversary_milestone | 652 | 1st/5th/10th/25th/50th anniversaries |
| gift_anniversary | 628 | General anniversaries |
| gift_memorial | 587 | Sympathy, condolence, tribute |
| vhs_legacy | 560 | General VHS/legacy media |
| gift_personalized | 538 | Custom/personalized gifts |
| direct_service | 523 | Core MEMOPYK conversion keywords |
| physical_products | 502 | Low priority (mugs, frames) |
| gift_other | 441 | Remaining gift keywords |
| gift_retirement | 374 | Retirement gifts (year-round) |
| gift_anniversary_couple | 364 | Dating/relationship anniversaries |
| life_events | 331 | Wedding, baby, milestones |

**Display formatting:** `formatCluster()` in `client/src/lib/utils.ts` — `gift_retirement` → "Gift Retirement", preserves acronyms (`vhs` → `VHS`).

### 1.6 Keyword CRUD API

**Base:** `/api/admin/content/keywords` — all endpoints require `requireAdmin` middleware.

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| GET | `/keywords/stats` | Aggregated statistics | 60s in-memory cache, returns counts by market/tier/intent/cluster/competition/volume |
| GET | `/keywords` | Paginated list | 100/page default (max 500), server-side filtering, enriched with topics_count + posts_count |
| GET | `/keywords/:id` | Single keyword | By UUID |
| POST | `/keywords` | Create keyword | Zod validation, invalidates stats cache |
| PATCH | `/keywords/:id` | Update keyword | Partial update, auto-sets updated_at |
| DELETE | `/keywords/:id` | Hard delete | No cascade (keywords are independent) |

**Filter params (comma-separated for multi-select):** `tier`, `intent`, `market`, `cluster`, `competition`, `volume_range`, `search`

**Volume ranges:** mega (≥50K), high (5K–50K), medium (500–5K), low (50–500), minimal (0–50)

**Count enrichment** (content.routes.ts lines 301–352): For each keyword in page, queries `content_topics` by matching `primary_keyword` + `market`, then queries `blog_posts` by `source_topic_id`. Returns `topics_count` and `posts_count` per keyword — clickable in UI to navigate to Topics/Planner tabs.

### 1.7 Keyword Admin UI

**Main component:** `admin/ContentProductionKeywords.tsx` (888 lines)

**Stats dashboard:** 4 cards (Total Keywords, Total Monthly Searches, Tier 1, High Intent) from cached `/stats` endpoint.

**Quick filter presets** (one-click):

| Preset | Filters Applied |
|--------|-----------------|
| Quick Wins | T1+T2, Low competition, High intent |
| Traffic Drivers | T2, Mega+High volume |
| Money Keywords | T1+T2, High intent |
| France Priority | FR market, T1+T2 |
| Blog Ideas | T1+T2, Medium intent, Low+Medium competition |

**Excel-style multi-select filters:** Market, Tier, Intent, Competition, Volume, Cluster — each with Select All, search (Cluster), OK/Cancel draft state pattern via `MultiSelectFilter.tsx`.

**Pagination:** Initial 100 → background loading in 500 chunks → client-side sorting after full load.

**Supporting components:**
- `KeywordFormModal.tsx` (332 lines) — Create/edit with seasonal months toggle, cluster input
- `KeywordDeleteDialog.tsx` (104 lines) — Confirmation with keyword name + volume display
- `MultiSelectFilter.tsx` (180 lines) — Reusable Excel-style filter with draft state
- `ContentKeywordsSkeleton.tsx` — Loading skeleton

---

## 2. Topic Management

### 2.1 Schema: `content_topics`

**File:** `shared/schema.ts` (lines 743–800)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | Required |
| slug | text | Unique, required, auto-generated from title |
| category | text | Required — PHOTO, VIDEO, FAMILY, DIGITAL, MEMORY, SEASONAL |
| type | text | Required — 17 types (Beginner/How-To, Storytelling, VHS Legacy, etc.) |
| market | text | `'fr'` or `'en'`, default `'fr'` |
| target_word_count | integer | Default 900 |
| primary_keyword | text | Required, links to keywords by text match |
| secondary_keywords | text[] | Array |
| search_volume | integer | Nullable |
| competition | text | Low / Medium / High |
| search_intent | text | Informational / Transactional / Navigational / Commercial |
| content_angle | text | ✨ AI field — unique perspective/approach |
| description | text | ✨ AI field — detailed scope/outline |
| hero_image_concept | text | Nullable |
| body_image_concepts | text[] | Nullable |
| priority | integer | 1–5, default 3 |
| selected_for_week | text | Nullable |
| status | text | Default `'backlog'` — backlog / planned / in_progress / published |
| role | text | Default `'spoke'` — pillar / spoke (hub-and-spoke model) |
| parent_topic_id | uuid | Nullable, self-reference for spoke → pillar |
| cluster | text | Grouping, e.g., `'gift_retirement'` |
| memopyk_link_opportunities | text | Which MEMOPYK pages to link to |
| last_generated_at | timestamp | Nullable |
| times_generated | integer | Default 0 |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

### 2.2 Topic CRUD API

**Base:** `/api/admin/content/topics` — all endpoints require `requireAdmin`.

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| GET | `/topics` | List topics | Filters: category, priority, status, market; includes post_count |
| GET | `/topics/:id` | Single topic | By UUID |
| POST | `/topics` | Create topic | Zod validation, auto-generates slug from title |
| PATCH | `/topics/:id` | Update topic | Partial update |
| DELETE | `/topics/:id` | Delete topic | **Blocks** if assignments exist (409); unlinks posts (sets `source_topic_id = null`) |

**Delete safety:** Checks `content_daily_assignments` first — returns 409 if any assignments reference this topic. If no assignments, unlinks blog posts (sets `source_topic_id = null`) but does not delete them.

### 2.3 Topic Admin UI

**TopicFormModal.tsx** — Create/edit modal with:
- **Auto-slug generation** from title on submit (not editable in UI)
- **✨ AI field indicators** on 7 fields wired into AI generation prompts
- **Collapsible sections:** SEO Research, Images
- **Dropdowns:** Competition (Low/Medium/High), Search Intent (4 values)
- **Hub-and-spoke:** Role selector (pillar/spoke), Parent Guide dropdown filtered by cluster
- **Cluster suggestions** from datalist of existing clusters

**TopicDeleteDialog.tsx** — Confirmation with:
- Post count warning (amber) if posts exist
- Times generated history warning (blue)
- "Posts will be unlinked, not deleted" explanation

### 2.4 Keyword → Topic Relationship

```
content_keywords.keyword + content_keywords.market
           ↓ (1:N, text match — no FK)
content_topics.primary_keyword + content_topics.market
           ↓ (FK: source_topic_id)
blog_posts.source_topic_id
```

- **No FK constraint** between keywords and topics — linked by text match
- Keywords table shows clickable `topics_count` / `posts_count` columns
- Clicking navigates to Topics/Planner tabs with keyword in search box

---

## 3. Content Planner

### 3.1 Schema: `content_daily_assignments`

**File:** `shared/schema.ts` (lines 860–883)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| date | timestamp | Assignment date |
| topic_id | uuid | References content_topics.id (application-enforced) |
| post_id | uuid | Nullable, references blog_posts.id |
| status | text | Default `'planned'` — planned / in_progress / published |
| notes | text | Nullable |
| created_at | timestamp | Auto |
| updated_at | timestamp | Auto |

**No explicit FK cascade** in schema — handled in application logic:
- Topics: blocked from deletion if assignments exist
- Posts: `assignment.post_id` set to null on post deletion

### 3.2 Planner UI

**Component:** `admin/ContentProductionPlanner.tsx`

**Features:**
- **12-week scrollable calendar** with infinite scroll
- **Two view modes:** Topics view (assigned topics) / Posts view (published posts by date)
- **Drag-and-drop** topic/assignment rescheduling
- **Status color-coding:**
  - Published: green (`#dcfce7`), 6px left border
  - In Review / Draft: amber (`#fef3c7`), 4px border
  - Planned: orange (`#ffedd5`), 2px border
- **Navigation:** Previous/Next (4-week jumps), Today button, auto-scroll to today

**Assignment CRUD in planner:**

| Action | Flow |
|--------|------|
| **Create** | Click day → Select topic from modal → Creates assignment with status `'planned'` → Updates topic status to `'planned'` |
| **Reschedule** | Drag to new date → Updates assignment date |
| **Delete** | Click X → Removes assignment → Reverts topic to `'backlog'` if no other assignments |

**Post integration:** Shows post status badge for each assigned topic using `getRelevantPost()` lookup against loaded blog posts.

---

## 4. Post Creation (Dual Path)

### 4.1 Entry Point: `admin/CreatePostLanding.tsx`

Two side-by-side cards:

| Path | Icon | Action |
|------|------|--------|
| **Write from scratch** | Pencil | `POST /api/admin/blog/posts` → creates blank post → redirects to Blog Editor |
| **Generate with AI** | Sparkles | Navigates to `?tab=ai-creator` → AI Creator flow |

**Blank post defaults:** Title "Untitled Post", slug `untitled-post-{timestamp}`, content `<p>Start writing your post here...</p>`, status `'draft'`.

### 4.2 AI Generation: `admin/BlogAICreator.tsx`

**3-step process:**

1. **Configure Post** — Select topic, language, status, SEO keywords. Click "Generate AI Prompt"
2. **Copy Prompt to AI** — Displays master prompt template in textarea. User copies to Claude/GPT
3. **Paste AI Response** — User pastes JSON. Client validates structure

**Master prompt template** (lines 19–129): Brand identity, writing style, content requirements (800–1000 words), HTML structure rules (semantic tags, no inline styles), image placeholder format (2–4 red suggestions), critical JSON rules, output schema.

### 4.3 AI Post Creation API

**Endpoint:** `POST /api/admin/blog/create-from-ai` (`blog-admin.routes.ts` lines 94–277)

**Request body:** title, slug, content, language (required) + description, hero_url, status, published_at, source_topic_id, primary_keyword, secondary_keywords (optional)

**Flow with rollback:**

```
1. Validate required fields
2. Validate source_topic_id (if provided)
3. INSERT into blog_posts
4. IF source_topic_id:
   a. Save current topic state (for potential rollback)
   b. Update topic: status → 'in_progress'/'published', times_generated++, last_generated_at
   c. IF topic update fails → delete post → return 500 (TOPIC_SYNC_FAILED, rolled_back: true)
   d. Update assignment: link post_id, sync status
   e. IF assignment update fails → revert topic → delete post → return 500 (ASSIGNMENT_SYNC_FAILED, rolled_back: true)
5. Return created post
```

**Why manual rollback?** Supabase JS client doesn't support transactions. Each step checks for errors and compensates by reverting previous steps.

**Duplicate slug handling:** Detects Postgres error code 23505, returns user-friendly message.

---

## 5. Blog Editor

### 5.1 Component: `admin/BlogEditor.tsx`

**Rich text editor** powered by TinyMCE (`@tinymce/tinymce-react`).

**Form fields:**
- Title, Slug, Description (SEO meta)
- Hero Image (upload component)
- Status dropdown, Published At date picker
- Tag selector (multi-select)
- Featured post toggle with order control
- Content editor (TinyMCE with custom config)
- Language badge (read-only)

**Image management:**
- **Custom file picker modal** instead of native TinyMCE picker
- Shows existing blog images in grid with search
- Upload new images inline
- Click to insert into content at cursor position
- Uploads to `/api/admin/blog/images` (Supabase Storage)

**Save logic:**
1. Sanitize content with DOMPurify
2. Save post content via PUT
3. Save tags separately via POST
4. Auto-set `published_at` when status = `'published'`
5. Invalidate React Query cache

### 5.2 Bilingual Support

- **Single-language posts** — each post has one `language` field (`'en-US'` or `'fr-FR'`)
- **No FR/EN tabs** in editor — language determined by post creation
- **Translation creates a new post** (see section 6)
- **Language badge** displayed in editor header

### 5.3 SEO Fields in Posts

Stored in `blog_posts.seo` JSONB field:

```typescript
{
  title?: string;        // SEO title (60 chars max)
  description?: string;  // Meta description (160 chars max)
  keywords?: string[];   // SEO keywords array
  ogImage?: string;      // Open Graph image URL
}
```

---

## 6. Translation Workflow

### 6.1 Translation Trigger

**Endpoint:** `POST /api/admin/blog/posts/:id/translate` (`blog-admin.routes.ts` lines 288–435)

**Request:** `{ method: 'manual' | 'ai' }` (default: `'manual'`)

### 6.2 Flow

```
1. Fetch source post
2. Determine target language: en-US ↔ fr-FR
3. Generate new slug (add -en/-fr suffix, append timestamp if duplicate)
4. Create duplicate post:
   - Title: "[TRANSLATE TO {LANGUAGE}] {original title}"
   - Status: 'draft'
   - All other fields copied
5a. IF method = 'manual':
    - Return duplicate as-is → user edits in Blog Editor
    - Translation Assistant button appears when title starts with "[TRANSLATE TO"
5b. IF method = 'ai':
    - Extract images → replace with [IMAGE X] placeholders
    - Call translateContent() via Claude API
    - Reinsert images into translated content
    - Update duplicate with translation, remove "[TRANSLATE TO...]" prefix
    - Return translated post
    - On failure: return manual duplicate with error message
```

### 6.3 AI Translation Service

**File:** `server/routes/translation-service.ts`

**`translateContent()`** (lines 40–149):
- Model: `claude-sonnet-4-20250514`
- Max tokens: 4096
- Inputs: text, title, slug, description, source/target language
- Fetches AI context (brand identity, tone, translation rules from `ai_context` table)
- Builds system prompt with brand context + 20 recent published posts for reference
- Calls Claude API
- Parses response for TITLE, SLUG, DESCRIPTION, CONTENT sections

**Image preservation:**
- `extractImagesFromContent()` — replaces `<img>`, `<figure>`, `<span>` containing images with `[IMAGE X]` placeholders
- `reinsertImages()` — restores original HTML image markup after translation

### 6.4 Brand Brain / AI Context

**Table:** `ai_context` (`shared/schema.ts` lines 1077–1095)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| key | text | Unique identifier |
| title | text | Display name |
| content | text | The context content |
| category | text | `'brand'` or `'translation'` |
| sort_order | integer | Display ordering |
| updated_at | timestamp | Auto |
| updated_by | text | Last editor |

**API:** `/api/admin/ai-context` — CRUD endpoints + `/api/internal/ai-context/full` (returns all context grouped by category + 50 recent published posts with summaries).

**Usage:** Fed into Claude API system prompts for post generation and translation to maintain brand voice consistency.

---

## 7. Status Cascade

### 7.1 Cascade Direction

```
blog_posts.status  →  content_topics.status  →  content_daily_assignments.status
```

### 7.2 Trigger Points

#### On Post Creation (`blog-admin.routes.ts` lines 162–254)

If `source_topic_id` is set:
- Topic status → `'published'` (if post published) or `'in_progress'`
- Topic `times_generated` incremented, `last_generated_at` set
- Assignment linked (`post_id` set), status synced
- **Rollback on failure** (see section 4.3)

#### On Post Update (`blog-admin.routes.ts` lines 585–656)

Only when status **actually changes** (`oldPost.status !== updates.status`):

| Post Status | → Topic Status | → Assignment Status |
|-------------|---------------|-------------------|
| `'published'` | `'published'` | `'published'` |
| `'draft'` or `'in_review'` | `'in_progress'` | `'in_progress'` |

#### On Post Deletion (`blog-admin.routes.ts` lines 723–794)

Checks if other posts exist for the same topic:

| Condition | → Topic Status | → Assignment |
|-----------|---------------|-------------|
| **Last post deleted** | Reverts to `'planned'` | `post_id = null`, status → `'planned'` |
| **Other posts exist** | Unchanged | Unchanged |

### 7.3 Non-Blocking Sync

Status synchronization uses try-catch — main operation succeeds even if sync fails. Errors are logged but don't break the primary action.

---

## 8. Image Pipeline

### 8.1 Image Bank

**Component:** `admin/ImageBankManager.tsx`

**Storage:** Supabase Storage bucket `memopyk-blog`, path: `image-bank/{filename}`

**Schema (Drizzle ORM):** 3 tables in `shared/schema.ts` (lines 652–737):

**`image_bank`:**
- Core: id, filename, originalFilename, storagePath (unique), publicUrl
- Dimensions: fileSizeBytes, width, height, mimeType
- Metadata: altText, caption, category, tags (text[])
- Usage tracking: usageCount, lastUsedAt, usedInPosts (uuid[])
- Licensing: source, licenseType, creditRequired, attributionText
- Suitability: isHeroSuitable, isBodySuitable
- Other: uploadedBy, notes, timestamps

**`image_labels`:** id, name (unique), color (hex), usageCount, createdBy, timestamps

**`image_label_links`:** id, imageId → image_bank (cascade delete), labelId → image_labels (cascade delete), createdAt

**API:** `/api/admin/image-bank` — Full CRUD + `/api/admin/image-labels` — Label CRUD with auto-color assignment (17 predefined colors) and rename cascading to images.

**UI features:** Grid layout (2–5 columns), filters (category, usage, search), drag-and-drop upload with metadata per file, label management modal.

### 8.2 Blog Gallery

**Schema:** `blog_galleries` (`shared/schema.ts` lines 614–628)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| post_id | uuid | FK → blog_posts (cascade delete) |
| sort | integer | Display order |
| url | text | Public URL in Supabase Storage |
| title | text | Image title |
| alt | text | Alt text |

**API:** `/api/admin/blog/posts/:id/gallery` — CRUD + reorder endpoint.

### 8.3 Public Gallery Display

**Public endpoint:** `GET /blog/posts/:slug/gallery` (`blog.routes.ts` lines 260–325)

**Auto-detected layout:**

| Image Count | Layout |
|-------------|--------|
| 1 | `'single'` |
| 2 | `'side-by-side'` |
| 3–4 | `'grid-2'` |
| 5+ | `'carousel'` |

**Rendered by:** `GalleryComponent` in `BlogPostPage.tsx`.

---

## 9. Public Blog Delivery

### 9.1 Public Endpoints

**File:** `server/routes/blog.routes.ts` — **no auth required**

| Method | Endpoint | Purpose | Key Params |
|--------|----------|---------|------------|
| GET | `/blog/posts` | Published posts list | language, limit, offset |
| GET | `/blog/featured` | Featured posts | language, limit (default: 3) |
| GET | `/blog/posts/search` | Full-text search | q, language, limit, offset |
| GET | `/blog/posts/:slug/related` | Related posts by shared tags | limit (default: 3) |
| GET | `/blog/posts/:slug/gallery` | Post gallery images | — |
| GET | `/blog/tags` | All tags with post counts | — |
| GET | `/blog/posts/:slug` | Single post by slug | language |

**Visibility filter:** All list endpoints filter `status = 'published'` AND `published_at <= NOW()`.

**Featured ordering:** `is_featured = true`, ordered by `featured_order` ASC then `published_at` DESC.

### 9.2 Blog Index Page

**Component:** `pages/BlogIndexPage.tsx`

- **Featured post section** — large hero layout for top featured post
- **Tag filtering** — clickable badges filter posts by tag
- **Posts grid** — 3-column responsive layout
- **Reading time** display per post
- **Language-aware** routing (`/fr-FR/blog`, `/en-US/blog`)
- **Empty state** with illustration

### 9.3 Blog Post Page

**Component:** `pages/BlogPostPage.tsx`

- **Reading progress bar** at top of page
- **Scroll tracking** for GA4 engagement analytics
- **Hero image** with overlay gradient
- **Share buttons:** Twitter, Facebook, LinkedIn, Copy link
- **Gallery section** via GalleryComponent
- **Related posts** section
- **Newsletter signup** inline
- **Breadcrumb navigation** back to blog
- **Analytics tracking:** View count, time on page

---

## 10. SEO Integration

### 10.1 SEO Settings Table

**File:** `shared/schema.ts` (lines 182–219)

**Table:** `seo_settings` — bilingual fields with version history

**Key fields:**
- **Page-level:** metaTitle, metaDescription, metaKeywords (all bilingual: En/Fr suffixes)
- **Open Graph:** ogTitle, ogDescription, ogImage, ogType (default: `'website'`)
- **Twitter Cards:** twitterCard (default: `'summary_large_image'`), twitterTitle, twitterDescription, twitterImage
- **Technical:** canonicalUrl, robotsIndex, robotsFollow, robotsNoArchive, robotsNoSnippet
- **Structured data:** jsonLd (JSONB), structuredData (JSONB)
- **Sitemap:** priority (decimal), changeFreq (default: `'monthly'`)
- **Custom:** customMetaTags (JSONB)

### 10.2 SEO Management Admin

**Component:** `admin/SeoManagement.tsx`

**5-tab editor:**

| Tab | Features |
|-----|----------|
| Basic SEO | Title (70 chars), description (320 chars), keywords, canonical URL |
| Robots | Index, follow, noarchive, nosnippet toggles |
| Social Media | Open Graph + Twitter Cards |
| Advanced | JSON-LD structured data, hreflang, extra meta tags |
| Live Preview | Complete HTML head output |

- **Bilingual editor** with language switcher (FR/EN)
- **Search result preview** (Google-style)
- **Character counters** on title/description
- **Version history** modal with rollback

### 10.3 SEO Rendering on Public Pages

**BlogPostPage.tsx** (lines 316–334) — React Helmet:

```html
<title>{seoTitle} | MEMOPYK</title>
<meta name="description" content="{seoDescription}" />
<meta name="keywords" content="{seoKeywords}" />
<link rel="canonical" href="{canonicalUrl}" />

<!-- Open Graph -->
<meta property="og:title" content="{seoTitle}" />
<meta property="og:description" content="{description}" />
<meta property="og:image" content="{ogUrl}" />
<meta property="og:type" content="article" />
<meta property="article:published_time" content="{publishDate}" />

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{seoTitle}" />
<meta name="twitter:description" content="{description}" />
<meta name="twitter:image" content="{ogUrl}" />
```

### 10.4 Slug Management

- **Auto-generated:** `untitled-post-{timestamp}` for blank posts
- **Language suffix:** `-en` or `-fr` for translations
- **Unique constraint** on `blog_posts.slug`
- **Duplicate handling:** Appends timestamp if slug exists
- **Editable** in Blog Editor

---

## 11. Publishing Flow Summary

**When a post status changes to `'published'`:**

```
1. Set published_at = NOW() (if not already set)
2. Update blog_posts record (content, SEO, hero_url, etc.)
3. IF source_topic_id:
   a. Update content_topics.status → 'published'
   b. Update content_daily_assignments.status → 'published'
4. Post appears on public blog (filtered by status='published' AND published_at <= NOW())
5. SEO meta tags rendered via React Helmet
6. Gallery images served from blog_galleries
7. Related posts computed by shared tags
```

---

## DB Tables Summary

| Table | Stage | ORM | Purpose |
|-------|-------|-----|---------|
| content_keywords | Keywords | Supabase JS | 12,501 seed keywords (FR+EN) |
| content_topics | Topics | Supabase JS | Topic briefs with SEO data, AI field indicators |
| content_daily_assignments | Planner | Supabase JS | Calendar assignments linking topics to dates |
| blog_posts | Posts | Supabase JS | Published content with SEO, bilingual support |
| blog_galleries | Posts | Supabase JS | Post-attached images with sort order |
| blog_tags | Posts | Supabase JS | Tag definitions |
| blog_post_tags | Posts | Supabase JS | Junction table (posts ↔ tags) |
| imageBank | Images | Drizzle | Image Bank with metadata, usage tracking |
| imageLabels | Images | Drizzle | Label definitions with auto-colors |
| imageLabelLinks | Images | Drizzle | Junction table (images ↔ labels) |
| seo_settings | SEO | Supabase JS | Bilingual page-level SEO with versioning |
| ai_context | AI | Supabase JS | Brand Brain context for Claude API |

**Note:** Image Bank tables use Drizzle ORM. All other tables use Supabase JS client.

---

## Key Design Patterns

| Pattern | Implementation |
|---------|---------------|
| **Manual rollback** | Supabase JS lacks transactions → compensating actions on failure |
| **Status cascade** | Post → Topic → Assignment sync (non-blocking, try-catch) |
| **Composite unique** | `(keyword, market)` allows bilingual keywords |
| **Text-based FK** | Keywords ↔ Topics linked by `primary_keyword` text match, not UUID |
| **Background pagination** | Initial 100 + chunked 500 for keyword table UX |
| **Draft state filters** | Excel-style OK/Cancel prevents accidental filter changes |
| **Image preservation** | `[IMAGE X]` placeholders during translation, reinserted after |
| **Hub-and-spoke** | Pillar + spoke topics grouped by cluster for internal linking |
| **Auto-layout gallery** | Image count determines layout (single/side-by-side/grid/carousel) |
| **Cached stats** | 60s TTL on keyword stats to reduce DB load |
