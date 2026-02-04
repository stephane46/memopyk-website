-- Merge two blog creation help flows into one unified flow
-- Run with: psql $DATABASE_URL -f migrations/merge-create-post-help-flows.sql
-- Or execute via Supabase SQL Editor
-- Date: 2026-02-04

-- ============================================================
-- STEP 1: CHECK CURRENT STATE (run these first to verify)
-- ============================================================

-- List all flows
SELECT id, title, description, updated_at FROM help_flows ORDER BY title;

-- List all screens
SELECT id, route, title, updated_at FROM help_screens ORDER BY route;

-- Check for ChatGPT/brand mentions and outdated tab names
SELECT title,
       steps_json::text ILIKE '%chatgpt%' as has_chatgpt,
       steps_json::text ILIKE '%Posts (Manual)%' as has_posts_manual,
       steps_json::text ILIKE '%Posts (AI)%' as has_posts_ai
FROM help_flows;

-- ============================================================
-- STEP 2: DELETE OLD CREATION FLOWS
-- ============================================================

-- Delete "Create a blog post (Manual)" flow
DELETE FROM help_flows WHERE title = 'Create a blog post (Manual)';

-- Delete "Create a blog post (AI-assisted)" flow
DELETE FROM help_flows WHERE title = 'Create a blog post (AI-assisted)';

-- Also delete any old names that might exist
DELETE FROM help_flows WHERE title = 'Publish a blog article';
DELETE FROM help_flows WHERE title = 'Create a Post with AI';

-- ============================================================
-- STEP 3: CREATE NEW MERGED CREATION FLOW
-- ============================================================

INSERT INTO help_flows (title, description, steps_json, updated_by, updated_at)
VALUES (
  'Create a blog post',
  'Step-by-step guide to create a blog post, manually or with AI assistance',
  '[
    {
      "step": 1,
      "route": "/admin?tab=posts",
      "title": "Go to Posts tab",
      "instruction": "In the <span class=\"help-tab\">Blog Hub</span>, click the <span class=\"help-tab\">Posts</span> tab to see all your blog posts."
    },
    {
      "step": 2,
      "route": "/admin?tab=posts",
      "title": "Click New Post",
      "instruction": "Click the <span class=\"help-btn\">+ New Post</span> button in the top-right corner. This opens the creation page."
    },
    {
      "step": 3,
      "route": "/admin?tab=new-post",
      "title": "Choose your method",
      "instruction": "You have two options: <span class=\"help-btn\">Write from scratch</span> opens the Blog Editor directly. <span class=\"help-btn\">Generate with AI</span> uses AI to create a draft."
    },
    {
      "step": 4,
      "route": "/admin?tab=blog-edit",
      "title": "Manual: Write your content",
      "instruction": "If you chose \"Write from scratch\": The Blog Editor opens with a blank post. Enter your <span class=\"help-label\">Title</span>, write your content in the editor, and add images as needed."
    },
    {
      "step": 5,
      "route": "/admin?tab=ai-creator",
      "title": "AI: Configure and generate",
      "instruction": "If you chose \"Generate with AI\": Enter your topic, select tone and keywords, then click <span class=\"help-btn\">Generate</span>. Review the result and click <span class=\"help-btn\">Edit in Blog Editor</span> to refine."
    },
    {
      "step": 6,
      "route": "/admin?tab=blog-edit",
      "title": "Set metadata",
      "instruction": "In the Blog Editor, configure: <span class=\"help-label\">Category</span>, <span class=\"help-label\">Tags</span>, <span class=\"help-label\">Featured Image</span>, and <span class=\"help-label\">Description (SEO)</span>."
    },
    {
      "step": 7,
      "route": "/admin?tab=blog-edit",
      "title": "Save and publish",
      "instruction": "Set <span class=\"help-label\">Status</span> to <span class=\"help-status\">Draft</span>, <span class=\"help-status\">In Review</span>, or <span class=\"help-status\">Published</span>. Click <span class=\"help-btn\">Save Changes</span>."
    }
  ]'::jsonb,
  'claude',
  NOW()
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 4: VERIFY & FIX TRANSLATION FLOW
-- ============================================================

-- Fix any "Posts (Manual)" references in translation flow
UPDATE help_flows
SET steps_json = REPLACE(steps_json::text, 'Posts (Manual)', 'Posts')::jsonb,
    updated_by = 'claude',
    updated_at = NOW()
WHERE title = 'Translate a post'
  AND steps_json::text LIKE '%Posts (Manual)%';

