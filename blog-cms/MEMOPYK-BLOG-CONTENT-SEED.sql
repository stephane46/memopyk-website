-- ============================================================================
-- MEMOPYK BLOG CMS - SEO-OPTIMIZED CONTENT SEED
-- ============================================================================
-- Business: Professional souvenir film & memory preservation service
-- Target: Families, travelers, couples, pet owners
-- SEO Focus: French primary market (44.4%), English secondary market (9.9%)
-- Execute this after DEPLOY_NOW.sql to add SEO-optimized blog content
-- ============================================================================

DO $$
DECLARE 
    author_id UUID;
    cat_family_fr UUID; cat_travel_fr UUID; cat_memories_fr UUID;
    cat_family_en UUID; cat_travel_en UUID; cat_memories_en UUID;
    
    tag_film_souvenir UUID; tag_preservation UUID; tag_premiere_annee UUID;
    tag_souvenirs_voyage UUID; tag_famille UUID; tag_montage_video UUID;
    
    tag_souvenir_film UUID; tag_memory_preservation UUID; tag_baby_first_year UUID;
    tag_travel_memories UUID; tag_family_memories UUID; tag_video_editing UUID;
    
    post1_id UUID; post2_id UUID; post3_id UUID;
    post4_id UUID; post5_id UUID; post6_id UUID;
