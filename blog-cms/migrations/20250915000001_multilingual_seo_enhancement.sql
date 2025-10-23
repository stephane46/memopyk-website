-- ============================================================================
-- MEMOPYK Blog CMS - Multilingual SEO Enhancement Migration
-- Version: 1.0.0
-- Date: 2025-09-15
-- Purpose: Complete blog CMS with multilingual support and SEO optimization
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- ============================================================================
-- LANGUAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL, -- e.g., 'en', 'fr', 'en-US', 'fr-FR'
    name VARCHAR(100) NOT NULL, -- e.g., 'English', 'Français'
    native_name VARCHAR(100), -- e.g., 'English', 'Français'
    is_default BOOLEAN DEFAULT false,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUTHORS TABLE
-- ============================================================================
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

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
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

-- ============================================================================
-- TAGS TABLE
-- ============================================================================
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

-- ============================================================================
-- POSTS TABLE (Main blog posts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content JSONB NOT NULL, -- Structured content (blocks, paragraphs, etc.)
    content_text TEXT, -- Plain text version for search
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    
    -- Author and categorization
    author_id UUID REFERENCES authors(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Publication status
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, published, archived
    publish_date TIMESTAMPTZ,
    scheduled_date TIMESTAMPTZ,
    
    -- SEO fields
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    canonical_url TEXT,
    og_image_url TEXT,
    og_description TEXT,
    
    -- Media
    featured_image_url TEXT,
    featured_image_alt TEXT,
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Content metadata
    reading_time_minutes INTEGER, -- Estimated reading time
    word_count INTEGER,
    
    -- Features
    is_featured BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    allow_comments BOOLEAN DEFAULT true,
    
    -- Search
    search_vector tsvector, -- Full-text search vector
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(slug, language),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived', 'scheduled'))
);

-- ============================================================================
-- POST_TRANSLATIONS TABLE (For multilingual content)
-- ============================================================================
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

-- ============================================================================
-- POST_TAGS TABLE (Many-to-many relationship)
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_tags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, tag_id)
);

-- ============================================================================
-- IMAGES TABLE (Media library)
-- ============================================================================
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    url TEXT NOT NULL,
    alt_text TEXT,
    caption TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(100),
    storage_path TEXT, -- Path in Supabase Storage
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- POST_ANALYTICS TABLE (Daily analytics tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    view_date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_time_on_page INTEGER, -- in seconds
    bounce_rate DECIMAL(5,2), -- percentage
    referrer_source VARCHAR(255),
    device_type VARCHAR(50), -- desktop, mobile, tablet
    country_code VARCHAR(2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, view_date, referrer_source, device_type)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_language ON posts(language);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_publish_date ON posts(publish_date DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_slug_language ON posts(slug, language);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(is_featured) WHERE is_featured = true AND status = 'published';
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_content_text_gin ON posts USING GIN(content_text gin_trgm_ops);

-- Post translations indexes
CREATE INDEX IF NOT EXISTS idx_post_translations_post_id ON post_translations(post_id);
CREATE INDEX IF NOT EXISTS idx_post_translations_language ON post_translations(language);
CREATE INDEX IF NOT EXISTS idx_post_translations_slug_language ON post_translations(slug, language);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug_language ON categories(slug, language);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_language ON categories(language);

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_slug_language ON tags(slug, language);
CREATE INDEX IF NOT EXISTS idx_tags_language ON tags(language);

-- Post tags indexes
CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);

-- Authors indexes
CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);
CREATE INDEX IF NOT EXISTS idx_authors_user_id ON authors(user_id);

-- Images indexes
CREATE INDEX IF NOT EXISTS idx_images_post_id ON images(post_id);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_by ON images(uploaded_by);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_post_analytics_post_date ON post_analytics(post_id, view_date DESC);
CREATE INDEX IF NOT EXISTS idx_post_analytics_date ON post_analytics(view_date DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Function to update search vector for posts
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER AS $
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.meta_keywords, '')), 'B');
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Function to increment post view count
CREATE OR REPLACE FUNCTION increment_post_view_count(post_uuid UUID)
RETURNS void AS $
BEGIN
    UPDATE posts 
    SET view_count = view_count + 1,
        updated_at = NOW()
    WHERE id = post_uuid;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update category post count
