# 📋 DIRECTUS SCHEMA MAPPING - MEMOPYK Blog System

**Purpose**: Complete reference for recreating Directus schema to maintain blog functionality
**Created**: October 25, 2025
**Status**: Production-Critical

---

## 🎯 QUICK REFERENCE

### Language Handling
- **Values**: `en-US` and `fr-FR` (exact match required)
- **Filter**: `filter[language][_eq]=en-US` or `filter[language][_eq]=fr-FR`
- **Strict**: Backend validates and rejects posts with mismatched languages
- **Storage**: Single `posts` collection with `language` field (no separate tables)

### Authentication
- **Method**: Email/Password login via `/auth/login` endpoint
- **Token**: Cached `access_token` with expiry tracking
- **Credentials**: Stored in Replit Secrets (`DIRECTUS_EMAIL`, `DIRECTUS_PASSWORD`)

---

## 🗃️ COLLECTIONS REQUIRED

### 1. `posts` (Main Blog Posts)
### 2. `posts_blocks` (M2A Junction Table)
### 3. `block_heading` (Heading Blocks)
### 4. `block_richtext` (Rich Text Blocks)
### 5. `block_gallery` (Gallery Blocks)
### 6. `block_content_section` (Content Section Blocks v1)
### 7. `block_content_section_v3` (Enhanced Content Section Blocks)
### 8. `directus_files` (System Collection - Files)
### 9. `authors` (Optional - Author Information)

---

## 📊 DETAILED FIELD SCHEMAS

### 1️⃣ **posts Collection**

**API Endpoint**: `/items/posts`

#### **Fields Queried for Post Listing** (`GET /api/blog/posts`):
```typescript
{
  id: string | number,              // Primary key (UUID or auto-increment)
  title: string,                    // Post title
  slug: string,                     // Unique URL slug
  status: 'draft' | 'published' | 'archived',
  published_at: datetime,           // ISO 8601 timestamp
  language: 'en-US' | 'fr-FR',     // EXACT match required
  description: text,                // Post excerpt/summary
  image: {                          // M2O relationship to directus_files
    id: string                      // ⚠️ ONLY ID queried (avoid 403)
  },
  author: {                         // M2O relationship to authors (optional)
    id: string,
    first_name: string,
    last_name: string,
    email: string
  },
  seo: json                         // SEO metadata (optional)
}
```

**Backend Query**:
```
GET /items/posts?filter[status][_eq]=published
                &filter[published_at][_lte]=2025-10-25T14:00:00.000Z
                &filter[language][_eq]=en-US
                &sort=-published_at
                &fields=id,title,slug,status,published_at,language,description,image.*,author.*,seo
                &limit=24
```

#### **Fields Queried for Single Post** (`GET /api/blog/posts/:slug`):
All fields from listing, PLUS:
```typescript
{
  // Same as listing, PLUS:
  blocks: Array<{                   // O2M to posts_blocks
    collection: string,             // Block type identifier
    item: object                    // Nested block data (see below)
  }>
}
```

**Backend Query** (excerpt):
```
GET /items/posts?filter[slug][_eq]=my-post-slug
                &filter[language][_eq]=en-US
                &filter[status][_eq]=published
                &filter[published_at][_lte]=2025-10-25T14:00:00.000Z
                &fields=id,title,slug,status,published_at,language,description,seo,
                        image.id,author.id,author.first_name,author.last_name,author.email,
                        blocks.collection,
                        blocks.item:block_heading.{all fields},
                        blocks.item:block_richtext.{all fields},
                        ...
                &limit=1
```

#### **Required Schema**:
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP WITH TIME ZONE,
  language TEXT NOT NULL CHECK (language IN ('en-US', 'fr-FR')),
  description TEXT,
  image UUID REFERENCES directus_files(id),
  author UUID REFERENCES authors(id),
  seo JSONB,
  date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_posts_language ON posts(language);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at);
