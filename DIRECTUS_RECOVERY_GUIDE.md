# 🚨 DIRECTUS RECOVERY GUIDE - MEMOPYK Blog System

**Status**: CRITICAL - Directus instance deleted, Supabase database intact
**Created**: October 25, 2025
**Last Updated**: October 25, 2025

---

## 📊 IMMEDIATE STATUS

### 1. **Frontend Status: ✅ RUNNING**
- **URL**: memopyk.com (deployed and operational)
- **Replit Deployment**: Active on replit.dev
- **Frontend Health**: Fully operational, no frontend errors
- **Current Issue**: Cannot fetch blog data (Directus 503 error)

### 2. **Current Error State**
```
❌ Directus authentication error: Error: Directus auth failed: 503
HTTP/2 503 - no available server
```

### 3. **Request Status**
- ❌ Blog post requests: **FAILING** (503 from Directus)
- ✅ Main MEMOPYK app: **WORKING** (gallery, analytics, partners)
- ✅ Supabase database: **INTACT** (all blog data preserved)

---

## 🔌 DIRECTUS & API CONNECTIONS

### 4. **Directus API Endpoint**
**Current Configuration**: `https://cms-blog.memopyk.org`

**Locations in Code**:
- `client/src/constants/directus.ts` (line 1): `export const DIRECTUS_URL = "https://cms-blog.memopyk.org"`
- `client/src/lib/directus.ts` (line 60): `const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'https://cms-blog.memopyk.org'`
- `server/routes.ts` (line 9330): `const BASE_URL = 'https://cms-blog.memopyk.org'`

### 5. **Directus API Credentials**

**Stored as Replit Secrets** (Environment Variables):
- ✅ `DIRECTUS_EMAIL` - exists
- ✅ `DIRECTUS_PASSWORD` - exists
- ❌ `DIRECTUS_TOKEN` - does NOT exist (uses email/password instead)

**Authentication Method**: Email/Password Login (not static token)
- Backend logs in via `/auth/login` endpoint
- Receives `access_token` dynamically
- Token cached in memory with expiry tracking

**Code Location**: `server/routes.ts` lines 8908-8940
```typescript
async function getDirectusToken(): Promise<string> {
  // Caches access_token, auto-refreshes on expiry
  const response = await fetch('https://cms-blog.memopyk.org/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.DIRECTUS_EMAIL,
      password: process.env.DIRECTUS_PASSWORD
    })
  });
  // Returns access_token
}
```

### 6. **Environment Variables for Directus**

**Required in Replit Secrets**:
```bash
DIRECTUS_EMAIL=<your-directus-admin-email>
DIRECTUS_PASSWORD=<your-directus-admin-password>
```

**Optional** (can override via frontend env):
```bash
VITE_DIRECTUS_URL=https://cms-blog.memopyk.org
```

---

## 💾 SUPABASE CONNECTION

### 7. **Supabase Connection Architecture**

**PRIMARY DATA FLOW**:
- ❌ **NO direct Supabase connection for blog data**
- ✅ **ALL blog data flows through Directus API**
- ✅ Directus connects to Supabase PostgreSQL as backend

**Other Supabase Usage** (separate from blog):
- Gallery data (videos, images)
- Analytics tracking
- Partner directory
- Session management

### 8. **Supabase Credentials**

**Stored as Replit Secrets**:
- ✅ `SUPABASE_URL` - exists
- ✅ `SUPABASE_SERVICE_KEY` - exists
- ✅ `DATABASE_URL` - exists

**Used For**: Gallery, Analytics, Partners (NOT for blog content)

---

## 🔄 CURRENT DATA FLOW

### 9. **Blog Data Flow Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                   BLOG DATA FLOW                        │
└─────────────────────────────────────────────────────────┘

Frontend (React)
    │
    ├─> /api/blog/posts (GET list)
    ├─> /api/blog/posts/:slug (GET single post)
    ├─> /api/admin/blog/create-from-ai (POST - AI generator)
    └─> /api/analytics/blog/view (POST - track views)
         │
         ▼
Backend Express Server (server/routes.ts)
    │
    ├─> getDirectusToken() → Login via email/password
    │
    └─> Fetch from Directus API
         │
         ├─> /items/posts (blog posts)
         ├─> /items/posts_blocks (M2A block relationships)
         ├─> /items/block_heading
         ├─> /items/block_richtext
         ├─> /items/block_gallery
         ├─> /items/block_content_section
         └─> /items/block_content_section_v3
              │
              ▼
    Directus CMS (cms-blog.memopyk.org)
         │
         └─> PostgreSQL Database (Supabase)
              └─> Blog posts, blocks, files metadata
                   │
                   └─> Directus Storage → Supabase Storage
                        └─> Image/video files
