# SEO Final Values Report — February 12, 2026

## OG Image Public URLs

| Language | Supabase Storage Path | Public URL |
|----------|----------------------|------------|
| French | memopyk-media/seo/og-home-fr.jpg | https://supabase.memopyk.org/storage/v1/object/public/memopyk-media/seo/og-home-fr.jpg |
| English | memopyk-media/seo/og-home-en.jpg | https://supabase.memopyk.org/storage/v1/object/public/memopyk-media/seo/og-home-en.jpg |

Both images are 1200x630px JPG, ~87KB each, publicly accessible (HTTP 200).

## Database Row Updated

Row ID: `42e1a653-9d2d-43bc-a1cb-3244d7abb501` (page='homepage', is_active=true)

## Per-Language OG Image Handling

The DB has a single `og_image_url` column (set to FR image). Server-side SEO injection in `server/app.ts` swaps `og-home-fr.jpg` to `og-home-en.jpg` when serving HTML with `Accept-Language: en`. No schema change needed.

## Verification Results

### Check 1: FR HTML (curl https://memopyk.memopyk.com with Accept-Language: fr-FR)
- `<html lang="fr">` — PASS
- `<title>MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo</title>` — PASS
- `<meta name="description" content="Transformez vos photos et vidéos...">` — PASS
- `<meta name="keywords" content="film souvenir, album photo vidéo...">` — PASS
- `<link rel="canonical" href="https://www.memopyk.com/fr-FR">` — PASS
- `<meta property="og:title">` with FR title — PASS
- `<meta property="og:description">` with FR description — PASS
- `<meta property="og:image">` with FR image URL — PASS
- `<meta name="twitter:card" content="summary_large_image">` — PASS
- `<meta name="twitter:image">` with FR image URL — PASS
- 3 hreflang links (fr-FR, en-US, x-default) — PASS
- `<script type="application/ld+json">` with Service schema — PASS

### Check 2: EN HTML (curl with Accept-Language: en-US)
- `<html lang="en">` — PASS
- `<title>MEMOPYK – Memory Films &amp; Albums | Your Photos on Video</title>` — PASS
- `<meta name="description">` with EN description — PASS
- `<meta name="keywords">` with EN keywords — PASS
- `<meta property="og:image">` with **EN** image URL (og-home-en.jpg) — PASS
- `<meta name="twitter:image">` with **EN** image URL — PASS
- JSON-LD Service schema present — PASS

### Check 3: GET /api/seo-config?lang=fr-FR
- Returns complete JSON with all FR fields — PASS
- title: "MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo" — PASS
- openGraph.image: FR image URL — PASS
- hreflang: 3 entries (fr-FR, en-US, x-default) — PASS
- jsonLd: Service + Organization schema with price, contact, sameAs — PASS

### Check 4: GET /api/seo-config?lang=en-US
- Returns complete JSON with all EN fields — PASS
- title: "MEMOPYK – Memory Films & Albums | Your Photos on Video" — PASS
- description: "Turn your photos and videos into professional memory films..." — PASS
- keywords: "memory film, photo video album, family video montage..." — PASS

### Check 5: Admin SEO page — FR view
- Screenshot: seo-admin-fr-final
- Title field: "MEMOPYK – Films et Albums Souvenirs | Vos Photos en Vidéo" (57/70 chars) — PASS
- Description field: Full FR description (148/320 chars) — PASS
- Keywords field: 5 FR keywords — PASS
- Canonical URL: https://www.memopyk.com/fr-FR — PASS

### Check 6: Admin SEO page — EN view
- Screenshot: seo-admin-en-final
- Title field: "MEMOPYK – Memory Films & Albums | Your Photos on Video" (54/70 chars) — PASS
- Description field: Full EN description (137/320 chars) — PASS
- Keywords field: 5 EN keywords — PASS
- Language switch FR→EN→FR works without blank page — PASS

## JSON-LD Verification

The `<script type="application/ld+json">` block appears in the raw HTML with:
- @type: Service
- name: MEMOPYK
- serviceType: Video Production
- offers.price: 150 EUR
- provider: MEMOPYK EURL (Organization)
- contactPoint: +33745843821
- availableLanguage: French, English

## All Checks: 6/6 PASS
