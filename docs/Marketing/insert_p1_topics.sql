-- ============================================================
-- P1 TOPICS: 4 Pillars + 17 Spokes (21 total)
-- Run in Supabase SQL Editor as a single transaction
-- ============================================================

WITH pillar_inserts AS (
  INSERT INTO content_topics (title, slug, category, market, primary_keyword, secondary_keywords, search_volume, competition, search_intent, content_angle, description, role, cluster, priority, status, type, target_word_count)
  VALUES
  -- PILLAR 1: gift_retirement FR
  (
    'Cadeaux de Départ à la Retraite : Le Guide Complet',
    'cadeaux-depart-retraite-guide-complet',
    'GIFT IDEAS & OCCASIONS',
    'fr',
    'cadeau retraite',
    ARRAY['cadeau départ retraite', 'cadeau pour la retraite', 'idée cadeau retraite', 'cadeau pour un départ à la retraite', 'cadeau pour départ en retraite'],
    5000, 'High', 'commercial',
    'Comprehensive gift guide positioning MEMOPYK souvenir films as the premium personalized option among retirement gifts',
    'Complete guide to retirement gifts covering every recipient, budget, and style. Hub page linking to gender-specific, personalized, and original gift spokes.',
    'pillar', 'gift_retirement', 1, 'backlog', 'guide', 3000
  ),
  -- PILLAR 2: gift_retirement EN
  (
    'Retirement Gift Ideas: The Complete Guide',
    'retirement-gift-ideas-complete-guide',
    'GIFT IDEAS & OCCASIONS',
    'en',
    'retirement gift ideas',
    ARRAY['retirement gifts', 'best retirement gifts', 'retirement present ideas', 'good retirement gifts'],
    5000, 'High', 'commercial',
    'Broad retirement gift guide with strong workplace gifting coverage (reflecting current demand), positioning MEMOPYK as the personalized premium option',
    'Complete retirement gift guide. Generic pillar that leans into workplace context while keeping URL/H1 broad for future growth. Links to coworker, gender, and personalized spokes.',
    'pillar', 'gift_retirement', 1, 'backlog', 'guide', 3000
  ),
  -- PILLAR 3: gift_memorial EN (sympathy)
  (
    'Memorial & Sympathy Gift Guide',
    'memorial-sympathy-gift-guide',
    'GIFT IDEAS & OCCASIONS',
    'en',
    'sympathy gifts',
    ARRAY['sympathy gift ideas', 'memorial gifts', 'condolence gift ideas', 'bereavement gifts', 'gifts to give at a funeral', 'sympathy presents'],
    50000, 'High', 'commercial',
    'Comprehensive sympathy/memorial gift guide. Position MEMOPYK memorial video as unique alternative to flowers and baskets.',
    'Hub page for all memorial and sympathy gifting. Links to relationship-specific spokes (loss of mother/father), modifier spokes (unique, personalized, DIY), and audience spokes (coworker, friend).',
    'pillar', 'gift_memorial', 1, 'backlog', 'guide', 3000
  ),
  -- PILLAR 4: gift_memorial EN (pet — standalone, no spokes)
  (
    'Pet Memorial Gifts: Honoring Your Furry Friend',
    'pet-memorial-gifts',
    'GIFT IDEAS & OCCASIONS',
    'en',
    'pet memorial gift',
    ARRAY['sympathy gift for loss of dog', 'condolence gifts for loss of dog', 'sympathy gifts for dog death', 'condolence gifts for loss of pet', 'pet sympathy gift', 'dog memorial gift'],
    50000, 'High', 'commercial',
    'Dedicated pet memorial guide. Different emotional context than human loss. Position MEMOPYK pet memorial video as a unique, lasting tribute.',
    'Standalone pillar for pet loss gifting. No spokes yet — add later with expanded GKP seeds (cat memorial, horse memorial, pet loss gift basket).',
    'pillar', 'gift_memorial', 1, 'backlog', 'guide', 3000
  )
  RETURNING id, slug
),

-- Map pillar slugs to IDs for spoke references
pillar_fr_retirement AS (SELECT id FROM pillar_inserts WHERE slug = 'cadeaux-depart-retraite-guide-complet'),
pillar_en_retirement AS (SELECT id FROM pillar_inserts WHERE slug = 'retirement-gift-ideas-complete-guide'),
pillar_en_sympathy  AS (SELECT id FROM pillar_inserts WHERE slug = 'memorial-sympathy-gift-guide')

