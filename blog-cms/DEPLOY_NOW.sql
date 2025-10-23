-- ============================================================================
-- MEMOPYK BLOG CMS - DÉPLOIEMENT IMMÉDIAT
-- ============================================================================
-- Exécutez ce fichier sur votre Supabase auto-hébergé
-- Temps d'exécution: 15-30 secondes
-- ============================================================================

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table: languages
CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    code VARCHAR(10) UNIQUE NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    native_name VARCHAR(100), 
    is_default BOOLEAN DEFAULT false, 
    is_enabled BOOLEAN DEFAULT true, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: authors
CREATE TABLE IF NOT EXISTS authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, 
    name VARCHAR(255) NOT NULL, 
    slug VARCHAR(255) UNIQUE NOT NULL, 
    email VARCHAR(255) UNIQUE, 
    bio TEXT, 
    avatar_url TEXT, 
    website_url TEXT, 
    twitter_handle VARCHAR(50), 
    linkedin_url TEXT, 
    is_active BOOLEAN DEFAULT true, 
    post_count INTEGER DEFAULT 0, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name VARCHAR(255) NOT NULL, 
    slug VARCHAR(255) NOT NULL, 
    description TEXT, 
    language VARCHAR(10) NOT NULL DEFAULT 'en', 
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL, 
    display_order INTEGER DEFAULT 0, 
    post_count INTEGER DEFAULT 0, 
    is_active BOOLEAN DEFAULT true, 
    meta_title VARCHAR(255), 
    meta_description TEXT, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    UNIQUE(slug, language)
);

-- Table: tags
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    name VARCHAR(100) NOT NULL, 
    slug VARCHAR(100) NOT NULL, 
    description TEXT, 
    language VARCHAR(10) NOT NULL DEFAULT 'en', 
    post_count INTEGER DEFAULT 0, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    UNIQUE(slug, language)
);

-- Table: posts (PRINCIPALE)
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    title VARCHAR(500) NOT NULL, 
    slug VARCHAR(500) NOT NULL, 
    excerpt TEXT, 
    content JSONB NOT NULL, 
    content_text TEXT, 
    language VARCHAR(10) NOT NULL DEFAULT 'en', 
    author_id UUID REFERENCES authors(id) ON DELETE SET NULL, 
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL, 
    status VARCHAR(20) NOT NULL DEFAULT 'draft', 
    publish_date TIMESTAMPTZ, 
    scheduled_date TIMESTAMPTZ, 
    meta_title VARCHAR(255), 
    meta_description TEXT, 
    meta_keywords TEXT, 
    canonical_url TEXT, 
    og_image_url TEXT, 
    og_description TEXT, 
    featured_image_url TEXT, 
    featured_image_alt TEXT, 
    view_count INTEGER DEFAULT 0, 
    like_count INTEGER DEFAULT 0, 
    comment_count INTEGER DEFAULT 0, 
    share_count INTEGER DEFAULT 0, 
    reading_time_minutes INTEGER, 
    word_count INTEGER, 
    is_featured BOOLEAN DEFAULT false, 
    is_pinned BOOLEAN DEFAULT false, 
    allow_comments BOOLEAN DEFAULT true, 
    search_vector tsvector, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    deleted_at TIMESTAMPTZ, 
    UNIQUE(slug, language), 
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived', 'scheduled'))
);

-- Table: post_translations
CREATE TABLE IF NOT EXISTS post_translations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, 
    language VARCHAR(10) NOT NULL, 
    title VARCHAR(500) NOT NULL, 
    slug VARCHAR(500) NOT NULL, 
    excerpt TEXT, 
    content JSONB NOT NULL, 
    content_text TEXT, 
    meta_title VARCHAR(255), 
    meta_description TEXT, 
    og_description TEXT, 
    is_published BOOLEAN DEFAULT false, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    UNIQUE(post_id, language), 
    UNIQUE(slug, language)
);

-- Table: post_tags (relation many-to-many)
CREATE TABLE IF NOT EXISTS post_tags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, 
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    PRIMARY KEY (post_id, tag_id)
);

