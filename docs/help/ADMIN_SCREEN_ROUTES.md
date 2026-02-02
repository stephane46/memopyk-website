# Admin Screen Routes

Reference for help system content. Each route maps to a `help_screens` entry.

**Last updated:** February 2, 2026

---

## Blog System

| Screen | Route | Description |
|--------|-------|-------------|
| Blog Posts List | `/admin?tab=posts` | List all blog posts, filter by status/language |
| Blog Editor | `/admin?tab=blog-edit` | Create/edit blog post (new post) |
| Blog Editor (existing) | `/admin?tab=blog-edit&id={uuid}` | Edit existing post |
| AI Creator | `/admin?tab=ai-creator` | Generate blog posts with AI |
| Tag Management | `/admin?tab=tags` | Create/edit/delete blog tags |

## Content Production

| Screen | Route | Description |
|--------|-------|-------------|
| Topics | `/admin?tab=content-topics` | Manage 102 pre-researched topics |
| Calendar | `/admin?tab=content-calendar` | Weekly content planning |
| Image Bank | `/admin?tab=image-bank` | Centralized image library |

## Site Content

| Screen | Route | Description |
|--------|-------|-------------|
| Hero Videos | `/admin?tab=hero` | Manage homepage hero videos |
| Gallery | `/admin?tab=gallery` | Manage video gallery items |
| FAQ | `/admin?tab=faq` | Manage FAQ sections and items |
| Partners | `/admin?tab=partners` | Manage partner directory |

## Settings & Tools

| Screen | Route | Description |
|--------|-------|-------------|
| SEO | `/admin?tab=seo` | SEO settings per page |
| Analytics | `/admin?tab=analytics` | View site analytics |
| Travel Upload | `/admin?tab=travel-upload` | Travel agency upload portal |

---

## Route Matching Rules

1. **Exact match first**: `/admin?tab=posts` matches before `/admin`
2. **Base route fallback**: If no exact match, show help for `/admin`
3. **ID parameters ignored**: `/admin?tab=blog-edit&id=123` matches `/admin?tab=blog-edit`

---

## Adding New Screens

When adding a new admin screen:
1. Add route to this document
2. Insert `help_screens` entry via Supabase MCP
3. Update related flows if needed
