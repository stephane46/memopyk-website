# AI Blog Creator - Quick Start Guide

**For:** IT Colleagues & Developers  
**Purpose:** Understand the AI Blog Creator feature in 5 minutes  
**Full Documentation:** See `AI_BLOG_CREATOR_DOCUMENTATION.md` for complete technical details

---

## What Is It?

The **AI Blog Creator** is a streamlined admin tool that accelerates blog content production for our Directus CMS. It bridges the gap between AI-generated content and our CMS data structure.

**User Workflow:**
1. Configure topic, language, SEO keywords
2. Generate & copy an AI-ready prompt
3. Paste AI's JSON response into validator
4. Create post directly in Directus

**No external AI services** - users bring their own AI assistant (Claude, ChatGPT, etc.)

---

## Key Files

```
client/src/admin/BlogAICreator.tsx     # Frontend UI (500 lines)
server/routes.ts (lines 9405-9689)     # Backend API handler (285 lines)
docs/examples/                         # Sample payloads & validation errors
```

---

## How It Works (30-Second Version)

1. **User configures** post parameters in React form
2. **System generates** detailed prompt with Directus schema specs
3. **User copies** prompt → gives to AI → gets JSON response
4. **Client validates** JSON (required fields, enums, block types)
5. **Backend creates** post in Directus via REST API:
   - POST `/items/posts` - Create post record
   - POST `/items/block_*` - Create content blocks
   - POST `/items/posts_blocks` - Link blocks to post

**Result:** Fully structured blog post in Directus, ready for editor review.

---

## What's Good

✅ **Fast content creation** - 5 minutes vs. 30+ minutes manual entry  
✅ **Schema compliance** - AI follows exact Directus data model  
✅ **Validation** - Client-side checks prevent bad data  
✅ **Flexible blocks** - Supports 3 block types with 20+ layout options  
✅ **Bilingual** - English & French with SEO optimization  
✅ **Production-ready** - Currently live and working

---

## What's Missing (Known Gaps)

🔴 **Security:**
- No authentication (endpoint publicly accessible)
- No CSRF protection
- No rate limiting

🟡 **Reliability:**
- No idempotency (duplicate submissions create multiple posts)
- No transaction support (partial failures leave orphaned data)
- No rollback on error

🟡 **Features:**
- Tags not created (post_tags junction table ignored)
- No image upload automation (manual via Directus admin)
- No duplicate slug pre-check

🟢 **Nice-to-Have:**
- No SEO length validation (title, meta description)
- No slug format validation
- No metrics/analytics tracking

---

## Quick Wins (Low-Effort Improvements)

**Priority 1 - Security (Critical):**
1. Add admin authentication middleware (3 hours)
2. Add rate limiting (1 hour)
3. Add CSRF token validation (2 hours)

**Priority 2 - Reliability (High):**
4. Add rollback on failure (4 hours)
5. Add idempotency via request ID (3 hours)

**Priority 3 - UX (Medium):**
6. Add SEO field length validation (2 hours)
7. Add slug format validation (1 hour)
8. Add duplicate slug pre-check (2 hours)

---

## Testing Locally

**1. Start dev server:**
```bash
npm run dev
```

**2. Navigate to:**
```
http://localhost:5000/admin → "AI Blog Creator" tab
```

**3. Use sample payload:**
```bash
# Test successful creation
curl -X POST http://localhost:5000/api/admin/blog/create-from-ai \
  -H "Content-Type: application/json" \
  -d @docs/examples/ai-blog-creator-example-success.json

# Test validation failure
curl -X POST http://localhost:5000/api/admin/blog/create-from-ai \
  -H "Content-Type: application/json" \
  -d @docs/examples/ai-blog-creator-example-failure.json
```

---

## Environment Variables

```bash
# Required
DIRECTUS_TOKEN=your_static_bearer_token_here

# Legacy (optional, not used if DIRECTUS_TOKEN set)
DIRECTUS_EMAIL=your_email@example.com
DIRECTUS_PASSWORD=your_password
```

**Get token:** Log into Directus admin → User settings → Generate static token

---

## API Contract (Quick Reference)

### Request
```http
POST /api/admin/blog/create-from-ai
Content-Type: application/json

{
  "title": "string",
  "slug": "kebab-case-string",
  "language": "en-US" | "fr-FR",
  "status": "draft" | "published",
  "description": "string",
  "blocks": [
    {
      "type": "block_richtext" | "block_content_section_v3" | "block_gallery",
      ...block-specific fields...
    }
  ]
}
```

