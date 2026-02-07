-- ============================================================
-- P1 PILLARS BATCH 2: 6 new pillar topics
-- Run in Supabase SQL Editor
-- ============================================================

INSERT INTO content_topics (
  title, slug, category, type, market, target_word_count,
  primary_keyword, search_volume, search_intent, content_angle, description,
  role, cluster, priority, status
)
VALUES
-- 1. gift_anniversary EN
(
  'Anniversary Gift Ideas: The Complete Guide',
  'anniversary-gift-ideas-complete-guide',
  'GIFT IDEAS & OCCASIONS', 'guide', 'en', 3000,
  'anniversary gift ideas',
  50000, 'commercial',
  'Broad umbrella pillar covering anniversary gifts across all years and types. Position MEMOPYK video as the timeless personalized option.',
  'Broad umbrella pillar. Wedding anniversary and couple sub-clusters get own pillars. Spokes TBD via full framework pass — biggest opportunity cluster at 5.2M total volume.',
  'pillar', 'gift_anniversary', 1, 'idea'
),
-- 2. gift_graduation EN
(
  'Best Graduation Gift Ideas',
  'best-graduation-gift-ideas',
  'GIFT IDEAS & OCCASIONS', 'guide', 'en', 3000,
  'graduation gifts',
  50000, 'commercial',
  'Comprehensive graduation gift guide. MEMOPYK as the meaningful alternative to cash/gift cards.',
  '2.2M cluster, EN-only. Strong seasonal component (May-June). Second largest untapped opportunity after anniversary.',
  'pillar', 'gift_graduation', 1, 'idea'
),
-- 3. vhs_digitization_info EN
(
  'How to Convert VHS to Digital: Complete Guide',
  'how-to-convert-vhs-to-digital',
  'VIDEO MEMORY & LEGACY', 'guide', 'en', 3000,
  'convert vhs to digital',
  50000, 'informational',
  'DIY intercept strategy — capture users searching how-to, funnel to MEMOPYK service.',
  '1.2M informational cluster. DIY intercept strategy — capture users searching how-to, funnel to MEMOPYK service. Clear intent separation from vhs_legacy pillar (this = how to do it, legacy = format identification and preservation).',
  'pillar', 'vhs_digitization_info', 1, 'idea'
),
-- 4. gift_anniversary_wedding EN
(
  'Wedding Anniversary Gifts by Year',
  'wedding-anniversary-gifts-by-year',
  'GIFT IDEAS & OCCASIONS', 'guide', 'en', 3000,
  'wedding anniversary gifts',
  50000, 'commercial',
  'Year-specific material traditions (paper, wood, tin, silver, gold). Different search intent from general anniversary.',
  'Separate from general anniversary — different search intent (year-specific material traditions: paper, wood, tin, silver, gold). 993K cluster volume.',
  'pillar', 'gift_anniversary_wedding', 1, 'idea'
),
-- 5. gift_mothers EN
(
  'Creative Mother''s Day Gift Ideas',
  'creative-mothers-day-gift-ideas',
  'GIFT IDEAS & OCCASIONS', 'guide', 'en', 3000,
  'cool mothers day gifts',
  50000, 'commercial',
  'Seasonal pillar — must publish by early March for April-May spike. MEMOPYK as the unique personalized Mother''s Day gift.',
  'SEASONAL: Must publish by early March to catch April-May search spike. 50K is seasonal average — expect 200K+ peak, near-zero in summer. Cluster is 100% Mother''s Day themed. gift_mothers_day folds in as spoke later. 654K + 213K combined cluster volume.',
  'pillar', 'gift_mothers', 1, 'idea'
),
-- 6. vhs_legacy EN
(
  'Super 8, 8mm & VCR Tapes: Guide to Your Home Movie Collection',
  'super-8-8mm-vcr-tapes-home-movie-guide',
  'VIDEO MEMORY & LEGACY', 'guide', 'en', 3000,
  '8mm film to digital',
  5000, 'informational',
  'Format identification and emotional preservation angle. NOT conversion how-to (that is vhs_digitization_info). Title hooks "what is this old format?" readers while primary KW targets conversion intent.',
  'Format identification and emotional preservation angle. NOT conversion how-to (that is vhs_digitization_info pillar). SERP check confirmed "film super 8mm" (50K) is product-intent — fell back to "8mm film to digital" (5K). NOTE: Title-to-keyword tension — title hooks "what is this old format?" readers while primary KW targets conversion intent. Content brief must bridge both: H1/intro should capture format identification curiosity, body satisfies digitization intent, CTA funnels to MEMOPYK service. 460K cluster volume.',
  'pillar', 'vhs_legacy', 1, 'idea'
);