```

**Key Points**:
- Frontend NEVER talks directly to Directus
- Backend acts as proxy/authentication layer
- Directus reads/writes to Supabase PostgreSQL
- Images served via `/assets/{id}` endpoint

### 10. **Main API Endpoints**

**Blog Content Endpoints**:
```typescript
GET  /api/blog/posts                    // List all published posts (paginated)
GET  /api/blog/posts/:slug              // Single post by slug + language
POST /api/admin/blog/create-from-ai     // AI-generated blog post creator
POST /api/analytics/blog/view           // Track post views
GET  /api/analytics/blog/popular        // Most viewed posts
GET  /api/analytics/blog/trends         // View trends over time
GET  /api/blog/posts-debug/:postId      // Debug endpoint (dev only)
GET  /api/debug/directus-blocks         // Debug M2A blocks (dev only)
```

**Directus Fetch Patterns**:
```typescript
// Backend fetches from Directus:
'https://cms-blog.memopyk.org/auth/login'                    // Auth
'https://cms-blog.memopyk.org/items/posts'                   // Post list
'https://cms-blog.memopyk.org/items/posts/{id}'             // Single post
'https://cms-blog.memopyk.org/items/posts_blocks'           // M2A relationships
'https://cms-blog.memopyk.org/items/block_heading'          // Heading blocks
'https://cms-blog.memopyk.org/items/block_richtext'         // Rich text blocks
'https://cms-blog.memopyk.org/items/block_gallery'          // Gallery blocks
'https://cms-blog.memopyk.org/items/block_content_section'  // Content sections v1
'https://cms-blog.memopyk.org/items/block_content_section_v3' // Content sections v3
'https://cms-blog.memopyk.org/assets/{file_id}'             // Images/files
```

---

## ⚙️ CONFIGURATION & CUSTOMIZATION

### 11. **Custom Directus Configurations**

**Critical Directus Schema Requirements**:

#### **Collections** (must exist in Directus):
1. `posts` - Main blog posts
2. `posts_blocks` - M2A junction table for blocks
3. `block_heading` - Heading content blocks
4. `block_richtext` - Rich text content blocks
5. `block_gallery` - Gallery/image grid blocks
6. `block_content_section` - Content sections (v1)
7. `block_content_section_v3` - Enhanced content sections
8. `directus_files` - File metadata (Directus system collection)

#### **Fields Required** (detailed schema):

**posts collection**:
```typescript
{
  id: string (UUID)
  title: string
  slug: string (unique)
  status: 'draft' | 'published' | 'archived'
  published_at: datetime
  language: 'en-US' | 'fr-FR'
  description: text
  seo: json
  image: M2O → directus_files
  author: M2O → authors (optional)
  blocks: O2M → posts_blocks
}
```

**posts_blocks collection** (M2A junction):
```typescript
{
  id: integer (auto-increment)
  posts_id: M2O → posts
  collection: string (block type)
  item: string (block ID)
  sort: integer
}
```

**block_content_section_v3 collection** (most complex):
```typescript
{
  id: string (UUID)
  layout: 'text-only' | 'image-left' | 'image-right' | 'image-full' | 'two-images' | 'three-images'
  text: text (markdown)
  image_primary: M2O → directus_files
  image_secondary: M2O → directus_files (optional)
  image_third: M2O → directus_files (optional)
  media_width: '25' | '33' | '40' | '50' | '60' | '66' | '75'
  media_align: 'left' | 'center' | 'right'
  max_width: 'content' | 'wide' | 'full'
  spacing_top: 'none' | 'sm' | 'md' | 'lg'
  spacing_bottom: 'none' | 'sm' | 'md' | 'lg'
  background: 'default' | 'light' | 'dark'
  caption: string (fallback caption)
  caption_primary: string (per-image caption)
  caption_secondary: string
  caption_third: string
  alt: string (fallback alt text)
  alt_primary: string (per-image alt)
  alt_secondary: string
  alt_third: string
  image_fit: 'natural' | 'cover' | 'contain'
  image_height: integer (pixels)
  gutter: integer (grid gap in px)
  corner_radius: integer (border radius in px)
  image_shadow: boolean
  block_shadow: boolean
  caption_align: 'left' | 'center' | 'right'
  caption_position: 'above' | 'below' | 'overlay'
  caption_bg: 'none' | 'light' | 'dark'
}
```

**Special API Permissions** (Directus roles):
- **Blog Reader Role** (public token): Read-only access to published posts
  - ✅ Can read: posts, posts_blocks, block_*, directus_files (ID only)
  - ❌ Cannot read: directus_files metadata (filename, etc.) - causes 403
  - Solution: Backend fetches only file IDs, builds URLs via `/assets/{id}`

**Webhooks/Automations**: NONE (no custom webhooks configured)

### 12. **Deleted Instance Details**

**Domain/Hostname**: `cms-blog.memopyk.org`
**Port**: 443 (HTTPS, likely proxied by Coolify)
**Hosting**: Coolify-managed VPS
**Database**: External Supabase PostgreSQL (INTACT)

---

## 🔧 RECOVERY STEPS

### 13. **What Needs to Change When You Redeploy**

**IF** the new Directus instance uses **the same domain** (`cms-blog.memopyk.org`):
✅ **ZERO code changes needed!**

**IF** the domain changes (e.g., `cms-blog2.memopyk.org`):
📝 **Update these 3 locations**:

1. **Frontend constant** (`client/src/constants/directus.ts` line 1):
   ```typescript
   export const DIRECTUS_URL = "https://YOUR-NEW-DOMAIN";
   ```

2. **Frontend SDK** (`client/src/lib/directus.ts` line 60):
   ```typescript
   const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'https://YOUR-NEW-DOMAIN';
   ```
   Also update line 71:
   ```typescript
   const CDN = 'https://YOUR-NEW-DOMAIN/assets';
   ```

3. **Backend API** (`server/routes.ts` line 9330):
   ```typescript
   const BASE_URL = 'https://YOUR-NEW-DOMAIN';
   ```

4. **CSP Headers** (`server/index.ts` line 154-159):
   Update Content Security Policy to include new domain

**Redeploy Required**: Yes, after code changes
**Restart Required**: Yes, to pick up environment variable changes

### 14. **Hardcoded URLs/Credentials**

**Hardcoded URLs** (need updating if domain changes):
- ✅ `client/src/constants/directus.ts` - Line 1
- ✅ `client/src/lib/directus.ts` - Lines 60, 71
- ✅ `server/routes.ts` - Lines 8918, 9206, 9330, etc.
- ✅ `server/index.ts` - Lines 154-159 (CSP headers)
- ✅ `client/src/components/blog/BlockContentSection.tsx` - Lines 180, 183
- ✅ `client/src/pages/BlogPostPage.tsx` - Line 109

**Credentials** (already in Replit Secrets - no changes needed):
- ✅ `DIRECTUS_EMAIL` - Reusable with new instance
- ✅ `DIRECTUS_PASSWORD` - Reusable with new instance
- ⚠️ **IMPORTANT**: Create same admin user in new Directus with these credentials

**Database Connection** (Directus → Supabase):
- New Directus instance needs your Supabase PostgreSQL credentials
- Get from Coolify or Supabase dashboard:
  - Database host
  - Database port
  - Database name
  - Database username
  - Database password

---

## 📋 CRITICAL CHECKLIST FOR NEW DIRECTUS INSTANCE

### Before Starting:
- [ ] Confirm Supabase PostgreSQL is accessible
- [ ] Get Supabase database credentials (host, port, user, password, database)
- [ ] Decide on domain: same (`cms-blog.memopyk.org`) or new?

### Deploy New Directus:
- [ ] Deploy Directus on Coolify
- [ ] Configure database connection to Supabase
- [ ] Point domain to new instance (or configure new domain)
- [ ] Verify Directus admin panel loads
- [ ] Create admin user with `DIRECTUS_EMAIL` / `DIRECTUS_PASSWORD`

### Configure Directus Schema:
- [ ] Verify all collections exist (posts, posts_blocks, block_*)
- [ ] Check field schema matches (see section 11)
- [ ] Configure file storage (Supabase Storage integration)
- [ ] Set up roles/permissions (especially "Blog Reader" public role)
- [ ] Test M2A block relationships work

### Configure Storage:
- [ ] Connect Directus Storage to Supabase Storage
- [ ] Verify `/assets/{id}` endpoint works
- [ ] Test image transformations (width, quality, format params)

### Test Connectivity:
- [ ] Test auth: `curl -X POST https://cms-blog.memopyk.org/auth/login -H "Content-Type: application/json" -d '{"email":"...","password":"..."}'`
- [ ] Test posts: `curl https://cms-blog.memopyk.org/items/posts`
- [ ] Test assets: `curl -I https://cms-blog.memopyk.org/assets/{some-file-id}`

