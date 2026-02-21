# Homepage Audit Report

| Field | Value |
|-------|-------|
| **Date** | 2026-02-21 |
| **Auditor** | Claude Code (Opus 4.6) |
| **Staging URL** | https://memopyk.memopyk.com/fr-FR |
| **Production URL** | https://memopyk.com/fr-FR |
| **TypeScript Errors** | 0 |

---

## Executive Summary

The MEMOPYK homepage is **functionally healthy** across both languages (FR/EN), both environments (staging/production), and both viewports (desktop/mobile). All 9 API endpoints return 200 OK, all 3 hero videos stream correctly via proxy, both CTA buttons link to working external services, and the FAQ/gallery/benefits sections render with complete bilingual content. The main concerns are **code quality and maintainability**: GallerySection.tsx alone contains ~400 lines of duplicated card code, 8+ unused imports, production console.log spam, and permanently disabled features still bundled. One **security issue** exists (unsanitized `dangerouslySetInnerHTML` in WhyMemopykSection). No blocking issues for the next campaign.

**Issue count:** 5 HIGH, 7 MEDIUM, 8 LOW, 5 DEAD CODE / TECH DEBT

---

## Section-by-Section Status

| Section | Status | Notes |
|---------|--------|-------|
| **Header / Navigation** | Working | Bilingual nav, language toggle, sticky header, hamburger on mobile |
| **Hero Video Carousel** | Working | 3 videos, auto-advances, arrows + dots, "Comment ca marche" CTA |
| **Key Visual** | Working | Illustration + animated text reveals, bilingual copy |
| **Why MEMOPYK (Benefits)** | Warning | 5 cards render correctly, but XSS risk via unsanitized HTML |
| **Gallery** | Warning | 6 cards visible, 3 of 6 have no video (null URLs), massive code duplication |
| **CTA Section** | Working | 2 buttons (Consultation + Devis), both link to working Zoho services |
| **How It Works** | Working | 3 flip cards with step illustrations, hardcoded content (not CMS-driven) |
| **FAQ** | Working | 3 sections (9 + 6 + 4 = 19 FAQs), accordion UI, properly sanitized HTML |
| **Footer** | Working | Navigation, legal links, contact info, copyright 2026 |
| **Cookie Banner** | Working | GDPR compliant, Accept/Refuse/Parameters, links to policies |
| **SEO** | Working | Meta tags, OG images, JSON-LD (Service + Organization), sitemap (12 URLs) |

---

## API Health

| Endpoint | Status | Data Count | Notes |
|----------|--------|------------|-------|
| `GET /api/hero-videos` | 200 OK | 3 videos | All active, `useSameVideo=true` for all |
| `GET /api/hero-text` | 200 OK | 1 config | Active, responsive font sizes configured |
| `GET /api/gallery` | 200 OK | 6 items | 3 with video, 3 without (null URLs) |
| `GET /api/faqs` | 200 OK | 18 FAQs | Across 3 sections, HTML answers |
| `GET /api/faq-sections` | 200 OK | 3 sections | General, Process, Pricing |
| `GET /api/cta` | 200 OK | 2 buttons | book_call + quick_quote, both active |
| `GET /api/why-memopyk-cards` | 200 OK | 5 cards | Simplicite, Gain de temps, Sur mesure, Securite, Expertise |
| `GET /api/seo-config` | 200 OK | 1 config | Complete meta + OG + JSON-LD |
| `GET /sitemap.xml` | 200 OK | 12 URLs | 4 pages x 2 languages + 4 blog posts |

**Staging and production return identical data** for hero-videos and gallery endpoints.

---

## Video System Health

| Video Filename | Proxy Status | Cache Status | Notes |
|----------------|-------------|-------------|-------|
| `VideoHero1.mp4` | Working (via `?filename=`) | Cached | Hero carousel video 1 |
| `VideoHero2.mp4` | Working (via `?filename=`) | Cached | Hero carousel video 2 |
| `VideoHero3.mp4` | Working (via `?filename=`) | Cached | Hero carousel video 3 |
| `PomGalleryC.mp4` | N/A (gallery) | Cached | Gallery: L'ete de Pom |
| `VitaminSeaC.mp4` | N/A (gallery) | Cached (78.8 MB) | Gallery: Notre Vitamine Sea |
| `safari-1.mp4` | N/A (gallery) | Cached (104.3 MB) | Gallery: Safari avec les amis |

