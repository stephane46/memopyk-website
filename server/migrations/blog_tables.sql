-- Blog System Tables Migration
-- Creates blog_posts, blog_tags, blog_post_tags, and blog_galleries tables

-- 1) Main blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  language VARCHAR(10) NOT NULL CHECK (language IN ('en-US', 'fr-FR')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'published')),
  content_html TEXT NOT NULL,
  description TEXT,
  hero_url TEXT,
  hero_caption TEXT,
  read_time_minutes INTEGER,
  seo JSONB,
  is_featured BOOLEAN DEFAULT false,
  featured_order INTEGER,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Blog tags table
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT,
  icon TEXT
);

-- 3) Post-Tag junction table (many-to-many)
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- 4) Blog galleries table (optional images per post)
CREATE TABLE IF NOT EXISTS blog_galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  sort INTEGER,
  url TEXT NOT NULL,
  title TEXT,
  alt TEXT
);

-- 5) Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION blog_set_updated_at() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_set_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_set_updated_at 
BEFORE UPDATE ON blog_posts
FOR EACH ROW EXECUTE FUNCTION blog_set_updated_at();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_language ON blog_posts(language);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured ON blog_posts(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post_id ON blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON blog_post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_blog_galleries_post_id ON blog_galleries(post_id);
