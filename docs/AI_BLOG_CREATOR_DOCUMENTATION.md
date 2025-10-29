# AI Blog Creator — Current State & Technical Documentation

**Version:** 1.0  
**Last Updated:** January 29, 2025  
**Project:** MEMOPYK Blog CMS  
**Status:** ✅ Production-Ready

---

## Table of Contents

1. [End-to-End Flow](#1-end-to-end-flow)
2. [Prompt Generation](#2-prompt-generation)
3. [Validation](#3-validation)
4. [Create Post API](#4-create-post-api)
5. [Media Handling](#5-media-handling)
6. [Multilingual & SEO](#6-multilingual--seo)
7. [Blocks & Galleries](#7-blocks--galleries)
8. [Security & Roles](#8-security--roles)
9. [Logging, Metrics, Errors](#9-logging-metrics-errors)
10. [Dev Setup & Scripts](#10-dev-setup--scripts)
11. [Known Issues & Quick Wins](#11-known-issues--quick-wins)

---

## 1. End-to-End Flow

### Route & Code Path

**Admin Menu Location:**  
`/admin` → "AI Blog Creator" tab

**Main Component:**  
`client/src/admin/BlogAICreator.tsx` (500 lines)

**Backend Endpoint:**  
`POST /api/admin/blog/create-from-ai` (in `server/routes.ts` lines 9405-9689)

---

### Step-by-Step Workflow

#### **Step 1: Configure Post** (Input Form)

**UI Location:** Left card in 2-column grid

**Inputs:**
- `topic` (string, required) - Blog post topic/title idea
- `language` (enum: 'en-US' | 'fr-FR', required) - Target language
- `status` (enum: 'draft' | 'published', required) - Publication status
- `publishNow` (boolean) - Whether to set `published_at` to current timestamp
- `seoKeywords` (string, optional) - Comma-separated SEO focus keywords

**Output:**  
State updated in React component (`useState` hooks)

**Functions Called:**
1. `generatePrompt()` - Lines 135-157
   - Validates topic is not empty
   - Replaces template placeholders with user input
   - Sets `generatedPrompt` state
   - Shows success toast

**External Calls:** None (pure client-side)

---

#### **Step 2: Generate Prompt** (AI Prompt Display)

**UI Location:** Right card in 2-column grid

**Input:**  
User clicks "Generate AI Prompt" button

**Output:**  
Populated textarea with complete AI prompt ready to copy

**Functions Called:**
1. `copyToClipboard()` - Lines 159-173
   - Uses `navigator.clipboard.writeText()`
   - Shows success/failure toast

**External Calls:**  
- Browser Clipboard API (permission-based)

**User Action Required:**  
1. Copy prompt to clipboard
2. Paste into AI assistant (Claude, ChatGPT, etc.)
3. Copy AI's JSON response

---

#### **Step 3: Create Post** (Validation & Submission)

**UI Location:** Bottom full-width card

**Inputs:**
- `aiJsonInput` (string, required) - Raw JSON from AI assistant

**Output:**  
- Success: New blog post created in Directus
- Failure: Validation error message displayed

**Functions Called:**

1. `validateJson()` - Lines 175-217
   - Parses JSON string
   - Validates required fields: `title`, `slug`, `language`, `status`, `description`, `blocks`
   - Validates language enum: `en-US` | `fr-FR`
   - Validates status enum: `draft` | `published`
   - Validates blocks array exists and has valid types
   - Returns `{ valid: boolean, data?: any, error?: string }`

2. `createBlogPost()` - Lines 219-280
   - Calls `validateJson()` first
   - If valid, makes POST request to `/api/admin/blog/create-from-ai`
   - Shows loading spinner during creation
   - On success: clears form, shows success toast
   - On failure: shows error toast with API error message

**External Calls:**

**Backend API:** `POST /api/admin/blog/create-from-ai`
- Request body: Validated JSON data
- Response: `{ success: boolean, postId: string, title: string, slug: string, ... }`

**Directus CMS API:** (via backend proxy)
1. `POST https://cms-blog.memopyk.org/items/posts` - Create post
2. `POST https://cms-blog.memopyk.org/items/block_richtext` - Create richtext blocks
3. `POST https://cms-blog.memopyk.org/items/block_content_section_v3` - Create content sections
4. `POST https://cms-blog.memopyk.org/items/block_gallery` - Create galleries
5. `POST https://cms-blog.memopyk.org/items/posts_blocks` - Link blocks to post (junction table)
6. `PATCH https://cms-blog.memopyk.org/items/block_content_section_v3/{id}` - Patch images (if provided)

---

## 2. Prompt Generation

### Exact Prompt Template

**Location:** `client/src/admin/BlogAICreator.tsx` lines 12-121

**Template Structure:**

```
MASTER PROMPT (give this to your marketing AI)
You are creating a new blog post for a Directus CMS that powers memopyk.com.
Return **one JSON object only** (no prose) that conforms EXACTLY to the schema below.

### INPUTS
- topic: {{TOPIC}}
- locale: {{LOCALE}}
- status: {{STATUS}}
- publish_now: {{PUBLISH_NOW}}
- seo_focus_keywords: {{SEO_KEYWORDS}}

### GOALS
- Produce an authoritative, helpful post with clear sections and scannable structure.
- Use **Markdown** for headings, lists, links, blockquotes, and **tables** (tables must be valid Markdown).
- Create content blocks using the "block_content_section_v3" layouts described below.

### DIRECTUS DATA MODEL
[Full schema with top-level post fields and block types]

### IMPORTANT CONTENT RULES
- Use the **first block** as a compelling intro with an H2 and short hook.
- Include at least one content_section_v3 with layout "two-images" for visual comparison if relevant.
- If you need internal links, add Markdown links and also list them in internal_links at the end.
- If you reference images, set image_*: null and describe them in assets_manifest with a short label.

### OUTPUT FORMAT
Return a single JSON object:
{
  ...post fields...,
  "blocks": [ ... ],
  "internal_links": [ { "label": "...", "url": "..." } ],
  "assets_manifest": [ { "ref": "...", "alt": "...", "notes": "..." } ]
}

### QUALITY BARS
- Tone: clear, helpful, non-hype; practical tips + short paragraphs.
- SEO: use target keywords naturally; include 2–3 FAQ-style subheads.
- Tables: use GitHub-flavored Markdown table syntax (| col | col |).

### RETURN
Return ONLY the JSON object. No commentary.
```

---

### Directus Model Injection

**Method:** Static JSON embedded in code (no live fetch)

**Directus Models Included:**

**Top-level Post Fields:**
```typescript
{
  title: string,                    // H1 heading
  slug: string,                     // URL-safe kebab-case slug
  language: "en-US" | "fr-FR",      // Exact match required
  status: "draft" | "published",
  published_at: ISO8601 | null,     // Auto-set if publishNow=true
  description: string,              // 150-200 char teaser
  author_name: string,              // Free text (mapped to user later)
  image_featured: null,             // Always null (added later)
  meta_title: string,               // ≤60 chars; fallback to title
  meta_description: string,         // 150-160 chars; fallback to description
  blocks: Block[]                   // Ordered array
}
```

**Block Types:**

1. **block_richtext** - Simple article sections
```typescript
{
  type: "block_richtext",
  text: string  // Markdown with headings, lists, tables
}
```

2. **block_content_section_v3** - Flexible layouts with images
```typescript
{
  type: "block_content_section_v3",
  layout: "text-only" | "image-left" | "image-right" | "image-full" | "two-images" | "three-images",
  text: string,              // Markdown
  caption: string | null,
  alt: string | null,
  image_primary: null,       // File ID (always null from AI)
  image_secondary: null,
  image_third: null,
  media_width: "25|33|40|50|60|66|75" | null,
  media_align: "left|center|right" | null,
  max_width: "content|wide|full",
  spacing_top: "none|sm|md|lg",
  spacing_bottom: "none|sm|md|lg",
  background: "default|light|dark",
  image_fit: "natural|cover|contain",
  image_height: number | null,
  gutter: number | null,
  corner_radius: number | null,
  image_shadow: boolean,
  block_shadow: boolean,
  caption_align: "left|center|right",
  caption_position: "below|above|overlay",
  caption_bg: "none|light|dark"
}
```

3. **block_gallery** - Image galleries
```typescript
{
  type: "block_gallery",
  title: string,
  intro: string,  // Markdown
  images: []      // Always empty (added by editor later)
}
```

---

### Example Prompts & AI Responses

See separate files:
- `docs/examples/ai-blog-creator-example-success.json` - Successful AI response
- `docs/examples/ai-blog-creator-example-failure.json` - Failed validation example

---

## 3. Validation

### Client-Side Validation

**Location:** `client/src/admin/BlogAICreator.tsx` lines 175-217

**Implementation:** Custom validation function (not Zod/JSON Schema)

**Validation Schema (Pseudo-Code):**

```typescript
interface ValidatedAIResponse {
  // Required top-level fields
  title: string;           // Must exist
  slug: string;            // Must exist
  language: string;        // Must be "en-US" or "fr-FR"
  status: string;          // Must be "draft" or "published"
  description: string;     // Must exist
  blocks: Block[];         // Must be array with length > 0

  // Optional fields (not validated)
  published_at?: string;
  author_name?: string;
  image_featured?: null;
  meta_title?: string;
  meta_description?: string;
  internal_links?: Array<{ label: string; url: string }>;
  assets_manifest?: Array<{ ref: string; alt: string; notes: string }>;
}

interface Block {
  type: string;  // Must be "block_richtext" | "block_content_section_v3" | "block_gallery"
  [key: string]: any;  // Other fields not validated client-side
}
```

---

### What's Enforced Today

✅ **Enforced:**
- Required fields: `title`, `slug`, `language`, `status`, `description`, `blocks`
- Language enum: Must be exactly `"en-US"` or `"fr-FR"`
- Status enum: Must be exactly `"draft"` or `"published"`
- Blocks array: Must exist and be non-empty
- Block types: Each block must have `type` field with valid value

❌ **Not Enforced:**
- String length limits (title, description, etc.)
- Slug format validation (kebab-case)
- HTML sanitization (assumed AI provides clean Markdown)
- Image URL validation
- Markdown syntax validation
- Duplicate slug detection (handled by Directus on backend)

---

### Typical Validation Errors

**Example 1: Missing Required Field**
```
Error: Missing required field: title
```

**Example 2: Invalid Language**
```
Error: Invalid language: en. Must be "en-US" or "fr-FR"
```

**Example 3: Invalid Status**
```
Error: Invalid status: pending. Must be "draft" or "published"
```

**Example 4: Empty Blocks**
```
Error: Blocks must be an array
```

**Example 5: Invalid Block Type**
```
Error: Block 2 has invalid type: custom_block
```

**Example 6: Invalid JSON**
```
Error: Invalid JSON format
```

---

## 4. Create Post API

### Contract

**Endpoint:** `POST /api/admin/blog/create-from-ai`

**Handler Location:** `server/routes.ts` lines 9405-9689

---

### Request Shape

**Content-Type:** `application/json`

**Body:**

```typescript
interface CreateFromAIRequest {
  // FLAT FORMAT (recommended):
  title: string;
  slug: string;
  language: "en-US" | "fr-FR";
  status: "draft" | "published";
  description: string;
  blocks: Block[];
  
  // Optional fields
  published_at?: string;  // ISO8601 timestamp
  author_name?: string;
  image_featured?: null;
  meta_title?: string;
  meta_description?: string;
  seo?: {
    meta_title?: string;
    meta_description?: string;
    keywords?: string;
    og_image?: string;
  };
  
  // Legacy support
  internal_links?: Array<{ label: string; url: string }>;
  assets_manifest?: Array<{ ref: string; alt: string; notes: string }>;
  
  // NESTED FORMAT (also supported):
  // post?: { ...post fields... };
  // blocks?: Block[];
  // images?: { map: ImageMapping[] };
}

interface Block {
  type: "block_richtext" | "block_content_section_v3" | "block_gallery";
  sort?: number;  // Optional explicit sort order (default: auto-increment by 100)
  [key: string]: any;  // Block-specific fields
}

interface ImageMapping {
  block_index: number;
  field: "image_primary" | "image_secondary" | "image_third";
  file_id: string;  // Directus file UUID
}
```

---

### Response Format

**Success (200 OK):**

```json
{
  "success": true,
  "postId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "The Ultimate Guide to Digitizing Old Photos",
  "slug": "ultimate-guide-digitizing-old-photos",
  "language": "en-US",
  "blocksCreated": 5,
  "imagesPatched": 0,
  "assetsManifest": [
    { "ref": "hero_01", "alt": "Vintage photo album", "notes": "Use as featured image" }
  ],
  "directusUrl": "https://cms-blog.memopyk.org/admin/content/posts/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Error Responses:**

**400 Bad Request** - Validation failure
```json
{
  "error": "Missing required field: post.title"
}
```

**409 Conflict** - Duplicate slug (from Directus)
```json
{
  "error": "Failed to create post: 409",
  "message": "Value for field 'slug' in collection 'posts' has to be unique."
}
```

**500 Internal Server Error** - Creation failure
```json
{
  "error": "Failed to create blog post",
  "message": "Failed to create block_richtext: 401"
}
```

---

### Idempotency & Duplicate Prevention

**Current State:** ❌ **No idempotency implemented**

**Duplicate Prevention:**
- Relies on Directus UNIQUE constraint on `posts.slug` field
- If duplicate slug submitted, Directus returns 409 Conflict
- Backend propagates error to frontend
- User must manually change slug and retry

**Missing:**
- No request ID tracking
- No content hash deduplication
- No client-side pre-check for existing slugs
- Multiple submissions create duplicate blocks if post creation fails mid-process

---

### Writes Performed

**Database Tables Modified:**

1. **posts** (Directus collection)
   - Creates 1 new row
   - Fields set: `title`, `slug`, `language`, `status`, `published_at`, `description`, `image`, `seo`, `author`
   - Generated: `id` (UUID), `date_created`, `date_updated`

2. **block_richtext** (Directus collection)
   - Creates N rows (one per richtext block)
   - Fields set: `text`, `headline`, `tagline`

3. **block_content_section_v3** (Directus collection)
   - Creates N rows (one per content section)
   - Fields set: 24 fields (layout, text, caption, images, styling options)

4. **block_gallery** (Directus collection)
   - Creates N rows (one per gallery block)
   - Fields set: `title`, `intro`, `images` (always empty array)

5. **posts_blocks** (Many-to-Any junction table)
   - Creates N rows (one per block)
   - Fields set: `posts_id`, `collection`, `item`, `sort`
   - Links each block to parent post

**Optional Writes:**

6. **block_content_section_v3** (PATCH operations)
   - Updates existing blocks with image file IDs
   - Only if `images.map` provided in request
   - Fields patched: `image_primary`, `image_secondary`, `image_third`

---

### Tags & SEO Handling

**Current State:**
- `seo` field: Passed as JSON blob to Directus (no validation)
- **Tags NOT created** - This is a gap (see Known Issues)

---

### Transactions & Rollback

**Current State:** ❌ **No transaction support**

**Issues:**
- If block creation fails after post creation, orphaned post remains in Directus
- If junction table link fails, orphaned blocks remain
- No automatic cleanup on partial failures
- User must manually delete failed posts from Directus admin

**Recommendation:** Wrap entire process in Directus transaction API (if available) or implement manual rollback logic.

---

## 5. Media Handling

### Current State

**Images in AI JSON:**
- AI always returns `image_primary: null`, `image_secondary: null`, `image_third: null`
- No base64 or URL support implemented
- Assets listed in `assets_manifest` array (for editor reference only)

**Image Upload Process:**
- ❌ Not automated - editor must upload images manually via Directus admin
- ❌ No deduplication - each upload creates new file
- ❌ No URL/base64 processing - AI cannot provide images directly
- ❌ No `<img>` rewriting in Markdown content

**Image Patching (Optional Feature):**

If request includes `images.map` array with file IDs:
```json
{
  "images": {
    "map": [
      { "block_index": 1, "field": "image_primary", "file_id": "abc-123" }
    ]
  }
}
```

Then backend:
1. Finds block at specified index
2. PATCHes the block with file ID
3. No validation of file existence
4. No metadata update (title/alt/credit)

**Title/Alt/Credit:**
- Set via `caption` and `alt` fields in block creation
- No automatic extraction from file metadata
- No validation

---

### Media Gaps

❌ Upload to Directus `/files`  
❌ Dedupe by hash  
❌ Rewrite `<img src>` in content  
❌ Image size/type validation  
❌ Automatic alt text generation  

---

## 6. Multilingual & SEO

### Language Enforcement

**Supported Languages:** `en-US`, `fr-FR`

**Validation Location:**
- Client-side: `BlogAICreator.tsx` line 188-190
- Backend: Not validated (relies on Directus schema)

**Enforcement:**
```typescript
if (!['en-US', 'fr-FR'].includes(data.language)) {
  return { valid: false, error: `Invalid language: ${data.language}. Must be "en-US" or "fr-FR"` };
}
```

---

### SEO Fields Validation

**Current State:** ❌ **Minimal validation**

**Title:**
- ✅ Required field (validated)
- ❌ No length limit enforced (recommendation: ≤60 chars)
- ❌ No character sanitization

**Meta Title:**
- ❌ Optional (can be omitted)
- ❌ No length limit enforced (recommendation: ≤60 chars)
- Fallback: Directus may use `title` if missing

**Description:**
- ✅ Required field (validated)
- ❌ No length limit enforced (recommendation: 150-200 chars)

**Meta Description:**
- ❌ Optional (can be omitted)
- ❌ No length limit enforced (recommendation: 150-160 chars)
- Fallback: Directus may use `description` if missing

**OG Image:**
- ❌ Not validated
- ❌ No URL format check
- ❌ No image dimension validation

**SEO JSON Blob:**
- Accepted as-is (no schema validation)
- Passed directly to Directus `seo` field

---

### Cross-Linking Between Languages

**Current State:** ❌ **Not implemented**

**Missing Features:**
- No automatic translation linking
- No `language_variant_of` field populated
- No bidirectional relationship creation
- User must manually link translations in Directus

**Recommendation:** Implement translation linking in future iterations.

---

## 7. Blocks & Galleries

### Supported Block Types

**3 block types supported in prompt/spec:**

1. **block_richtext**
2. **block_content_section_v3**
3. **block_gallery**

**Legacy Support:**
- AI can return `type: "richtext"` → Auto-converted to `"block_richtext"`
- AI can return `type: "content_section_v3"` → Auto-converted to `"block_content_section_v3"`
- AI can return `type: "gallery"` → Auto-converted to `"block_gallery"`

---

### Block Type Definitions

**1. block_richtext**

**Directus Table:** `block_richtext`

**Fields Created:**
```typescript
{
  id: UUID (auto),
  text: string,           // Markdown content
  headline: string | null,
  tagline: string | null
}
```

**API Call:**
```
POST https://cms-blog.memopyk.org/items/block_richtext
Body: { text, headline, tagline }
```

---

**2. block_content_section_v3**

**Directus Table:** `block_content_section_v3`

**Fields Created (24 total):**
```typescript
{
  id: UUID (auto),
  layout: string,              // "text-only" | "image-left" | ...
  text: string,                // Markdown
  caption: string | null,
  alt: string | null,
  image_primary: UUID | null,
  image_secondary: UUID | null,
  image_third: UUID | null,
  media_width: string | null,  // "25" | "33" | ...
  media_align: string | null,  // "left" | "center" | "right"
  max_width: string,           // "content" | "wide" | "full"
  spacing_top: string,         // "none" | "sm" | "md" | "lg"
  spacing_bottom: string,
  background: string,          // "default" | "light" | "dark"
  image_fit: string,           // "natural" | "cover" | "contain"
  image_height: number | null,
  gutter: number | null,
  corner_radius: number | null,
  image_shadow: boolean,
  block_shadow: boolean,
  caption_align: string,       // "left" | "center" | "right"
  caption_position: string,    // "below" | "above" | "overlay"
  caption_bg: string           // "none" | "light" | "dark"
}
```

**API Call:**
```
POST https://cms-blog.memopyk.org/items/block_content_section_v3
Body: { ...all 24 fields... }
```

---

**3. block_gallery**

**Directus Table:** `block_gallery`

**Fields Created:**
```typescript
{
  id: UUID (auto),
  title: string | null,
  intro: string | null,  // Markdown
  images: []             // Always empty array
}
```

**API Call:**
```
POST https://cms-blog.memopyk.org/items/block_gallery
Body: { title, intro, images: [] }
```

---

### posts_blocks Junction Table

**Directus Table:** `posts_blocks` (Many-to-Any relationship)

**Fields:**
```typescript
{
  id: number (auto),
  posts_id: UUID,           // Foreign key to posts.id
  collection: string,       // "block_richtext" | "block_content_section_v3" | "block_gallery"
  item: UUID,               // Foreign key to block collection
  sort: number              // Display order (100, 200, 300, ...)
}
```

**Sort Handling:**
- Default: Auto-increment by 100 (`(i + 1) * 100`)
- Override: AI can provide explicit `sort` value in block JSON
- Frontend rendering: Sorts blocks by `sort` ASC

---

### Gallery Creation

**Current Implementation:**

1. Block created with empty `images` array
2. Editor must manually add images via Directus admin interface
3. No automatic gallery population from AI

**Future Enhancement:**
- Could support `images.map` similar to content sections
- Would require pre-uploading images to Directus `/files` endpoint

---

## 8. Security & Roles

### Directus Token & Role

**Token Type:** Static Bearer Token

**Environment Variable:** `DIRECTUS_TOKEN`

**Token Source:**
```typescript
const token = await getDirectusToken();
```

**Function Location:** `server/routes.ts` (not in excerpt, but referenced in code)

**Authentication Method:**
- Previously: Email/password login (`DIRECTUS_EMAIL`, `DIRECTUS_PASSWORD`)
- Current: Static token (`DIRECTUS_TOKEN`) - More reliable for backend-to-backend

**Token Scope:**
- Must have `create` permission on: `posts`, `block_richtext`, `block_content_section_v3`, `block_gallery`, `posts_blocks`
- Must have `read` permission on: `posts` (for duplicate slug check, if implemented)
- Must have `update` permission on: `block_content_section_v3` (for image patching)

---

### Required Directus Permissions

**Collections:**
- `posts` - Create, Read
- `block_richtext` - Create
- `block_content_section_v3` - Create, Update (for image patching)
- `block_gallery` - Create
- `posts_blocks` - Create
- `directus_files` - Read (for image validation, if implemented)

**Fields:**
- All fields must be accessible to the token role
- No field-level restrictions should be applied

---

### Rate Limits

**Current State:** ❌ **No rate limiting implemented**

**Risks:**
- Unlimited blog post creation
- Potential for abuse/spam
- No throttling on Directus API calls

**Recommendation:** Implement rate limiting middleware (e.g., `express-rate-limit`)

---

### Auth Middleware

**Current State:** ❌ **No authentication middleware**

**Gaps:**
- Endpoint publicly accessible (anyone can create blog posts)
- No user role validation
- No admin-only restriction
- No session/JWT verification

**Recommendation:** Add admin authentication middleware before handler.

---

### CSRF Protection

**Current State:** ❌ **No CSRF token validation**

**Missing:**
- No CSRF token check in POST handler
- Frontend does not send CSRF token with request
- Vulnerable to cross-site request forgery

**Recommendation:** Implement CSRF protection using existing `/api/csrf` endpoint pattern.

---

## 9. Logging, Metrics, Errors

### Console Logging

**Frontend Logging:**

**Location:** `client/src/admin/BlogAICreator.tsx`

**Events Logged:**
```typescript
console.error('Error creating blog post:', error);  // Line 271
```

**Log Level:** Error only (no info/debug logs)

---

**Backend Logging:**

**Location:** `server/routes.ts` lines 9405-9689

**Events Logged:**

**Info Level:**
```
🤖 AI Blog Creator: Starting post creation...
📝 Creating post: "{title}" ({language})
✅ Post created with ID: {postId}
📦 Creating {N} blocks...
   [{i}/{total}] Creating {blockType} (sort: {sortOrder})...
   🔗 Linking {blockType} ({blockId}) to post...
   ✅ Block {i} linked successfully
🖼️ Patching {N} images...
   ✅ Patched {field} with file {file_id} on block {blockId}
   Title: {title}
   Slug: {slug}
   Language: {language}
   Status: {status}
   Blocks: {N}
   Images patched: {N}
   Post ID: {postId}
📸 Assets to upload ({N}):
   - {ref}: {alt} ({notes})
```

**Warning Level:**
```
⚠️ Unsupported block type: {blockType}, skipping...
⚠️ Could not find created block at index {index}, skipping image patch
⚠️ Block at index {index} is not a content_section_v3, skipping image patch
⚠️ Failed to patch {field} on block {blockId}
```

**Error Level:**
```
❌ Failed to create post: {errorText}
❌ Error creating blog post from AI: {error}
```

---

### Dashboards & Log Viewing

**Current State:** ❌ **No centralized logging dashboard**

**Where to View Logs:**
- **Development:** Console output in terminal running `npm run dev`
- **Production:** Replit deployment logs (accessed via Replit UI)
- No Datadog, Sentry, or other observability tools integrated

---

### Sample Error Entries

**Error 1: Missing Required Field**
```
POST /api/admin/blog/create-from-ai - 400 Bad Request
Response: { "error": "Missing required field: post.title" }
```

**Error 2: Directus API Failure**
```
❌ Failed to create post: {"errors":[{"message":"Invalid token","extensions":{"code":"INVALID_CREDENTIALS"}}]}
POST /api/admin/blog/create-from-ai - 500 Internal Server Error
Response: { "error": "Failed to create blog post", "message": "Failed to create post: 401" }
```

**Error 3: Duplicate Slug**
```
POST /api/admin/blog/create-from-ai - 500 Internal Server Error
Response: { "error": "Failed to create blog post", "message": "Value for field 'slug' in collection 'posts' has to be unique." }
```

**Error 4: Invalid Block Type**
```
⚠️ Unsupported block type: custom_heading, skipping...
(Post still created, but block omitted)
```

---

### Metrics Tracked

**Current State:** ❌ **No metrics collected**

**Missing:**
- No success/failure counters
- No latency tracking
- No block creation time metrics
- No Directus API response time tracking

**Recommendation:** Add metrics using Prometheus or similar.

---

## 10. Dev Setup & Scripts

### Environment Variables Required

**Backend:**
```bash
DIRECTUS_TOKEN=your_static_token_here
```

**Optional (legacy):**
```bash
DIRECTUS_EMAIL=your_email@example.com
DIRECTUS_PASSWORD=your_password
```

---

### Running Locally

**1. Install Dependencies:**
```bash
npm install
```

**2. Set Environment Variables:**
```bash
# Create .env file
echo "DIRECTUS_TOKEN=your_token" >> .env
```

**3. Start Development Server:**
```bash
npm run dev
```

**4. Access AI Blog Creator:**
```
http://localhost:5000/admin
```
Click "AI Blog Creator" tab.

---

### Mock Tokens & Sample Payloads

**Sample Successful Payload:**

See `docs/examples/ai-blog-creator-example-success.json`

**Sample Failure Payload:**

See `docs/examples/ai-blog-creator-example-failure.json`

---

### Testing Script (Replay Successful Creation)

**Create test script:** `scripts/test-ai-blog-creator.sh`

```bash
#!/bin/bash
curl -X POST http://localhost:5000/api/admin/blog/create-from-ai \
  -H "Content-Type: application/json" \
  -d @docs/examples/ai-blog-creator-example-success.json
```

**Run:**
```bash
chmod +x scripts/test-ai-blog-creator.sh
./scripts/test-ai-blog-creator.sh
```

---

### Tests

**Current State:** ❌ **No automated tests**

**Missing:**
- Unit tests for `validateJson()`
- Integration tests for API endpoint
- End-to-end tests for full workflow
- Directus mock/fixture setup

**Recommendation:** Add tests using Jest + Supertest.

---

## 11. Known Issues & Quick Wins

### Known Issues

#### **1. No Idempotency** (High Priority)
- **Issue:** Duplicate submissions create multiple posts with identical content
- **Impact:** Data pollution, wasted Directus storage
- **Fix:** Implement request ID tracking or content hash deduplication

#### **2. No Transaction Support** (High Priority)
- **Issue:** Partial failures leave orphaned posts/blocks in Directus
- **Impact:** Manual cleanup required, data inconsistency
- **Fix:** Wrap all operations in Directus transaction API or add rollback logic

#### **3. No Authentication** (Critical Security Issue)
- **Issue:** Endpoint publicly accessible without admin verification
- **Impact:** Anyone can create blog posts
- **Fix:** Add admin authentication middleware

#### **4. No CSRF Protection** (Security Issue)
- **Issue:** Vulnerable to cross-site request forgery
- **Impact:** Malicious sites could create posts on behalf of logged-in admins
- **Fix:** Validate CSRF token from `/api/csrf` endpoint

#### **5. Tags Not Created** (Feature Gap)
- **Issue:** `post_tags` junction table not populated
- **Impact:** Posts have no tags, affecting SEO and categorization
- **Fix:** Add tag creation logic in API handler

#### **6. No Duplicate Slug Pre-Check** (UX Issue)
- **Issue:** User only discovers duplicate slug after full submission
- **Impact:** Poor user experience, wasted AI token cost
- **Fix:** Add client-side slug availability check before submission

#### **7. No Rate Limiting** (Security Issue)
- **Issue:** Unlimited blog post creation
- **Impact:** Potential spam/abuse, Directus resource exhaustion
- **Fix:** Add `express-rate-limit` middleware

#### **8. Image Upload Not Automated** (Feature Gap)
- **Issue:** Editor must manually upload images referenced in `assets_manifest`
- **Impact:** Slow content publishing workflow
- **Fix:** Implement image URL/base64 → Directus `/files` upload pipeline

---

### Quick Wins (Low-Effort, High-Impact)

#### **1. Add Request Logging** (1 hour)
**Impact:** Better debugging, usage tracking  
**Implementation:** Add structured logging to API handler

```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'ai_blog_creator_request',
  user: req.user?.id,
  topic: aiData.title,
  language: aiData.language,
  blocksCount: aiData.blocks.length
}));
```

---

#### **2. Add SEO Field Length Validation** (2 hours)
**Impact:** Better SEO compliance, fewer Directus errors  
**Implementation:** Update `validateJson()` function

```typescript
if (data.meta_title && data.meta_title.length > 60) {
  return { valid: false, error: 'Meta title must be ≤60 characters' };
}
if (data.meta_description && data.meta_description.length > 160) {
  return { valid: false, error: 'Meta description must be ≤160 characters' };
}
```

---

#### **3. Add Slug Format Validation** (1 hour)
**Impact:** Prevent invalid URLs, improve UX  
**Implementation:** Add regex check in `validateJson()`

```typescript
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (!slugRegex.test(data.slug)) {
  return { valid: false, error: 'Slug must be lowercase kebab-case (e.g., my-blog-post)' };
}
```

---

#### **4. Add Success Metrics Logging** (2 hours)
**Impact:** Track feature usage, identify patterns  
**Implementation:** Log success events to database or analytics service

```typescript
await hybridStorage.logEvent('ai_blog_creator_success', {
  postId,
  language: postData.language,
  blocksCount: blocks.length,
  duration: Date.now() - startTime
});
```

---

#### **5. Add Rollback on Failure** (4 hours)
**Impact:** Prevent orphaned data, improve reliability  
**Implementation:** Track created resources and delete on error

```typescript
const createdResources: { collection: string; id: string }[] = [];

try {
  // Create post
  const postResult = await createPost();
  createdResources.push({ collection: 'posts', id: postResult.id });
  
  // Create blocks...
  
} catch (error) {
  // Rollback
  for (const resource of createdResources.reverse()) {
    await deleteDirectusItem(resource.collection, resource.id);
  }
  throw error;
}
```

---

#### **6. Add Admin Auth Middleware** (3 hours)
**Impact:** Secure endpoint, prevent unauthorized access  
**Implementation:** Reuse existing auth patterns from other admin endpoints

```typescript
import { requireAdmin } from './middleware/auth';

app.post("/api/admin/blog/create-from-ai", requireAdmin, async (req, res) => {
  // Existing handler code
});
```

---

#### **7. Add Client-Side Slug Check** (2 hours)
**Impact:** Better UX, early error detection  
**Implementation:** Add API call before submission

```typescript
const checkSlugAvailability = async (slug: string, language: string) => {
  const response = await fetch(`/api/blog/slug-available?slug=${slug}&language=${language}`);
  return response.json();
};

// Call in validateJson() or before submission
```

---

#### **8. Add Progress Indicator** (1 hour)
**Impact:** Better UX during long creation process  
**Implementation:** Add step-by-step progress display

```typescript
const [progress, setProgress] = useState({
  step: '',
  current: 0,
  total: 0
});

// Update during creation
setProgress({ step: 'Creating blocks', current: i, total: blocks.length });
```

---

## Appendix A: File Locations

**Core Files:**
- Frontend Component: `client/src/admin/BlogAICreator.tsx` (500 lines)
- Backend Handler: `server/routes.ts` lines 9405-9689 (285 lines)
- Directus SDK: `client/src/lib/directus.ts`
- Directus Constants: `client/src/constants/directus.ts`

**Example Files:**
- Success Example: `docs/examples/ai-blog-creator-example-success.json`
- Failure Example: `docs/examples/ai-blog-creator-example-failure.json`
- Prompt Template: Embedded in `BlogAICreator.tsx` lines 12-121

---

## Appendix B: External Dependencies

**Frontend:**
- React state management (`useState`)
- shadcn/ui components (Card, Button, Input, Textarea, Select, Checkbox, Toast)
- Lucide React icons (Sparkles, Copy, CheckCircle, AlertCircle, Loader2, Send)

**Backend:**
- Directus REST API (https://cms-blog.memopyk.org)
- Node.js `fetch` API for HTTP requests
- Express.js route handling

**No External AI Services:**
- AI interaction is manual (copy-paste workflow)
- No OpenAI/Claude API integration
- User provides AI response manually

---

## Appendix C: Related Documentation

- **Directus Recovery Guide:** `DIRECTUS_RECOVERY_GUIDE.md`
- **Directus Schema Mapping:** `DIRECTUS_SCHEMA_MAPPING.md`
- **Blog System Architecture:** `replit.md` (lines 180-200)

---

**End of Documentation**
