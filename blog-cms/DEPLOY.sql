-- ============================================================================
-- MEMOPYK BLOG CMS - ONE-CLICK DEPLOYMENT
-- ============================================================================
-- Copy this ENTIRE file and paste into Supabase SQL Editor, then click RUN
-- Takes 15-30 seconds to complete
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS languages (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), code VARCHAR(10) UNIQUE NOT NULL, name VARCHAR(100) NOT NULL, native_name VARCHAR(100), is_default BOOLEAN DEFAULT false, is_enabled BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS authors (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, name VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, email VARCHAR(255) UNIQUE, bio TEXT, avatar_url TEXT, website_url TEXT, twitter_handle VARCHAR(50), linkedin_url TEXT, is_active BOOLEAN DEFAULT true, post_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS categories (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL, description TEXT, language VARCHAR(10) NOT NULL DEFAULT 'en', parent_id UUID REFERENCES categories(id) ON DELETE SET NULL, display_order INTEGER DEFAULT 0, post_count INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, meta_title VARCHAR(255), meta_description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(slug, language));
CREATE TABLE IF NOT EXISTS tags (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(100) NOT NULL, slug VARCHAR(100) NOT NULL, description TEXT, language VARCHAR(10) NOT NULL DEFAULT 'en', post_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(slug, language));
CREATE TABLE IF NOT EXISTS posts (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), title VARCHAR(500) NOT NULL, slug VARCHAR(500) NOT NULL, excerpt TEXT, content JSONB NOT NULL, content_text TEXT, language VARCHAR(10) NOT NULL DEFAULT 'en', author_id UUID REFERENCES authors(id) ON DELETE SET NULL, category_id UUID REFERENCES categories(id) ON DELETE SET NULL, status VARCHAR(20) NOT NULL DEFAULT 'draft', publish_date TIMESTAMPTZ, scheduled_date TIMESTAMPTZ, meta_title VARCHAR(255), meta_description TEXT, meta_keywords TEXT, canonical_url TEXT, og_image_url TEXT, og_description TEXT, featured_image_url TEXT, featured_image_alt TEXT, view_count INTEGER DEFAULT 0, like_count INTEGER DEFAULT 0, comment_count INTEGER DEFAULT 0, share_count INTEGER DEFAULT 0, reading_time_minutes INTEGER, word_count INTEGER, is_featured BOOLEAN DEFAULT false, is_pinned BOOLEAN DEFAULT false, allow_comments BOOLEAN DEFAULT true, search_vector tsvector, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), deleted_at TIMESTAMPTZ, UNIQUE(slug, language), CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived', 'scheduled')));
CREATE TABLE IF NOT EXISTS post_translations (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, language VARCHAR(10) NOT NULL, title VARCHAR(500) NOT NULL, slug VARCHAR(500) NOT NULL, excerpt TEXT, content JSONB NOT NULL, content_text TEXT, meta_title VARCHAR(255), meta_description TEXT, og_description TEXT, is_published BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(post_id, language), UNIQUE(slug, language));
CREATE TABLE IF NOT EXISTS post_tags (post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (post_id, tag_id));
CREATE TABLE IF NOT EXISTS images (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), post_id UUID REFERENCES posts(id) ON DELETE SET NULL, url TEXT NOT NULL, alt_text TEXT, caption TEXT, width INTEGER, height INTEGER, file_size INTEGER, mime_type VARCHAR(100), storage_path TEXT, uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS post_analytics (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE, view_date DATE NOT NULL, view_count INTEGER DEFAULT 0, unique_visitors INTEGER DEFAULT 0, avg_time_on_page INTEGER, bounce_rate DECIMAL(5,2), referrer_source VARCHAR(255), device_type VARCHAR(50), country_code VARCHAR(2), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(post_id, view_date, referrer_source, device_type));

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

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_post_search_vector() RETURNS TRIGGER AS $$ BEGIN NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') || setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'B') || setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'C'); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION increment_post_view_count(post_uuid UUID) RETURNS void AS $$ BEGIN UPDATE posts SET view_count = view_count + 1 WHERE id = post_uuid; END; $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION update_category_post_count() RETURNS TRIGGER AS $$ BEGIN IF TG_OP = 'INSERT' THEN UPDATE categories SET post_count = post_count + 1 WHERE id = NEW.category_id; ELSIF TG_OP = 'DELETE' THEN UPDATE categories SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.category_id; END IF; RETURN NULL; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION update_tag_post_count() RETURNS TRIGGER AS $$ BEGIN IF TG_OP = 'INSERT' THEN UPDATE tags SET post_count = post_count + 1 WHERE id = NEW.tag_id; ELSIF TG_OP = 'DELETE' THEN UPDATE tags SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.tag_id; END IF; RETURN NULL; END; $$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION get_post_with_translation(slug_param TEXT, preferred_language TEXT DEFAULT 'en') RETURNS TABLE (id UUID, title TEXT, slug TEXT, excerpt TEXT, content JSONB, language TEXT, author_id UUID, category_id UUID, status TEXT, publish_date TIMESTAMPTZ, meta_title TEXT, meta_description TEXT, featured_image_url TEXT, view_count INTEGER) AS $$ BEGIN RETURN QUERY SELECT p.id, COALESCE(pt.title, p.title), COALESCE(pt.slug, p.slug), COALESCE(pt.excerpt, p.excerpt), COALESCE(pt.content, p.content), p.language, p.author_id, p.category_id, p.status, p.publish_date, COALESCE(pt.meta_title, p.meta_title), COALESCE(pt.meta_description, p.meta_description), p.featured_image_url, p.view_count FROM posts p LEFT JOIN post_translations pt ON p.id = pt.post_id AND pt.language = preferred_language WHERE p.slug = slug_param AND p.status = 'published' AND p.deleted_at IS NULL LIMIT 1; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t1 ON posts; CREATE TRIGGER t1 BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS t2 ON authors; CREATE TRIGGER t2 BEFORE UPDATE ON authors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS t3 ON categories; CREATE TRIGGER t3 BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS t4 ON tags; CREATE TRIGGER t4 BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS t5 ON posts; CREATE TRIGGER t5 BEFORE INSERT OR UPDATE OF title, excerpt, content_text ON posts FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();
DROP TRIGGER IF EXISTS t6 ON posts; CREATE TRIGGER t6 AFTER INSERT OR DELETE ON posts FOR EACH ROW EXECUTE FUNCTION update_category_post_count();
DROP TRIGGER IF EXISTS t7 ON post_tags; CREATE TRIGGER t7 AFTER INSERT OR DELETE ON post_tags FOR EACH ROW EXECUTE FUNCTION update_tag_post_count();

ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p1 ON languages; CREATE POLICY p1 ON languages FOR SELECT USING (is_enabled = true);
DROP POLICY IF EXISTS p2 ON authors; CREATE POLICY p2 ON authors FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS p3 ON authors; CREATE POLICY p3 ON authors FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS p4 ON categories; CREATE POLICY p4 ON categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS p5 ON categories; CREATE POLICY p5 ON categories FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS p6 ON tags; CREATE POLICY p6 ON tags FOR SELECT USING (true);
DROP POLICY IF EXISTS p7 ON tags; CREATE POLICY p7 ON tags FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS p8 ON posts; CREATE POLICY p8 ON posts FOR SELECT USING (status = 'published' AND deleted_at IS NULL OR auth.uid() IN (SELECT user_id FROM authors WHERE id = posts.author_id) OR auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS p9 ON posts; CREATE POLICY p9 ON posts FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM authors WHERE id = posts.author_id) OR auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS p10 ON posts; CREATE POLICY p10 ON posts FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM authors WHERE id = posts.author_id) OR auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS p11 ON posts; CREATE POLICY p11 ON posts FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
DROP POLICY IF EXISTS p12 ON post_translations; CREATE POLICY p12 ON post_translations FOR SELECT USING (is_published = true);
DROP POLICY IF EXISTS p13 ON post_tags; CREATE POLICY p13 ON post_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS p14 ON images; CREATE POLICY p14 ON images FOR SELECT USING (true);
DROP POLICY IF EXISTS p15 ON post_analytics; CREATE POLICY p15 ON post_analytics FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

