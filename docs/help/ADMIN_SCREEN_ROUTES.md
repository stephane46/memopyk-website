# Admin Screen Routes

Reference for help system content. Each route maps to a `help_screens` entry in Supabase.

**Last updated:** February 14, 2026
**Total screens:** 30
**Total flows:** 2

---

## Blog System (7 screens)

| Screen | Route | Help Title |
|--------|-------|------------|
| Blog Hub | `/admin?tab=blog` | Blog Hub |
| Keywords | `/admin?tab=keywords` | Keywords |
| Planned Posts | `/admin?tab=topics` | Planned Posts |
| Planner | `/admin?tab=planner` | Planner |
| Posts | `/admin?tab=posts` | Posts |
| Image Bank | `/admin?tab=images` | Image Bank |
| Blog Editor | `/admin?tab=blog-edit` | Blog Editor |

**Note:** Blog Editor is a secondary screen — reached by clicking a post title or edit icon from Posts tab. Route accepts `&id={uuid}` for editing existing posts.

## AI Tools (2 screens)

| Screen | Route | Help Title |
|--------|-------|------------|
| AI Context (Brand Brain) | `/admin?tab=ai-context` | AI Context (Brand Brain) |
| AI Creator | `/admin?tab=ai-creator` | AI Creator |

## Analytics (11 screens)

| Screen | Route | Help Title |
|--------|-------|------------|
| Analytics Dashboard | `/admin?tab=analytics-new` | Analytics Dashboard |
| Overview | `/admin?tab=analytics-new&an_tab=overview` | Analytics — Overview |
| Live View | `/admin?tab=analytics-new&an_tab=live` | Analytics — Live |
| Trends | `/admin?tab=analytics-new&an_tab=trends` | Analytics — Trends |
| Video | `/admin?tab=analytics-new&an_tab=video` | Analytics — Video |
| Geography | `/admin?tab=analytics-new&an_tab=geo` | Analytics - Geographic Market Analysis |
| CTA | `/admin?tab=analytics-new&an_tab=cta` | Analytics — CTA |
| Blog Analytics | `/admin?tab=analytics-new&an_tab=blog` | Analytics — Blog |
| Clarity | `/admin?tab=analytics-new&an_tab=clarity` | Analytics — Clarity |
| Diagnostics | `/admin?tab=analytics-new&an_tab=fallback` | Analytics — Diagnostics |
| Exclusions | `/admin?tab=analytics-new&an_tab=exclusions` | Analytics — Exclusions |

## Site Content (5 screens)

| Screen | Route | Help Title |
|--------|-------|------------|
| Hero Videos | `/admin?tab=hero-management` | Hero Videos |
| Video Gallery | `/admin?tab=gallery` | Video Gallery |
| FAQ Management | `/admin?tab=faq` | FAQ Management |
| Why MEMOPYK Cards | `/admin?tab=why-memopyk` | Why MEMOPYK Cards |
| CTA Buttons | `/admin?tab=cta` | CTA Buttons |

## Partners & Travel (2 screens)

| Screen | Route | Help Title |
|--------|-------|------------|
| Partners Directory | `/admin?tab=partners` | Partners Directory |
| Travel Agencies | `/admin?tab=travel-agencies` | Travel Agencies |

**Note:** Travel Agencies has two tabs (Uploads and Agency Codes) managed within a single help screen.

## Settings (3 screens)

| Screen | Route | Help Title |
|--------|-------|------------|
| SEO Management | `/admin?tab=seo` | SEO Management |
| Legal Documents | `/admin?tab=legal-docs` | Legal Documents |
| Cache Management | `/admin?tab=cache` | Cache Management |

---

## Help Flows (2 flows)

| Flow | Steps | Description |
|------|-------|-------------|
| Create a blog post | 7 | Step-by-step guide to create a blog post, manually or with AI assistance |
| Translate a post | 8 | Translate a post to another language using AI or manual tools |

---

## Route Matching Rules

1. **Exact match first**: `/admin?tab=analytics-new&an_tab=overview` matches before `/admin?tab=analytics-new`
2. **Base route fallback**: If no exact match, show help for the parent route
3. **ID parameters ignored**: `/admin?tab=blog-edit&id=abc123` matches `/admin?tab=blog-edit`

---

## Adding New Screens

When adding a new admin screen:
1. Add route to this document
2. Insert `help_screens` entry via psql:
   ```sql
   INSERT INTO help_screens (route, title, html_content)
   VALUES ('/admin?tab=new-screen', 'Screen Title', '<h3>Screen Title</h3><p>...</p>');
   ```
3. Update related flows if the new screen is part of a workflow
4. Run naive user test to verify help content quality (see docs/help/NAIVE_USER_TEST_PROCEDURE.md)

## Help Content Guidelines

- Use CSS badge classes: `.help-btn` (orange buttons), `.help-tab` (blue tabs), `.help-label` (gray field labels), `.help-status` (green status indicators)
- Minimum 500 chars, target 800-2000 chars per screen
- Describe actual visible controls, not concepts
- No jargon (no Supabase, API, CDN, JSON, schema, endpoint, middleware, ORM)
- See prompt templates at `C:\Users\ngocn\OneDrive\1 Personal\CLAUDE\HELP_CONTENT_WRITING_PROMPT_TEMPLATE.md` for full guidelines
