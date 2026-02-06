import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const newContent = `<h3>Keywords</h3>
<p>SEO keyword strategy and targeting framework for your blog content. Keywords from both French and English markets are tracked here.</p>

<h4>Keyword Fields</h4>
<ul>
  <li><strong>Keyword</strong> — The exact search term people type into Google</li>
  <li><strong>Market</strong> — 🇫🇷 France or 🇬🇧 English target audience</li>
  <li><strong>Tier</strong> — Relevance to MEMOPYK services:
    <ul>
      <li>Tier 1 = Direct service match (highest priority)</li>
      <li>Tier 2 = High relevance (good blog topics)</li>
      <li>Tier 3 = Secondary relevance</li>
    </ul>
  </li>
  <li><strong>Searches/mo</strong> — Monthly search volume from Google Keyword Planner</li>
  <li><strong>Competition</strong> — Advertiser competition level (High/Medium/Low)</li>
  <li><strong>Intent</strong> — How likely to convert:
    <ul>
      <li>HIGH = Ready to buy or hire</li>
      <li>MEDIUM = Comparing options</li>
      <li>LOW = Just researching</li>
    </ul>
  </li>
  <li><strong>Seasonal</strong> — Keywords that spike at certain times (in Additional Options)</li>
  <li><strong>Peak Months</strong> — Which months keyword peaks (shown when Seasonal is on)</li>
  <li><strong>Notes</strong> — Freeform notes (in Additional Options; EN keywords include cluster)</li>
</ul>

<h4>Actions</h4>
<ul>
  <li><span class="help-action help-add">➕ New Keyword</span> — Add a keyword manually</li>
  <li><span class="help-action help-edit">✏️ Edit</span> — Modify keyword details</li>
  <li><span class="help-action help-delete">🗑️ Delete</span> — Remove keyword (with confirmation)</li>
  <li><span class="help-action help-link">📄 View Topics</span> — See which topics target this keyword</li>
</ul>

<h4>Tips</h4>
<ul>
  <li>Focus on <strong>Tier 1 + High Intent</strong> keywords first — these convert best</li>
  <li>Use the <strong>Market filter</strong> to plan French vs English content separately</li>
  <li>Each blog post should target <strong>1 primary keyword</strong></li>
  <li>Check how keywords are used in the <span class="help-action help-tab">Topics</span> tab</li>
  <li>High-volume keywords (5K+ searches/mo) are great for awareness content</li>
  <li>Medium competition + Tier 1 = best ROI for new blog posts</li>
</ul>`;

async function updateHelp() {
  console.log('Updating Keywords help content...');

  const { data, error } = await supabase
    .from('help_screens')
    .update({
      html_content: newContent,
      updated_at: new Date().toISOString(),
      updated_by: 'claude-code'
    })
    .eq('route', '/admin?tab=keywords')
    .select('id, title');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('✅ Updated:', JSON.stringify(data, null, 2));
}

updateHelp();
