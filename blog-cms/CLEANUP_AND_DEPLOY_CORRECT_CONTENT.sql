-- ============================================================================
-- MEMOPYK BLOG CMS - CLEANUP AND DEPLOY CORRECT SOUVENIR FILMS CONTENT
-- ============================================================================
-- This script:
-- 1. Sets old note-taking posts to 'draft' status (soft delete)
-- 2. Deploys 6 NEW souvenir films blog posts
-- 3. Creates correct categories and tags for souvenir films business
-- ============================================================================

-- STEP 1: Soft delete old incorrect posts (set to draft)
-- This keeps the data but hides from public
UPDATE posts SET 
    status = 'draft',
    updated_at = NOW()
WHERE slug IN (
    '5-methodes-prise-notes-productivite',
    'gerer-temps-efficacement-7-techniques',
    'organisation-etudiante-guide-complet'
);

-- STEP 2: Create correct categories for Films Souvenirs business
INSERT INTO categories (name, slug, description, language, display_order, is_active, meta_title, meta_description) VALUES 
    ('Famille & Enfants', 'famille-enfants', 'Films souvenirs famille', 'fr-FR', 2, true, 'Films Famille | MEMOPYK', 'Souvenirs de famille'),
    ('Voyages & Aventures', 'voyages-aventures', 'Films de voyages', 'fr-FR', 3, true, 'Films Voyage | MEMOPYK', 'Revivez vos aventures'),
    ('Préservation de Mémoires', 'preservation-memoires', 'Conseils pour préserver vos souvenirs', 'fr-FR', 1, true, 'Préservation | MEMOPYK', 'Préservez vos souvenirs'),
    ('Family & Children', 'family-children', 'Family souvenir films', 'en-US', 2, true, 'Family Films | MEMOPYK', 'Family memories'),
    ('Travel & Adventures', 'travel-adventures', 'Travel films', 'en-US', 3, true, 'Travel Films | MEMOPYK', 'Travel memories'),
    ('Memory Preservation', 'memory-preservation', 'Preserving memories', 'en-US', 1, true, 'Memory Preservation | MEMOPYK', 'Preserve memories')
ON CONFLICT (slug, language) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    meta_title = EXCLUDED.meta_title,
    meta_description = EXCLUDED.meta_description;

-- STEP 3: Create souvenir film tags
INSERT INTO tags (name, slug, description, language) VALUES 
    ('film souvenir', 'film-souvenir', 'Films souvenirs', 'fr-FR'),
    ('préservation mémoire', 'preservation-memoire', 'Préserver souvenirs', 'fr-FR'),
    ('première année bébé', 'premiere-annee-bebe', 'Films bébé', 'fr-FR'),
    ('souvenirs voyage', 'souvenirs-voyage', 'Films voyage', 'fr-FR'),
    ('famille', 'famille', 'Moments famille', 'fr-FR'),
    ('montage vidéo', 'montage-video', 'Montage pro', 'fr-FR'),
    ('souvenir film', 'souvenir-film', 'Souvenir films', 'en-US'),
    ('memory preservation', 'memory-preservation', 'Preserve memories', 'en-US'),
    ('baby first year', 'baby-first-year', 'Baby films', 'en-US'),
    ('travel memories', 'travel-memories', 'Travel films', 'en-US'),
    ('family memories', 'family-memories', 'Family moments', 'en-US'),
    ('video editing', 'video-editing', 'Pro editing', 'en-US')
ON CONFLICT (slug, language) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- STEP 4: Deploy 6 NEW souvenir films blog posts
DO $$
DECLARE 
    v_author_id UUID;
    v_cat_family_fr UUID;
    v_cat_travel_fr UUID;
    v_cat_family_en UUID;
    v_cat_travel_en UUID;
    
    v_tag_film_souvenir UUID;
    v_tag_preservation UUID;
    v_tag_premiere_annee UUID;
    v_tag_souvenirs_voyage UUID;
    v_tag_famille UUID;
    v_tag_montage_video UUID;
    
    v_tag_souvenir_film UUID;
    v_tag_baby_first_year UUID;
    v_tag_travel_memories UUID;
    v_tag_family_memories UUID;
    v_tag_video_editing UUID;
    
    v_post1_id UUID;
    v_post2_id UUID;
    v_post3_id UUID;
    v_post4_id UUID;
    v_post5_id UUID;
    v_post6_id UUID;
