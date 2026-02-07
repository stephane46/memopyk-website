-- Update ALL Blog Hub help sections with consistent terminology
-- Replaces: "Topics" tab → "Planned Posts", "topic" → "planned post", etc.
-- Run this in Supabase SQL Editor (or apply via MCP)
-- Date: 2026-02-07

-- =============================================================
-- 1. PLANNED POSTS TAB (formerly "Topics")
-- =============================================================
UPDATE help_screens
SET title = 'Planned Posts',
    html_content = '<h3>Planned Posts</h3>
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


-- =============================================================
-- 2. BLOG HUB OVERVIEW
-- =============================================================
UPDATE help_screens
SET html_content = '<h3>Blog Hub</h3>
<p>Your central hub for blog management — from idea to published article.</p>

<h4>The Workflow</h4>
<p>The tab bar shows your content pipeline as 5 numbered steps:</p>
<ol>
  <li><span class="help-tab">Planned Posts</span> — Your blog post backlog. Each entry is a plan for one blog post.</li>
  <li><span class="help-tab">Keywords</span> — SEO keyword research. Search data that informs what to write about.</li>
  <li><span class="help-tab">Planner</span> — Schedule when to write and publish on a 12-week calendar.</li>
  <li><span class="help-tab">Posts</span> — Write, edit, publish, and translate blog articles.</li>
  <li><span class="help-tab">Image Bank</span> — Store and manage images for your articles.</li>
</ol>
<p>The active tab is highlighted in orange with its step number. You don''t have to follow the order — click any tab to jump directly.</p>

<h4>Default View: Planner</h4>
<p>Blog Hub opens on the <span class="help-tab">Planner</span> (step 3) — your daily command center showing what''s scheduled this week and what''s coming up.</p>

<h4>Planned Posts vs Published Posts</h4>
<p>A <strong>Planned Post</strong> (in the Planned Posts tab) is a content plan — the title, keywords, and guidance for an article you intend to write. A <strong>Published Post</strong> (in the Posts tab) is the actual article that readers see on the blog. One planned post typically leads to one published post.</p>

<h4>Post Statuses</h4>
<ul>
  <li><span class="help-status">Draft</span> - Work in progress, not visible to readers</li>
  <li><span class="help-status">In Review</span> - Ready for review before publishing</li>
  <li><span class="help-status">Published</span> - Live and visible on the blog</li>
  <li><span class="help-status">Archived</span> - Hidden from the public blog but preserved</li>
</ul>

<h4>Dashboard Stats</h4>
<ul>
  <li><strong>Total Posts</strong> - All planned posts in your backlog</li>
  <li><strong>Assigned This Week</strong> - Posts scheduled for this week</li>
  <li><strong>Unassigned</strong> - Posts not yet scheduled</li>
</ul>',
    updated_at = NOW()
WHERE id = '40fc629f-05b7-4d48-83ed-484d554b71d6';


-- =============================================================
-- 3. PLANNER
-- =============================================================
UPDATE help_screens
SET html_content = '<h3>Planner</h3>
<p>12-week content calendar to plan, schedule, and track your blog production.</p>

<h4>Two Views</h4>
<p><span class="help-action help-tab">Planned Posts</span> - Schedule when to write. Assign posts from your backlog to specific days.</p>
<p><span class="help-action help-tab">Published Posts</span> - See when posts go live. Published posts appear on their publish date, drafts on their assigned date.</p>

<h4>Planned Posts View Actions</h4>
<ul>
  <li>Click <strong>+</strong> on any day to assign a planned post from your backlog</li>
  <li>Drag a card to reschedule it to a different day</li>
  <li>Click <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D67C4A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg> on a <span class="help-action help-status">Planned</span> post to create a published post from it</li>
  <li>Click <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg> to view or edit the associated post</li>
  <li>Click <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> to remove a planned post from the calendar</li>
</ul>

<h4>Published Posts View Actions</h4>
<ul>
  <li>Drag a post card to reschedule its publication date</li>
  <li>Click <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg> to view or edit the post</li>
</ul>

<h4>Navigation</h4>
<ul>
  <li>Use arrow buttons to move 4 weeks forward or back</li>
  <li>Click <span class="help-action help-btn">Today</span> to jump to the current week</li>
</ul>

<h4>Status Colors</h4>
<ul>
  <li>Orange border - <span class="help-action help-status">Planned</span> (no published post yet)</li>
  <li>Yellow border - <span class="help-action help-status">Draft</span> or <span class="help-action help-status">In Review</span></li>
  <li>Green border - <span class="help-action help-status">Published</span></li>