### Response (Success)
```json
{
  "success": true,
  "postId": "uuid",
  "title": "string",
  "slug": "string",
  "language": "en-US",
  "blocksCreated": 5,
  "directusUrl": "https://cms-blog.memopyk.org/admin/content/posts/uuid"
}
```

### Response (Error)
```json
{
  "error": "Failed to create blog post",
  "message": "Detailed error message here"
}
```

---

## Directus Permissions Required

Token needs these permissions:

| Collection | Create | Read | Update |
|-----------|--------|------|--------|
| posts | ✅ | ✅ | ❌ |
| block_richtext | ✅ | ❌ | ❌ |
| block_content_section_v3 | ✅ | ❌ | ✅* |
| block_gallery | ✅ | ❌ | ❌ |
| posts_blocks | ✅ | ❌ | ❌ |

*Update only needed for image patching (optional feature)

---

## Supported Block Types

**1. block_richtext** - Simple text with Markdown
```json
{
  "type": "block_richtext",
  "text": "## Heading\n\nBody with **bold** and *italic*."
}
```

**2. block_content_section_v3** - Rich layouts with images
```json
{
  "type": "block_content_section_v3",
  "layout": "two-images",
  "text": "### Section heading\n\nBody text...",
  "image_primary": null,
  "image_secondary": null,
  "media_width": "50",
  "background": "light"
}
```

**3. block_gallery** - Image galleries
```json
{
  "type": "block_gallery",
  "title": "Gallery Title",
  "intro": "Intro text...",
  "images": []
}
```

---

## Common Errors & Solutions

**Error:** `Missing required field: title`  
**Fix:** Ensure all required fields present: `title`, `slug`, `language`, `status`, `description`, `blocks`

**Error:** `Invalid language: en. Must be "en-US" or "fr-FR"`  
**Fix:** Use full locale codes: `en-US` or `fr-FR`

**Error:** `Block 1 has invalid type: custom_block`  
**Fix:** Use only supported types: `block_richtext`, `block_content_section_v3`, `block_gallery`

**Error:** `Failed to create post: 409`  
**Fix:** Slug already exists - change to unique value

**Error:** `Failed to create post: 401`  
**Fix:** Invalid/expired DIRECTUS_TOKEN - generate new token

---

## Example Prompt Template

The system generates prompts like this:

```
MASTER PROMPT (give this to your marketing AI)
You are creating a new blog post for a Directus CMS that powers memopyk.com.
Return **one JSON object only** (no prose) that conforms EXACTLY to the schema below.

### INPUTS
- topic: The Ultimate Guide to Digitizing Old Photos
- locale: en-US
- status: published
- publish_now: true
- seo_focus_keywords: photo digitization, memory preservation, scanning

### DIRECTUS DATA MODEL
[Complete schema with all field definitions]

### OUTPUT FORMAT
Return a single JSON object:
{
  "title": "...",
  "slug": "...",
  "language": "en-US",
  "status": "published",
  "blocks": [...]
}
```

**AI responds with valid JSON** → User pastes into UI → Post created

---

## Debugging

**Enable verbose logging:**
```typescript
// server/routes.ts line 9407
console.log('🤖 AI Blog Creator:', JSON.stringify(aiData, null, 2));
```

**Check Directus logs:**
- Production: https://cms-blog.memopyk.org/admin/insights/logs
- Development: Check Directus console output

**Test Directus API directly:**
```bash
curl -X GET https://cms-blog.memopyk.org/items/posts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Next Steps

1. **Review full documentation:** `AI_BLOG_CREATOR_DOCUMENTATION.md`
2. **Check example payloads:** `docs/examples/`
3. **Review validation errors:** `docs/examples/ai-blog-creator-validation-errors.md`
4. **Implement quick wins:** Start with authentication + rate limiting

---

## Questions?

**Architecture:** See full documentation Section 1 (End-to-End Flow)  
**Validation:** See full documentation Section 3  
**Security:** See full documentation Section 8  
**Known Issues:** See full documentation Section 11

**Contact:** Review the codebase files listed above or consult the project documentation.

---

**Last Updated:** January 29, 2025  
**Version:** 1.0  
**Status:** Production-Ready with Known Gaps
