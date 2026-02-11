---
paths:
  - client/src/**
  - client/public/**
  - vite.config.ts
  - tailwind.config.ts
  - index.html
---

# Frontend Rules

## Tech Stack — Don't Deviate
- React 18 + TypeScript + Vite (NOT Next.js)
- Tailwind CSS + shadcn/ui (Radix primitives)
- npm (NOT yarn, NOT pnpm)

## Bilingual (FR/EN)
- ALL user-facing text must support French and English
- French is the primary language, English is secondary
- Check existing i18n patterns before adding new strings

## Performance
- Use React.lazy + Suspense for code splitting (already in place)
- Lazy load images below the fold
- Keep bundle size in check — run `npm run build` and check output sizes

## SEO
- Every public page needs proper meta tags (title, description, OG)
- SEO settings are per-page and multilingual — see server/routes/seo.routes.ts
- Structured data (JSON-LD) for service pages

## UI Consistency
- Use shadcn/ui components — don't create custom components for things shadcn already provides
- Follow existing patterns in client/src/components/
- Admin panel uses a sidebar layout — maintain consistency across sections
- Think like a user, not a developer — avoid jargon in labels

## Testing
- Browser testing: Playwright (NOT Puppeteer, NOT Selenium)
- Test config: playwright.config.ts (viewport 2560x1440, staging URL)
- Auth helper: tests/e2e/helpers/auth.ts
- Run tests against staging: `npx playwright test`