</ul>

<h4>Tips</h4>
<ul>
  <li>Aim for 2-3 posts per week for consistent publishing</li>
  <li>Schedule posts at least 1 week ahead</li>
  <li>Use the Planned Posts view to plan, then switch to Published Posts view to track progress</li>
</ul>',
    updated_at = NOW()
WHERE id = '93f9269d-7975-4b62-a9ec-bb8f6fba9dc4';


-- =============================================================
-- 4. KEYWORDS
-- =============================================================
UPDATE help_screens
SET html_content = '<h3>Keywords (12,501)</h3>
<p>SEO keywords from Google Keyword Planner, organized for content planning.</p>

<h4>Quick Filters</h4>
<p>One-click presets for common keyword analysis tasks:</p>
<ul>
  <li><strong>🎯 Quick Wins</strong> — Low competition + High intent keywords in Tier 1-2. Your easiest path to conversions. Start here.</li>
  <li><strong>📈 Traffic Drivers</strong> — High-volume Tier 2 keywords (1,000+ searches/mo). Build authority and brand awareness.</li>
  <li><strong>💰 Money Keywords</strong> — All high-intent keywords in Tier 1-2, regardless of competition. Your full conversion universe.</li>
  <li><strong>🇫🇷 France Priority</strong> — French market Tier 1-2 keywords. Focus on your home market advantage.</li>
  <li><strong>✍️ Blog Ideas</strong> — Medium intent, low-medium competition keywords. Perfect for content calendar planning.</li>
  <li><strong>✕ Clear</strong> — Reset all filters to default.</li>
</ul>
<p>Click any preset to instantly apply its filters. The preset deactivates if you manually change any filter.</p>

<h4>Filtering</h4>
<p>Use the dropdowns above each column to filter:</p>
<ul>
  <li><strong>Search</strong> — Type to find specific keywords</li>
  <li><strong>Cluster</strong> — Content category (Gift Retirement, VHS Legacy, etc.)</li>
  <li><strong>Market</strong> — 🇫🇷 France or 🇺🇸 US</li>
  <li><strong>Tier</strong> — Relevance to MEMOPYK service</li>
  <li><strong>Searches/mo</strong> — Monthly search volume ranges</li>
  <li><strong>Comp.</strong> — How hard to rank (Low/Medium/High)</li>
  <li><strong>Intent</strong> — Buyer readiness</li>
</ul>
<p>Each filter supports multi-select: check/uncheck individual options, use <em>Select All</em> to toggle all. Click <strong>OK</strong> to apply, <strong>Cancel</strong> to revert.</p>

<h4>Table Columns</h4>
<ul>
  <li><strong>Keyword</strong> — The search term. Cluster shown inline as a <span style="color: #b45309; background: #fffbeb; padding: 1px 6px; border-radius: 3px; font-size: 0.85em;">🏷️ Gift Retirement</span> tag</li>
  <li><strong>Market</strong> — 🇫🇷 FR = France, 🇺🇸 US = United States</li>
  <li><strong>Tier</strong> — How relevant to MEMOPYK:
    <ul>
      <li><span style="color: #16a34a;">Tier 1</span> = Direct service match (best!)</li>
      <li><span style="color: #2563eb;">Tier 2</span> = High relevance</li>
      <li><span style="color: #ca8a04;">Tier 3</span> = Secondary</li>
    </ul>
  </li>
  <li><strong>Searches/mo</strong> — Monthly search volume from Google</li>
  <li><strong>Competition</strong> — How hard to rank:
    <ul>
      <li><span style="color: #16a34a;">Low</span> = Easy to rank (good!)</li>
      <li><span style="color: #d97706;">Medium</span> = Moderate effort</li>
      <li><span style="color: #dc2626;">High</span> = Hard to rank</li>
    </ul>
  </li>
  <li><strong>Intent</strong> — Conversion likelihood:
    <ul>
      <li><span style="color: #16a34a;">High</span> = Ready to buy (best!)</li>
      <li><span style="color: #2563eb;">Medium</span> = Comparing options</li>
      <li><span style="color: #6b7280;">Low</span> = Just researching</li>
    </ul>
  </li>
  <li><strong>Planned Posts</strong> — Number of planned posts targeting this keyword. Click to view in the Planned Posts tab.</li>
  <li><strong>Posts</strong> — Number of published posts using this keyword. Click to view in the Posts tab.</li>