BEGIN
    -- Get author ID
    SELECT id INTO v_author_id FROM authors WHERE slug = 'memopyk-team' LIMIT 1;
    
    -- Get category IDs
    SELECT id INTO v_cat_family_fr FROM categories WHERE slug = 'famille-enfants' AND language = 'fr-FR';
    SELECT id INTO v_cat_travel_fr FROM categories WHERE slug = 'voyages-aventures' AND language = 'fr-FR';
    SELECT id INTO v_cat_family_en FROM categories WHERE slug = 'family-children' AND language = 'en-US';
    SELECT id INTO v_cat_travel_en FROM categories WHERE slug = 'travel-adventures' AND language = 'en-US';
    
    -- Get tag IDs (French)
    SELECT id INTO v_tag_film_souvenir FROM tags WHERE slug = 'film-souvenir' AND language = 'fr-FR';
    SELECT id INTO v_tag_preservation FROM tags WHERE slug = 'preservation-memoire' AND language = 'fr-FR';
    SELECT id INTO v_tag_premiere_annee FROM tags WHERE slug = 'premiere-annee-bebe' AND language = 'fr-FR';
    SELECT id INTO v_tag_souvenirs_voyage FROM tags WHERE slug = 'souvenirs-voyage' AND language = 'fr-FR';
    SELECT id INTO v_tag_famille FROM tags WHERE slug = 'famille' AND language = 'fr-FR';
    SELECT id INTO v_tag_montage_video FROM tags WHERE slug = 'montage-video' AND language = 'fr-FR';
    
    -- Get tag IDs (English)
    SELECT id INTO v_tag_souvenir_film FROM tags WHERE slug = 'souvenir-film' AND language = 'en-US';
    SELECT id INTO v_tag_baby_first_year FROM tags WHERE slug = 'baby-first-year' AND language = 'en-US';
    SELECT id INTO v_tag_travel_memories FROM tags WHERE slug = 'travel-memories' AND language = 'en-US';
    SELECT id INTO v_tag_family_memories FROM tags WHERE slug = 'family-memories' AND language = 'en-US';
    SELECT id INTO v_tag_video_editing FROM tags WHERE slug = 'video-editing' AND language = 'en-US';
    
    -- POST 1: French - Baby First Year
    INSERT INTO posts (
        title, slug, excerpt, content, content_text, language, 
        author_id, category_id, status, publish_date, 
        meta_title, meta_description, meta_keywords, 
        reading_time_minutes, word_count, is_featured
    ) VALUES (
        'Comment Créer un Film Souvenir de la Première Année de Bébé',
        'film-souvenir-premiere-annee-bebe',
        'La première année de votre bébé passe trop vite. Découvrez comment transformer vos photos et vidéos en un film souvenir émouvant qui capture chaque moment précieux.',
        '{"blocks":[{"type":"heading","content":"Pourquoi créer un film de la première année de bébé ?"},{"type":"paragraph","content":"La première année de bébé est extraordinaire. Chaque sourire, chaque premier pas, chaque découverte mérite d''être préservé dans un film professionnel qui raconte cette année magique."},{"type":"heading","content":"Les moments clés à capturer"},{"type":"paragraph","content":"Du premier sourire aux premiers pas, notre service transforme vos photos et vidéos en un film émouvant avec musique et transitions professionnelles."}]}'::jsonb,
        'première année bébé film souvenir moments photos vidéos famille nouveau-né naissance premiers pas premiers sourires',
        'fr-FR', v_author_id, v_cat_family_fr, 'published', NOW() - INTERVAL '5 days',
        'Film Souvenir Première Année Bébé | MEMOPYK',
        'Créez un film émouvant de la première année de votre bébé. MEMOPYK transforme vos photos en souvenirs professionnels.',
        'film souvenir bébé, première année bébé, vidéo naissance, film nouveau-né, souvenirs bébé',
        4, 650, true
    ) ON CONFLICT (slug, language) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    RETURNING id INTO v_post1_id;
    
    -- Add tags to post 1
    INSERT INTO post_tags (post_id, tag_id) VALUES 
        (v_post1_id, v_tag_film_souvenir),
        (v_post1_id, v_tag_premiere_annee),
        (v_post1_id, v_tag_famille),
        (v_post1_id, v_tag_montage_video)
    ON CONFLICT DO NOTHING;
    
    -- POST 2: French - Travel Film
    INSERT INTO posts (
        title, slug, excerpt, content, content_text, language, 
        author_id, category_id, status, publish_date, 
        meta_title, meta_description, meta_keywords, 
        reading_time_minutes, word_count, is_featured
    ) VALUES (
        'Transformez Vos Photos de Voyage en Film Souvenir Épique',
        'transformer-photos-voyage-film-souvenir',
        'Vos souvenirs de vacances éparpillés dans votre téléphone ? Créez un film de voyage professionnel qui capture l''essence de votre aventure.',
        '{"blocks":[{"type":"heading","content":"Revivez vos aventures comme un documentaire"},{"type":"paragraph","content":"Un film de voyage raconte votre histoire avec musique et émotions. MEMOPYK transforme vos photos et vidéos en un documentaire professionnel de votre aventure."},{"type":"heading","content":"De vos photos à votre film épique"},{"type":"paragraph","content":"Transitions naturelles, musique immersive et montage professionnel créent une expérience cinématographique de vos voyages."}]}'::jsonb,
        'voyage film souvenir photos vidéos aventure vacances souvenirs tourisme',
        'fr-FR', v_author_id, v_cat_travel_fr, 'published', NOW() - INTERVAL '12 days',
        'Film Souvenir de Voyage | Créez Votre Film Épique | MEMOPYK',
        'Créez un film professionnel de vos voyages. MEMOPYK transforme vos photos en documentaire épique.',
        'film voyage, souvenir voyage, montage vidéo voyage, film vacances',
        5, 580, true
    ) ON CONFLICT (slug, language) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    RETURNING id INTO v_post2_id;
    
    -- Add tags to post 2
    INSERT INTO post_tags (post_id, tag_id) VALUES 
        (v_post2_id, v_tag_film_souvenir),
        (v_post2_id, v_tag_souvenirs_voyage),
        (v_post2_id, v_tag_montage_video)
    ON CONFLICT DO NOTHING;
    
    -- POST 3: French - Family Reunion
    INSERT INTO posts (
        title, slug, excerpt, content, content_text, language, 
        author_id, category_id, status, publish_date, 
        meta_title, meta_description, meta_keywords, 
        reading_time_minutes, word_count
    ) VALUES (
        '5 Raisons de Créer un Film Souvenir de Réunion Familiale',
        '5-raisons-film-souvenir-reunion-familiale',
        'Les réunions familiales sont rares et précieuses. Découvrez pourquoi préserver ces moments pour les générations futures.',
        '{"blocks":[{"type":"heading","content":"Préserver l''héritage familial"},{"type":"paragraph","content":"Un film de réunion familiale capture les interactions entre générations, les voix et les traditions familiales pour créer un héritage précieux."},{"type":"heading","content":"Pour les générations futures"},{"type":"paragraph","content":"Ces films deviennent des trésors de famille que vos enfants et petits-enfants chériront pour toujours."}]}'::jsonb,
        'réunion familiale film souvenir famille générations héritage traditions',
        'fr-FR', v_author_id, v_cat_family_fr, 'published', NOW() - INTERVAL '18 days',
        'Film Réunion Familiale | Préservez Votre Héritage | MEMOPYK',
        'Préservez les moments précieux de vos réunions familiales avec MEMOPYK. Un héritage pour les générations futures.',
        'réunion familiale, film famille, héritage familial, souvenirs famille',
        6, 620
    ) ON CONFLICT (slug, language) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    RETURNING id INTO v_post3_id;
    
    -- Add tags to post 3
    INSERT INTO post_tags (post_id, tag_id) VALUES 
        (v_post3_id, v_tag_film_souvenir),
        (v_post3_id, v_tag_famille),
        (v_post3_id, v_tag_preservation)
    ON CONFLICT DO NOTHING;
    
    -- POST 4: English - Baby First Year
    INSERT INTO posts (
        title, slug, excerpt, content, content_text, language, 
        author_id, category_id, status, publish_date, 
        meta_title, meta_description, meta_keywords, 
        reading_time_minutes, word_count, is_featured
    ) VALUES (
        'Creating a Memory Film of Your Baby''s First Year',
        'creating-memory-film-baby-first-year',
        'Your baby''s first year passes too quickly. Transform your photos and videos into a touching memory film that captures every precious moment.',
        '{"blocks":[{"type":"heading","content":"Why create a first year memory film?"},{"type":"paragraph","content":"A professional memory film captures every smile, first step, and discovery, creating an immersive experience with music and professional transitions."},{"type":"heading","content":"Key moments to preserve"},{"type":"paragraph","content":"From first smiles to first steps, MEMOPYK transforms your photos into an emotional journey through your baby''s magical first year."}]}'::jsonb,
        'baby first year memory film photos videos family newborn birth first steps first smiles',
        'en-US', v_author_id, v_cat_family_en, 'published', NOW() - INTERVAL '7 days',
        'Baby First Year Memory Film | MEMOPYK',
        'Create a touching film of your baby''s first year. MEMOPYK turns photos into professional memories.',
        'baby memory film, first year video, baby film, newborn memories, family memories',
        4, 630, true
    ) ON CONFLICT (slug, language) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    RETURNING id INTO v_post4_id;
    
    -- Add tags to post 4
    INSERT INTO post_tags (post_id, tag_id) VALUES 
        (v_post4_id, v_tag_souvenir_film),
        (v_post4_id, v_tag_baby_first_year),
        (v_post4_id, v_tag_family_memories),
        (v_post4_id, v_tag_video_editing)
    ON CONFLICT DO NOTHING;
    
    -- POST 5: English - Travel Film
    INSERT INTO posts (
        title, slug, excerpt, content, content_text, language, 
        author_id, category_id, status, publish_date, 
        meta_title, meta_description, meta_keywords, 
        reading_time_minutes, word_count, is_featured
    ) VALUES (
        'Transform Your Travel Photos into an Epic Souvenir Film',
        'transform-travel-photos-epic-souvenir-film',
        'Scattered vacation memories on your phone? Create a professional travel film that captures the essence of your adventure.',
        '{"blocks":[{"type":"heading","content":"Relive your adventures like a documentary"},{"type":"paragraph","content":"A travel film tells your story with music and emotions. MEMOPYK transforms your travel photos into a professional documentary of your adventure."},{"type":"heading","content":"From photos to epic film"},{"type":"paragraph","content":"Natural transitions, immersive music, and professional editing create a cinematic experience of your travels."}]}'::jsonb,
        'travel film souvenir photos videos adventure vacation memories tourism',
        'en-US', v_author_id, v_cat_travel_en, 'published', NOW() - INTERVAL '14 days',
        'Travel Souvenir Film | Create Your Epic Film | MEMOPYK',
        'Create a professional film of your travels. MEMOPYK transforms photos into epic documentary.',
        'travel film, vacation memories, travel video editing, vacation film',
        5, 590, true
    ) ON CONFLICT (slug, language) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    RETURNING id INTO v_post5_id;
    
    -- Add tags to post 5
    INSERT INTO post_tags (post_id, tag_id) VALUES 
        (v_post5_id, v_tag_souvenir_film),
        (v_post5_id, v_tag_travel_memories),
        (v_post5_id, v_tag_video_editing)
    ON CONFLICT DO NOTHING;
    
    -- POST 6: English - Pet Memory Film
    INSERT INTO posts (
        title, slug, excerpt, content, content_text, language, 
        author_id, category_id, status, publish_date, 
        meta_title, meta_description, meta_keywords, 
        reading_time_minutes, word_count
    ) VALUES (
        'Celebrate Your Pet''s Life with a Professional Memory Film',
        'celebrate-pet-life-professional-memory-film',
        'Create a touching tribute film that celebrates your pet''s unique personality and the unconditional love you share.',
        '{"blocks":[{"type":"heading","content":"A heartfelt tribute to your companion"},{"type":"paragraph","content":"A pet memory film captures their playful energy, special moments, and the bond you share. MEMOPYK creates a heartfelt tribute you''ll treasure forever."},{"type":"heading","content":"Preserving precious memories"},{"type":"paragraph","content":"Professional editing and music transform your pet photos into an emotional journey celebrating their life and your love."}]}'::jsonb,
        'pet memory film dog cat animal tribute video memorial celebration',
        'en-US', v_author_id, v_cat_family_en, 'published', NOW() - INTERVAL '21 days',
        'Pet Memory Film | Touching Tribute | MEMOPYK',
        'Create a touching tribute film for your pet with MEMOPYK. Celebrate their life and your love.',
        'pet memory film, dog video, pet tribute, animal memories, pet celebration',
        5, 560
    ) ON CONFLICT (slug, language) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        updated_at = NOW()
    RETURNING id INTO v_post6_id;
    
    -- Add tags to post 6
    INSERT INTO post_tags (post_id, tag_id) VALUES 
        (v_post6_id, v_tag_souvenir_film),
        (v_post6_id, v_tag_family_memories),
        (v_post6_id, v_tag_video_editing)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ MEMOPYK SOUVENIR FILMS CONTENT DEPLOYED!';
    RAISE NOTICE 'French Posts: 3 (Baby, Travel, Family) | English Posts: 3 (Baby, Travel, Pet)';
    RAISE NOTICE 'Old note-taking posts set to DRAFT (hidden from public)';
END $$;

-- Success message
SELECT 
    COUNT(*) FILTER (WHERE status = 'published' AND language = 'fr-FR') as "Published French Posts",
    COUNT(*) FILTER (WHERE status = 'published' AND language = 'en-US') as "Published English Posts",
    COUNT(*) FILTER (WHERE status = 'draft') as "Draft Posts (Old Content)"
FROM posts;