-- Table: images
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL, 
    url TEXT NOT NULL, 
    alt_text TEXT, 
    caption TEXT, 
    width INTEGER, 
    height INTEGER, 
    file_size INTEGER, 
    mime_type VARCHAR(100), 
    storage_path TEXT, 
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: post_analytics
CREATE TABLE IF NOT EXISTS post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, 
    view_date DATE NOT NULL, 
    view_count INTEGER DEFAULT 0, 
    unique_visitors INTEGER DEFAULT 0, 
    avg_time_on_page INTEGER, 
    bounce_rate DECIMAL(5,2), 
    referrer_source VARCHAR(255), 
    device_type VARCHAR(50), 
    country_code VARCHAR(2), 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 
    UNIQUE(post_id, view_date, referrer_source, device_type)
);

-- ============================================================================
-- INDEXES (Performance SEO critique)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_language ON posts(language);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_publish_date ON posts(publish_date DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_slug_language ON posts(slug, language);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured) WHERE is_featured = true AND status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_content_text_gin ON posts USING GIN(content_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_post_translations_post_id ON post_translations(post_id);
CREATE INDEX IF NOT EXISTS idx_post_translations_language ON post_translations(language);
CREATE INDEX IF NOT EXISTS idx_categories_slug_language ON categories(slug, language);
CREATE INDEX IF NOT EXISTS idx_tags_slug_language ON tags(slug, language);
CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column() 
RETURNS TRIGGER AS $$ 
BEGIN 
    NEW.updated_at = NOW(); 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_post_search_vector() 
RETURNS TRIGGER AS $$ 
BEGIN 
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') || 
        setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') || 
        setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'C'); 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_view_count(post_uuid UUID) 
RETURNS void AS $$ 
BEGIN 
    UPDATE posts 
    SET view_count = view_count + 1 
    WHERE id = post_uuid; 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_category_post_count() 
RETURNS TRIGGER AS $$ 
BEGIN 
    IF TG_OP = 'INSERT' THEN 
        UPDATE categories 
        SET post_count = post_count + 1 
        WHERE id = NEW.category_id; 
    ELSIF TG_OP = 'DELETE' THEN 
        UPDATE categories 
        SET post_count = GREATEST(post_count - 1, 0) 
        WHERE id = OLD.category_id; 
    END IF; 
    RETURN NULL; 
END; 
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_tag_post_count() 
RETURNS TRIGGER AS $$ 
BEGIN 
    IF TG_OP = 'INSERT' THEN 
        UPDATE tags 
        SET post_count = post_count + 1 
        WHERE id = NEW.tag_id; 
    ELSIF TG_OP = 'DELETE' THEN 
        UPDATE tags 
        SET post_count = GREATEST(post_count - 1, 0) 
        WHERE id = OLD.tag_id; 
    END IF; 
    RETURN NULL; 
END; 
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_post_with_translation(
    slug_param TEXT, 
    preferred_language TEXT DEFAULT 'en'
) 
RETURNS TABLE (
    id UUID, title TEXT, slug TEXT, excerpt TEXT, content JSONB, 
    language TEXT, author_id UUID, category_id UUID, status TEXT, 
    publish_date TIMESTAMPTZ, meta_title TEXT, meta_description TEXT, 
    featured_image_url TEXT, view_count INTEGER
) AS $$ 
BEGIN 
    RETURN QUERY 
    SELECT p.id, COALESCE(pt.title, p.title)::TEXT, COALESCE(pt.slug, p.slug)::TEXT, 
           COALESCE(pt.excerpt, p.excerpt)::TEXT, COALESCE(pt.content, p.content), 
           p.language::TEXT, p.author_id, p.category_id, p.status::TEXT, p.publish_date, 
           COALESCE(pt.meta_title, p.meta_title)::TEXT, 
           COALESCE(pt.meta_description, p.meta_description)::TEXT, 
           p.featured_image_url::TEXT, p.view_count 
    FROM posts p 
    LEFT JOIN post_translations pt ON p.id = pt.post_id AND pt.language = preferred_language 
    WHERE p.slug = slug_param AND p.status = 'published' AND p.deleted_at IS NULL 
    LIMIT 1; 