</ul>

<h4>Actions</h4>
<ul>
  <li><span class="help-action help-edit">✏️ Edit</span> — Modify keyword details</li>
  <li><span class="help-action help-delete">🗑️ Delete</span> — Remove (with confirmation)</li>
</ul>

<h4>Best Strategy</h4>
<ol>
  <li>Start with <strong>Quick Wins</strong> preset — these are your best ROI keywords</li>
  <li>Use <strong>Traffic Drivers</strong> for brand awareness content</li>
  <li>Create planned posts targeting these keywords first</li>
  <li>Track progress via the Planned Posts and Posts counts</li>
</ol>',
    updated_at = NOW()
WHERE id = 'e5baaf39-2626-43ee-bc2b-9395fadb2412';


-- =============================================================
-- 5. POSTS
-- =============================================================
UPDATE help_screens
SET html_content = '<h3>Posts</h3>
<p>This is where you manage all your blog posts - create, edit, preview, translate, and delete.</p>

<h4>Top Buttons</h4>
<ul>
  <li><span class="help-btn">New Post</span> (orange, top right) - Opens the creation page where you choose to write from scratch or generate with AI.</li>
  <li><span class="help-btn">Manage Tags</span> - Opens a dialog where you can add new tags, rename existing ones, or delete them.</li>
</ul>

<h4>Filters</h4>
<p>Use the filter card at the top to narrow your list:</p>
<ul>
  <li><span class="help-label">Status</span> - Show All Posts, <span class="help-status">Draft</span> Only, <span class="help-status">In Review</span> Only, <span class="help-status">Published</span> Only, or <span class="help-status">Archived</span> Only.</li>
  <li><span class="help-label">Language</span> - Show All Languages, English, or French.</li>
  <li><span class="help-label">Title Keyword</span> - Type a word to search by post title.</li>
  <li>The post count on the right shows how many posts match your current filters.</li>
</ul>
<p>If you arrived from the <span class="help-tab">Planned Posts</span> tab with a filter active, a blue banner appears. Click the X on the badge to clear it.</p>

<h4>Post Cards</h4>
<p>Each post appears as a card showing:</p>
<ul>
  <li><strong>Title</strong> - The post name. If created from a planned post, a <span class="help-btn">View source plan</span> link appears next to it.</li>
  <li><strong>Description</strong> - A short summary (2 lines max).</li>
  <li><strong>Badges</strong> below the description: language (EN/FR), status (<span class="help-status">Draft</span> / <span class="help-status">In Review</span> / <span class="help-status">Published</span> date / <span class="help-status">Archived</span>), tag badges, and <strong>Featured</strong> (purple) if marked.</li>
</ul>

<h4>Action Icons (right side of each card)</h4>
<p>Each card has 5 controls on the right:</p>
<ol>
  <li><span class="help-label">Status</span> dropdown - Change status directly (<span class="help-status">Draft</span>, <span class="help-status">In Review</span>, <span class="help-status">Published</span>, or <span class="help-status">Archived</span>). No need to open the editor.</li>
  <li>Eye icon ("View post") - Open the post on the public blog in a new tab.</li>
  <li>Translation icon ("Duplicate for translation") - Create a copy for translation. All images are preserved.</li>
  <li>Pencil icon ("Edit post") - Open the post in the Blog Editor.</li>
  <li>Trash icon ("Delete post", red) - Delete the post with confirmation.</li>
</ol>

<h4>Tips</h4>
<ul>
  <li>To quickly change a post status, use the <span class="help-label">Status</span> dropdown on the card - no need to open the editor.</li>
  <li>The Translation button copies everything (title, content, images). Just replace the text.</li>
  <li>To create a post from a content plan, go to the <span class="help-tab">Planned Posts</span> tab and click "Create Post" on any entry.</li>
  <li>Click <span class="help-btn">New Post</span> to choose between writing from scratch or generating with AI.</li>
</ul>

<h4>Translating Posts</h4>
<p>Click the <span class="help-btn">🌐</span> translate icon on any post to create a translation. Choose <span class="help-btn">✨ Translate with AI</span> for one-click automatic translation, or <span class="help-btn">Translate manually</span> to use your own tools.</p>',
    updated_at = NOW()
WHERE id = 'c2b37059-c32c-44e4-a266-54a01a1f69bf';