**Video cache:** 7 files cached, 300.8 MB / 1000 MB (30% utilization). Healthy.

**Gallery videos missing:** 3 of 6 gallery items have null video URLs:
- "Mon defi solo en VTT" -- no video
- "Bebe Premiere Annee" -- no video
- "Reunion de famille" -- no video

These cards show thumbnail images and descriptions but no play button functionality.

---

## CTA System

| Button | FR Label | EN Label | FR URL | EN URL | Reachable |
|--------|----------|----------|--------|--------|-----------|
| **Consultation** | Consultation gratuite | Free consultation | `cal.memopyk.com/#/memopykfr` | `cal.memopyk.com/#/memopyk1` | Yes (Zoho Bookings) |
| **Devis** | Devis gratuit | Free quote | `zfrmz.eu/RdtLOFOuH2XDmFB1yXzG` | `zfrmz.eu/hQvcUay58hWLza3hc6qM` | Yes (Zoho Forms) |

**Notes:**
- FR quote form redirects to `forms.memopyk.com` (custom domain), EN quote form to `forms.zohopublic.eu` (Zoho public domain). Both work.
- Booking service is Zoho Bookings (not Calendly as labeled in some docs).
- Quote forms are creative brief questionnaires (Name, Email, Theme, Tone, etc.), not pricing calculators.

---

## Issues Found

### HIGH (must fix before next campaign)

**H1. XSS vulnerability in WhyMemopykSection** -- `dangerouslySetInnerHTML` renders benefit card descriptions from the API with **no sanitization** (5 instances). FAQSection properly uses `htmlSanitizer.sanitize()`, but WhyMemopykSection does not.
- **File:** `client/src/components/sections/WhyMemopykSection.tsx` lines 116, 170, 214, 253, 291
- **Recommendation:** Add `htmlSanitizer.sanitize()` calls matching the pattern in FAQSection.tsx.

**H2. Gallery data never refreshes** -- `staleTime: Infinity` combined with `refetchOnMount: false` means gallery content will never update for returning visitors unless they clear their browser cache or open a new tab. Admin gallery changes are invisible to users with cached data.
- **File:** `client/src/components/sections/GallerySection.tsx` lines 135-140
- **Recommendation:** Set `staleTime` to 5-10 minutes (matching other sections) to allow periodic refresh.

**H3. 3 of 6 gallery items have no video** -- "Mon defi solo en VTT", "Bebe Premiere Annee", and "Reunion de famille" have null `videoUrlFr`, `videoUrlEn`, and `videoFilename`. Play buttons show but clicking them leads to no content.
- **Source:** Database `gallery_items` table
- **Recommendation:** Either upload videos for these items or hide the play button overlay when no video URL exists.

**H4. Play buttons not keyboard accessible** -- Gallery play buttons and HowItWorks flip cards are `<div>` elements with `onClick` but no `role="button"`, `tabIndex`, or `onKeyDown` handlers. Keyboard-only users cannot interact with them.
- **Files:** `GallerySection.tsx` lines 792-824, 1000-1032; `HowItWorksCondensed.tsx` flip cards
- **Recommendation:** Add `role="button"`, `tabIndex={0}`, and `onKeyDown` (Enter/Space) to interactive div elements.

**H5. Hero video `<video>` element has no accessible label** -- Screen readers cannot describe what the video content is. Navigation arrows also lack `aria-label`.
- **File:** `client/src/components/sections/HeroVideoSection.tsx` lines 204, 370-386
- **Recommendation:** Add `aria-label` to the video element and navigation arrows.

### MEDIUM (fix in current sprint)

**M1. Production console.log spam** -- GallerySection has 10+ `console.log`/`console.warn` calls that execute on every render for every gallery item, degrading devtools performance for users.
- **File:** `GallerySection.tsx` lines 324-336, 483-508, 626-627, 693, 764-765
- **Recommendation:** Remove or guard behind `process.env.NODE_ENV === 'development'`.