GRANT EXECUTE ON FUNCTION increment_post_view_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_post_with_translation(TEXT, TEXT) TO anon, authenticated;

INSERT INTO languages VALUES (uuid_generate_v4(),'en','English','English',false,true,NOW(),NOW()),(uuid_generate_v4(),'fr','French','Français',true,true,NOW(),NOW()),(uuid_generate_v4(),'en-US','English (US)','English (US)',false,true,NOW(),NOW()),(uuid_generate_v4(),'fr-FR','French (France)','Français (France)',false,true,NOW(),NOW()) ON CONFLICT DO NOTHING;
INSERT INTO authors VALUES (uuid_generate_v4(),NULL,'MEMOPYK Team','memopyk-team','team@memopyk.com','Équipe MEMOPYK - Conseils productivité',NULL,NULL,NULL,NULL,true,0,NOW(),NOW()) ON CONFLICT DO NOTHING;
INSERT INTO categories (name,slug,description,language,display_order,is_active,meta_title,meta_description) VALUES ('Productivité','productivite','Conseils productivité','fr',1,true,'Productivité | MEMOPYK','Conseils pour améliorer votre productivité'),('Prise de Notes','prise-de-notes','Techniques de prise de notes','fr',2,true,'Prise de Notes | MEMOPYK','Méthodes de prise de notes efficaces'),('Organisation','organisation','Organisation personnelle','fr',3,true,'Organisation | MEMOPYK','Guides d''organisation pratiques'),('Étudiants','etudiants','Conseils pour étudiants','fr',4,true,'Étudiants | MEMOPYK','Ressources pour la réussite étudiante'),('Travail à Distance','travail-a-distance','Télétravail','fr',5,true,'Travail à Distance | MEMOPYK','Optimiser le télétravail'),('Productivity','productivity','Productivity tips','en',1,true,'Productivity | MEMOPYK','Boost your productivity'),('Note-Taking','note-taking','Note-taking methods','en',2,true,'Note-Taking | MEMOPYK','Effective note-taking techniques'),('Organization','organization','Organization guides','en',3,true,'Organization | MEMOPYK','Personal organization guides'),('Students','students','Student resources','en',4,true,'Students | MEMOPYK','Student success resources'),('Remote Work','remote-work','Remote work tips','en',5,true,'Remote Work | MEMOPYK','Remote work optimization') ON CONFLICT DO NOTHING;
INSERT INTO tags (name,slug,description,language) VALUES ('prise de notes','prise-de-notes','Techniques notes','fr'),('productivité','productivite','Productivité','fr'),('organisation étudiante','organisation-etudiante','Organisation étudiants','fr'),('méthodes de travail','methodes-de-travail','Méthodes travail','fr'),('gestion du temps','gestion-du-temps','Gestion temps','fr'),('outils numériques','outils-numeriques','Outils numériques','fr'),('études','etudes','Conseils études','fr'),('concentration','concentration','Concentration','fr'),('organisation personnelle','organisation-personnelle','Organisation perso','fr'),('télétravail','teletravail','Télétravail','fr'),('note-taking app','note-taking-app','Note apps','en'),('productivity tool','productivity-tool','Productivity tools','en'),('time management','time-management','Time management','en'),('study tips','study-tips','Study tips','en'),('work organization','work-organization','Work organization','en'),('digital tools','digital-tools','Digital tools','en'),('focus','focus','Focus','en'),('remote work tips','remote-work-tips','Remote tips','en'),('student productivity','student-productivity','Student productivity','en'),('note-taking methods','note-taking-methods','Note methods','en') ON CONFLICT DO NOTHING;

