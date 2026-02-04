-- Migration: Fix Help Content from Naive User Test V2
-- Date: 2026-02-04
-- Fixes 11 mismatches identified in docs/help/TEST_REPORT_FLOWS_V2.md

-- ============================================================================
-- FIX 1: "Create a blog post" flow — Step 5 button labels
-- DB says "Generate" but code says "Generate AI Prompt"
-- DB says "Edit in Blog Editor" but code says "Save Blog Post"
-- ============================================================================
UPDATE help_flows
SET steps_json = jsonb_set(
  steps_json, '{4,instruction}',
  '"If you chose \"Generate with AI\": Enter your topic, select tone and keywords, then click <span class=\"help-btn\">Generate AI Prompt</span>. Copy the prompt to your AI assistant, paste the JSON response, then click <span class=\"help-btn\">Save Blog Post</span> to save and open in Blog Editor."'::jsonb
),
updated_at = NOW()
WHERE title = 'Create a blog post';

-- ============================================================================
-- FIX 2: "Create a blog post" flow — Step 6 remove Category
-- Category field doesn't exist. Fix "Featured Image" → "Hero Image"
-- ============================================================================
UPDATE help_flows
SET steps_json = jsonb_set(
  steps_json, '{5,instruction}',
  '"In the Blog Editor, configure: <span class=\"help-label\">Tags</span>, <span class=\"help-label\">Hero Image</span>, and <span class=\"help-label\">Description (SEO)</span>."'::jsonb
),
updated_at = NOW()
WHERE title = 'Create a blog post';

-- ============================================================================
-- FIX 3: Blog Hub screen — update tab list from 6 to 5
-- Remove Posts (Manual) and Posts (AI), add single Posts tab
-- ============================================================================
UPDATE help_screens
SET html_content = REPLACE(
  REPLACE(
    html_content,
    '<li><span class="help-tab">Posts (Manual)</span> - View, edit, and publish blog articles</li>',
    '<li><span class="help-tab">Posts</span> - View, edit, publish, and translate blog articles</li>'
  ),
  '<li><span class="help-tab">Posts (AI)</span> - Generate blog posts using AI</li>',
  ''
),
updated_at = NOW()
WHERE route = '/admin?tab=blog';

-- ============================================================================
-- FIX 4: Posts screen — remove stale "Posts (AI)" tip
-- ============================================================================
UPDATE help_screens
SET html_content = REPLACE(
  html_content,
  '<li>For AI-assisted posts, use the <span class="help-tab">Posts (AI)</span> tab instead.</li>',
  '<li>Click <span class="help-btn">New Post</span> to choose between writing from scratch or generating with AI.</li>'
),
updated_at = NOW()
WHERE route = '/admin?tab=posts';

-- ============================================================================
-- FIX 5: Posts screen — fix "New Post" button description
-- ============================================================================
UPDATE help_screens
SET html_content = REPLACE(
  html_content,
  '<span class="help-btn">New Post</span> (orange, top right) - Creates a blank post and opens it in the Blog Editor immediately.',
  '<span class="help-btn">New Post</span> (orange, top right) - Opens the creation page where you choose to write from scratch or generate with AI.'
),
updated_at = NOW()
WHERE route = '/admin?tab=posts';

-- ============================================================================
-- FIX 6: AI Creator screen — rename title, replace ChatGPT
-- ============================================================================
UPDATE help_screens
SET title = 'AI Creator',
    html_content = REPLACE(
      REPLACE(
        REPLACE(html_content,
          '<h3>Posts (AI)</h3>', '<h3>AI Creator</h3>'),
        'ChatGPT/Claude', 'your AI assistant'),
      'ChatGPT', 'your AI assistant'
    ),
    updated_at = NOW()
WHERE route = '/admin?tab=ai-creator';

-- ============================================================================
-- FIX 7: Blog Editor screen — replace ChatGPT references
-- ============================================================================
UPDATE help_screens
SET html_content = REPLACE(
  html_content,
  'ChatGPT or Claude', 'your AI assistant'
),
updated_at = NOW()
WHERE route = '/admin?tab=blog-edit';

-- ============================================================================
-- FIX 8: Blog Editor screen — fix Posts (Manual) reference in Tags section
-- ============================================================================
UPDATE help_screens
SET html_content = REPLACE(
  html_content,
  'the <span class="help-tab">Posts (Manual)</span> tab',
  'the <span class="help-tab">Posts</span> tab'
),
updated_at = NOW()
WHERE route = '/admin?tab=blog-edit';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check for remaining stale references in help_screens
SELECT route, title,
  html_content LIKE '%ChatGPT%' as has_chatgpt,
  html_content LIKE '%Posts (Manual)%' as has_posts_manual,
  html_content LIKE '%Posts (AI)%' as has_posts_ai
FROM help_screens
ORDER BY route;

-- Check for remaining stale references in help_flows
SELECT title,
  steps_json::text LIKE '%Category%' as has_category,
  steps_json::text LIKE '%ChatGPT%' as has_chatgpt
FROM help_flows;

-- Verify "Create a blog post" steps 5 and 6
SELECT title,
  steps_json->4->'instruction' as step5_instruction,
  steps_json->5->'instruction' as step6_instruction
FROM help_flows
WHERE title = 'Create a blog post';
