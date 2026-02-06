import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const newContent = `<h3>Keywords</h3>
<p>SEO keywords for blog content. Track French (🇫🇷) and English (🇺🇸) markets separately.</p>

<h4>Badge Colors</h4>
<p>Colors indicate priority: <span style="color: #16a34a; font-weight: bold;">GREEN = good</span>, <span style="color: #2563eb; font-weight: bold;">BLUE = neutral</span>, <span style="color: #ca8a04; font-weight: bold;">YELLOW = caution</span>, <span style="color: #dc2626; font-weight: bold;">RED = bad</span>, <span style="color: #6b7280; font-weight: bold;">GRAY = low priority</span></p>
<ul>
  <li><strong>Tier</strong> — How relevant to MEMOPYK:
    <ul>
      <li><span style="color: #16a34a;">Tier 1</span> = Direct service match (best!)</li>
      <li><span style="color: #2563eb;">Tier 2</span> = High relevance</li>
      <li><span style="color: #ca8a04;">Tier 3</span> = Secondary</li>
      <li><span style="color: #6b7280;">Tier 4</span> = Low relevance</li>
    </ul>
  </li>
  <li><strong>Competition</strong> — How hard to rank:
    <ul>
      <li><span style="color: #16a34a;">Low</span> = Easy to rank (good!)</li>
      <li><span style="color: #ca8a04;">Medium</span> = Moderate effort</li>
      <li><span style="color: #dc2626;">High</span> = Hard to rank (tough!)</li>
    </ul>
  </li>
  <li><strong>Intent</strong> — Conversion likelihood:
    <ul>
      <li><span style="color: #16a34a;">High</span> = Ready to buy (best!)</li>
      <li><span style="color: #2563eb;">Medium</span> = Comparing options</li>
      <li><span style="color: #6b7280;">Low</span> = Just researching</li>
    </ul>
  </li>
</ul>

<h4>Other Fields</h4>
<ul>
  <li><strong>Searches/mo</strong> — Monthly search volume</li>
  <li><strong>Seasonal</strong> — Keywords that spike at certain times of year</li>
  <li><strong>Cluster</strong> — Content category grouping (e.g., gift_retirement, vhs_legacy). Shows 📝 icon in table when present (hover to view)</li>
</ul>

<h4>Actions</h4>
<ul>
  <li><span class="help-action help-add">➕ New Keyword</span> — Add keyword manually</li>
  <li><span class="help-action help-edit">✏️ Edit</span> — Modify details</li>
  <li><span class="help-action help-delete">🗑️ Delete</span> — Remove (with confirmation)</li>
  <li><span class="help-action help-link">📄 View Topics</span> — See topics using this keyword</li>
</ul>

<h4>Best Strategy</h4>
<ul>
  <li>Prioritize: <strong>Tier 1 + High Intent + Low Competition</strong> = best ROI</li>
  <li>High-volume (5K+) keywords are good for awareness content</li>
  <li>Each blog post should target <strong>1 primary keyword</strong></li>
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