END; 
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_posts_timestamp ON posts;
CREATE TRIGGER trigger_update_posts_timestamp BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_authors_timestamp ON authors;
CREATE TRIGGER trigger_update_authors_timestamp BEFORE UPDATE ON authors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_categories_timestamp ON categories;
CREATE TRIGGER trigger_update_categories_timestamp BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tags_timestamp ON tags;
CREATE TRIGGER trigger_update_tags_timestamp BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_post_search_vector ON posts;
CREATE TRIGGER trigger_update_post_search_vector BEFORE INSERT OR UPDATE OF title, excerpt, content_text ON posts FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

DROP TRIGGER IF EXISTS trigger_update_category_post_count ON posts;
CREATE TRIGGER trigger_update_category_post_count AFTER INSERT OR DELETE ON posts FOR EACH ROW EXECUTE FUNCTION update_category_post_count();

DROP TRIGGER IF EXISTS trigger_update_tag_post_count ON post_tags;
CREATE TRIGGER trigger_update_tag_post_count AFTER INSERT OR DELETE ON post_tags FOR EACH ROW EXECUTE FUNCTION update_tag_post_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_languages_select ON languages;
CREATE POLICY policy_languages_select ON languages FOR SELECT USING (is_enabled = true);

DROP POLICY IF EXISTS policy_authors_select ON authors;
CREATE POLICY policy_authors_select ON authors FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS policy_authors_all ON authors;
CREATE POLICY policy_authors_all ON authors FOR ALL USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS policy_categories_select ON categories;
CREATE POLICY policy_categories_select ON categories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS policy_categories_all ON categories;
CREATE POLICY policy_categories_all ON categories FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS policy_tags_select ON tags;
CREATE POLICY policy_tags_select ON tags FOR SELECT USING (true);