CREATE INDEX idx_posts_slug ON posts(slug);
```

---

### 2️⃣ **posts_blocks Collection** (M2A Junction)

**API Endpoint**: `/items/posts_blocks`

**Purpose**: Many-to-Any junction table linking posts to various block types

#### **Fields**:
```typescript
{
  id: number,                       // Auto-increment primary key
  posts_id: string | number,        // M2O to posts (FK)
  collection: string,               // Block collection name
  item: string | number,            // Block item ID (polymorphic)
  sort: number                      // Display order (ascending)
}
```

**Backend Query**:
```
GET /items/posts_blocks?filter[posts_id][_eq]=POST_UUID
                       &fields=id,collection,item,sort
                       &sort=sort
```

#### **Collection Values**:
- `block_heading`
- `block_richtext`
- `block_gallery`
- `block_content_section`
- `block_content_section_v3`

#### **Required Schema**:
```sql
CREATE TABLE posts_blocks (
  id SERIAL PRIMARY KEY,
  posts_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  collection TEXT NOT NULL,
  item TEXT NOT NULL,              -- Polymorphic: can be UUID or integer
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_posts_blocks_posts_id ON posts_blocks(posts_id);
CREATE INDEX idx_posts_blocks_sort ON posts_blocks(sort);
```

---

### 3️⃣ **block_heading Collection**

**API Endpoint**: `/items/block_heading`

#### **Fields Queried**:
```typescript
{
  id: string | number,              // Primary key
  text: string,                     // Heading text content
  level: 1 | 2 | 3 | 4 | 5 | 6,    // H1-H6
  align: 'left' | 'center' | 'right' | null
}
```

**Backend Query** (via M2A expansion):
```
blocks.item:block_heading.id,
blocks.item:block_heading.text,
blocks.item:block_heading.level,
blocks.item:block_heading.align
```

#### **Required Schema**:
```sql
CREATE TABLE block_heading (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 6),
  align TEXT CHECK (align IN ('left', 'center', 'right'))
);
```

---

### 4️⃣ **block_richtext Collection**

**API Endpoint**: `/items/block_richtext`

#### **Fields Queried**:
```typescript
{
  id: string | number,              // Primary key
  content: text,                    // Rich HTML or Markdown content
  headline: string | null,          // Optional heading above content
  tagline: string | null            // Optional subheading
}
```

**Backend Query** (via M2A expansion):
```
blocks.item:block_richtext.id,
blocks.item:block_richtext.content,
blocks.item:block_richtext.headline,
blocks.item:block_richtext.tagline
```

#### **Required Schema**:
```sql
CREATE TABLE block_richtext (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  headline TEXT,
  tagline TEXT
);
```

---

### 5️⃣ **block_gallery Collection**

**API Endpoint**: `/items/block_gallery`

**Note**: This is a NESTED M2M structure (gallery → gallery_items → files)

#### **Fields Queried**:
```typescript
{
  id: string | number,              // Primary key
  headline: string | null,          // Gallery title
  tagline: string | null,           // Gallery subtitle
  items: Array<{                    // O2M to gallery junction table
    id: number,                     // Junction ID
    sort: number,                   // Display order
    directus_file: {                // M2O to directus_files
      id: string                    // ⚠️ ONLY ID queried
    }
  }>
}
```

**Backend Query** (via M2A expansion):
```
blocks.item:block_gallery.id,
blocks.item:block_gallery.headline,
blocks.item:block_gallery.tagline,
blocks.item:block_gallery.items.id,
blocks.item:block_gallery.items.sort,
blocks.item:block_gallery.items.directus_file.id
```

#### **Required Schema**:
```sql
CREATE TABLE block_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT,
  tagline TEXT
);