### Update Frontend (if domain changed):
- [ ] Update `client/src/constants/directus.ts`
- [ ] Update `client/src/lib/directus.ts`
- [ ] Update `server/routes.ts`
- [ ] Update `server/index.ts` CSP headers
- [ ] Update `client/src/components/blog/BlockContentSection.tsx`
- [ ] Update `client/src/pages/BlogPostPage.tsx`
- [ ] Redeploy Replit app

### Verify Working:
- [ ] Test backend: `curl https://YOUR-REPLIT-URL/api/blog/posts?language=en-US`
- [ ] Open blog page: `https://memopyk.com/blog`
- [ ] Check browser console for errors
- [ ] Verify images load
- [ ] Test blog post page navigation

---

## 🏗️ ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MEMOPYK BLOG SYSTEM                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   memopyk.com   │  Frontend (React + Vite)
│  (Replit App)   │  - Blog listing pages
└────────┬────────┘  - Blog post pages
         │           - AI blog creator (admin)
         │
         ├─── GET /api/blog/posts?language=en-US
         ├─── GET /api/blog/posts/:slug?language=en-US
         ├─── POST /api/admin/blog/create-from-ai
         └─── POST /api/analytics/blog/view
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│           Backend Express API (server/routes.ts)        │
│  - Authenticates with Directus (email/password)         │
│  - Proxies requests to Directus                         │
│  - Transforms responses for frontend                    │
│  - Tracks blog analytics to Supabase                    │
└────────────────────┬────────────────────────────────────┘
                     │
       ┌─────────────┴──────────────┐
       │                            │
       ▼                            ▼