DO $$
DECLARE a UUID; c1 UUID; c2 UUID; c3 UUID; p1 UUID; p2 UUID; p3 UUID; t1 UUID; t2 UUID; t3 UUID; t4 UUID;
BEGIN
  SELECT id INTO a FROM authors WHERE slug='memopyk-team';
  SELECT id INTO c1 FROM categories WHERE slug='prise-de-notes' AND language='fr';
  SELECT id INTO c2 FROM categories WHERE slug='productivite' AND language='fr';
  SELECT id INTO c3 FROM categories WHERE slug='organisation' AND language='fr';
  SELECT id INTO t1 FROM tags WHERE slug='prise-de-notes' AND language='fr';
  SELECT id INTO t2 FROM tags WHERE slug='productivite' AND language='fr';
  SELECT id INTO t3 FROM tags WHERE slug='methodes-de-travail' AND language='fr';
  SELECT id INTO t4 FROM tags WHERE slug='gestion-du-temps' AND language='fr';
  
  INSERT INTO posts VALUES (uuid_generate_v4(),'5 Méthodes de Prise de Notes pour Améliorer votre Productivité','5-methodes-prise-notes-productivite','Découvrez les 5 meilleures méthodes de prise de notes.',jsonb_build_object('blocks',jsonb_build_array(jsonb_build_object('type','paragraph','content','La prise de notes est essentielle.'),jsonb_build_object('type','heading','level',2,'content','1. Méthode Cornell'))),'Cornell Mind Mapping Puces','fr',a,c1,'published',NOW()-INTERVAL '5 days',NULL,'5 Méthodes de Prise de Notes | MEMOPYK','Les 5 meilleures méthodes de prise de notes.','prise de notes',NULL,NULL,NULL,NULL,NULL,0,0,0,0,5,850,true,false,true,NULL,NOW(),NOW(),NULL) RETURNING id INTO p1;
  INSERT INTO post_tags VALUES (p1,t1),(p1,t2),(p1,t3);
  
  INSERT INTO posts VALUES (uuid_generate_v4(),'Comment Gérer son Temps Efficacement : 7 Techniques','gerer-temps-efficacement-7-techniques','La gestion du temps est la clé de la productivité.',jsonb_build_object('blocks',jsonb_build_array(jsonb_build_object('type','paragraph','content','Gérer son temps est un défi.'),jsonb_build_object('type','heading','level',2,'content','1. Technique Pomodoro'))),'Pomodoro Eisenhower Time Blocking','fr',a,c2,'published',NOW()-INTERVAL '10 days',NULL,'Gestion du Temps | MEMOPYK','7 techniques de gestion du temps.','gestion du temps',NULL,NULL,NULL,NULL,NULL,0,0,0,0,7,1200,false,false,true,NULL,NOW(),NOW(),NULL) RETURNING id INTO p2;
  INSERT INTO post_tags VALUES (p2,t2),(p2,t4),(p2,t3);
  
  INSERT INTO posts VALUES (uuid_generate_v4(),'Organisation Étudiante : Guide Complet','organisation-etudiante-guide-complet','Organisez efficacement vos études, notes et temps.',jsonb_build_object('blocks',jsonb_build_array(jsonb_build_object('type','paragraph','content','La réussite dépend de votre organisation.'),jsonb_build_object('type','heading','level',2,'content','Organiser vos Notes'))),'Organisation notes révisions projets','fr',a,c3,'published',NOW()-INTERVAL '15 days',NULL,'Organisation Étudiante | MEMOPYK','Guide organisation pour étudiants.','organisation étudiante',NULL,NULL,NULL,NULL,NULL,0,0,0,0,6,1000,false,false,true,NULL,NOW(),NOW(),NULL) RETURNING id INTO p3;
  INSERT INTO post_tags VALUES (p3,t1),(p3,t2);
  
  RAISE NOTICE '✅ DEPLOYMENT COMPLETE!';
  RAISE NOTICE 'Languages: 4 | Categories: 10 | Tags: 20 | Posts: 3';
  RAISE NOTICE 'Next: Set admin role & link author to your user';
END $$;
