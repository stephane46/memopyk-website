-- Update help content for Topics tab with plain-language terminology
-- Run this in Supabase SQL Editor

UPDATE help_screens
SET html_content = '<h3>Topics</h3>
<p>Pre-researched blog topics with SEO data, content guidance, and image concepts. Topics are the foundation for AI-generated blog posts.</p>

<h4>What are Topic Groups?</h4>
<p>A <strong>Topic Group</strong> is a collection of related articles about the same theme. For example, the "Gift Retirement" group contains all articles about retirement gift ideas. Grouping articles this way helps search engines understand your site structure and boosts rankings.</p>

<h4>Main Guide vs Supporting Article</h4>
<ul>
  <li><strong>Main Guide</strong> — A broad, comprehensive article that covers the entire topic (e.g. "Retirement Gift Ideas: The Complete Guide"). This is the anchor of the group.</li>
  <li><strong>Supporting Article</strong> — A focused article that dives deep into one specific angle (e.g. "Best Retirement Gifts for Women"). Supporting articles link back to their Main Guide.</li>
</ul>

<h4>How the list is organized</h4>
<ul>
  <li>Topics are <strong>grouped by Topic Group</strong> with collapsible sections</li>
  <li>Within each group, <strong>Main Guides appear first</strong>, followed by Supporting Articles</li>
  <li>Supporting Articles are <strong>indented</strong> to show the hierarchy visually</li>
  <li>Groups are sorted by total search volume (highest first)</li>
</ul>

<h4>Topic Fields</h4>
<ul>
  <li><strong>Title</strong> — The blog post title (becomes the H1)</li>
  <li><strong>Article Role</strong> — Main Guide or Supporting Article</li>
  <li><strong>Topic Group</strong> — Which group of related articles this belongs to</li>
  <li><strong>Parent Guide</strong> — For Supporting Articles: which Main Guide it supports</li>
  <li><strong>Market</strong> — Target audience (France or English)</li>
  <li><strong>Category</strong> — Content category (Photo, Video, Family, Digital, Crafts, Seasonal)</li>
  <li><strong>Type</strong> — Content type (How-To, Storytelling, etc.)</li>
  <li><strong>Priority</strong> — P1 (lowest) to P5 (highest)</li>
  <li><strong>Status</strong> — Backlog, Planned, In Progress, or Published</li>
  <li><strong>Primary Keyword</strong> — Main SEO keyword to target</li>
  <li><strong>Secondary Keywords</strong> — Supporting keywords</li>
  <li><strong>Content Angle</strong> — Unique perspective for the article</li>
  <li><strong>Description</strong> — What the article should cover</li>
</ul>

<h4>Filters</h4>
<ul>
  <li><strong>Search</strong> — Search by title or keywords</li>
  <li><strong>Article Role</strong> — Show only Main Guides or Supporting Articles</li>
  <li><strong>Topic Group</strong> — Show only topics from a specific group</li>
  <li><strong>Market</strong> — Filter by France or English</li>
  <li><strong>Category</strong> — Filter by content category</li>
  <li><strong>Status</strong> — Filter by workflow status</li>
  <li><strong>Type</strong> — Filter by content type</li>
  <li><strong>Priority</strong> — Filter by priority level</li>
</ul>

<h4>Actions</h4>
<ul>
  <li><span class="help-action help-add">New Topic</span> — Create a topic manually</li>
  <li><span class="help-action help-edit">Edit</span> — Modify topic details</li>
  <li><span class="help-action help-delete">Delete</span> — Remove topic (unlinks any posts)</li>
  <li><span class="help-action help-primary">Create Post from Topic</span> — Generate a blog post using AI</li>
  <li><span class="help-action help-link">View Posts</span> — See posts created from this topic</li>
</ul>

<h4>Tips</h4>
<ul>
  <li>Start by creating a <strong>Main Guide</strong> for each Topic Group, then add Supporting Articles around it</li>
  <li>Use the <strong>Article Role filter</strong> to quickly see all your Main Guides at a glance</li>
  <li>Use the <strong>Topic Group filter</strong> to focus on one group at a time</li>
  <li>Click any topic row to expand and see full details</li>
  <li>Collapse topic groups you are not working on to keep the list manageable</li>
  <li>Topics with "Generated Nx" badge have been used to create posts</li>
</ul>',
    updated_at = NOW()
WHERE id = '573ad402-f9d3-43df-a3c6-ddc09c0562a0';
