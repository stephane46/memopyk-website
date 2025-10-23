-- ============================================================================
-- VERIFICATION SCRIPT - Run After Deploying Content
-- ============================================================================
-- This script helps verify that your MEMOPYK souvenir films content
-- was deployed correctly and the old note-taking content is hidden
-- ============================================================================

-- 1. COUNT POSTS BY STATUS AND LANGUAGE
SELECT 
    '📊 POST STATUS SUMMARY' as "Report Section",
    status,
    language,
    COUNT(*) as "Count",
    STRING_AGG(title, ' | ') as "Titles"
FROM posts
GROUP BY status, language
ORDER BY status, language;

-- 2. LIST ALL PUBLISHED POSTS (Should be 6 souvenir film posts)
SELECT 
    '✅ PUBLISHED POSTS' as "Report Section",
    language,
    title,
    slug,
    is_featured,
    view_count,
    TO_CHAR(publish_date, 'YYYY-MM-DD') as "Published Date"
FROM posts
WHERE status = 'published'
ORDER BY language, publish_date DESC;

-- 3. LIST DRAFT POSTS (Should be 3 old note-taking posts)
SELECT 
    '📝 DRAFT POSTS (Hidden from Public)' as "Report Section",
    language,
    title,
    slug,
    TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI') as "Last Updated"
FROM posts
WHERE status = 'draft'
ORDER BY updated_at DESC;

-- 4. VERIFY CATEGORIES
SELECT 
    '📁 CATEGORIES' as "Report Section",
    language,
    name,
    slug,
    is_active,
    (SELECT COUNT(*) FROM posts WHERE category_id = categories.id AND status = 'published') as "Published Posts Count"
FROM categories
WHERE slug IN (
    'famille-enfants', 'voyages-aventures', 'preservation-memoires',
    'family-children', 'travel-adventures', 'memory-preservation'
)
ORDER BY language, name;

-- 5. VERIFY TAGS
SELECT 
    '🏷️ SOUVENIR FILM TAGS' as "Report Section",
    language,
    name,
    slug,
    (SELECT COUNT(DISTINCT post_id) FROM post_tags WHERE tag_id = tags.id) as "Posts Using This Tag"
FROM tags
WHERE slug IN (
    'film-souvenir', 'premiere-annee-bebe', 'souvenirs-voyage', 'famille', 'montage-video', 'preservation-memoire',
    'souvenir-film', 'baby-first-year', 'travel-memories', 'family-memories', 'video-editing', 'memory-preservation'
)
ORDER BY language, name;

-- 6. CHECK POST-TAG ASSOCIATIONS
SELECT 
    '🔗 POST-TAG ASSOCIATIONS' as "Report Section",
    p.language,
    p.title as "Post Title",
    STRING_AGG(t.name, ', ') as "Tags"
FROM posts p
JOIN post_tags pt ON p.id = pt.post_id
JOIN tags t ON pt.tag_id = t.id
WHERE p.status = 'published'
GROUP BY p.language, p.title
ORDER BY p.language, p.title;

-- 7. FEATURED POSTS CHECK
SELECT 
    '⭐ FEATURED POSTS' as "Report Section",
    language,
    title,
    slug,
    view_count
FROM posts
WHERE is_featured = true AND status = 'published'
ORDER BY language, title;

-- 8. SEO METADATA CHECK
SELECT 
    '🔍 SEO METADATA VERIFICATION' as "Report Section",
    language,
    title,
    CASE 
        WHEN meta_title IS NOT NULL THEN '✅ Has Meta Title'
        ELSE '❌ Missing Meta Title'
    END as "Meta Title Status",
    CASE 
        WHEN meta_description IS NOT NULL THEN '✅ Has Meta Description'
        ELSE '❌ Missing Meta Description'
    END as "Meta Description Status",
    CASE 
        WHEN meta_keywords IS NOT NULL THEN '✅ Has Keywords'
        ELSE '❌ Missing Keywords'
    END as "Keywords Status"
FROM posts
WHERE status = 'published'
ORDER BY language, title;

-- 9. CONTENT COMPLETENESS CHECK
SELECT 
    '📄 CONTENT COMPLETENESS' as "Report Section",
    language,
    title,
    CASE 
        WHEN excerpt IS NOT NULL AND LENGTH(excerpt) > 50 THEN '✅ Good'
        ELSE '⚠️ Too Short'
    END as "Excerpt Status",
    reading_time_minutes || ' min' as "Reading Time",
    word_count || ' words' as "Word Count",
    CASE 
        WHEN featured_image_url IS NOT NULL THEN '✅ Has Image'
        ELSE '❌ No Image'
    END as "Image Status"
FROM posts
WHERE status = 'published'
ORDER BY language, title;

-- 10. FINAL SUMMARY
SELECT 
    '📈 DEPLOYMENT SUMMARY' as "Report",
    (SELECT COUNT(*) FROM posts WHERE status = 'published' AND language = 'fr-FR') as "French Published Posts",
    (SELECT COUNT(*) FROM posts WHERE status = 'published' AND language = 'en-US') as "English Published Posts",
    (SELECT COUNT(*) FROM posts WHERE status = 'draft') as "Draft Posts (Hidden)",
    (SELECT COUNT(*) FROM categories WHERE is_active = true) as "Active Categories",
    (SELECT COUNT(*) FROM tags) as "Total Tags",
    (SELECT COUNT(*) FROM authors) as "Total Authors";

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ✅ French Published Posts: 3
-- ✅ English Published Posts: 3
-- ✅ Draft Posts (Hidden): 3
-- ✅ Active Categories: 6+ (including souvenir film categories)
-- ✅ Total Tags: 12+ (including souvenir film tags)
-- ✅ Featured Posts: 4 (2 French + 2 English baby & travel films)
-- ============================================================================

-- Run this final check to confirm everything is correct:
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM posts WHERE status = 'published') >= 6 
        THEN '✅ SUCCESS! Souvenir films content is deployed!'
        ELSE '⚠️ WARNING: Less than 6 published posts found'
    END as "Deployment Status";
