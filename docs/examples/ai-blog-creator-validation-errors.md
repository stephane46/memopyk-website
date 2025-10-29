# AI Blog Creator - Validation Error Examples

This document shows typical validation errors and how to fix them.

---

## Error 1: Invalid Language Code

### ❌ Input
```json
{
  "title": "My Blog Post",
  "slug": "my-blog-post",
  "language": "en",
  "status": "draft",
  "description": "A great post",
  "blocks": [...]
}
```

### 🔴 Error
```
Invalid language: en. Must be "en-US" or "fr-FR"
```

### ✅ Fix
```json
{
  "language": "en-US"  // Changed from "en" to "en-US"
}
```

---

## Error 2: Invalid Status

### ❌ Input
```json
{
  "title": "My Blog Post",
  "slug": "my-blog-post",
  "language": "en-US",
  "status": "pending",
  "description": "A great post",
  "blocks": [...]
}
```

### 🔴 Error
```
Invalid status: pending. Must be "draft" or "published"
```

### ✅ Fix
```json
{
  "status": "draft"  // Changed from "pending" to "draft"
}
```

---

## Error 3: Invalid Slug Format

### ❌ Input
```json
{
  "title": "My Blog Post",
  "slug": "My Blog Post With Spaces",
  "language": "en-US",
  "status": "draft",
  "description": "A great post",
  "blocks": [...]
}
```

### 🔴 Error (future validation - not currently enforced)
```
Slug must be lowercase kebab-case (e.g., my-blog-post)
```

### ✅ Fix
```json
{
  "slug": "my-blog-post-with-spaces"  // Lowercase, hyphens instead of spaces
}
```

---

## Error 4: Missing Required Field

### ❌ Input
```json
{
  "title": "My Blog Post",
  "slug": "my-blog-post",
  "language": "en-US",
  "status": "draft",
  "blocks": [...]
}
```

### 🔴 Error
```
Missing required field: description
```

### ✅ Fix
```json
{
  "title": "My Blog Post",
  "slug": "my-blog-post",
  "language": "en-US",
  "status": "draft",
  "description": "A compelling description of my blog post",  // Added
  "blocks": [...]
}
```

---

## Error 5: Empty Blocks Array

### ❌ Input
```json
{
  "title": "My Blog Post",
  "slug": "my-blog-post",
  "language": "en-US",
  "status": "draft",
  "description": "A great post",
  "blocks": []
}
```

### 🔴 Error
```
Blocks must be an array (with at least one block)
```

### ✅ Fix
```json
{
  "blocks": [
    {
      "type": "block_richtext",
      "text": "## Introduction\n\nThis is my blog post content."
    }
  ]
}
```

---

## Error 6: Invalid Block Type

### ❌ Input
```json
{
  "title": "My Blog Post",
  "slug": "my-blog-post",
  "language": "en-US",
  "status": "draft",
  "description": "A great post",
  "blocks": [
    {
      "type": "custom_heading",
      "content": "My heading"
    }
  ]
}
```

### 🔴 Error
```
Block 1 has invalid type: custom_heading
```

### ✅ Fix
```json
{
  "blocks": [
    {
      "type": "block_richtext",  // Use valid block type
      "text": "## My Heading"
    }
  ]
}
```

**Valid block types:**
- `block_richtext`
- `block_content_section_v3`
- `block_gallery`

**Also accepted (auto-converted):**
- `richtext` → `block_richtext`
- `content_section_v3` → `block_content_section_v3`
- `gallery` → `block_gallery`

---

## Error 7: Invalid JSON Format

### ❌ Input
```json
{
  "title": "My Blog Post",
  "slug": "my-blog-post",
  "language": "en-US",
  "status": "draft",
  "description": "A great post",
  "blocks": [
    {
      "type": "block_richtext",
      "text": "Content here"
    }
  ]  // Missing closing brace
```

### 🔴 Error
```
Invalid JSON format
```

### ✅ Fix
Ensure JSON is valid:
- All opening braces `{` have closing braces `}`
- All opening brackets `[` have closing brackets `]`
- All strings are properly quoted
- No trailing commas
- Use a JSON validator tool

---

## Error 8: Meta Description Too Long (Future Validation)

### ❌ Input
```json
{
  "title": "My Blog Post",
  "slug": "my-blog-post",
  "language": "en-US",
  "status": "draft",
  "description": "A great post",
  "meta_description": "This is a very long meta description that exceeds the recommended 160 character limit for search engine optimization and will be truncated in search results which is bad for SEO and user experience",
  "blocks": [...]
}
```

### 🔴 Error (not currently enforced)
```
Meta description must be ≤160 characters
```

### ✅ Fix
```json
{
  "meta_description": "A concise, compelling description under 160 characters that summarizes the post for search engines."
}
```

---

## Error 9: Duplicate Slug (Backend Error)

### ❌ Input
```json
{
  "title": "New Post",
  "slug": "existing-slug-already-used",  // Slug already exists in Directus
  "language": "en-US",
  "status": "draft",
  "description": "A great post",
  "blocks": [...]
}
```

### 🔴 Error (from backend)
```
Failed to create blog post
Value for field 'slug' in collection 'posts' has to be unique.
```

### ✅ Fix
```json
{
  "slug": "new-unique-slug-2025"  // Use a different, unique slug
}
```

**Tip:** Add date or version number to make slugs unique:
- `my-post-2025`
- `my-post-v2`
- `my-post-january`

---

## Error 10: Block Missing Required Field

### ❌ Input
```json
{
  "blocks": [
    {
      "type": "block_content_section_v3"
      // Missing "text" field
    }
  ]
}
```

### 🔴 Error (from backend, not client-side)
```
Failed to create block_content_section_v3: 400
```

### ✅ Fix
```json
{
  "blocks": [
    {
      "type": "block_content_section_v3",
      "layout": "text-only",
      "text": "## Section Content\n\nThis is the actual content."  // Added
    }
  ]
}
```

**Required fields by block type:**

**block_richtext:**
- `text` (string) - Markdown content

**block_content_section_v3:**
- `layout` (string) - Layout type
- `text` (string) - Markdown content

**block_gallery:**
- None (title and intro are optional)

---

## Complete Valid Example

```json
{
  "title": "How to Create Amazing Memory Films",
  "slug": "how-to-create-amazing-memory-films",
  "language": "en-US",
  "status": "draft",
  "published_at": null,
  "description": "Learn the essential steps to transform your family photos into professional memory films that preserve your precious moments forever.",
  "author_name": "MEMOPYK Team",
  "image_featured": null,
  "meta_title": "Create Amazing Memory Films | MEMOPYK Guide",
  "meta_description": "Step-by-step guide to creating professional memory films from family photos. Expert tips for preserving your precious moments.",
  "blocks": [
    {
      "type": "block_richtext",
      "text": "## Introduction\n\nMemory films are powerful tools for preserving family history."
    },
    {
      "type": "block_content_section_v3",
      "layout": "text-only",
      "text": "### Getting Started\n\nFollow these simple steps to begin your memory film journey.",
      "max_width": "content",
      "spacing_top": "md",
      "spacing_bottom": "md",
      "background": "default"
    }
  ],
  "internal_links": [],
  "assets_manifest": []
}
```

This example passes all current validations and will successfully create a blog post.
