-- Help Screen Validation Fixes (Feb 11, 2026)
-- Fixes factual mismatches between help_screens content and actual admin UI code

-- 1. Analytics Dashboard: Fix tab name "Diagnostics" -> "Fallback", fix "Live" -> "Live View",
--    fix global filters description (no "Date Filter toggle" - it's in Exclusions tab now),
--    add Custom range to date presets
UPDATE help_screens SET html_content = '<h3>Analytics Dashboard</h3>
<p>Track visitor behavior, video engagement, CTA clicks, and blog performance - all from one dashboard.</p>

<h4>Tab Navigation</h4>
<p>Use the horizontal tabs to switch between analytics views:</p>
<ul>
  <li><span class="help-tab">Overview</span> - KPIs at a glance: visitors, sessions, page views, bounce rate, top pages</li>
  <li><span class="help-tab">Live View</span> - Real-time visitor activity on the site right now</li>
  <li><span class="help-tab">Trends</span> - Traffic trends over time with daily/weekly breakdowns</li>
  <li><span class="help-tab">Video</span> - Video engagement funnel: starts, progress milestones, completions</li>
  <li><span class="help-tab">Geo</span> - Visitor geography: countries, cities, language breakdown</li>
  <li><span class="help-tab">CTA</span> - Call-to-action button click tracking (Book a Call, Quick Quote)</li>
  <li><span class="help-tab">Blog</span> - Blog post views, popular posts, top keywords and categories</li>
  <li><span class="help-tab">Clarity</span> - Microsoft Clarity heatmaps and session recordings (coming soon)</li>
  <li><span class="help-tab">Fallback</span> - Server health, database status, cache usage</li>
  <li><span class="help-tab">Exclusions</span> - Manage IP addresses and date exclusions from analytics</li>
</ul>

<h4>Global Filters</h4>
<p>Filters at the top apply across all tabs:</p>
<ul>
  <li><strong>Date range</strong> - Today, Yesterday, Last 7 days, Last 30 days, Last 90 days, or Custom range</li>
  <li><strong>Language</strong> - Filter by ALL, EN, or FR visitors</li>
  <li><strong>Country</strong> - Filter by visitor country (France, US, Canada, UK, etc.)</li>
</ul>

<h4>Data Sources</h4>
<p>The <span class="help-label">Data Source</span> badge shows where numbers come from:</p>
<ul>
  <li><strong>MEMOPYK</strong> (orange) - Internal Supabase tracking. Admin IPs excluded. Most accurate for conversions.</li>
  <li><strong>GA4</strong> (blue) - Google Analytics 4. Broader coverage but subject to sampling and consent.</li>
</ul>

<h4>Header Badges</h4>
<p>The header shows contextual information:</p>
<ul>
  <li><strong>Since: [date]</strong> - Appears when the date exclusion filter is active (configured in <span class="help-tab">Exclusions</span>)</li>
  <li><span class="help-status">IPs: N</span> - Shows how many IPs are excluded from analytics</li>
</ul>', updated_at = NOW()
WHERE route = '/admin?tab=analytics-new';

-- 2. Analytics Blog: Add Data Source toggle, Category Performance section, update sub-sections
UPDATE help_screens SET html_content = '<h3>Blog Analytics</h3>
<p>Track blog post performance: views, reading patterns, popular topics, and keyword traffic.</p>

<h4>Data Source</h4>
<p>Toggle between <span class="help-btn">MEMOPYK</span> and <span class="help-btn">GA4</span> at the top. Blog analytics default to MEMOPYK (internal tracking, admin IPs excluded).</p>

<h4>Sections</h4>
<ul>
  <li><strong>Blog Views Over Time</strong> - Area chart showing daily blog post views for the selected period, with total views count</li>
  <li><strong>Popular Blog Posts</strong> - Table of most-viewed posts ranked by view count. Click a row to navigate to the post in the Posts tab</li>
  <li><strong>Top Content Topics</strong> - Topics ranked by total traffic from linked posts. Click to navigate to the Planned Posts tab</li>
  <li><strong>Top SEO Keywords</strong> - Keywords ranked by traffic they drive. Click to filter posts by keyword</li>
  <li><strong>Category Performance</strong> - Bar chart and stats grid showing traffic breakdown by content category</li>
</ul>

<h4>Cross-Navigation</h4>
<p>Click any post, topic, or keyword row to jump directly to the related Blog Hub tab with the item highlighted.</p>', updated_at = NOW()
WHERE route = '/admin?tab=analytics-new&an_tab=blog';

-- 3. Analytics Diagnostics (Fallback): Fix status cards description to match actual UI
UPDATE help_screens SET html_content = '<h3>System Diagnostics</h3>
<p>Server health, database status, and cache usage at a glance.</p>

<h4>Status Cards</h4>
<ul>
  <li><strong>Server</strong> - Server health status and version number</li>
  <li><strong>Database</strong> - Connection status and response time</li>
  <li><strong>Uptime</strong> - Time since last server restart</li>
  <li><strong>Analytics</strong> - DB and GA4 pipeline status (ON/OFF badges)</li>
</ul>

<h4>Cache Storage</h4>
<p>Shows video cache, image cache, and total usage with a progress bar. Includes file counts and sizes.</p>

<h4>Auto-refresh</h4>
<p>Health checks refresh every 30 seconds, cache stats every 60 seconds. Click <span class="help-btn">Refresh</span> for an immediate update.</p>

<h4>When to Check</h4>
<p>Visit this tab if analytics data seems stale or missing - it will show whether the server, database, or cache layer has issues.</p>', updated_at = NOW()
WHERE route = '/admin?tab=analytics-new&an_tab=fallback';

-- 4. Cache Management: Update to match the actual French UI with detailed sections
UPDATE help_screens SET html_content = '<h3>Cache Management</h3>
<p>Gestion du Cache - manage the server-side cache for all media (videos and images).</p>

<h4>Storage Overview</h4>
<p>The orange card at the top shows cache usage, auto cleanup settings (30 days), and total media file count.</p>

<h4>Video Sections</h4>
<p>Two side-by-side cards showing cache status for each video type:</p>
<ul>
  <li><strong>Hero Videos</strong> - Critical homepage carousel videos, preloaded for instant display</li>
  <li><strong>Gallery Videos</strong> - Portfolio gallery videos optimized for lightbox playback</li>
</ul>
<p>Each card shows per-file cache status with checkmarks for cached files.</p>

<h4>Global Cache Actions</h4>
<p>Three action buttons for managing the entire cache:</p>
<ul>
  <li><span class="help-btn">All Media Cache</span> (purple) - Cache all media with full verification. Takes 15-45 seconds</li>
  <li><span class="help-btn">Smart Cleanup</span> (blue) - Remove only expired files (older than 30 days) and orphaned files</li>
  <li><span class="help-btn">Images Orphelines</span> (orange) - Remove only unused cached images not referenced by any gallery</li>
</ul>

<h4>Note</h4>
<p>Clearing the cache does not delete original files - it only removes temporary copies. Files will be re-cached on next access. Recommended after each production deployment.</p>', updated_at = NOW()
WHERE route = '/admin?tab=cache';

-- 5. AI Context: Fix description to match actual UI (key-value editor with categories)
UPDATE help_screens SET html_content = '<h3>AI Context - Brand Brain</h3>
<p>Define the brand personality, tone, and knowledge base that AI uses when generating blog content.</p>

<h4>What You See</h4>
<p>Context entries are grouped by category:</p>
<ul>
  <li><strong>Brand Guidelines</strong> - Brand voice, tone, style, and content guidelines</li>
  <li><strong>Translation Rules</strong> - Rules for how AI should handle translations</li>
</ul>
<p>Each entry shows its key, title, content, and last update timestamp.</p>

<h4>How to Edit</h4>
<ol>
  <li>Click <span class="help-btn">Edit</span> on any entry card</li>
  <li>Modify the content in the text area</li>
  <li>Click <span class="help-btn">Save</span> to apply changes</li>
</ol>

<h4>How It Works</h4>
<p>When AI generates blog content (via the <span class="help-tab">Posts</span> tab), it reads this context to match your brand voice. The more detailed your context, the better the AI output.</p>

<h4>Internal API</h4>
<p>The full context (brand + published posts) is available at <code>GET /api/internal/ai-context/full</code> for integration with other tools.</p>', updated_at = NOW()
WHERE route = '/admin?tab=ai-context';

-- 6. SEO Management: Add sub-tabs, language switcher, History and Publish buttons
UPDATE help_screens SET html_content = '<h3>SEO Management</h3>
<p>Configure meta tags, Open Graph data, and page-level SEO settings for the website.</p>

<h4>Language Switcher</h4>
<p>Use the <span class="help-btn">French</span> / <span class="help-btn">English</span> toggle in the top-right to edit SEO settings for each language separately.</p>

<h4>Sub-Tabs</h4>
<ul>
  <li><span class="help-tab">Basic SEO</span> - Page title, meta description, keywords, canonical URL, and a Google search result preview</li>
  <li><span class="help-tab">Robots</span> - Control indexing, link following, archiving, and snippet behavior</li>
  <li><span class="help-tab">Social Media</span> - Open Graph (Facebook, LinkedIn) and Twitter Card settings</li>
  <li><span class="help-tab">Advanced</span> - JSON-LD structured data, hreflang alternate languages, and extra meta tags</li>
  <li><span class="help-tab">Live Preview</span> - Preview the complete HTML head tags that will be generated</li>
</ul>

<h4>Actions</h4>
<ul>
  <li><span class="help-btn">Save SEO Settings</span> - Save your changes (bottom of the form)</li>
  <li><span class="help-btn">History</span> - View version history of SEO changes</li>
  <li><span class="help-btn">Publish</span> - Publish current settings to the live site</li>
</ul>

<h4>Tips</h4>
<ul>
  <li>Keep titles under 70 characters and descriptions under 320 characters</li>
  <li>Each language version should have unique title and description</li>
  <li>Use the Live Preview tab to verify your tags before publishing</li>
</ul>', updated_at = NOW()
WHERE route = '/admin?tab=seo';

-- 7. Analytics Exclusions: Add date exclusion (Since Date) which was moved here from global filters
UPDATE help_screens SET html_content = '<h3>IP Exclusions</h3>
<p>Manage IP addresses excluded from all analytics data, and configure date-based data exclusions.</p>

<h4>IP Exclusions</h4>
<ul>
  <li>Excluded IPs are filtered out from <strong>all</strong> MEMOPYK analytics queries</li>
  <li>Both exact IPs and CIDR ranges (e.g., <code>192.168.1.0/24</code>) are supported</li>
  <li>The <span class="help-status">IPs: N</span> badge in the analytics header shows the active count</li>
</ul>

<h4>Actions</h4>
<ul>
  <li><strong>Auto-detect</strong> - Detects your current IP address for quick exclusion</li>
  <li><strong>Add IP</strong> - Manually enter an IP or CIDR range with an optional label</li>
  <li><strong>Toggle</strong> - Enable/disable individual exclusions without deleting them</li>
  <li><strong>Delete</strong> - Permanently remove an exclusion entry</li>
</ul>

<h4>Date Exclusion (Since Date)</h4>
<p>Set a start date to exclude all analytics data collected before that date. Useful for ignoring pre-launch test data. When active, a <strong>Since: [date]</strong> badge appears in the analytics header.</p>

<h4>Tips</h4>
<ul>
  <li>Add all team members'' IPs to get clean visitor data</li>
  <li>Labels help remember why an IP was excluded (e.g., "Stephane home", "Office VPN")</li>
</ul>', updated_at = NOW()
WHERE route = '/admin?tab=analytics-new&an_tab=exclusions';

-- 8. Analytics Live: Fix tab name "Live" -> "Live View" to match UI
UPDATE help_screens SET html_content = '<h3>Live Visitors</h3>
<p>Real-time activity on the site right now.</p>
<h4>What You See</h4>
<ul>
  <li><strong>Active Users</strong> - Visitors with activity in the last 5 minutes</li>
  <li><strong>Current Pages</strong> - Which pages are being viewed right now</li>
  <li><strong>Session Timeline</strong> - Recent session starts and page navigations</li>
</ul>
<h4>Auto-refresh</h4>
<p>This tab refreshes every 30 seconds automatically. The timestamp shows when data was last fetched.</p>', updated_at = NOW()
WHERE route = '/admin?tab=analytics-new&an_tab=live';

-- 9. Legal Documents: Add missing document types (Terms of Sale, Refund, Disclaimer)
UPDATE help_screens SET html_content = '<h3>Legal Document Management</h3>
<p>Manage legal pages displayed on the website.</p>

<h4>What You Can Do</h4>
<ul>
  <li><strong>Edit document content</strong> in rich text format</li>
  <li><strong>Bilingual support</strong> - separate French and English versions</li>
  <li><strong>Toggle visibility</strong> - activate or deactivate individual documents</li>
</ul>

<h4>Document Types</h4>
<ul>
  <li><strong>Legal Notice</strong> (Mentions legales)</li>
  <li><strong>Terms of Service</strong> (CGU)</li>
  <li><strong>Terms of Sale</strong> (CGV)</li>
  <li><strong>Privacy Policy</strong> (Politique de confidentialite)</li>
  <li><strong>Cookie Policy</strong> (Politique des cookies)</li>
  <li><strong>Refund Policy</strong> (Politique de remboursement)</li>
  <li><strong>Disclaimer</strong> (Avis de non-responsabilite)</li>
</ul>', updated_at = NOW()
WHERE route = '/admin?tab=legal-docs';

-- 10. Hero Videos: Add text overlay management (heroTab has "videos" and text overlays)
UPDATE help_screens SET html_content = '<h3>Hero Video Management</h3>
<p>Control the hero video section at the top of the homepage.</p>

<h4>Video Management</h4>
<ul>
  <li><strong>Upload hero videos</strong> for the homepage banner (drag-and-drop or file picker)</li>
  <li><strong>Bilingual videos</strong> - set separate videos for French and English, or use the same video for both</li>
  <li><strong>Set video order</strong> - use arrow buttons to control which video plays first</li>
  <li><strong>Toggle active state</strong> - enable/disable individual hero videos</li>
</ul>

<h4>Text Overlays</h4>
<ul>
  <li><strong>Edit overlay text</strong> - headline displayed over the video in both languages</li>
  <li><strong>Responsive sizes</strong> - separate font sizes for desktop, tablet, and mobile</li>
  <li><strong>Live preview</strong> - toggle between French and English preview</li>
</ul>', updated_at = NOW()
WHERE route = '/admin?tab=hero-management';
