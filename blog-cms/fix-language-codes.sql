-- ============================================
-- MEMOPYK Blog CMS - Language Code Migration
-- Fix: 'en'/'fr' → 'en-US'/'fr-FR'
-- Date: 2025-10-03
-- ============================================

-- Step 1: Update categories
UPDATE categories SET language = 'fr-FR' WHERE language = 'fr';
UPDATE categories SET language = 'en-US' WHERE language = 'en';

-- Step 2: Update tags
UPDATE tags SET language = 'fr-FR' WHERE language = 'fr';
UPDATE tags SET language = 'en-US' WHERE language = 'en';

-- Step 3: Update posts
UPDATE posts SET language = 'fr-FR' WHERE language = 'fr';
UPDATE posts SET language = 'en-US' WHERE language = 'en';

-- Step 4: Update post_translations (if any exist)
UPDATE post_translations SET language = 'fr-FR' WHERE language = 'fr';
UPDATE post_translations SET language = 'en-US' WHERE language = 'en';

-- Step 5: Clean up languages table - Remove 2-letter codes
DELETE FROM languages WHERE code IN ('fr', 'en');

-- Step 6: Set fr-FR as default (France is 44.4% of your traffic)
UPDATE languages SET is_default = false WHERE code != 'fr-FR';
UPDATE languages SET is_default = true WHERE code = 'fr-FR';

-- Verification queries
SELECT 'Categories by language:' as check_type;
SELECT language, COUNT(*) as count FROM categories GROUP BY language ORDER BY language;

SELECT 'Tags by language:' as check_type;
SELECT language, COUNT(*) as count FROM tags GROUP BY language ORDER BY language;

SELECT 'Posts by language:' as check_type;
SELECT language, COUNT(*) as count FROM posts GROUP BY language ORDER BY language;

SELECT 'Languages table:' as check_type;
SELECT code, name, is_default, is_enabled FROM languages ORDER BY is_default DESC, code;
