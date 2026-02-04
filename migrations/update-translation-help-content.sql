-- Update Help Content for One-Click Translation
-- Run with: psql $DATABASE_URL -f migrations/update-translation-help-content.sql
-- Or execute via Supabase SQL Editor

-- Update "Translate a post" flow to reflect the new one-click flow
UPDATE help_flows
SET steps_json = '[
  {
    "step": 1,
    "route": "/admin?tab=posts",
    "title": "Find your post",
    "instruction": "Go to <span class=\"help-tab\">Posts (Manual)</span> and locate the post you want to translate."
  },
  {
    "step": 2,
    "route": "/admin?tab=posts",
    "title": "Click translate icon",
    "instruction": "Click the <span class=\"help-btn\">🌐</span> translate icon next to the post. A dialog will appear."
  },
  {
    "step": 3,
    "route": "/admin?tab=posts",
    "title": "Choose translation method",
    "instruction": "Choose <span class=\"help-btn\">✨ Translate with AI</span> for automatic translation, or <span class=\"help-btn\">Translate manually</span> to use your own tools."
  },
  {
    "step": 4,
    "route": "/admin?tab=blog-edit",
    "title": "Review AI translation",
    "instruction": "If you chose AI: the editor opens with the translated content. Review the title, description, and content for accuracy."
  },
  {
    "step": 5,
    "route": "/admin?tab=blog-edit",
    "title": "Manual translation (if chosen)",
    "instruction": "If you chose manual: the editor opens with the original content. Click <span class=\"help-btn\">Translation Assistant</span> to use the translation helper, or translate directly."
  },
  {
    "step": 6,
    "route": "/admin?tab=blog-edit",
    "title": "Edit and refine",
    "instruction": "Make any necessary edits to the translation. Images are automatically preserved in their original positions."
  },
  {
    "step": 7,
    "route": "/admin?tab=blog-edit",
    "title": "Update metadata",
    "instruction": "Verify the <span class=\"help-label\">Slug</span> is language-appropriate (e.g., ends in -en or -fr). Update the <span class=\"help-label\">Description (SEO)</span> if needed."
  },
  {
    "step": 8,
    "route": "/admin?tab=blog-edit",
    "title": "Set status and save",
    "instruction": "Change <span class=\"help-label\">Status</span> to <span class=\"help-status\">Published</span> when ready. Click <span class=\"help-btn\">Save Changes</span>."
  }
]',
description = 'Translate a post to another language using AI or manual tools',
updated_by = 'claude',
updated_at = NOW()
WHERE title = 'Translate a post';

-- Add a tip about translation to the Posts (Manual) help screen
UPDATE help_screens
SET html_content = html_content || '

<h4>Translating Posts</h4>
<p>Click the <span class="help-btn">🌐</span> translate icon on any post to create a translation. Choose <span class="help-btn">✨ Translate with AI</span> for one-click automatic translation, or <span class="help-btn">Translate manually</span> to use your own tools.</p>',
updated_by = 'claude',
updated_at = NOW()
WHERE route = '/admin?tab=posts'
AND html_content NOT LIKE '%Translating Posts%';

-- Verify updates
SELECT title, description FROM help_flows WHERE title = 'Translate a post';
SELECT route, title, LEFT(html_content, 200) as content_preview FROM help_screens WHERE route = '/admin?tab=posts';