CREATE OR REPLACE FUNCTION update_category_post_count()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE categories 
        SET post_count = post_count + 1 
        WHERE id = NEW.category_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE categories 
        SET post_count = post_count - 1 
        WHERE id = OLD.category_id AND post_count > 0;
    ELSIF TG_OP = 'UPDATE' AND NEW.category_id != OLD.category_id THEN
        UPDATE categories 
        SET post_count = post_count - 1 
        WHERE id = OLD.category_id AND post_count > 0;
        UPDATE categories 
        SET post_count = post_count + 1 
        WHERE id = NEW.category_id;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Function to update tag post count
CREATE OR REPLACE FUNCTION update_tag_post_count()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags 
        SET post_count = post_count + 1 
        WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags 
        SET post_count = post_count - 1 
        WHERE id = OLD.tag_id AND post_count > 0;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Function to update author post count
CREATE OR REPLACE FUNCTION update_author_post_count()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE authors 
        SET post_count = post_count + 1 
        WHERE id = NEW.author_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE authors 
        SET post_count = post_count - 1 
        WHERE id = OLD.author_id AND post_count > 0;
    ELSIF TG_OP = 'UPDATE' AND NEW.author_id != OLD.author_id THEN
        UPDATE authors 
        SET post_count = post_count - 1 
        WHERE id = OLD.author_id AND post_count > 0;
        UPDATE authors 
        SET post_count = post_count + 1 
        WHERE id = NEW.author_id;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Function to get post with translation fallback
CREATE OR REPLACE FUNCTION get_post_with_translation(
    slug_param TEXT,
    preferred_language TEXT DEFAULT 'en'
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    excerpt TEXT,
    content JSONB,
    language TEXT,
    author_id UUID,
    category_id UUID,
    status TEXT,
    publish_date TIMESTAMPTZ,
    meta_title TEXT,
    meta_description TEXT,
    featured_image_url TEXT,
    view_count INTEGER,
    is_translation BOOLEAN
) AS $
BEGIN
    -- Try to get translation first
    RETURN QUERY
    SELECT 
        p.id,
        COALESCE(pt.title, p.title) as title,
        COALESCE(pt.slug, p.slug) as slug,
        COALESCE(pt.excerpt, p.excerpt) as excerpt,
        COALESCE(pt.content, p.content) as content,
        COALESCE(pt.language, p.language) as language,
        p.author_id,
        p.category_id,
        p.status,
        p.publish_date,
        COALESCE(pt.meta_title, p.meta_title) as meta_title,
        COALESCE(pt.meta_description, p.meta_description) as meta_description,
        p.featured_image_url,
        p.view_count,
        (pt.id IS NOT NULL) as is_translation
    FROM posts p
    LEFT JOIN post_translations pt ON p.id = pt.post_id AND pt.language = preferred_language
    WHERE (p.slug = slug_param OR pt.slug = slug_param)
        AND p.status = 'published'
        AND p.deleted_at IS NULL
    LIMIT 1;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS trigger_update_posts_updated_at ON posts;
CREATE TRIGGER trigger_update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_authors_updated_at ON authors;
CREATE TRIGGER trigger_update_authors_updated_at
    BEFORE UPDATE ON authors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_categories_updated_at ON categories;
CREATE TRIGGER trigger_update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_tags_updated_at ON tags;
CREATE TRIGGER trigger_update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_post_translations_updated_at ON post_translations;
CREATE TRIGGER trigger_update_post_translations_updated_at
    BEFORE UPDATE ON post_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Search vector trigger
DROP TRIGGER IF EXISTS trigger_update_post_search_vector ON posts;
CREATE TRIGGER trigger_update_post_search_vector
    BEFORE INSERT OR UPDATE OF title, excerpt, content_text, meta_keywords ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_search_vector();

-- Count triggers
DROP TRIGGER IF EXISTS trigger_update_category_post_count ON posts;
CREATE TRIGGER trigger_update_category_post_count
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_category_post_count();

DROP TRIGGER IF EXISTS trigger_update_tag_post_count ON post_tags;
CREATE TRIGGER trigger_update_tag_post_count
    AFTER INSERT OR DELETE ON post_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_post_count();

DROP TRIGGER IF EXISTS trigger_update_author_post_count ON posts;
CREATE TRIGGER trigger_update_author_post_count
    AFTER INSERT OR UPDATE OR DELETE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_author_post_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

-- Languages policies (public read, admin write)
CREATE POLICY "Languages are viewable by everyone"
    ON languages FOR SELECT
    USING (is_enabled = true);