-- ============================================================
-- SPOKES: 6 FR retirement + 4 EN retirement + 7 EN memorial
-- ============================================================
INSERT INTO content_topics (title, slug, category, market, primary_keyword, secondary_keywords, search_volume, competition, search_intent, content_angle, description, role, cluster, priority, status, type, target_word_count, parent_topic_id)

-- BATCH 2: FR retirement spokes (parent = pillar #1)
SELECT title, slug, category, market, primary_keyword, secondary_keywords, search_volume, competition, search_intent, content_angle, description, role, cluster, priority, status, type, target_word_count, pillar_fr_retirement.id
FROM pillar_fr_retirement,
(VALUES
  -- 5. FR Spoke: Femme
  (
    'Idées Cadeaux de Retraite pour Femme',
    'cadeau-retraite-femme',
    'GIFT IDEAS & OCCASIONS', 'fr',
    'cadeau retraite femme',
    ARRAY['cadeau pour retraité femme', 'cadeau pour la retraite femme', 'cadeau pour retraite femme', 'idée cadeau retraite femme', 'cadeau départ retraite femme'],
    5000, 'High', 'commercial',
    'Feminine retirement gift ideas. MEMOPYK as the personalized emotional gift that stands out.',
    'Spoke targeting women-specific retirement gifts. Links back to main FR retirement pillar.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  ),
  -- 6. FR Spoke: Homme
  (
    'Idées Cadeaux de Retraite pour Homme',
    'cadeau-retraite-homme',
    'GIFT IDEAS & OCCASIONS', 'fr',
    'cadeau retraite homme',
    ARRAY['cadeau pour la retraite homme', 'cadeau pour retraité homme', 'cadeau homme retraite', 'cadeau pour homme retraite', 'cadeau de retraite homme'],
    5000, 'High', 'commercial',
    'Masculine retirement gift ideas. Position MEMOPYK as thoughtful alternative to generic gifts.',
    'Spoke targeting men-specific retirement gifts. Links back to main FR retirement pillar.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  ),
  -- 7. FR Spoke: Personnalisé
  (
    'Cadeau Retraite Personnalisé : Les Meilleures Idées',
    'cadeau-retraite-personnalise',
    'GIFT IDEAS & OCCASIONS', 'fr',
    'cadeau retraite personnalisé',
    ARRAY['cadeau personnalisé retraite', 'cadeau personnalisé départ retraite'],
    500, 'Medium', 'commercial',
    'MEMOPYK MONEY PAGE. Personalized retirement gifts = MEMOPYK''s core offering. Strongest CTA placement.',
    'MEMOPYK money page spoke for personalized retirement gifts in FR market.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  ),
  -- 8. FR Spoke: Original
  (
    'Cadeau de Retraite Original et Inoubliable',
    'cadeau-retraite-original',
    'GIFT IDEAS & OCCASIONS', 'fr',
    'cadeau retraite original',
    ARRAY['idée cadeau retraite original', 'cadeau original pour retraite', 'retraite cadeau original', 'cadeau original retraite', 'cadeau de retraite original'],
    500, 'Medium', 'commercial',
    'Second MEMOPYK money page. Original = video souvenir. Position against generic gifts.',
    'Second money page spoke for original/unique retirement gifts in FR market.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  ),
  -- 9. FR Spoke: Collègue
  (
    'Cadeau Retraite Collègue : Idées pour Marquer le Coup',
    'cadeau-retraite-collegue',
    'GIFT IDEAS & OCCASIONS', 'fr',
    'cadeau de départ pour un collègue',
    ARRAY['idée cadeau retraite collègue', 'cadeau départ retraite collègue', 'cadeau collègue retraite', 'cadeau départ en retraite collègue'],
    500, 'Medium', 'commercial',
    'Workplace retirement gifting — collective gifts, budget pooling, office-appropriate options. MEMOPYK as the group gift solution.',
    'Spoke targeting workplace/colleague retirement gifts in FR market.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  ),
  -- 10. FR Spoke: Humour
  (
    'Cadeau Retraite Humour : Offrir le Sourire',
    'cadeau-retraite-humour',
    'GIFT IDEAS & OCCASIONS', 'fr',
    'cadeau retraite humour',
    ARRAY['cadeau humour retraite', 'cadeau drôle retraite', 'cadeau depart retraite humour', 'cadeau retraite rigolo', 'cadeau rigolo retraite'],
    500, 'Low', 'commercial',
    'Funny retirement gifts. Light tone. MEMOPYK angle: funny video montage with blooper reel or humorous career highlights.',
    'Spoke targeting humorous/funny retirement gifts in FR market.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  )
) AS v(title, slug, category, market, primary_keyword, secondary_keywords, search_volume, competition, search_intent, content_angle, description, role, cluster, priority, status, type, target_word_count)

UNION ALL

-- BATCH 3: EN retirement spokes (parent = pillar #2)
SELECT title, slug, category, market, primary_keyword, secondary_keywords, search_volume, competition, search_intent, content_angle, description, role, cluster, priority, status, type, target_word_count, pillar_en_retirement.id
FROM pillar_en_retirement,
(VALUES
  -- 11. EN Spoke: Coworker
  (
    'Best Retirement Gifts for Coworkers',
    'retirement-gifts-coworkers',
    'GIFT IDEAS & OCCASIONS', 'en',
    'retirement gift for coworker',
    ARRAY['retirement present for coworker', 'retirement gift for colleague', 'retirement gift ideas for coworker', 'coworker retirement ideas', 'retirement gifts for colleagues'],
    5000, 'High', 'commercial',
    'Highest-traffic EN spoke. Office retirement gifting guide. Group gift ideas, budget pooling. MEMOPYK as the memorable collective gift.',
    'Top EN spoke for workplace retirement gifts. Links back to EN retirement pillar.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  ),
  -- 12. EN Spoke: Women
  (
    'Best Retirement Gifts for Women',
    'retirement-gifts-women',
    'GIFT IDEAS & OCCASIONS', 'en',
    'retirement gift for coworker female',
    ARRAY['retirement gift ideas for female coworker', 'retirement gifts for female coworker', 'retirement gift for female colleague'],
    500, 'Medium', 'commercial',
    'Female-focused retirement gifts. MEMOPYK as the thoughtful personalized option.',
    'Spoke targeting women-specific retirement gifts in EN market.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  ),
  -- 13. EN Spoke: Men
  (
    'Best Retirement Gifts for Men',
    'retirement-gifts-men',
    'GIFT IDEAS & OCCASIONS', 'en',
    'retirement gifts for male coworkers',
    ARRAY['retirement gift ideas for male coworker', 'retirement gift for coworker male', 'retirement gift for male colleague'],
    500, 'Medium', 'commercial',
    'Male-focused retirement gifts. MEMOPYK as alternative to generic ''guy gifts''.',
    'Spoke targeting men-specific retirement gifts in EN market.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  ),
  -- 14. EN Spoke: Personalized (MEMOPYK money page)
  (
    'Personalized Retirement Gifts That Last Forever',
    'personalized-retirement-gifts',
    'GIFT IDEAS & OCCASIONS', 'en',
    'personalized retirement gifts for coworkers',
    ARRAY['custom retirement gifts', 'personalized retirement gift ideas'],
    50, 'Low', 'commercial',
    'MEMOPYK MONEY PAGE. Editorial decision — low volume but high conversion intent. This IS MEMOPYK''s service. Strongest CTA.',
    'MEMOPYK money page spoke for personalized retirement gifts in EN market.',
    'spoke', 'gift_retirement', 1, 'backlog', 'article', 1200
  )
) AS v(title, slug, category, market, primary_keyword, secondary_keywords, search_volume, competition, search_intent, content_angle, description, role, cluster, priority, status, type, target_word_count)

UNION ALL

-- BATCH 4: EN memorial spokes (parent = pillar #3 sympathy)
SELECT title, slug, category, market, primary_keyword, secondary_keywords, search_volume, competition, search_intent, content_angle, description, role, cluster, priority, status, type, target_word_count, pillar_en_sympathy.id
FROM pillar_en_sympathy,
(VALUES
  -- 15. EN Spoke: Loss of Mother (+ folded keywords)
  (
    'Memorial Gifts for Loss of Mother',
    'memorial-gifts-loss-of-mother',
    'GIFT IDEAS & OCCASIONS', 'en',
    'memorial gifts for loss of mom',
    ARRAY['memorial gift for loss of mother', 'remembrance gift for loss of mother', 'sympathy gifts for loss of mom', 'condolences gift for loss of mother', 'gifts for sympathy loss of mother', 'unique memorial gifts for loss of mother', 'unique sympathy gifts for loss of mother'],
    5000, 'High', 'commercial',
    'Emotionally sensitive. Mother-loss specific gifts. MEMOPYK memorial video as a way to preserve her memory.',
    'Spoke for mother-loss memorial gifts. Includes folded women/unique keywords.',
    'spoke', 'gift_memorial', 1, 'backlog', 'article', 1200
  ),
  -- 16. EN Spoke: Loss of Father (+ folded keywords)
  (
    'Memorial Gifts for Loss of Father',
    'memorial-gifts-loss-of-father',
    'GIFT IDEAS & OCCASIONS', 'en',
    'loss of father memorial gifts',
    ARRAY['sympathy gifts for loss of father', 'memorial gifts for loss of father', 'sympathy gifts for loss of dad', 'remembrance gifts for loss of father', 'condolence gifts for loss of father', 'personalized memorial gifts for loss of father', 'personalized sympathy gifts for loss of father', 'unique memorial gifts for loss of father', 'unique sympathy gifts for loss of father'],
    5000, 'High', 'commercial',
    'Father-loss specific gifts. MEMOPYK tribute video preserving his legacy.',
    'Spoke for father-loss memorial gifts. Includes folded men/personalized and men/unique keywords.',
    'spoke', 'gift_memorial', 1, 'backlog', 'article', 1200
  ),
  -- 17. EN Spoke: Unique
  (
    'Unique & Unusual Memorial Gifts',
    'unique-memorial-gifts',
    'GIFT IDEAS & OCCASIONS', 'en',
    'unique memorial gifts',
    ARRAY['unusual memorial gifts', 'unique bereavement gifts', 'unique gifts for loss of loved one', 'unique memorial gift ideas', 'unique sympathy gift'],
    5000, 'High', 'commercial',
    'MEMOPYK MONEY PAGE. ''Unique'' = video memorial. Position against generic sympathy baskets.',
    'MEMOPYK money page spoke for unique memorial gifts.',
    'spoke', 'gift_memorial', 1, 'backlog', 'article', 1200
  ),
  -- 18. EN Spoke: Personalized
  (
    'Personalized Sympathy & Memorial Gifts',
    'personalized-sympathy-gifts',
    'GIFT IDEAS & OCCASIONS', 'en',
    'personalized sympathy gifts',
    ARRAY['personalized memorial gifts', 'personalized gift for loss of loved one', 'personalized memorial gift ideas'],
    500, 'Medium', 'commercial',
    'MEMOPYK MONEY PAGE. Personalized memorial = MEMOPYK core service. Strong CTA placement.',
    'MEMOPYK money page spoke for personalized memorial gifts.',
    'spoke', 'gift_memorial', 1, 'backlog', 'article', 1200
  ),
  -- 19. EN Spoke: Coworker
  (
    'Bereavement Gifts for Coworkers',
    'bereavement-gifts-coworkers',
    'GIFT IDEAS & OCCASIONS', 'en',
    'sympathy gifts for coworker',
    ARRAY['condolences gift for coworker', 'sympathy gift ideas for coworker', 'bereavement gift for male coworker'],
    500, 'Medium', 'commercial',
    'Workplace sympathy gifting. Professional tone. Group contribution to MEMOPYK memorial as office-appropriate option.',
    'Spoke for workplace bereavement/sympathy gifts.',
    'spoke', 'gift_memorial', 1, 'backlog', 'article', 1200
  ),
  -- 20. EN Spoke: DIY
  (
    'DIY Memorial & Sympathy Gifts',
    'diy-memorial-gifts',
    'GIFT IDEAS & OCCASIONS', 'en',
    'diy memorial gifts',
    ARRAY['diy sympathy gift', 'diy bereavement gifts', 'diy remembrance gifts', 'diy sympathy gift basket ideas', 'grieving diy sympathy gift baskets'],
    500, 'Low', 'informational',
    'Intercept DIY searchers. Show what''s possible handmade, then position MEMOPYK as the professional upgrade when DIY falls short.',
    'Spoke for DIY memorial gifts — captures informational intent and upsells to MEMOPYK.',
    'spoke', 'gift_memorial', 1, 'backlog', 'article', 1200
  ),
  -- 21. EN Spoke: Friend
  (
    'Sympathy Gifts for a Grieving Friend',
    'sympathy-gifts-friend',
    'GIFT IDEAS & OCCASIONS', 'en',
    'sympathy gifts for friend',
    ARRAY['care package ideas for grieving friend', 'condolence gift for friend', 'friend memorial gifts', 'memorial gift for best friend'],
    500, 'Medium', 'commercial',
    'Intimate, personal tone. Friend-to-friend gifting context. MEMOPYK as the deeply personal tribute option.',
    'Spoke for friend-to-friend sympathy gifts.',
    'spoke', 'gift_memorial', 1, 'backlog', 'article', 1200
  )
) AS v(title, slug, category, market, primary_keyword, secondary_keywords, search_volume, competition, search_intent, content_angle, description, role, cluster, priority, status, type, target_word_count);