┌──────────────────┐      ┌────────────────────┐
│  Directus CMS    │      │  Supabase Storage  │
│ cms-blog.memopyk │      │  (File Storage)    │
│  - Admin UI      │      │  - Blog images     │
│  - REST API      │      │  - Thumbnails      │
│  - File mgmt     │◄─────┤  - Assets          │
└────────┬─────────┘      └────────────────────┘
         │
         └─────► PostgreSQL Database
                 (Supabase-hosted)
                 - posts
                 - posts_blocks (M2A)
                 - block_heading
                 - block_richtext
                 - block_gallery
                 - block_content_section
                 - block_content_section_v3
                 - directus_files (metadata)
                 - directus_users
                 - directus_roles
```

**Data Flow**:
1. User visits blog page → Frontend requests `/api/blog/posts`
2. Backend logs into Directus → Gets access token
3. Backend fetches from Directus → `/items/posts`
4. Directus queries Supabase PostgreSQL
5. Directus returns data with file IDs
6. Backend transforms response → Adds asset URLs
7. Frontend renders → Images load via `/assets/{id}`

---

## 🆘 TROUBLESHOOTING

### Common Issues After Redeployment:

**503 Service Unavailable**:
- Directus container not running
- Domain not pointed correctly
- Firewall blocking port 443

**401 Unauthorized**:
- Admin user not created with correct email/password
- Replit Secrets not matching Directus user
- Token expiry issues (should auto-refresh)

**403 Forbidden on Images**:
- File permissions not set correctly
- "Blog Reader" role missing read permission on `directus_files`
- Public access not enabled for `/assets/*`

**404 Not Found on Posts**:
- Collections not created in Directus
- Posts not published (`status = 'published'`)
- `published_at` date in future

**Empty Blocks Array**:
- M2A relationships not configured
- `posts_blocks` collection missing
- Block collections don't exist

---

## 📞 SUPPORT CONTACTS

**Directus Docs**: https://docs.directus.io/
**Coolify Docs**: https://coolify.io/docs
**Supabase Docs**: https://supabase.com/docs

**Quick Recovery Estimate**: 30-60 minutes if database is intact

---

## ✅ SUCCESS CRITERIA

You'll know recovery is complete when:
1. ✅ `curl https://cms-blog.memopyk.org/auth/login` returns 200 with access token
2. ✅ `curl https://cms-blog.memopyk.org/items/posts` returns blog posts
3. ✅ `curl https://YOUR-REPLIT-URL/api/blog/posts?language=en-US` returns transformed posts
4. ✅ Blog pages load on memopyk.com/blog
5. ✅ Images display correctly
6. ✅ No errors in browser console

---

**Document Version**: 1.0
**Last Tested**: Pre-deletion (working state)
**Recovery Priority**: HIGH - Blog is critical feature