**M2. Hero text tablet font > desktop font** -- Tablet font is 45px vs desktop 40px. This may be intentional for aspect ratio but looks like a configuration error.
- **Source:** Database `hero_text_settings` table
- **Recommendation:** Verify this is intentional. If not, set desktop >= tablet.

**M3. Hero video titles never customized** -- Videos 1 and 3 still have auto-generated titles ("Nouvelle Video - VideoHero1.mp4"). These titles are visible in admin but not on the public site -- low impact.
- **Source:** Database `hero_videos` table
- **Recommendation:** Update titles to descriptive names for admin clarity.

**M4. `MobileEnhancedGallery` permanently disabled but still bundled** -- Wrapped in `{false ? ... : ...}`, the import still pulls the component into the bundle.
- **File:** `GallerySection.tsx` lines 9, 696-722
- **Recommendation:** Remove the import and dead JSX, or re-enable the mobile gallery.

**M5. Preloaded video system declared but never preloads** -- State, refs, and cleanup code exist for video preloading, but no video is ever actually preloaded.
- **File:** `GallerySection.tsx` lines 614-656
- **Recommendation:** Either implement preloading or remove the dead infrastructure.

**M6. `document.body.style.overflow = 'unset'` in gallery lightbox close** -- Should restore the original overflow value rather than assuming `'unset'`.
- **File:** `GallerySection.tsx` line 590
- **Recommendation:** Save `document.body.style.overflow` before setting `'hidden'`, restore on close.

**M7. Gallery item 1 has full URL in `video_filename`** -- Inconsistent with other items that use just filenames. May cause issues with proxy URL construction.
- **Source:** Database `gallery_items` table
- **Recommendation:** Normalize to filename-only format.

### LOW (nice to have)

**L1. Unused `language` variable in HomePage** -- Destructured from `useLanguage()` but never used.
- **File:** `client/src/pages/HomePage.tsx` line 16

**L2. Unused imports in HeroVideoSection** -- `Play`, `Pause`, `useCallback`, `trackVideoView` imported but never used.
- **File:** `HeroVideoSection.tsx` lines 1, 3, 37

**L3. 6 unused imports in GallerySection** -- `Badge`, `Eye`, `Star`, `ImageIcon`, `Play`, `LazyImage`, `useNetworkStatus`, `useDeviceOrientation`.
- **File:** `GallerySection.tsx` lines 6-12

**L4. Unused `RoundedPeelCorner` import** -- Imported but manual inline styles used instead.
- **File:** `HowItWorksCondensed.tsx` line 4

**L5. Dead `togglePlayPause` function** -- Defined but never called from any JSX.
- **File:** `HeroVideoSection.tsx` lines 136-146

**L6. WhyMemopykSection brand image has empty alt text** -- `alt=""` makes it decorative. If the image conveys meaning, it should have descriptive alt text.
- **File:** `WhyMemopykSection.tsx` line 135

**L7. Hardcoded header height `64px`** for hero scroll offset -- Fragile if header height changes.
- **File:** `HeroVideoSection.tsx` line 340

**L8. OG image is French-only** -- Single `og_image_url` column, pointing to `og-home-fr.jpg`. No EN variant served.
- **Source:** Database `seo_settings` table

### DEAD CODE / TECH DEBT

**D1. ~380 lines of duplicated gallery card code** -- Lines 731-917 (first 3 cards) and 941-1123 (last 3 cards) are nearly identical. Should be extracted into a `GalleryCard` component.
- **File:** `GallerySection.tsx`

**D2. WhyMemopykSection renders 5 identical card structures by direct index** -- `benefits[0]` through `benefits[4]` each with 20+ lines of identical JSX. Should be a mapped component.
- **File:** `WhyMemopykSection.tsx` lines 92-303

**D3. HowItWorksCondensed content is hardcoded** -- Step titles, descriptions, and image paths are hardcoded in the component while all other homepage sections (hero, gallery, FAQ, benefits, CTA) are CMS-driven via API.
- **File:** `HowItWorksCondensed.tsx` lines 80-114