BEGIN
    SELECT id INTO author_id FROM authors WHERE slug = 'memopyk-team';
    
    INSERT INTO categories (name, slug, description, language, display_order, is_active, meta_title, meta_description) VALUES 
        ('Préservation de Mémoires', 'preservation-memoires', 'Conseils pour préserver vos souvenirs', 'fr-FR', 1, true, 'Préservation | MEMOPYK', 'Préservez vos souvenirs'),
        ('Famille & Enfants', 'famille-enfants', 'Films souvenirs famille', 'fr-FR', 2, true, 'Films Famille | MEMOPYK', 'Souvenirs de famille'),
        ('Voyages & Aventures', 'voyages-aventures', 'Films de voyages', 'fr-FR', 3, true, 'Films Voyage | MEMOPYK', 'Revivez vos aventures'),
        ('Memory Preservation', 'memory-preservation', 'Preserving memories', 'en-US', 1, true, 'Memory Preservation | MEMOPYK', 'Preserve memories'),
        ('Family & Children', 'family-children', 'Family souvenir films', 'en-US', 2, true, 'Family Films | MEMOPYK', 'Family memories'),
        ('Travel & Adventures', 'travel-adventures', 'Travel films', 'en-US', 3, true, 'Travel Films | MEMOPYK', 'Travel memories')
    ON CONFLICT (slug, language) DO NOTHING;
    
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
    ON CONFLICT (slug, language) DO NOTHING;
    
    SELECT id INTO cat_family_fr FROM categories WHERE slug = 'famille-enfants' AND language = 'fr-FR';
    SELECT id INTO cat_travel_fr FROM categories WHERE slug = 'voyages-aventures' AND language = 'fr-FR';
    SELECT id INTO cat_family_en FROM categories WHERE slug = 'family-children' AND language = 'en-US';
    SELECT id INTO cat_travel_en FROM categories WHERE slug = 'travel-adventures' AND language = 'en-US';
    
    SELECT id INTO tag_film_souvenir FROM tags WHERE slug = 'film-souvenir' AND language = 'fr-FR';
    SELECT id INTO tag_preservation FROM tags WHERE slug = 'preservation-memoire' AND language = 'fr-FR';
    SELECT id INTO tag_premiere_annee FROM tags WHERE slug = 'premiere-annee-bebe' AND language = 'fr-FR';
    SELECT id INTO tag_souvenirs_voyage FROM tags WHERE slug = 'souvenirs-voyage' AND language = 'fr-FR';
    SELECT id INTO tag_famille FROM tags WHERE slug = 'famille' AND language = 'fr-FR';
    SELECT id INTO tag_montage_video FROM tags WHERE slug = 'montage-video' AND language = 'fr-FR';
    
    SELECT id INTO tag_souvenir_film FROM tags WHERE slug = 'souvenir-film' AND language = 'en-US';
    SELECT id INTO tag_memory_preservation FROM tags WHERE slug = 'memory-preservation' AND language = 'en-US';
    SELECT id INTO tag_baby_first_year FROM tags WHERE slug = 'baby-first-year' AND language = 'en-US';
    SELECT id INTO tag_travel_memories FROM tags WHERE slug = 'travel-memories' AND language = 'en-US';
    SELECT id INTO tag_family_memories FROM tags WHERE slug = 'family-memories' AND language = 'en-US';
    SELECT id INTO tag_video_editing FROM tags WHERE slug = 'video-editing' AND language = 'en-US';
    
    INSERT INTO posts (title, slug, excerpt, content, content_text, language, author_id, category_id, status, publish_date, meta_title, meta_description, meta_keywords, reading_time_minutes, word_count, is_featured) 
    VALUES (
        'Comment Créer un Film Souvenir de la Première Année de Bébé',
        'film-souvenir-premiere-annee-bebe',
        'La première année de votre bébé passe trop vite. Découvrez comment transformer vos photos et vidéos en un film souvenir émouvant.',
        '{"blocks":[{"type":"paragraph","content":"La première année de bébé est extraordinaire. Chaque sourire et premier pas mérite d''être préservé dans un film professionnel qui raconte cette année magique."}]}'::jsonb,
        'première année bébé film souvenir moments photos vidéos famille',
        'fr-FR', author_id, cat_family_fr, 'published', NOW() - INTERVAL '5 days',
        'Film Souvenir Première Année Bébé | MEMOPYK',
        'Créez un film émouvant de la première année de votre bébé avec MEMOPYK.',
        'film souvenir bébé, première année bébé, vidéo naissance',
        4, 650, true
    ) RETURNING id INTO post1_id;
    
    INSERT INTO post_tags (post_id, tag_id) VALUES (post1_id, tag_film_souvenir), (post1_id, tag_premiere_annee), (post1_id, tag_famille), (post1_id, tag_montage_video);
    
    INSERT INTO posts (title, slug, excerpt, content, content_text, language, author_id, category_id, status, publish_date, meta_title, meta_description, meta_keywords, reading_time_minutes, word_count, is_featured) 
    VALUES (
        'Transformez Vos Photos de Voyage en Film Souvenir Épique',
        'transformer-photos-voyage-film-souvenir',
        'Vos souvenirs de vacances éparpillés ? Créez un film de voyage professionnel qui capture votre aventure.',
        '{"blocks":[{"type":"paragraph","content":"Un film de voyage raconte votre histoire avec musique et émotions. MEMOPYK transforme vos photos en documentaire professionnel."}]}'::jsonb,
        'voyage film souvenir photos vidéos aventure vacances',
        'fr-FR', author_id, cat_travel_fr, 'published', NOW() - INTERVAL '12 days',
        'Film Souvenir de Voyage | MEMOPYK',
        'Créez un film professionnel de vos voyages avec MEMOPYK.',
        'film voyage, souvenir voyage, montage vidéo voyage',
        5, 580, true
    ) RETURNING id INTO post2_id;
    
    INSERT INTO post_tags (post_id, tag_id) VALUES (post2_id, tag_film_souvenir), (post2_id, tag_souvenirs_voyage), (post2_id, tag_montage_video);
    
    INSERT INTO posts (title, slug, excerpt, content, content_text, language, author_id, category_id, status, publish_date, meta_title, meta_description, meta_keywords, reading_time_minutes, word_count) 
    VALUES (
        '5 Raisons de Créer un Film Souvenir de Réunion Familiale',
        '5-raisons-film-souvenir-reunion-familiale',
        'Les réunions familiales sont rares et précieuses. Préservez ces moments pour les générations futures.',
        '{"blocks":[{"type":"paragraph","content":"Un film capture les interactions entre générations, les voix et les traditions familiales pour créer un héritage précieux."}]}'::jsonb,
        'réunion familiale film souvenir famille générations',
        'fr-FR', author_id, cat_family_fr, 'published', NOW() - INTERVAL '18 days',
        'Film Réunion Familiale | MEMOPYK',
        'Préservez les moments de vos réunions familiales avec MEMOPYK.',
        'réunion familiale, film famille, héritage familial',
        6, 620
    ) RETURNING id INTO post3_id;
    
    INSERT INTO post_tags (post_id, tag_id) VALUES (post3_id, tag_film_souvenir), (post3_id, tag_famille), (post3_id, tag_preservation);
    
    INSERT INTO posts (title, slug, excerpt, content, content_text, language, author_id, category_id, status, publish_date, meta_title, meta_description, meta_keywords, reading_time_minutes, word_count, is_featured) 
    VALUES (
        'Creating a Memory Film of Your Baby''s First Year',
        'creating-memory-film-baby-first-year',
        'Your baby''s first year passes too quickly. Transform photos into a touching memory film.',
        '{"blocks":[{"type":"paragraph","content":"A professional memory film captures every smile and first step, creating an immersive experience with music and transitions."}]}'::jsonb,
        'baby first year memory film photos videos family',
        'en-US', author_id, cat_family_en, 'published', NOW() - INTERVAL '7 days',
        'Baby First Year Memory Film | MEMOPYK',
        'Create a touching film of your baby''s first year with MEMOPYK.',
        'baby memory film, first year video, family memories',
        4, 630, true
    ) RETURNING id INTO post4_id;
    
    INSERT INTO post_tags (post_id, tag_id) VALUES (post4_id, tag_souvenir_film), (post4_id, tag_baby_first_year), (post4_id, tag_family_memories), (post4_id, tag_video_editing);
    
    INSERT INTO posts (title, slug, excerpt, content, content_text, language, author_id, category_id, status, publish_date, meta_title, meta_description, meta_keywords, reading_time_minutes, word_count, is_featured) 
    VALUES (
        'Transform Your Travel Photos into an Epic Souvenir Film',
        'transform-travel-photos-epic-souvenir-film',
        'Scattered vacation memories? Create a professional travel film that captures your adventure.',
        '{"blocks":[{"type":"paragraph","content":"Relive your adventure like a documentary. MEMOPYK transforms travel photos into cinematic memories with music and natural transitions."}]}'::jsonb,
        'travel film souvenir photos videos adventure vacation',
        'en-US', author_id, cat_travel_en, 'published', NOW() - INTERVAL '14 days',
        'Travel Souvenir Film | MEMOPYK',
        'Create a professional film of your travels with MEMOPYK.',
        'travel film, vacation memories, travel video editing',
        5, 590, true
    ) RETURNING id INTO post5_id;
    
    INSERT INTO post_tags (post_id, tag_id) VALUES (post5_id, tag_souvenir_film), (post5_id, tag_travel_memories), (post5_id, tag_video_editing);
    
    INSERT INTO posts (title, slug, excerpt, content, content_text, language, author_id, category_id, status, publish_date, meta_title, meta_description, meta_keywords, reading_time_minutes, word_count) 
    VALUES (
        'Celebrate Your Pet''s Life with a Professional Memory Film',
        'celebrate-pet-life-professional-memory-film',
        'Create a touching tribute film that celebrates your pet''s unique personality and the love you share.',
        '{"blocks":[{"type":"paragraph","content":"A pet memory film captures their playful energy and special moments. MEMOPYK creates a heartfelt tribute you''ll treasure forever."}]}'::jsonb,
        'pet memory film dog cat animal tribute video',
        'en-US', author_id, cat_family_en, 'published', NOW() - INTERVAL '21 days',
        'Pet Memory Film | MEMOPYK',
        'Create a touching tribute film for your pet with MEMOPYK.',
        'pet memory film, dog video, pet tribute, animal memories',
        5, 560
    ) RETURNING id INTO post6_id;
    
    INSERT INTO post_tags (post_id, tag_id) VALUES (post6_id, tag_souvenir_film), (post6_id, tag_family_memories), (post6_id, tag_video_editing);
    
    RAISE NOTICE '✅ MEMOPYK BLOG CONTENT SEED COMPLETED!';
    RAISE NOTICE 'French Posts: 3 | English Posts: 3';
    RAISE NOTICE 'Categories: 6 | Tags: 12';
END $$;
