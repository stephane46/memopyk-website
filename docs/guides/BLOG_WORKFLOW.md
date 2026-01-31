# Blog Workflow Guide

**Location:** Admin Panel → Blog  
**URL:** `/admin/blog`

---

## Overview

The MEMOPYK blog supports bilingual content (English/French). Each post requires both language versions. Posts can be saved as drafts or published immediately.

---

## Creating a New Post

### Step 1: Access Blog Management

1. Login to admin panel (`/admin`)
2. Click "Blog" in sidebar
3. Click "New Post" button

### Step 2: Fill Basic Information

| Field | Required | Description |
|-------|----------|-------------|
| Title (EN) | Yes | English title (appears in URL slug) |
| Title (FR) | Yes | French title |
| Slug (EN) | Auto | URL path (auto-generated from title) |
| Slug (FR) | Auto | French URL path |
| Excerpt (EN) | Yes | Short summary for listings (150-200 chars) |
| Excerpt (FR) | Yes | French summary |
| Author Name | Yes | Display name |
| Author Avatar | No | Avatar image URL |

### Step 3: Write Content

The editor supports rich text formatting:

- **Bold**, *italic*, ~~strikethrough~~
- Headings (H2, H3, H4)
- Bullet and numbered lists
- Links
- Images (see below)
- Code blocks
- Block quotes

**Tip:** Write content in one language first, then translate.

### Step 4: Add Featured Image

1. Click "Featured Image" section
2. Either:
   - Upload new image (drag & drop or click)
   - Enter existing image URL
3. Preview appears in card

**Recommended size:** 1200x630px (OG image standard)

### Step 5: Add Tags

1. Click "Tags" section
2. Select existing tags or create new
3. Multiple tags allowed

**Best practices:**
- Use 2-5 tags per post
- Keep tags broad (e.g., "memories", "photography")
- Create FR/EN versions of tags

### Step 6: Set SEO Metadata

| Field | Purpose |
|-------|---------|
| Meta Title | Browser tab title (50-60 chars) |
| Meta Description | Search result snippet (150-160 chars) |

**Tips:**
- Include target keyword in title
- Write compelling description (call to action)
- Preview in search result simulator

### Step 7: Save or Publish

- **Save as Draft:** Post not visible on site
- **Publish:** Post goes live immediately
- **Schedule:** Set future publish date (if implemented)

---

## Editing Existing Posts

1. Go to Blog → Posts list
2. Click post title or "Edit" button
3. Make changes
4. Click "Save" or "Update"

**Note:** Changing the slug after publishing may break existing links. Create a redirect if needed.

---

## Managing Tags

### Create New Tag

1. Go to Blog → Tags
2. Click "New Tag"
3. Enter English and French names
4. Enter slugs (URL-friendly)
5. Save

### Edit Tag

1. Click tag name in list
2. Update fields
3. Save

### Delete Tag

1. Click delete icon
2. Confirm deletion
3. Posts with this tag will lose the association

---

## Adding Images to Posts

### Method 1: Upload via Editor

1. Click image icon in editor toolbar
2. Select file from computer
3. Image uploads to `/api/admin/blog/images`
4. Inserts into content

### Method 2: External URL

1. Click image icon
2. Select "From URL" tab
3. Paste image URL
4. Inserts as external image

### Method 3: Supabase Storage

1. Upload image to Supabase Storage (memopyk-images bucket)
2. Copy public URL
3. Insert via URL method

**Image Guidelines:**
- Format: JPEG, PNG, WebP
- Max size: 5MB
- Recommended width: 800-1200px
- Use descriptive filenames

---

## Content Guidelines

### Writing Style

- **Tone:** Warm, personal, professional
- **Voice:** Second person ("you") when addressing reader
- **Length:** 800-2000 words for SEO
- **Structure:** Clear headings, short paragraphs

### Bilingual Content

- Write original in your stronger language
- Translate fully (don't summarize)
- Adapt cultural references
- Keep URLs/technical terms consistent

### SEO Best Practices

1. **Keyword research:** Target 1-2 keywords per post
2. **Title:** Include keyword near beginning
3. **URL slug:** Short, keyword-rich
4. **First paragraph:** Include keyword naturally
5. **Headings:** Use H2/H3 with related terms
6. **Images:** Add alt text with keywords
7. **Internal links:** Link to other MEMOPYK pages
8. **External links:** Link to authoritative sources

---

## Publishing Checklist

Before publishing, verify:

- [ ] Title is compelling and includes keyword
- [ ] Both EN and FR versions complete
- [ ] Excerpt summarizes the post well
- [ ] Featured image uploaded and looks good
- [ ] Content proofread for errors
- [ ] Links tested and working
- [ ] Images have alt text
- [ ] Tags selected (2-5)
- [ ] Meta title/description set
- [ ] Preview looks correct on mobile

---

## Post Status

| Status | Visibility | Use Case |
|--------|------------|----------|
| Draft | Admin only | Work in progress |
| Published | Public | Live posts |
| Scheduled | Admin only | Future publishing |

---

## Troubleshooting

### Images Not Uploading

**Causes:**
- File too large (>5MB)
- Invalid format
- Storage quota exceeded

**Solutions:**
- Compress image
- Convert to JPEG/PNG/WebP
- Delete old unused images

### Post Not Appearing

**Causes:**
- Status is "Draft"
- Publish date in future
- Build cache stale

**Solutions:**
- Check status is "Published"
- Verify publish date
- Clear cache / redeploy

### Slug Conflict

**Causes:**
- Two posts with same slug

**Solutions:**
- Change one slug to be unique
- Add date or number suffix

---

## Content Calendar Integration

If using content planning tables (`content_topics`, `content_weekly_plans`):

1. Create topic in Content Planner
2. Assign to date in weekly plan
3. Create post from topic
4. Topic status updates automatically

See database schema for content planning tables.

---

## Related Documentation

- [API.md](../architecture/API.md) — Blog API endpoints
- [DATABASE.md](../architecture/DATABASE.md) — Blog tables schema

---

*Quality content is key to SEO success. Take time to create valuable posts that help your audience.*
