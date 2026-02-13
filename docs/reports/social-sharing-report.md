# Social Sharing OG Tags Verification Report

**Date:** February 13, 2026
**Tested by:** Claude Code
**Production URL:** https://www.memopyk.com

## Executive Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| OG tags present | ✅ PASS | All required OG tags exist |
| Twitter Card tags | ✅ PASS | All required Twitter tags exist |
| Image accessibility | ✅ PASS | Both FR and EN images load (HTTP 200) |
| Duplicate tags | ⚠️ WARNING | Duplicate OG tags found on all pages |
| EN locale tags | ❌ FAIL | EN pages show French content in server-side HTML |
| Blog post tags | ❌ FAIL | Blog post uses homepage tags instead of article-specific tags |
| og:url accuracy | ❌ FAIL | All pages show og:url="https://www.memopyk.com/fr-FR" |

**Overall:** FAIL - Critical issues found

## Test Results

### 1. French Homepage (https://www.memopyk.com)

#### Server-side HTML (what social crawlers see)
```html
<meta property="og:title" content="MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo" />
<meta property="og:description" content="Transformez vos photos et vidéos en films souvenirs professionnels. Service artisanal et humain pour les familles. Devis gratuit. À partir de 150 €." />
<meta property="og:image" content="https://supabase.memopyk.org/storage/v1/object/public/memopyk-media/seo/og-home-fr.jpg" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.memopyk.com/fr-FR" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo" />
<meta name="twitter:description" content="Transformez vos photos et vidéos en films souvenirs professionnels. Service artisanal et humain pour les familles. Devis gratuit. À partir de 150 €." />
<meta name="twitter:image" content="https://supabase.memopyk.org/storage/v1/object/public/memopyk-media/seo/og-home-fr.jpg" />
```

**Status:** ✅ PASS - Correct French content for FR homepage

#### Client-side (after React hydration)
The browser shows **duplicate OG tags** - both the server-rendered French tags AND client-rendered English tags:

**First set (from server):**
- og:title: "MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo"
- og:image: og-home-fr.jpg
- og:url: https://www.memopyk.com/fr-FR

**Second set (from React):**
- og:title: "MEMOPYK – Memory Films & Albums | Your Photos on Video"
- og:image: og-home-en.jpg (first instance), og-home-fr.jpg (second instance)
- og:url: https://www.memopyk.com/fr-FR (wrong - should be /en-US or root)

**Impact:** Social crawlers typically use the FIRST occurrence, so French tags should win. But duplicate tags violate OG protocol and may cause unpredictable behavior.

### 2. English Homepage (https://www.memopyk.com/en-US)

#### Server-side HTML (what social crawlers see)
```html
<meta property="og:title" content="MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo" />
<meta property="og:description" content="Transformez vos photos et vidéos en films souvenirs professionnels. Service artisanal et humain pour les familles. Devis gratuit. À partir de 150 €." />
<meta property="og:image" content="https://supabase.memopyk.org/storage/v1/object/public/memopyk-media/seo/og-home-fr.jpg" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.memopyk.com/fr-FR" />
```

**Status:** ❌ FAIL - Shows French tags instead of English

When users share the English site (/en-US), Facebook/Twitter/LinkedIn crawlers see FRENCH content. This is a critical bug.

#### Client-side (after React hydration)
Same duplicate tag issue as FR homepage - English tags are added by React but the server-rendered French tags remain.

### 3. Blog Post (https://www.memopyk.com/blog/puppy-photos-smartphone)

#### Server-side HTML (what social crawlers see)
```html
<meta property="og:title" content="MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo" />
<meta property="og:description" content="Transformez vos photos et vidéos en films souvenirs professionnels. Service artisanal et humain pour les familles. Devis gratuit. À partir de 150 €." />
<meta property="og:image" content="https://supabase.memopyk.org/storage/v1/object/public/memopyk-media/seo/og-home-fr.jpg" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://www.memopyk.com/fr-FR" />
```

**Status:** ❌ FAIL - Shows homepage tags instead of article-specific tags

Expected for blog posts:
- og:type should be "article"
- og:title should be the article title
- og:description should be the article excerpt/summary
- og:image should be the article's featured image
- og:url should be the article's canonical URL

### 4. Image Accessibility Test

Both OG images are publicly accessible:

```bash
curl -I https://supabase.memopyk.org/storage/v1/object/public/memopyk-media/seo/og-home-fr.jpg
# HTTP 200 OK

curl -I https://supabase.memopyk.org/storage/v1/object/public/memopyk-media/seo/og-home-en.jpg
# HTTP 200 OK
```

**Status:** ✅ PASS - Both images load successfully

### 5. Social Media Debug Tools

#### Facebook Sharing Debugger
Tool URL: https://developers.facebook.com/tools/debug/

**Status:** Cookie consent wall prevents automated testing. Manual testing recommended.

To manually test:
1. Go to https://developers.facebook.com/tools/debug/
2. Accept cookies
3. Enter https://www.memopyk.com
4. Click "Debug"
5. Check what Facebook's crawler sees

#### LinkedIn Post Inspector
Tool URL: https://www.linkedin.com/post-inspector/

**Status:** Accessible but automation click failed. Manual testing recommended.

To manually test:
1. Go to https://www.linkedin.com/post-inspector/
2. Enter https://www.memopyk.com
3. Click "Inspect"
4. Check preview

## Issues Found

### Critical Issues

