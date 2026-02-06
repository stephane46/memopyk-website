import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const newContent = `<h3>Topics</h3>
<p>Pre-researched blog topics with SEO data, content guidance, and image concepts. Topics are the foundation for AI-generated blog posts.</p>

<h4>Topic Fields</h4>
<ul>
  <li><strong>Title</strong> — The blog post title (becomes the H1)</li>
  <li><strong>Market</strong> — 🇫🇷 France or 🇺🇸 English target audience</li>
  <li><strong>Category</strong> — Content category (Photo, Video, Family, Digital, Crafts, Seasonal)</li>
  <li><strong>Type</strong> — Content type (How-To, Storytelling, etc.)</li>
  <li><strong>Priority</strong> — P1 (lowest) to P5 (highest)</li>
  <li><strong>Status</strong> — Backlog → Planned → In Progress → Published</li>
  <li><strong>Primary Keyword</strong> — Main SEO keyword to target</li>
  <li><strong>Secondary Keywords</strong> — Supporting keywords</li>
  <li><strong>Content Angle</strong> — Unique perspective for the article</li>
  <li><strong>Description</strong> — What the article should cover</li>
</ul>

<h4>Filters</h4>
<ul>
  <li><strong>Search</strong> — Search by title or keywords</li>
  <li><strong>Market</strong> — Filter by 🇫🇷 France or 🇺🇸 English</li>
  <li><strong>Category</strong> — Filter by content category</li>
  <li><strong>Status</strong> — Filter by workflow status</li>
  <li><strong>Type</strong> — Filter by content type</li>
</ul>

<h4>Actions</h4>
<ul>
  <li><span class="help-action help-add">➕ New Topic</span> — Create a topic manually</li>
  <li><span class="help-action help-edit">✏️ Edit</span> — Modify topic details</li>
  <li><span class="help-action help-delete">🗑️ Delete</span> — Remove topic (unlinks any posts)</li>
  <li><span class="help-action help-primary">✨ Create Post from Topic</span> — Generate a blog post using AI</li>
  <li><span class="help-action help-link">📖 View Posts</span> — See posts created from this topic</li>
</ul>

<h4>Tips</h4>
<ul>
  <li>Use the <strong>Market filter</strong> to plan French vs English content separately</li>
  <li>Focus on <strong>P4-P5 topics</strong> first — they have the highest potential</li>
  <li>Click any topic row to expand and see full details</li>
  <li>Topics with "Generated Nx" badge have been used to create posts</li>
</ul>`;

async function updateHelp() {
  console.log('Updating Topics help content...');

  const { data, error } = await supabase
    .from('help_screens')
    .update({
      html_content: newContent,
      updated_at: new Date().toISOString(),
      updated_by: 'claude-code'
    })
    .eq('route', '/admin?tab=topics')
    .select('id, title');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('✅ Updated:', JSON.stringify(data, null, 2));
}

updateHelp();