CREATE TABLE block_gallery_files (
  id SERIAL PRIMARY KEY,
  block_gallery_id UUID NOT NULL REFERENCES block_gallery(id) ON DELETE CASCADE,
  directus_file UUID NOT NULL REFERENCES directus_files(id),
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_block_gallery_files_gallery ON block_gallery_files(block_gallery_id);
```

---

### 6️⃣ **block_content_section Collection** (Legacy v1)

**API Endpoint**: `/items/block_content_section`

**Purpose**: Text + image layouts with per-image captions/alt text

#### **Fields Queried**:
```typescript
{
  id: string | number,
  layout: 'text-only' | 'image-left' | 'image-right' | 'image-full' | 'two-images' | 'three-images',
  text: text,                       // Markdown content
  
  // Layout configuration
  media_width: '25' | '33' | '40' | '50' | '60' | '66' | '75',
  media_align: 'left' | 'center' | 'right',
  max_width: 'content' | 'wide' | 'full',
  spacing_top: 'none' | 'sm' | 'md' | 'lg',
  spacing_bottom: 'none' | 'sm' | 'md' | 'lg',
  background: 'default' | 'light' | 'dark',
  
  // Images (M2O relationships)
  image_primary: { id: string },    // ⚠️ ONLY ID queried
  image_secondary: { id: string },  // Optional
  image_third: { id: string },      // Optional
  
  // Fallback caption/alt
  caption: string | null,           // Used if caption_primary is null
  alt: string | null,               // Used if alt_primary is null
  
  // Per-image captions (NEW)
  caption_primary: string | null,   // Caption for image_primary
  caption_secondary: string | null, // Caption for image_secondary
  caption_third: string | null,     // Caption for image_third
  
  // Per-image alt text (NEW)
  alt_primary: string | null,       // Alt text for image_primary
  alt_secondary: string | null,     // Alt text for image_secondary
  alt_third: string | null          // Alt text for image_third
}
```

**Backend Query** (via M2A expansion):
```
blocks.item:block_content_section.id,
blocks.item:block_content_section.layout,
blocks.item:block_content_section.text,
blocks.item:block_content_section.media_width,
blocks.item:block_content_section.media_align,
blocks.item:block_content_section.max_width,
blocks.item:block_content_section.spacing_top,
blocks.item:block_content_section.spacing_bottom,
blocks.item:block_content_section.background,
blocks.item:block_content_section.caption,
blocks.item:block_content_section.alt,
blocks.item:block_content_section.caption_primary,
blocks.item:block_content_section.caption_secondary,
blocks.item:block_content_section.caption_third,
blocks.item:block_content_section.alt_primary,
blocks.item:block_content_section.alt_secondary,
blocks.item:block_content_section.alt_third,
blocks.item:block_content_section.image_primary.id,
blocks.item:block_content_section.image_secondary.id,
blocks.item:block_content_section.image_third.id
```

#### **Required Schema**:
```sql
CREATE TABLE block_content_section (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout TEXT NOT NULL CHECK (layout IN ('text-only', 'image-left', 'image-right', 'image-full', 'two-images', 'three-images')),
  text TEXT,
  media_width TEXT CHECK (media_width IN ('25', '33', '40', '50', '60', '66', '75')),
  media_align TEXT CHECK (media_align IN ('left', 'center', 'right')),
  max_width TEXT CHECK (max_width IN ('content', 'wide', 'full')),
  spacing_top TEXT CHECK (spacing_top IN ('none', 'sm', 'md', 'lg')),
  spacing_bottom TEXT CHECK (spacing_bottom IN ('none', 'sm', 'md', 'lg')),
  background TEXT CHECK (background IN ('default', 'light', 'dark')),
  image_primary UUID REFERENCES directus_files(id),
  image_secondary UUID REFERENCES directus_files(id),
  image_third UUID REFERENCES directus_files(id),
  caption TEXT,
  alt TEXT,
  caption_primary TEXT,
  caption_secondary TEXT,
  caption_third TEXT,
  alt_primary TEXT,
  alt_secondary TEXT,
  alt_third TEXT
);
```

---

### 7️⃣ **block_content_section_v3 Collection** (Enhanced)

**API Endpoint**: `/items/block_content_section_v3`

**Purpose**: Extended version with additional styling controls

#### **Fields Queried**:
```typescript
{
  id: string | number,
  layout: 'text-only' | 'image-left' | 'image-right' | 'image-full' | 'two-images' | 'three-images',
  text: text,
  
  // Layout configuration (same as v1)
  media_width: '25' | '33' | '40' | '50' | '60' | '66' | '75',
  media_align: 'left' | 'center' | 'right',
  max_width: 'content' | 'wide' | 'full',
  spacing_top: 'none' | 'sm' | 'md' | 'lg',
  spacing_bottom: 'none' | 'sm' | 'md' | 'lg',
  background: 'default' | 'light' | 'dark',
  
  // Images
  image_primary: { id: string },
  image_secondary: { id: string },
  image_third: { id: string },
  
  // Captions & Alt Text (same as v1)
  caption: string | null,
  alt: string | null,
  caption_primary: string | null,
  caption_secondary: string | null,
  caption_third: string | null,
  alt_primary: string | null,
  alt_secondary: string | null,
  alt_third: string | null,
  
  // 🆕 ENHANCED STYLING (v3 only)
  image_fit: 'natural' | 'cover' | 'contain',
  image_height: number | null,      // Pixels
  gutter: number | null,            // Grid gap in pixels
  corner_radius: number | null,     // Border radius in pixels
  image_shadow: boolean,
  block_shadow: boolean,
  caption_align: 'left' | 'center' | 'right',
  caption_position: 'above' | 'below' | 'overlay',
  caption_bg: 'none' | 'light' | 'dark'
}
```

**Backend Query** (via M2A expansion):
```
blocks.item:block_content_section_v3.id,
blocks.item:block_content_section_v3.layout,
blocks.item:block_content_section_v3.text,
blocks.item:block_content_section_v3.media_width,
blocks.item:block_content_section_v3.media_align,
blocks.item:block_content_section_v3.max_width,
blocks.item:block_content_section_v3.spacing_top,
blocks.item:block_content_section_v3.spacing_bottom,
blocks.item:block_content_section_v3.background,
blocks.item:block_content_section_v3.caption,
blocks.item:block_content_section_v3.alt,
blocks.item:block_content_section_v3.image_fit,
blocks.item:block_content_section_v3.image_height,
blocks.item:block_content_section_v3.gutter,
blocks.item:block_content_section_v3.corner_radius,
blocks.item:block_content_section_v3.image_shadow,
blocks.item:block_content_section_v3.block_shadow,
blocks.item:block_content_section_v3.caption_align,
blocks.item:block_content_section_v3.caption_position,
blocks.item:block_content_section_v3.caption_bg,
blocks.item:block_content_section_v3.caption_primary,
blocks.item:block_content_section_v3.caption_secondary,
blocks.item:block_content_section_v3.caption_third,
blocks.item:block_content_section_v3.alt_primary,
blocks.item:block_content_section_v3.alt_secondary,
blocks.item:block_content_section_v3.alt_third,
blocks.item:block_content_section_v3.image_primary.id,
blocks.item:block_content_section_v3.image_secondary.id,
blocks.item:block_content_section_v3.image_third.id
```

#### **Required Schema**:
```sql
CREATE TABLE block_content_section_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout TEXT NOT NULL,
  text TEXT,
  media_width TEXT,
  media_align TEXT,
  max_width TEXT,
  spacing_top TEXT,
  spacing_bottom TEXT,
  background TEXT,
  image_primary UUID REFERENCES directus_files(id),
  image_secondary UUID REFERENCES directus_files(id),
  image_third UUID REFERENCES directus_files(id),
  caption TEXT,
  alt TEXT,
  caption_primary TEXT,
  caption_secondary TEXT,
  caption_third TEXT,
  alt_primary TEXT,
  alt_secondary TEXT,
  alt_third TEXT,
  -- v3 enhancements
  image_fit TEXT CHECK (image_fit IN ('natural', 'cover', 'contain')),
  image_height INTEGER,
  gutter INTEGER,
  corner_radius INTEGER,
  image_shadow BOOLEAN DEFAULT FALSE,
  block_shadow BOOLEAN DEFAULT FALSE,
  caption_align TEXT CHECK (caption_align IN ('left', 'center', 'right')),
  caption_position TEXT CHECK (caption_position IN ('above', 'below', 'overlay')),
  caption_bg TEXT CHECK (caption_bg IN ('none', 'light', 'dark'))
);
```

---

### 8️⃣ **directus_files Collection** (System)

**API Endpoint**: `/assets/{id}` (NOT `/items/directus_files`)

**Critical**: Only query file IDs, never nested metadata!

#### **Why Only IDs?**
- Querying nested file metadata (filename, type, etc.) causes **403 Forbidden** errors
- Images are publicly accessible via `/assets/{id}` endpoint
- Backend builds URLs: `https://cms-blog.memopyk.org/assets/{id}`

