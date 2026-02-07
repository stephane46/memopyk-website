-- Update help content for Planned Posts tab (formerly "Topics")
-- Run this in Supabase SQL Editor

UPDATE help_screens
SET html_content = '<h3>Planned Posts</h3>
<p>Your blog post backlog. Each entry here becomes one published blog post. Plan what to write, then use "Create Post" to generate it with AI.</p>

<h4>Two views</h4>
<ul>
  <li><strong>List view</strong> (default) — A flat list sorted by status (In Progress first, then Planned, Backlog, Published), then by search volume.</li>
  <li><strong>Grouped view</strong> — Posts organized by Topic Group with collapsible sections. Main Guides appear first, Supporting Articles are indented below.</li>
</ul>
<p>Switch between views using the <strong>List / Grouped</strong> toggle in the header.</p>

<h4>What are Topic Groups?</h4>
<p>A <strong>Topic Group</strong> is a collection of related articles about the same theme. For example, the "Gift Retirement" group contains all articles about retirement gift ideas. Grouping articles this way helps search engines understand your site structure and boosts rankings.</p>

<h4>Main Guide vs Supporting Article</h4>
<ul>
  <li><strong>Main Guide</strong> — A broad, comprehensive article that covers the entire topic (e.g. "Retirement Gift Ideas"). This is the anchor of the group.</li>
  <li><strong>Supporting Article</strong> — A focused article that dives deep into one specific angle (e.g. "Best Retirement Gifts for Women"). Supporting articles link back to their Main Guide.</li>
</ul>

<h4>Post Fields</h4>
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
  <li><strong>Topic Group</strong> — Show only posts from a specific group</li>
  <li><strong>Market</strong> — Filter by France or English</li>
  <li><strong>Category</strong> — Filter by content category</li>
  <li><strong>Status</strong> — Filter by workflow status</li>
  <li><strong>Type</strong> — Filter by content type</li>
  <li><strong>Priority</strong> — Filter by priority level</li>
</ul>

<h4>Stats Cards</h4>
<ul>
  <li><strong>Total Posts</strong> — All planned posts in your backlog</li>
  <li><strong>Ready to Write</strong> — Posts with "Backlog" status, waiting to be written</li>
  <li><strong>In Progress</strong> — Posts that are "Planned" or "In Progress"</li>
  <li><strong>Published</strong> — Posts that have been published</li>
</ul>

<h4>Actions</h4>
<ul>
  <li><span class="help-action help-add">Plan New Post</span> — Add a new post to your backlog</li>
  <li><span class="help-action help-edit">Edit</span> — Modify post details</li>
  <li><span class="help-action help-delete">Delete</span> — Remove post (unlinks any published posts)</li>
  <li><span class="help-action help-primary">Create Post</span> — Generate a blog post using AI</li>
  <li><span class="help-action help-link">View Posts</span> — See published posts created from this plan</li>
</ul>

<h4>Tips</h4>
<ul>
  <li>The <strong>List view</strong> shows your most actionable posts first (In Progress and Planned at the top)</li>
  <li>Switch to <strong>Grouped view</strong> to see how your posts relate to each other within Topic Groups</li>
  <li>Start by creating a <strong>Main Guide</strong> for each Topic Group, then add Supporting Articles around it</li>
  <li>Click any row to expand and see full details including SEO data and content guidance</li>
  <li>Posts with a "Generated Nx" badge have already been used to create published posts</li>
</ul>',
    updated_at = NOW()
WHERE id = '573ad402-f9d3-43df-a3c6-ddc09c0562a0';