DROP POLICY IF EXISTS policy_tags_all ON tags;
CREATE POLICY policy_tags_all ON tags FOR ALL USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS policy_posts_select ON posts;
CREATE POLICY policy_posts_select ON posts FOR SELECT USING ((status = 'published' AND deleted_at IS NULL) OR auth.uid() IN (SELECT user_id FROM authors WHERE id = posts.author_id) OR (auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS policy_posts_insert ON posts;
CREATE POLICY policy_posts_insert ON posts FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM authors WHERE id = posts.author_id) OR (auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS policy_posts_update ON posts;
CREATE POLICY policy_posts_update ON posts FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM authors WHERE id = posts.author_id) OR (auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS policy_posts_delete ON posts;
CREATE POLICY policy_posts_delete ON posts FOR DELETE USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS policy_post_translations_select ON post_translations;
CREATE POLICY policy_post_translations_select ON post_translations FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS policy_post_tags_select ON post_tags;
CREATE POLICY policy_post_tags_select ON post_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS policy_images_select ON images;
CREATE POLICY policy_images_select ON images FOR SELECT USING (true);

DROP POLICY IF EXISTS policy_post_analytics_select ON post_analytics;
CREATE POLICY policy_post_analytics_select ON post_analytics FOR SELECT USING ((auth.jwt() ->> 'role') = 'admin');

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION increment_post_view_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_post_with_translation(TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO languages (code, name, native_name, is_default, is_enabled) VALUES 
    ('en', 'English', 'English', false, true),
    ('fr', 'French', 'Français', true, true),
    ('en-US', 'English (US)', 'English (US)', false, true),
    ('fr-FR', 'French (France)', 'Français (France)', false, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO authors (name, slug, email, bio, is_active) VALUES (
    'MEMOPYK Team', 'memopyk-team', 'team@memopyk.com', 
    'Équipe MEMOPYK - Experts en productivité et prise de notes', true
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, description, language, display_order, is_active, meta_title, meta_description) VALUES 
    ('Productivité', 'productivite', 'Conseils pour améliorer votre productivité au quotidien', 'fr', 1, true, 'Productivité | MEMOPYK', 'Conseils pour améliorer votre productivité'),
    ('Prise de Notes', 'prise-de-notes', 'Techniques et méthodes de prise de notes efficaces', 'fr', 2, true, 'Prise de Notes | MEMOPYK', 'Méthodes de prise de notes efficaces'),
    ('Organisation', 'organisation', 'Guides d''organisation personnelle et professionnelle', 'fr', 3, true, 'Organisation | MEMOPYK', 'Guides d''organisation pratiques'),
    ('Étudiants', 'etudiants', 'Ressources et conseils pour la réussite étudiante', 'fr', 4, true, 'Étudiants | MEMOPYK', 'Ressources pour la réussite étudiante'),
    ('Travail à Distance', 'travail-a-distance', 'Optimiser votre télétravail et productivité à distance', 'fr', 5, true, 'Travail à Distance | MEMOPYK', 'Optimiser le télétravail'),
    ('Productivity', 'productivity', 'Tips to boost your daily productivity', 'en', 1, true, 'Productivity | MEMOPYK', 'Boost your productivity'),
    ('Note-Taking', 'note-taking', 'Effective note-taking methods and techniques', 'en', 2, true, 'Note-Taking | MEMOPYK', 'Effective note-taking techniques'),
    ('Organization', 'organization', 'Personal and professional organization guides', 'en', 3, true, 'Organization | MEMOPYK', 'Personal organization guides'),
    ('Students', 'students', 'Resources for student success', 'en', 4, true, 'Students | MEMOPYK', 'Student success resources'),
    ('Remote Work', 'remote-work', 'Optimize your remote work productivity', 'en', 5, true, 'Remote Work | MEMOPYK', 'Remote work optimization')
ON CONFLICT (slug, language) DO NOTHING;

INSERT INTO tags (name, slug, description, language) VALUES 
    ('prise de notes', 'prise-de-notes', 'Techniques et outils de prise de notes', 'fr'),
    ('productivité', 'productivite', 'Améliorer sa productivité', 'fr'),
    ('organisation étudiante', 'organisation-etudiante', 'Organisation pour étudiants', 'fr'),
    ('méthodes de travail', 'methodes-de-travail', 'Méthodes de travail efficaces', 'fr'),
    ('gestion du temps', 'gestion-du-temps', 'Gérer son temps efficacement', 'fr'),
    ('outils numériques', 'outils-numeriques', 'Outils digitaux pour la productivité', 'fr'),
    ('études', 'etudes', 'Conseils pour les études', 'fr'),
    ('concentration', 'concentration', 'Améliorer sa concentration', 'fr'),
    ('organisation personnelle', 'organisation-personnelle', 'Organisation au quotidien', 'fr'),
    ('télétravail', 'teletravail', 'Travailler à distance efficacement', 'fr'),
    ('note-taking app', 'note-taking-app', 'Note-taking applications', 'en'),
    ('productivity tool', 'productivity-tool', 'Productivity tools and apps', 'en'),
    ('time management', 'time-management', 'Manage your time effectively', 'en'),
    ('study tips', 'study-tips', 'Tips for effective studying', 'en'),
    ('work organization', 'work-organization', 'Organize your work', 'en'),
    ('digital tools', 'digital-tools', 'Digital productivity tools', 'en'),
    ('focus', 'focus', 'Improve your focus', 'en'),
    ('remote work tips', 'remote-work-tips', 'Tips for remote work', 'en'),
    ('student productivity', 'student-productivity', 'Productivity for students', 'en'),
    ('note-taking methods', 'note-taking-methods', 'Note-taking techniques', 'en')
ON CONFLICT (slug, language) DO NOTHING;

-- ============================================================================
-- SAMPLE POSTS
-- ============================================================================

DO $$
DECLARE 
    author_id UUID; cat_notes_id UUID; cat_prod_id UUID; cat_org_id UUID;
    tag_notes_id UUID; tag_prod_id UUID; tag_methods_id UUID; tag_time_id UUID;
    post1_id UUID; post2_id UUID; post3_id UUID;
BEGIN
    SELECT id INTO author_id FROM authors WHERE slug = 'memopyk-team';
    SELECT id INTO cat_notes_id FROM categories WHERE slug = 'prise-de-notes' AND language = 'fr';
    SELECT id INTO cat_prod_id FROM categories WHERE slug = 'productivite' AND language = 'fr';
    SELECT id INTO cat_org_id FROM categories WHERE slug = 'organisation' AND language = 'fr';
    SELECT id INTO tag_notes_id FROM tags WHERE slug = 'prise-de-notes' AND language = 'fr';
    SELECT id INTO tag_prod_id FROM tags WHERE slug = 'productivite' AND language = 'fr';
    SELECT id INTO tag_methods_id FROM tags WHERE slug = 'methodes-de-travail' AND language = 'fr';
    SELECT id INTO tag_time_id FROM tags WHERE slug = 'gestion-du-temps' AND language = 'fr';
    
    INSERT INTO posts (title, slug, excerpt, content, content_text, language, author_id, category_id, status, publish_date, meta_title, meta_description, meta_keywords, reading_time_minutes, word_count, is_featured) 
    VALUES (
        '5 Méthodes de Prise de Notes pour Améliorer votre Productivité',
        '5-methodes-prise-notes-productivite',
        'Découvrez les 5 meilleures méthodes de prise de notes utilisées par les étudiants et professionnels les plus productifs.',
        jsonb_build_object('blocks', jsonb_build_array(
            jsonb_build_object('type', 'paragraph', 'content', 'La prise de notes est essentielle pour la réussite.'),
            jsonb_build_object('type', 'heading', 'level', 2, 'content', '1. Méthode Cornell')
        )),
        'Cornell Mind Mapping Puces méthodes prise de notes',
        'fr', author_id, cat_notes_id, 'published', NOW() - INTERVAL '5 days',
        '5 Méthodes de Prise de Notes | MEMOPYK',
        'Les 5 meilleures méthodes de prise de notes pour booster votre productivité.',
        'prise de notes, productivité, Cornell, Mind Mapping',
        5, 850, true
    ) RETURNING id INTO post1_id;
    INSERT INTO post_tags (post_id, tag_id) VALUES (post1_id, tag_notes_id), (post1_id, tag_prod_id), (post1_id, tag_methods_id);
    
    INSERT INTO posts (title, slug, excerpt, content, content_text, language, author_id, category_id, status, publish_date, meta_title, meta_description, meta_keywords, reading_time_minutes, word_count) 
    VALUES (
        'Comment Gérer son Temps Efficacement : 7 Techniques',
        'gerer-temps-efficacement-7-techniques',
        'La gestion du temps est la clé de la productivité. Découvrez 7 techniques éprouvées.',
        jsonb_build_object('blocks', jsonb_build_array(
            jsonb_build_object('type', 'paragraph', 'content', 'Gérer son temps est un défi quotidien.'),
            jsonb_build_object('type', 'heading', 'level', 2, 'content', '1. Technique Pomodoro')
        )),
        'Pomodoro Eisenhower Time Blocking gestion du temps',
        'fr', author_id, cat_prod_id, 'published', NOW() - INTERVAL '10 days',
        'Gestion du Temps : 7 Techniques | MEMOPYK',
        '7 techniques de gestion du temps pour améliorer votre productivité au quotidien.',
        'gestion du temps, productivité, Pomodoro',
        7, 1200
    ) RETURNING id INTO post2_id;
    INSERT INTO post_tags (post_id, tag_id) VALUES (post2_id, tag_prod_id), (post2_id, tag_time_id), (post2_id, tag_methods_id);
    
    INSERT INTO posts (title, slug, excerpt, content, content_text, language, author_id, category_id, status, publish_date, meta_title, meta_description, meta_keywords, reading_time_minutes, word_count) 
    VALUES (
        'Organisation Étudiante : Guide Complet',
        'organisation-etudiante-guide-complet',
        'Organisez efficacement vos études, notes et temps avec ce guide complet.',
        jsonb_build_object('blocks', jsonb_build_array(
            jsonb_build_object('type', 'paragraph', 'content', 'La réussite dépend de votre organisation.'),
            jsonb_build_object('type', 'heading', 'level', 2, 'content', 'Organiser vos Notes')
        )),
        'Organisation notes révisions projets étudiants',
        'fr', author_id, cat_org_id, 'published', NOW() - INTERVAL '15 days',
        'Organisation Étudiante : Guide Complet | MEMOPYK',
        'Guide complet d''organisation pour étudiants : notes, révisions, et gestion du temps.',
        'organisation étudiante, notes, révisions',
        6, 1000
    ) RETURNING id INTO post3_id;
    INSERT INTO post_tags (post_id, tag_id) VALUES (post3_id, tag_notes_id), (post3_id, tag_prod_id);
    
    RAISE NOTICE '✅ DÉPLOIEMENT TERMINÉ !';
    RAISE NOTICE 'Tables: 9 | Langues: 4 | Catégories: 10 | Tags: 20 | Articles: 3';
END $$;