#### **Image URL Format**:
```typescript
// Base URL
https://cms-blog.memopyk.org/assets/{file_id}

// With transformations
https://cms-blog.memopyk.org/assets/{file_id}?width=800&quality=82&format=webp&fit=inside
```

#### **Supported Transformations**:
- `width` - Max width in pixels
- `quality` - JPEG quality (1-100)
- `format` - `webp`, `jpg`, `png`
- `fit` - `inside`, `cover`, `contain`

---

### 9️⃣ **authors Collection** (Optional)

**API Endpoint**: `/items/authors`

#### **Fields Queried**:
```typescript
{
  id: string | number,
  first_name: string,
  last_name: string,
  email: string
}
```

**Backend Query**:
```
author.id,
author.first_name,
author.last_name,
author.email
```

#### **Required Schema**:
```sql
CREATE TABLE authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  bio TEXT,
  avatar UUID REFERENCES directus_files(id)
);
```

---

## 🔐 PERMISSIONS & ROLES

### Admin Role
- **Full access** to all collections
- Can create, read, update, delete all items
- Can manage files and users

### Blog Reader Role (Public API Access)
**Critical for frontend functionality**

#### **Read Permissions Required**:
✅ `posts` - Read published posts only
- Filter: `status = 'published' AND published_at <= $NOW`

