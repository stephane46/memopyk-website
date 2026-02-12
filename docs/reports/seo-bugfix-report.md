# SEO Bugfix Report — February 12, 2026

## Bug 1: Admin SEO language switch shows stale data

**Symptom:** Switching between FR/EN in the admin SEO page showed the previous language's data in the form fields. The language button updated visually but form values didn't refresh.

**Root cause:** The loading spinner (`if (loading) { return <spinner> }`) at `SeoManagement.tsx:350` unmounted the entire `<form>` during the API call. When `loadSeoData()` called `form.reset(newData)` (react-hook-form), the form DOM elements were unmounted, so the reset values were lost. When loading finished and the form re-mounted, inputs registered with stale default values.

**Fix:** Changed `if (loading)` to `if (!seoData && loading)`. This shows the spinner only on initial load (no data yet). During language switches, the form stays mounted so `form.reset()` properly updates all input values.

**Files changed:**
- `client/src/components/admin/SeoManagement.tsx` — loading condition fix + removed 7 debug console.log statements (these caused 1.5M character output in Puppeteer MCP, unrelated to the form bug but cleaned up)

**Verified:** FR→EN and EN→FR switches both load correct data with form values matching the selected language.

---

## Bug 2: SEO meta tags missing from server-rendered HTML

**Symptom:** `curl https://memopyk.memopyk.com` returned only `<title>MEMOPYK - Memory Preservation Service</title>` (Vite's hardcoded default). No `<meta name="description">`, no `og:` tags, no Twitter cards in the initial HTML. Social media crawlers (Facebook, LinkedIn, Twitter) that don't execute JavaScript saw no OG tags.

**Root cause (two issues):**

1. **Server:** Express served `index.html` as-is via `res.sendFile()`, with no SEO tag injection. All meta tags relied on client-side `react-helmet-async` which only runs after JavaScript hydration.

2. **Client:** `SEO.tsx` had a bug where `apiRequest()` returns a `Response` object, but the queryFn cast it directly to `SeoData` without calling `.json()`. This meant client-side SEO always used hardcoded fallback defaults, never the actual DB values.

**Fix:**

### Server-side injection (`server/app.ts`):
- Read `index.html` once at startup into memory
- On each non-API, non-admin request:
  - Detect language from `Accept-Language` header (default: `fr-FR`)
  - Call `seoService.generateHeadPreview(lang)` to get meta tags from DB
  - Replace the static `<title>` with the dynamic one
  - Remove the static `<meta description>` to avoid duplication
  - Inject all SEO tags (description, keywords, robots, canonical, OG, Twitter, hreflang, JSON-LD) before `</head>`
  - Set `<html lang="fr">` or `<html lang="en">` based on detected language
- In-memory cache with 5-minute TTL per language (avoids DB hit on every page load)
- Graceful fallback: if SEO generation fails, serves plain `index.html`
- Admin routes (`/admin/*`) skip SEO injection (not crawled)

### Client-side fix (`client/src/components/SEO.tsx`):
- Changed `return response as unknown as SeoData` to `return await response.json() as SeoData`
- Client-side SEO now correctly parses the API response and uses actual DB values
- `react-helmet-async` still handles SPA navigation (client-side route changes update tags dynamically)

**Files changed:**
- `server/app.ts` — SEO injection in `setupStaticServing()`, language detection, caching
- `client/src/components/SEO.tsx` — fixed queryFn to parse JSON response

**Architecture:**
```
Initial page load (crawler or browser):
  Browser → Express → reads index.html + injects SEO from DB → sends HTML with meta tags

SPA navigation (after JS loads):
  React route change → SEO.tsx → fetches /api/seo-config → react-helmet-async updates <head>
```

Both paths now serve correct, language-aware SEO tags from the database.
