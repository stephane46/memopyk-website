-- Seed Help System content
-- Run with: psql $DATABASE_URL -f migrations/seed-help-content.sql

INSERT INTO help_screens (route, title, html_content, tags, updated_by) VALUES
('/admin?tab=posts', 'Blog Posts List', '<h3>Managing Blog Posts</h3><p>Filter by status, search by title, click to edit, trash icon to delete.</p>', '{blog,posts}', 'claude'),
('/admin?tab=blog-edit', 'Blog Editor', '<h3>Editing a Blog Post</h3><p>Title, content, hero image, SEO, tags, status. Save often with Ctrl+S.</p>', '{blog,editor}', 'claude'),
('/admin?tab=ai-creator', 'AI Blog Creator', '<h3>AI Content Creation</h3><p>Select topic, review keywords, generate draft, edit, add images.</p>', '{blog,ai}', 'claude'),
('/admin?tab=tags', 'Tag Management', '<h3>Managing Tags</h3><p>Create, edit, delete tags. Usage count shows posts per tag.</p>', '{blog,tags}', 'claude')
ON CONFLICT (route) DO UPDATE SET
  title = EXCLUDED.title,
  html_content = EXCLUDED.html_content,
  tags = EXCLUDED.tags,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

INSERT INTO help_flows (title, description, steps_json, updated_by) VALUES
('Publish a blog article', 'Step-by-step guide to create and publish a blog post', '[{"step":1,"route":"/admin?tab=blog","title":"Go to Blog Hub","instruction":"Click Blog in the sidebar to open the Blog Hub"},{"step":2,"route":"/admin?tab=posts","title":"Go to Posts","instruction":"Click the Posts tab to see all blog posts"},{"step":3,"route":"/admin?tab=posts","title":"Create New Post","instruction":"Click the + New Post button to open the editor"},{"step":4,"route":"/admin?tab=blog-edit","title":"Publish","instruction":"Write your content, set status to Published, and click Save"}]', 'claude');