**D4. Multiple empty useEffects with only comments** -- Disabled animation/refresh logic left as commented-out scaffolding.
- **File:** `GallerySection.tsx` lines 145-147, 203-207

**D5. `clearBrowserCache` useEffect aggressively clears localStorage/sessionStorage on every mount** -- Brute-force fix for a cache sync issue that could interfere with other features.
- **File:** `GallerySection.tsx` lines 104-128

---

## Visual Observations from Screenshots

| Screenshot | Observation |
|------------|-------------|
| `01-hero-fr.png` | Hero renders with video background, bilingual text overlay, "Comment ca marche" button, carousel dots (3), navigation arrows. Cookie banner visible on first load. |
| `02-fullpage-fr.png` | Full page captures all 8 sections in correct order. No broken layouts or missing sections. |
| `03-hero-en.png` | EN version renders correctly: "We transform your personal photos and videos into unforgettable souvenir films". Nav items translated. "How it works" CTA. |
| `04-fullpage-en.png` | EN full page correct. Gallery shows USD prices (225, 145, 332, 1195, 535, 880). |
| `05-mobile-fr.png` | Mobile: hamburger menu, hero text readable at 18px, CTA button centered, carousel dots visible. |
| `06-mobile-fullpage-fr.png` | Mobile full page: benefit cards stack vertically (1 column), gallery cards full-width, CTA buttons stack, FAQ accordion works. |

**Key visual observations:**
- Gallery row 1 (portrait-oriented items) and row 2 (landscape items) split cleanly with "...aux projets les plus ambitieux" divider
- Price badges positioned consistently (bottom-right of card images)
- Format badges (Vertical, Stories Mobiles, Posts Instagram, TV & Bureau) render correctly
- Footer is well-structured with 4 columns: brand, navigation, legal, contact
- No visual regressions detected between FR and EN

---

## Mobile Observations

| Aspect | Status | Notes |
|--------|--------|-------|
| **Responsive layout** | Good | All sections stack vertically on 390px viewport |
| **Hero text** | Good | 18px mobile font, readable, centered |
| **Navigation** | Good | Hamburger menu, language toggle visible |
| **Gallery cards** | Good | Full-width single column, play buttons sized appropriately |
| **CTA buttons** | Good | Full-width, stacked vertically |
| **FAQ** | Good | Accordion works, 44px min touch targets |
| **Footer** | Good | Stacks to single column |
| **Cookie banner** | Warning | On first load, cookie banner takes significant viewport space on mobile |

---

## Recommendations (Prioritized)

1. **Fix XSS in WhyMemopykSection** -- Add `htmlSanitizer.sanitize()` to all 5 `dangerouslySetInnerHTML` instances. Quick fix, high security impact.

2. **Fix gallery cache policy** -- Change `staleTime: Infinity` to `staleTime: 5 * 60 * 1000` (5 minutes). One-line change, prevents stale content for returning visitors.

3. **Upload missing gallery videos or hide play buttons** -- 3 of 6 gallery items have no video. Either upload content or conditionally hide the play overlay when `videoUrl` is null.

4. **Add keyboard accessibility to interactive elements** -- Add `role="button"`, `tabIndex={0}`, `onKeyDown` to gallery play buttons and HowItWorks flip cards.

5. **Extract GalleryCard component** -- Eliminate ~380 lines of duplication. Improves maintainability and reduces bundle size.

6. **Remove production console.log calls** -- 10+ log calls in GallerySection run on every render. Remove or gate behind dev check.

7. **Clean up unused imports** -- 15+ unused imports across homepage files. Tree-shaking helps but clutters code.

8. **Remove permanently disabled MobileEnhancedGallery** -- Either re-enable or remove the `{false ? ...}` dead code and its import.

9. **Consider CMS-driving HowItWorks content** -- It's the only homepage section with hardcoded content. Add API endpoint for consistency.

10. **Add EN OG image variant** -- Currently only French OG image is served regardless of language.

---

*Report generated by Claude Code (Opus 4.6) on 2026-02-21. Screenshots saved to `tests/e2e/screenshots/homepage-audit/`.*
