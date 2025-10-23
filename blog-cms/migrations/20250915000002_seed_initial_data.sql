-- ============================================================================
-- MEMOPYK Blog CMS - Seed Initial Data
-- Version: 1.0.0
-- Date: 2025-09-15
-- Purpose: Populate initial categories, tags, and sample posts for testing
-- ============================================================================

-- ============================================================================
-- SEED LANGUAGES
-- ============================================================================
INSERT INTO languages (code, name, native_name, is_default, is_enabled) VALUES
    ('en', 'English', 'English', false, true),
    ('fr', 'French', 'Français', true, true),
    ('en-US', 'English (US)', 'English (US)', false, true),
    ('fr-FR', 'French (France)', 'Français (France)', false, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED CATEGORIES (French - Primary Market)
-- ============================================================================
INSERT INTO categories (name, slug, description, language, display_order, is_active, meta_title, meta_description) VALUES
    -- French categories (primary market - 44.4% of traffic)
    ('Productivité', 'productivite', 'Conseils et astuces pour améliorer votre productivité', 'fr', 1, true, 
     'Productivité - Conseils et Astuces | MEMOPYK', 
     'Découvrez nos meilleurs conseils pour améliorer votre productivité et organisation quotidienne.'),
    
    ('Prise de Notes', 'prise-de-notes', 'Méthodes et techniques de prise de notes efficaces', 'fr', 2, true,
     'Prise de Notes - Méthodes et Techniques | MEMOPYK',
     'Apprenez les meilleures techniques de prise de notes pour étudiants et professionnels.'),
    
    ('Organisation', 'organisation', 'Organisation personnelle et professionnelle', 'fr', 3, true,
     'Organisation - Guides et Outils | MEMOPYK',
     'Organisez votre vie personnelle et professionnelle avec nos guides pratiques.'),
    
    ('Étudiants', 'etudiants', 'Ressources et conseils pour étudiants', 'fr', 4, true,
     'Guide pour Étudiants | MEMOPYK',
     'Ressources et conseils spécialement conçus pour la réussite étudiante.'),
    
    ('Travail à Distance', 'travail-a-distance', 'Optimiser le télétravail', 'fr', 5, true,
     'Travail à Distance - Guide Complet | MEMOPYK',
     'Tous nos conseils pour optimiser votre travail à distance et rester productif.'),

    -- English categories (secondary market - 9.9% of traffic)
    ('Productivity', 'productivity', 'Tips and tricks to improve your productivity', 'en', 1, true,
     'Productivity Tips and Tricks | MEMOPYK',
     'Discover the best productivity tips to organize your daily life efficiently.'),
    
    ('Note-Taking', 'note-taking', 'Effective note-taking methods and techniques', 'en', 2, true,
     'Note-Taking Methods and Techniques | MEMOPYK',
     'Learn the best note-taking techniques for students and professionals.'),
    
    ('Organization', 'organization', 'Personal and professional organization', 'en', 3, true,
     'Organization Guides and Tools | MEMOPYK',
     'Organize your personal and professional life with our practical guides.'),
    
    ('Students', 'students', 'Resources and tips for students', 'en', 4, true,
     'Student Success Guide | MEMOPYK',
     'Resources and tips specially designed for student success.'),
    
    ('Remote Work', 'remote-work', 'Optimize remote working', 'en', 5, true,
     'Remote Work Complete Guide | MEMOPYK',
     'All our tips to optimize your remote work and stay productive.')
ON CONFLICT (slug, language) DO NOTHING;

-- ============================================================================
-- SEED TAGS (Targeting SEO Keywords)
-- ============================================================================
INSERT INTO tags (name, slug, description, language) VALUES
    -- French tags (aligned with SEO keywords)
    ('prise de notes', 'prise-de-notes', 'Techniques de prise de notes', 'fr'),
    ('productivité', 'productivite', 'Améliorer la productivité', 'fr'),
    ('organisation étudiante', 'organisation-etudiante', 'Organisation pour étudiants', 'fr'),
    ('méthodes de travail', 'methodes-de-travail', 'Méthodes de travail efficaces', 'fr'),
    ('gestion du temps', 'gestion-du-temps', 'Gérer son temps efficacement', 'fr'),
    ('outils numériques', 'outils-numeriques', 'Outils numériques de productivité', 'fr'),
    ('études', 'etudes', 'Conseils pour les études', 'fr'),
    ('concentration', 'concentration', 'Améliorer la concentration', 'fr'),
    ('organisation personnelle', 'organisation-personnelle', 'Organiser sa vie personnelle', 'fr'),
    ('télétravail', 'teletravail', 'Conseils télétravail', 'fr'),
    
    -- English tags (aligned with SEO keywords)
    ('note-taking app', 'note-taking-app', 'Note-taking applications', 'en'),
    ('productivity tool', 'productivity-tool', 'Productivity tools and apps', 'en'),
    ('time management', 'time-management', 'Time management techniques', 'en'),
    ('study tips', 'study-tips', 'Study tips and techniques', 'en'),
    ('work organization', 'work-organization', 'Organize your work', 'en'),
    ('digital tools', 'digital-tools', 'Digital productivity tools', 'en'),
    ('focus', 'focus', 'Improve focus and concentration', 'en'),
    ('remote work tips', 'remote-work-tips', 'Remote work best practices', 'en'),
    ('student productivity', 'student-productivity', 'Productivity for students', 'en'),
    ('note-taking methods', 'note-taking-methods', 'Effective note-taking methods', 'en')
ON CONFLICT (slug, language) DO NOTHING;

-- ============================================================================
-- SEED SAMPLE AUTHOR (You'll need to replace with actual user_id)
-- ============================================================================
-- Note: This creates a sample author. You should update the user_id with your actual auth.users id
INSERT INTO authors (name, slug, email, bio, is_active) VALUES
    ('MEMOPYK Team', 'memopyk-team', 'team@memopyk.com', 
     'L''équipe MEMOPYK partage des conseils et astuces pour améliorer votre productivité et organisation.',
     true)
ON CONFLICT (slug) DO NOTHING;

-- Get the author_id for sample posts
DO $
DECLARE
    v_author_id UUID;
    v_category_productivite_id UUID;
    v_category_prise_notes_id UUID;
    v_category_organisation_id UUID;
    v_category_productivity_id UUID;
    v_post_1_id UUID;
    v_post_2_id UUID;
    v_post_3_id UUID;
    v_tag_prise_notes_id UUID;
    v_tag_productivite_id UUID;
    v_tag_methodes_id UUID;
    v_tag_gestion_temps_id UUID;
    v_tag_note_taking_app_id UUID;
    v_tag_productivity_tool_id UUID;
BEGIN
    -- Get author ID
    SELECT id INTO v_author_id FROM authors WHERE slug = 'memopyk-team' LIMIT 1;
    
    -- Get category IDs
    SELECT id INTO v_category_productivite_id FROM categories WHERE slug = 'productivite' AND language = 'fr';
    SELECT id INTO v_category_prise_notes_id FROM categories WHERE slug = 'prise-de-notes' AND language = 'fr';
    SELECT id INTO v_category_organisation_id FROM categories WHERE slug = 'organisation' AND language = 'fr';
    SELECT id INTO v_category_productivity_id FROM categories WHERE slug = 'productivity' AND language = 'en';
    
    -- Get tag IDs
    SELECT id INTO v_tag_prise_notes_id FROM tags WHERE slug = 'prise-de-notes' AND language = 'fr';
    SELECT id INTO v_tag_productivite_id FROM tags WHERE slug = 'productivite' AND language = 'fr';
    SELECT id INTO v_tag_methodes_id FROM tags WHERE slug = 'methodes-de-travail' AND language = 'fr';
    SELECT id INTO v_tag_gestion_temps_id FROM tags WHERE slug = 'gestion-du-temps' AND language = 'fr';
    SELECT id INTO v_tag_note_taking_app_id FROM tags WHERE slug = 'note-taking-app' AND language = 'en';
    SELECT id INTO v_tag_productivity_tool_id FROM tags WHERE slug = 'productivity-tool' AND language = 'en';

    -- ========================================================================
    -- SAMPLE POST 1: French - Prise de Notes (PUBLISHED)
    -- ========================================================================
    INSERT INTO posts (
        title, slug, excerpt, content, content_text, language,
        author_id, category_id, status, publish_date,
        meta_title, meta_description, meta_keywords,
        reading_time_minutes, word_count, is_featured
    ) VALUES (
        '5 Méthodes de Prise de Notes pour Améliorer votre Productivité',
        '5-methodes-prise-notes-productivite',
        'Découvrez les 5 meilleures méthodes de prise de notes utilisées par les étudiants et professionnels les plus productifs. Guide complet avec exemples pratiques.',
        jsonb_build_object(
            'blocks', jsonb_build_array(
                jsonb_build_object('type', 'paragraph', 'content', 'La prise de notes est un art essentiel pour capturer et organiser l''information efficacement. Dans cet article, nous explorons 5 méthodes éprouvées qui transformeront votre façon de prendre des notes.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '1. La Méthode Cornell'),
                jsonb_build_object('type', 'paragraph', 'content', 'Développée à l''université Cornell, cette méthode divise votre page en trois sections : notes principales, mots-clés, et résumé. Elle favorise la révision active et la mémorisation.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '2. Le Mind Mapping'),
                jsonb_build_object('type', 'paragraph', 'content', 'Le mind mapping utilise des diagrammes visuels pour relier les concepts. Parfait pour les penseurs visuels et la créativité.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '3. La Méthode des Puces'),
                jsonb_build_object('type', 'paragraph', 'content', 'Simple mais efficace, la méthode des puces organise l''information de manière hiérarchique. Idéale pour les prises de notes rapides.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '4. La Méthode des Phrases'),
                jsonb_build_object('type', 'paragraph', 'content', 'Chaque nouvelle idée commence sur une nouvelle ligne. Cette méthode est excellente pour les cours magistraux où l''information vient rapidement.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '5. La Méthode des Encadrés'),
                jsonb_build_object('type', 'paragraph', 'content', 'Chaque sujet est isolé dans son propre encadré. Parfait pour les matières avec de nombreux concepts séparés.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', 'Conclusion'),
                jsonb_build_object('type', 'paragraph', 'content', 'Essayez ces différentes méthodes et trouvez celle qui correspond le mieux à votre style d''apprentissage. MEMOPYK vous permet d''utiliser toutes ces méthodes grâce à son interface flexible.')
            )
        ),
        'La prise de notes est un art essentiel pour capturer et organiser l''information efficacement. 1. La Méthode Cornell - Développée à l''université Cornell. 2. Le Mind Mapping - Utilise des diagrammes visuels. 3. La Méthode des Puces - Organisation hiérarchique. 4. La Méthode des Phrases - Chaque idée sur une nouvelle ligne. 5. La Méthode des Encadrés - Sujets isolés. Essayez MEMOPYK pour toutes ces méthodes.',
        'fr',
        v_author_id,
        v_category_prise_notes_id,
        'published',
        NOW() - INTERVAL '5 days',
        '5 Méthodes de Prise de Notes pour Booster votre Productivité',
        'Découvrez les 5 meilleures méthodes de prise de notes (Cornell, Mind Mapping, etc.) pour améliorer votre productivité. Guide complet avec exemples.',
        'prise de notes, méthodes, productivité, cornell, mind mapping, organisation',
        5,
        850,
        true
    ) RETURNING id INTO v_post_1_id;
    
    -- Add tags to post 1
    INSERT INTO post_tags (post_id, tag_id) VALUES
        (v_post_1_id, v_tag_prise_notes_id),
        (v_post_1_id, v_tag_productivite_id),
        (v_post_1_id, v_tag_methodes_id);

    -- ========================================================================
    -- SAMPLE POST 2: French - Productivité (PUBLISHED)
    -- ========================================================================
    INSERT INTO posts (
        title, slug, excerpt, content, content_text, language,
        author_id, category_id, status, publish_date,
        meta_title, meta_description, meta_keywords,
        reading_time_minutes, word_count
    ) VALUES (
        'Comment Gérer son Temps Efficacement : 7 Techniques Éprouvées',
        'gerer-temps-efficacement-7-techniques',
        'La gestion du temps est la clé de la productivité. Découvrez 7 techniques pratiques pour optimiser votre emploi du temps et accomplir plus en moins de temps.',
        jsonb_build_object(
            'blocks', jsonb_build_array(
                jsonb_build_object('type', 'paragraph', 'content', 'Dans notre monde hyperconnecté, gérer son temps est devenu un défi quotidien. Voici 7 techniques éprouvées pour reprendre le contrôle de votre agenda.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '1. La Technique Pomodoro'),
                jsonb_build_object('type', 'paragraph', 'content', 'Travaillez par intervalles de 25 minutes avec des pauses de 5 minutes. Cette méthode maintient votre concentration à son maximum.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '2. La Matrice d''Eisenhower'),
                jsonb_build_object('type', 'paragraph', 'content', 'Classez vos tâches selon leur urgence et importance. Concentrez-vous sur l''important, déléguez l''urgent.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '3. Le Time Blocking'),
                jsonb_build_object('type', 'paragraph', 'content', 'Bloquez des créneaux horaires spécifiques pour différentes activités. Votre calendrier devient votre meilleur allié.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '4. La Règle des 2 Minutes'),
                jsonb_build_object('type', 'paragraph', 'content', 'Si une tâche prend moins de 2 minutes, faites-la immédiatement. Évitez l''accumulation de petites tâches.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '5. Le Batching'),
                jsonb_build_object('type', 'paragraph', 'content', 'Regroupez les tâches similaires et traitez-les en une seule session. Réduisez le coût du changement de contexte.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '6. La Méthode GTD (Getting Things Done)'),
                jsonb_build_object('type', 'paragraph', 'content', 'Capturez tout, clarifiez, organisez, réfléchissez, engagez-vous. Un système complet de gestion de tâches.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '7. L''Analyse des Chronophages'),
                jsonb_build_object('type', 'paragraph', 'content', 'Identifiez vos activités chronophages et éliminez-les. Chaque minute compte.')
            )
        ),
        'Techniques de gestion du temps : Pomodoro, Matrice Eisenhower, Time Blocking, Règle des 2 minutes, Batching, GTD, Analyse des chronophages. Optimisez votre productivité avec ces méthodes éprouvées.',
        'fr',
        v_author_id,
        v_category_productivite_id,
        'published',
        NOW() - INTERVAL '10 days',
        'Gestion du Temps : 7 Techniques pour être Plus Productif',
        'Maîtrisez votre temps avec 7 techniques éprouvées : Pomodoro, Eisenhower, Time Blocking. Guide complet pour optimiser votre productivité.',
        'gestion du temps, productivité, pomodoro, eisenhower, time blocking, organisation',
        7,
        1200
    ) RETURNING id INTO v_post_2_id;
    
    -- Add tags to post 2
    INSERT INTO post_tags (post_id, tag_id) VALUES
        (v_post_2_id, v_tag_productivite_id),
        (v_post_2_id, v_tag_gestion_temps_id),
        (v_post_2_id, v_tag_methodes_id);

    -- ========================================================================
    -- SAMPLE POST 3: French - Organisation (PUBLISHED)
    -- ========================================================================
    INSERT INTO posts (
        title, slug, excerpt, content, content_text, language,
        author_id, category_id, status, publish_date,
        meta_title, meta_description, meta_keywords,
        reading_time_minutes, word_count
    ) VALUES (
        'Organisation Étudiante : Le Guide Complet pour Réussir vos Études',
        'organisation-etudiante-guide-complet',
        'Étudiants, découvrez comment organiser efficacement vos études, vos notes et votre temps. Méthodes pratiques pour exceller académiquement.',
        jsonb_build_object(
            'blocks', jsonb_build_array(
                jsonb_build_object('type', 'paragraph', 'content', 'La réussite académique dépend largement de votre organisation. Ce guide complet vous donne toutes les clés pour optimiser vos études.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', 'Organiser vos Notes de Cours'),
                jsonb_build_object('type', 'paragraph', 'content', 'Créez un système de classification clair : par matière, par date, par sujet. Utilisez des outils numériques comme MEMOPYK pour centraliser vos notes.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', 'Planifier vos Révisions'),
                jsonb_build_object('type', 'paragraph', 'content', 'Créez un planning de révision réaliste. Répartissez vos sessions sur plusieurs jours pour favoriser la mémorisation à long terme.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', 'Gérer les Projets et Devoirs'),
                jsonb_build_object('type', 'paragraph', 'content', 'Décomposez les grands projets en tâches plus petites. Fixez des deadlines intermédiaires pour éviter la procrastination.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', 'Équilibrer Études et Vie Personnelle'),
                jsonb_build_object('type', 'paragraph', 'content', 'Bloquez du temps pour vos loisirs et votre vie sociale. Un bon équilibre améliore votre productivité académique.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', 'Utiliser les Bons Outils'),
                jsonb_build_object('type', 'paragraph', 'content', 'MEMOPYK, calendrier numérique, applications de révision : choisissez les outils qui correspondent à votre style d''apprentissage.')
            )
        ),
        'Guide organisation étudiante : notes de cours, révisions, projets, équilibre vie personnelle, outils numériques. Optimisez votre réussite académique avec ces méthodes pratiques.',
        'fr',
        v_author_id,
        v_category_organisation_id,
        'published',
        NOW() - INTERVAL '15 days',
        'Organisation Étudiante : Guide Complet pour Réussir',
        'Guide complet d''organisation pour étudiants : notes, révisions, projets, équilibre vie personnelle. Méthodes pratiques pour exceller académiquement.',
        'organisation étudiante, études, révisions, notes de cours, productivité étudiante',
        6,
        1000
    ) RETURNING id INTO v_post_3_id;
    
    -- Add tags to post 3
    INSERT INTO post_tags (post_id, tag_id) VALUES
        (v_post_3_id, v_tag_prise_notes_id),
        (v_post_3_id, v_tag_productivite_id);

    -- ========================================================================
    -- SAMPLE POST 4: English Translation of Post 1 (DRAFT)
    -- ========================================================================
    INSERT INTO post_translations (
        post_id, language, title, slug, excerpt, content, content_text,
        meta_title, meta_description, is_published
    ) VALUES (
        v_post_1_id,
        'en',
        '5 Note-Taking Methods to Boost Your Productivity',
        '5-note-taking-methods-boost-productivity',
        'Discover the 5 best note-taking methods used by the most productive students and professionals. Complete guide with practical examples.',
        jsonb_build_object(
            'blocks', jsonb_build_array(
                jsonb_build_object('type', 'paragraph', 'content', 'Note-taking is an essential art for capturing and organizing information effectively. In this article, we explore 5 proven methods that will transform your note-taking approach.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '1. The Cornell Method'),
                jsonb_build_object('type', 'paragraph', 'content', 'Developed at Cornell University, this method divides your page into three sections: main notes, keywords, and summary. It promotes active review and memorization.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '2. Mind Mapping'),
                jsonb_build_object('type', 'paragraph', 'content', 'Mind mapping uses visual diagrams to connect concepts. Perfect for visual thinkers and creativity.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '3. The Bullet Point Method'),
                jsonb_build_object('type', 'paragraph', 'content', 'Simple yet effective, the bullet point method organizes information hierarchically. Ideal for quick note-taking.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '4. The Sentence Method'),
                jsonb_build_object('type', 'paragraph', 'content', 'Each new idea starts on a new line. This method is excellent for lectures where information comes quickly.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', '5. The Boxing Method'),
                jsonb_build_object('type', 'paragraph', 'content', 'Each topic is isolated in its own box. Perfect for subjects with many separate concepts.'),
                jsonb_build_object('type', 'heading', 'level', 2, 'content', 'Conclusion'),
                jsonb_build_object('type', 'paragraph', 'content', 'Try these different methods and find the one that best suits your learning style. MEMOPYK allows you to use all these methods thanks to its flexible interface.')
            )
        ),
        'Note-taking is essential for effective information capture. 1. Cornell Method 2. Mind Mapping 3. Bullet Points 4. Sentence Method 5. Boxing Method. Try MEMOPYK for all these methods.',
        '5 Note-Taking Methods to Boost Your Productivity | MEMOPYK',
        'Discover the 5 best note-taking methods (Cornell, Mind Mapping, etc.) to improve productivity. Complete guide with practical examples.',
        false
    );

    -- ========================================================================
    -- SEED ANALYTICS DATA (Sample)
    -- ========================================================================
    INSERT INTO post_analytics (post_id, view_date, view_count, unique_visitors, avg_time_on_page, bounce_rate, device_type, country_code)
    SELECT 
        v_post_1_id,
        CURRENT_DATE - (n || ' days')::INTERVAL,
        (random() * 50)::INTEGER + 10,
        (random() * 30)::INTEGER + 5,
        (random() * 180)::INTEGER + 60,
        (random() * 40)::NUMERIC + 20,
        CASE (random() * 2)::INTEGER 
            WHEN 0 THEN 'desktop'
            WHEN 1 THEN 'mobile'
            ELSE 'tablet'
        END,
        CASE (random() * 3)::INTEGER
            WHEN 0 THEN 'FR'
            WHEN 1 THEN 'US'
            WHEN 2 THEN 'CA'
            ELSE 'BR'
        END
    FROM generate_series(1, 5) AS n;

    RAISE NOTICE 'Sample blog posts created successfully!';
    RAISE NOTICE 'Post 1 (FR): 5 Méthodes de Prise de Notes - ID: %', v_post_1_id;
    RAISE NOTICE 'Post 2 (FR): Comment Gérer son Temps - ID: %', v_post_2_id;
    RAISE NOTICE 'Post 3 (FR): Organisation Étudiante - ID: %', v_post_3_id;
END $;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count inserted records
DO $
DECLARE
    v_language_count INTEGER;
    v_category_count INTEGER;
    v_tag_count INTEGER;
    v_author_count INTEGER;
    v_post_count INTEGER;
    v_translation_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_language_count FROM languages;
    SELECT COUNT(*) INTO v_category_count FROM categories;
    SELECT COUNT(*) INTO v_tag_count FROM tags;
    SELECT COUNT(*) INTO v_author_count FROM authors;
    SELECT COUNT(*) INTO v_post_count FROM posts;
    SELECT COUNT(*) INTO v_translation_count FROM post_translations;
    
    RAISE NOTICE '════════════════════════════════════════════';
    RAISE NOTICE 'SEED DATA SUMMARY';
    RAISE NOTICE '════════════════════════════════════════════';
    RAISE NOTICE 'Languages: %', v_language_count;
    RAISE NOTICE 'Categories: %', v_category_count;
    RAISE NOTICE 'Tags: %', v_tag_count;
    RAISE NOTICE 'Authors: %', v_author_count;
    RAISE NOTICE 'Posts: %', v_post_count;
    RAISE NOTICE 'Translations: %', v_translation_count;
    RAISE NOTICE '════════════════════════════════════════════';
    RAISE NOTICE 'Seed data migration completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Update author user_id with your auth.users id';
    RAISE NOTICE '2. Create your first real blog post';
    RAISE NOTICE '3. Test the frontend integration';
    RAISE NOTICE '════════════════════════════════════════════';
END $;