-- Remove any ChatGPT references (shouldn't be any, but just in case)
UPDATE help_flows
SET steps_json = REPLACE(steps_json::text, 'ChatGPT', 'AI')::jsonb,
    updated_by = 'claude',
    updated_at = NOW()
WHERE title = 'Translate a post'
  AND steps_json::text ILIKE '%chatgpt%';

-- ============================================================
-- STEP 5: ADD/UPDATE CREATEPOSTLANDING HELP SCREEN
-- ============================================================

INSERT INTO help_screens (route, title, html_content, tags, updated_by, updated_at)
VALUES (
  '/admin?tab=new-post',
  'New Post',
  '<h3>Create a New Blog Post</h3>
<p>This is your starting point for creating new content. Choose the method that works best for you:</p>

<h4><span class="help-btn">Write from scratch</span></h4>
<p>Opens the Blog Editor with a blank post. Best when you have a clear idea of what you want to write.</p>

<h4><span class="help-btn">Generate with AI</span></h4>
<p>Uses AI to generate a draft based on your topic and preferences. Great for overcoming writer''s block or getting a head start.</p>

<div class="help-tip" style="background: #FEF3C7; border-left: 4px solid #D67C4A; padding: 12px; margin-top: 16px; border-radius: 4px;">
  <strong>💡 Tip:</strong> You can always switch methods — start with AI to get a draft, then refine manually in the Blog Editor.
</div>',
  '{blog,create,new-post}',
  'claude',
  NOW()
)
ON CONFLICT (route) DO UPDATE SET
  title = EXCLUDED.title,
  html_content = EXCLUDED.html_content,
  tags = EXCLUDED.tags,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

-- ============================================================
-- STEP 6: LINK FLOW TO SCREENS
-- ============================================================

-- Get the new flow ID and update related_flow_ids on relevant screens
-- We need to do this in a transaction to capture the flow ID

DO $$
DECLARE
  create_flow_id UUID;
BEGIN
  -- Get the ID of the new "Create a blog post" flow
  SELECT id INTO create_flow_id FROM help_flows WHERE title = 'Create a blog post';

  IF create_flow_id IS NOT NULL THEN
    -- Link to Posts screen
    UPDATE help_screens
    SET related_flow_ids = array_append(
      COALESCE(array_remove(related_flow_ids, create_flow_id), '{}'),
      create_flow_id
    ),
    updated_at = NOW()
    WHERE route = '/admin?tab=posts';

    -- Link to CreatePostLanding screen
    UPDATE help_screens
    SET related_flow_ids = array_append(
      COALESCE(array_remove(related_flow_ids, create_flow_id), '{}'),
      create_flow_id
    ),
    updated_at = NOW()
    WHERE route = '/admin?tab=new-post';

    -- Link to Blog Editor screen
    UPDATE help_screens
    SET related_flow_ids = array_append(
      COALESCE(array_remove(related_flow_ids, create_flow_id), '{}'),
      create_flow_id
    ),
    updated_at = NOW()
    WHERE route = '/admin?tab=blog-edit';
  END IF;
END $$;

-- ============================================================
-- STEP 7: VERIFICATION QUERIES
-- ============================================================

-- Verify the new flow exists with correct steps
SELECT title, description,
       jsonb_array_length(steps_json) as step_count
FROM help_flows
WHERE title = 'Create a blog post';

-- Show all steps of the new flow
SELECT title,
       step->>'step' as step_num,
       step->>'title' as step_title,
       LEFT(step->>'instruction', 80) as instruction_preview
FROM help_flows,
     jsonb_array_elements(steps_json) as step
WHERE title = 'Create a blog post'
ORDER BY (step->>'step')::int;

-- Confirm old flows are gone
SELECT title FROM help_flows
WHERE title ILIKE '%manual%'
   OR title ILIKE '%ai-assisted%'
   OR title = 'Publish a blog article'
   OR title = 'Create a Post with AI';

-- Confirm no ChatGPT or outdated tab names anywhere
SELECT title, 'has ChatGPT' as issue
FROM help_flows WHERE steps_json::text ILIKE '%chatgpt%'
UNION ALL
SELECT title, 'has Posts (Manual)' as issue
FROM help_flows WHERE steps_json::text LIKE '%Posts (Manual)%'
UNION ALL
SELECT title, 'has Posts (AI)' as issue
FROM help_flows WHERE steps_json::text LIKE '%Posts (AI)%';

-- List all flows with step counts
SELECT title, description, jsonb_array_length(steps_json) as steps
FROM help_flows
ORDER BY title;

-- Verify screen-flow linking
SELECT hs.route, hs.title as screen_title,
       array_length(hs.related_flow_ids, 1) as linked_flow_count
FROM help_screens hs
WHERE hs.route IN ('/admin?tab=posts', '/admin?tab=new-post', '/admin?tab=blog-edit')
ORDER BY hs.route;

-- Show CreatePostLanding screen content
SELECT route, title, LEFT(html_content, 200) as content_preview
FROM help_screens
WHERE route = '/admin?tab=new-post';
