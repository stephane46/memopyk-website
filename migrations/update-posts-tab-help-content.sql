-- Update Help Content: "Posts (Manual)" → "Posts"
-- Run with: psql $DATABASE_URL -f migrations/update-posts-tab-help-content.sql
-- Or execute via Supabase SQL Editor

-- Update help_screens: rename "Posts (Manual)" to "Posts"
UPDATE help_screens
SET title = 'Posts',
    html_content = REPLACE(html_content, 'Posts (Manual)', 'Posts'),
    updated_by = 'claude',
    updated_at = NOW()
WHERE route = '/admin?tab=posts';

-- Update help_flows: replace "Posts (Manual)" with "Posts" in all steps
UPDATE help_flows
SET steps_json = REPLACE(steps_json::text, 'Posts (Manual)', 'Posts')::jsonb,
    updated_by = 'claude',
    updated_at = NOW()
WHERE steps_json::text LIKE '%Posts (Manual)%';

-- Verify updates
SELECT title FROM help_screens WHERE route = '/admin?tab=posts';
SELECT title, steps_json->0->>'instruction' as step1 FROM help_flows WHERE steps_json::text LIKE '%Posts%';