CREATE POLICY "Languages are insertable by admins"
    ON languages FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Languages are updatable by admins"
    ON languages FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin');

-- Authors policies (public read active authors)
CREATE POLICY "Active authors are viewable by everyone"
    ON authors FOR SELECT
    USING (is_active = true);

CREATE POLICY "Authors can manage their own profile"
    ON authors FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all authors"
    ON authors FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Categories policies (public read active categories)
CREATE POLICY "Active categories are viewable by everyone"
    ON categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage categories"
    ON categories FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Tags policies (public read)
CREATE POLICY "Tags are viewable by everyone"
    ON tags FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage tags"
    ON tags FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Posts policies (public read published posts)
CREATE POLICY "Published posts are viewable by everyone"
    ON posts FOR SELECT
    USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "Authors can view their own posts"
    ON posts FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM authors WHERE id = posts.author_id
        )
    );

CREATE POLICY "Authors can create posts"
    ON posts FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM authors WHERE id = posts.author_id
        )
    );

CREATE POLICY "Authors can update their own posts"
    ON posts FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM authors WHERE id = posts.author_id
        )
    );

CREATE POLICY "Admins can manage all posts"
    ON posts FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Post translations policies
CREATE POLICY "Published post translations are viewable by everyone"
    ON post_translations FOR SELECT
    USING (
        is_published = true AND
        post_id IN (
            SELECT id FROM posts 
            WHERE status = 'published' AND deleted_at IS NULL
        )
    );

CREATE POLICY "Authors can manage translations of their posts"
    ON post_translations FOR ALL
    USING (
        post_id IN (
            SELECT p.id FROM posts p
            INNER JOIN authors a ON p.author_id = a.id
            WHERE a.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all translations"
    ON post_translations FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Post tags policies
CREATE POLICY "Post tags are viewable by everyone"
    ON post_tags FOR SELECT
    USING (
        post_id IN (
            SELECT id FROM posts 
            WHERE status = 'published' AND deleted_at IS NULL
        )
    );

CREATE POLICY "Authors can manage tags for their posts"
    ON post_tags FOR ALL
    USING (
        post_id IN (
            SELECT p.id FROM posts p
            INNER JOIN authors a ON p.author_id = a.id
            WHERE a.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all post tags"
    ON post_tags FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Images policies
CREATE POLICY "Images are viewable by everyone"
    ON images FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can upload images"
    ON images FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can manage their own images"
    ON images FOR ALL
    USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all images"
    ON images FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Analytics policies (read-only for authors, full access for admins)
CREATE POLICY "Authors can view analytics for their posts"
    ON post_analytics FOR SELECT
    USING (
        post_id IN (
            SELECT p.id FROM posts p
            INNER JOIN authors a ON p.author_id = a.id
            WHERE a.user_id = auth.uid()
        )
        OR auth.jwt() ->> 'role' = 'admin'
    );

CREATE POLICY "System can insert analytics"
    ON post_analytics FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can manage all analytics"
    ON post_analytics FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

-- Grant permissions for anon role to increment view count
GRANT EXECUTE ON FUNCTION increment_post_view_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_post_with_translation(TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE posts IS 'Main blog posts table with multilingual support and SEO optimization';
COMMENT ON TABLE post_translations IS 'Translations for posts in different languages';
COMMENT ON TABLE categories IS 'Post categories with hierarchical support';
COMMENT ON TABLE tags IS 'Post tags for flexible organization';
COMMENT ON TABLE authors IS 'Blog post authors linked to auth users';
COMMENT ON TABLE images IS 'Media library for blog images';
COMMENT ON TABLE post_analytics IS 'Daily analytics tracking for posts';
COMMENT ON TABLE languages IS 'Supported languages configuration';

COMMENT ON COLUMN posts.content IS 'Structured content stored as JSONB for flexibility';
COMMENT ON COLUMN posts.content_text IS 'Plain text version for full-text search';
COMMENT ON COLUMN posts.search_vector IS 'Full-text search vector (auto-generated)';
COMMENT ON COLUMN posts.view_count IS 'Total view count for the post';
COMMENT ON COLUMN posts.reading_time_minutes IS 'Estimated reading time in minutes';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log completion
DO $
BEGIN
    RAISE NOTICE 'MEMOPYK Blog CMS schema deployed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run seed data migration (20250915000002_seed_initial_data.sql)';
    RAISE NOTICE '2. Configure admin user roles';
    RAISE NOTICE '3. Test with sample blog post creation';
END $;
