-- Rename help flows for unified "Create a blog post" mental model
-- Run with: psql $DATABASE_URL -f migrations/2026-02-04-rename-help-flows.sql

-- Rename "Publish a blog article" to "Create a blog post (Manual)"
UPDATE help_flows
SET title = 'Create a blog post (Manual)',
    updated_at = NOW(),
    updated_by = 'claude'
WHERE title = 'Publish a blog article';

-- Rename "Create a Post with AI" to "Create a blog post (AI-assisted)"
UPDATE help_flows
SET title = 'Create a blog post (AI-assisted)',
    updated_at = NOW(),
    updated_by = 'claude'
WHERE title = 'Create a Post with AI';

-- Verify the changes
SELECT id, title, description FROM help_flows ORDER BY title;