✅ `posts_blocks` - Read all (needed for M2A expansion)

✅ `block_heading` - Read all

✅ `block_richtext` - Read all

✅ `block_gallery` - Read all

✅ `block_gallery_files` - Read all (if using nested gallery)

✅ `block_content_section` - Read all

✅ `block_content_section_v3` - Read all

✅ `authors` - Read all (if using authors)

⚠️ `directus_files` - **ID ONLY** (no metadata)
- Reason: Prevents 403 errors
- Solution: Backend fetches only IDs, builds `/assets/{id}` URLs

#### **Public Access**:
- `/assets/*` - Must be publicly accessible without authentication
- `/auth/login` - Must accept email/password authentication

---

## 🔄 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│              GET /api/blog/posts?language=en-US         │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Backend Express API         │
        │ server/routes.ts line 9077  │
        └──────────┬──────────────────┘
                   │
                   ├─► POST /auth/login (get token)
                   │
                   └─► GET /items/posts?filter[language][_eq]=en-US
                                       &filter[status][_eq]=published
                                       &filter[published_at][_lte]=NOW
                                       &sort=-published_at
                                       &limit=24
                        │
                        ▼
              ┌──────────────────┐
              │  Directus CMS    │
              │  cms-blog.memopyk│
              └────────┬─────────┘
                       │
                       └─► Query Supabase PostgreSQL
                            │
                            └─► Return posts array
                                 │
                                 ▼
                       Backend transforms:
                       - published_at → publish_date
                       - image.id → featured_image_url
                       - Validates language matches
                                 │
                                 ▼
                       Frontend receives:
                       [
                         {
                           id: "uuid",
                           title: "My Post",
                           slug: "my-post",
                           language: "en-US",
                           publish_date: "2025-10-25T12:00:00Z",
                           featured_image_url: "https://cms-blog.memopyk.org/assets/file-uuid"
                         }
                       ]
```

---

## 🧪 TESTING YOUR SCHEMA

### 1. Test Authentication
```bash
curl -X POST https://cms-blog.memopyk.org/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD"
  }'

# Expected response:
{
  "data": {
    "access_token": "eyJhbGc...",
    "expires": 900000,
    "refresh_token": "abc123..."
  }
}
```

### 2. Test Post Listing
```bash
TOKEN="YOUR_ACCESS_TOKEN"