1. **EN pages serve French OG tags to crawlers**
   - When sharing /en-US URLs, social platforms see French content
   - Server-side rendering not language-aware
   - Impact: English-speaking audience sees French titles/descriptions in shared posts

2. **Blog posts use homepage OG tags**
   - All blog posts show "MEMOPYK – Films et Albums Souvenirs" title
   - Should show article title, excerpt, featured image
   - og:type should be "article" not "website"
   - Impact: All blog shares look identical, reduces click-through

3. **Incorrect og:url on all pages**
   - All pages (FR, EN, blog) show og:url="https://www.memopyk.com/fr-FR"
   - EN pages should show /en-US
   - Blog posts should show /blog/slug
   - Impact: Social platforms may consolidate engagement metrics incorrectly

### Warnings

4. **Duplicate OG tags**
   - Server renders one set, React adds another
   - Violates OG protocol (each tag should appear once)
   - Impact: Unpredictable behavior - crawlers may use first, last, or arbitrary occurrence

5. **Missing og:locale**
   - No og:locale tag found
   - Should be "fr_FR" for French pages, "en_US" for English pages
   - Impact: Social platforms may not optimize content for user's language

6. **Missing og:site_name**
   - Present in client-side render but not server-side
   - Should be consistently "MEMOPYK"
   - Impact: Minor - most platforms infer site name

## Root Cause Analysis

The issues stem from **server-side rendering not being language/route aware**:

1. Server renders HTML with hardcoded French SEO tags
2. React hydrates and injects locale-specific tags via client-side SEO service
3. Social crawlers only see server-rendered HTML (no JavaScript execution)
4. Result: Crawlers see French tags regardless of actual page locale/content

**Evidence:**
- curl (no JS) shows French tags on EN pages
- Browser DevTools (with JS) shows duplicate tags (server + client)
- Server-rendered canonical tag also shows /fr-FR for all pages

## Recommendations

### Immediate Fixes (High Priority)

1. **Make server-side SEO rendering locale-aware**
   - Pass locale to server/index.html rendering
   - Conditionally inject FR vs EN meta tags based on route
   - File: `server/index.html` or SSR middleware

2. **Add route-specific OG tags for blog posts**
   - Fetch post metadata server-side
   - Inject article-specific og:title, og:description, og:image
   - Set og:type="article"
   - Add og:article:published_time, og:article:author

3. **Fix og:url to match actual page URL**
   - Extract from request URL or route
   - Ensure EN pages show /en-US, blog posts show /blog/slug

### Secondary Fixes (Medium Priority)

4. **Remove duplicate tags**
   - Server should be single source of truth for OG tags
   - Remove client-side OG tag injection (keep only for SPA navigation)
   - OR: Remove server-rendered tags, make SSR fully dynamic

5. **Add missing OG tags**
   - og:locale (fr_FR or en_US)
   - og:site_name ("MEMOPYK")
   - For articles: og:article:published_time, og:article:modified_time, og:article:section

6. **Add JSON-LD structured data for blog posts**
   - type: "BlogPosting" or "Article"
   - headline, description, image, datePublished, author
   - Improves Google search results

### Testing Recommendations

1. **After fixes, clear Facebook's cache:**
   ```
   https://developers.facebook.com/tools/debug/?q=https://www.memopyk.com/en-US
   ```
   Click "Scrape Again"

2. **Test with curl (simulates crawler):**
   ```bash
   curl -A "facebookexternalhit/1.1" https://www.memopyk.com/en-US | grep og:
   ```
   Should show English tags, no duplicates

3. **Validate with:**
   - Facebook Sharing Debugger
   - LinkedIn Post Inspector
   - Twitter Card Validator (https://cards-dev.twitter.com/validator)
   - https://www.opengraph.xyz/

## Technical Details

### Current SEO Service Behavior

The client-side SEO service (`client/src/services/seoService.ts` or similar) correctly generates locale-specific tags:

```javascript
// Generates correct tags based on locale
{
  "fr-FR": {
    title: "MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo",
    image: "og-home-fr.jpg"
  },
  "en-US": {
    title: "MEMOPYK – Memory Films & Albums | Your Photos on Video",
    image: "og-home-en.jpg"
  }
}
```

BUT: This runs client-side only. Social crawlers don't execute JavaScript.

### Server-Side Rendering Gap

The Express server sends HTML from `server/index.html` with hardcoded meta tags:

```html
<!-- This is what ALL pages serve, regardless of route -->
<meta property="og:title" content="MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo" />
<meta property="og:url" content="https://www.memopyk.com/fr-FR" />
```

**Solution:** Make the server route-aware:
1. Parse request URL
2. Determine locale (fr-FR, en-US) and page type (home, blog post)
3. Fetch metadata from database for blog posts
4. Inject appropriate tags before sending HTML

## Screenshots

Screenshots of social media debug tools available at:
- `tests/e2e/screenshots/social-sharing/facebook-debug-tool.png` (cookie consent wall)
- `tests/e2e/screenshots/social-sharing/linkedin-post-inspector.png` (input screen)

## Next Steps

1. Fix server-side SEO rendering to be locale/route-aware
2. Add blog post metadata fetching and injection
3. Remove duplicate tag injection
4. Clear Facebook/LinkedIn caches
5. Retest with social debug tools
6. Update this report with verification results

## Related Documentation

- SEO Implementation: `docs/reports/seo-implementation-log.md`
- SEO Values: `docs/reports/seo-values-report.md`
- SEO Bugfix Report: `docs/reports/seo-bugfix-report.md`
