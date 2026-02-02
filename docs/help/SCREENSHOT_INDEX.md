# Help Screenshots Index

Quick reference for all admin help screenshots.

## Blog (`/admin?tab=blog`)

| File | Screen | Route | Last Updated |
|------|--------|-------|--------------|
| hub.png | Blog Hub (default) | `/admin?tab=blog` | 2026-02-02 |
| planner.png | Weekly Planner | `/admin?tab=planner` | 2026-02-02 |
| topics.png | Topics | `/admin?tab=topics` | 2026-02-02 |
| keywords.png | Keywords | `/admin?tab=keywords` | 2026-02-02 |
| posts.png | Posts | `/admin?tab=posts` | 2026-02-02 |
| images.png | Image Bank | `/admin?tab=images` | **TODO: retake** |

## Partners (`/admin?tab=...`)

| File | Screen | Route | Last Updated |
|------|--------|-------|--------------|
| travel-agencies.png | Agences de Voyage | `/admin?tab=travel-agencies` | TODO |
| partners.png | Annuaire Pro | `/admin?tab=partners` | TODO |

## Site Content (`/admin?tab=...`)

| File | Screen | Route | Last Updated |
|------|--------|-------|--------------|
| hero-management.png | Vidéos Hero | `/admin?tab=hero-management` | TODO |
| gallery.png | Galerie Vidéos | `/admin?tab=gallery` | TODO |
| faq.png | FAQ | `/admin?tab=faq` | TODO |
| why-memopyk.png | Pourquoi MEMOPYK | `/admin?tab=why-memopyk` | TODO |
| cta.png | Boutons CTA | `/admin?tab=cta` | TODO |
| legal-docs.png | Documents Légaux | `/admin?tab=legal-docs` | TODO |

## System (`/admin?tab=...`)

| File | Screen | Route | Last Updated |
|------|--------|-------|--------------|
| cache.png | Cache | `/admin?tab=cache` | TODO |
| tests.png | Tests | `/admin?tab=tests` | TODO |
| deployment.png | Déploiement | `/admin?tab=deployment` | TODO |

## Analytics

| File | Screen | Route | Last Updated |
|------|--------|-------|--------------|
| analytics.png | Analytics Dashboard | `/admin?tab=analytics-new` | TODO |

## SEO

| File | Screen | Route | Last Updated |
|------|--------|-------|--------------|
| seo.png | SEO Management | `/admin?tab=seo` | TODO |

---

## When to Update Screenshots

- **Button/label renamed** → retake screenshot
- **Layout changed** → retake screenshot
- **New feature added** → add new screenshot
- **Tab renamed** → retake + update route in table

## How to Capture

```bash
# Set password and run script
ADMIN_PASSWORD=xxx npx tsx scripts/screenshot-blog-screens.ts

# Or capture individual screen
npx playwright screenshot https://memopyk.memopyk.com/en-US/admin?tab=blog
```

## Screenshot Guidelines

- Viewport: 1400x900
- Wait for content to fully load (networkidle + 1-2s)
- Include sidebar to show navigation context
- Don't capture login page or cookie banner