curl "https://cms-blog.memopyk.org/items/posts?filter[language][_eq]=en-US&filter[status][_eq]=published&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
{
  "data": [
    {
      "id": "uuid",
      "title": "Test Post",
      "slug": "test-post",
      "language": "en-US",
      "status": "published",
      "published_at": "2025-10-25T12:00:00Z"
    }
  ]
}
```

### 3. Test Single Post with Blocks
```bash
curl "https://cms-blog.memopyk.org/items/posts?filter[slug][_eq]=test-post&filter[language][_eq]=en-US&fields=id,title,blocks.collection,blocks.item:block_heading.*" \
  -H "Authorization: Bearer $TOKEN"

# Expected response:
{
  "data": [
    {
      "id": "uuid",
      "title": "Test Post",
      "blocks": [
        {
          "collection": "block_heading",
          "item": {
            "id": "uuid",
            "text": "Introduction",
            "level": 2
          }
        }
      ]
    }
  ]
}
```

### 4. Test Image Assets
```bash
# Get post with image
curl "https://cms-blog.memopyk.org/items/posts?filter[slug][_eq]=test-post&fields=image.id" \
  -H "Authorization: Bearer $TOKEN"

# Response:
{
  "data": [{
    "image": { "id": "abc123-uuid" }
  }]
}

# Test image URL (should work WITHOUT authentication)
curl -I "https://cms-blog.memopyk.org/assets/abc123-uuid?width=800&format=webp"

# Expected: HTTP 200 with image
```

---

## ⚠️ COMMON ISSUES & SOLUTIONS

### Issue: 403 Forbidden on Images
**Cause**: Querying `directus_files` metadata instead of just IDs
**Solution**: Always use `image.id` not `image.*`

### Issue: Empty Blocks Array
**Cause**: M2A relationships not configured in Directus
**Solution**: Set up `posts_blocks` as M2A junction with proper collection/item fields

### Issue: Language Filter Not Working
**Cause**: Language stored as `en` instead of `en-US`
**Solution**: Use exact values `en-US` and `fr-FR` with strict equality filters

### Issue: Posts Not Appearing
**Checklist**:
- ✅ `status = 'published'`
- ✅ `published_at <= NOW()`
- ✅ `language` matches filter exactly
- ✅ Blog Reader role has read permission

---

## 📝 MIGRATION CHECKLIST

When setting up new Directus instance:

### Schema Setup
- [ ] Create all 9 collections (posts, posts_blocks, block_*, authors)
- [ ] Set correct field types and constraints
- [ ] Configure M2A relationships for `posts_blocks`
- [ ] Set up M2O relationships for images
- [ ] Add indexes on language, status, published_at, slug

### Data Migration
- [ ] Export data from Supabase if needed
- [ ] Import posts with correct UUIDs
- [ ] Import block data
- [ ] Verify M2A relationships maintained
- [ ] Upload files to Directus Storage → Supabase

### Permissions
- [ ] Create "Blog Reader" role
- [ ] Set read-only permissions for published posts
- [ ] Enable public `/assets/*` access
- [ ] Test authentication with admin user

### Testing
- [ ] Test auth endpoint
- [ ] Test post listing by language
- [ ] Test single post with blocks
- [ ] Test image URLs
- [ ] Test M2A block expansion
- [ ] Verify fallback hydration works

### Frontend Integration
- [ ] Update Directus URL if changed (6 files)
- [ ] Update Replit Secrets with credentials
- [ ] Restart backend server
- [ ] Test blog pages load
- [ ] Verify images display
- [ ] Check browser console for errors

---

## 🎯 SUCCESS CRITERIA

Your schema is correct when:

1. ✅ `GET /api/blog/posts?language=en-US` returns posts
2. ✅ `GET /api/blog/posts/:slug?language=en-US` returns post with blocks
3. ✅ Images load via `/assets/{id}` URLs
4. ✅ No 403 errors on file access
5. ✅ M2A blocks expand correctly
6. ✅ Language filtering works exactly
7. ✅ Per-image captions and alt text render
8. ✅ Both v1 and v3 content sections work

---

**Document Version**: 1.0  
**Maintained By**: MEMOPYK Development Team  
**Last Updated**: October 25, 2025
