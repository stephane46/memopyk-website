import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const testTables = [
  'analytics_sessions',
  'analytics_views', 
  'analytics_exclusions',
  'analytics_events',
  'analytics_conversions',
  'analytics_daily_summary',
  'blog_posts',
  'blog_post_views',
  'blog_tags',
  'blog_post_tags',
  'partners',
  'partner_submissions',
  'faq_sections',
  'faqs',
  'legal_documents',
  'cta_settings',
  'why_memopyk_cards',
  'hero_text_settings',
  'performance_metrics',
  'conversion_funnel',
  'realtime_visitors',
  'engagement_heatmap',
  'gallery_items',
  'galleries',
  'gallery_images'
];

console.log('🔍 Checking which tables exist in Supabase VPS Database:\n');

let existCount = 0;
let missingCount = 0;

for (const table of testTables) {
  const { error } = await supabase.from(table).select('id').limit(0);
  if (error) {
    console.log(`❌ ${table.padEnd(30)} - ${error.code}`);
    missingCount++;
  } else {
    console.log(`✅ ${table.padEnd(30)} - EXISTS`);
    existCount++;
  }
}

console.log(`\n📊 Summary: ${existCount} exist, ${missingCount} missing`);
