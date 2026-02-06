/**
 * Import English Keywords to Supabase
 *
 * Reads docs/Marketing/EN_keywords_merged_classified.csv
 * Imports Tier 1-3 keywords to content_keywords table with market='en'
 *
 * CSV columns: keyword, volume, competition, comp_index, tier, cluster, intent
 *
 * Run with: npx tsx scripts/import-keywords-en.ts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ==============================================
// CSV PARSING
// ==============================================

interface CsvRow {
  keyword: string;
  volume: number;
  competition: string;
  comp_index: number;
  tier: number;
  cluster: string;
  intent: string;
}

function parseCSV(content: string): CsvRow[] {
  const lines = content.split('\n');
  const rows: CsvRow[] = [];

  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // CSV format: keyword,volume,competition,comp_index,tier,cluster,intent
    const parts = line.split(',');
    if (parts.length < 7) continue;

    const keyword = parts[0].trim();
    const volume = parseInt(parts[1]) || 0;
    const competition = parts[2].trim();
    const comp_index = parseInt(parts[3]) || 0;
    const tier = parseInt(parts[4]) || 4;
    const cluster = parts[5].trim();
    const intent = parts[6].trim().toLowerCase(); // Convert HIGH -> high

    if (keyword) {
      rows.push({
        keyword,
        volume,
        competition,
        comp_index,
        tier,
        cluster,
        intent
      });
    }
  }

  return rows;
}

// ==============================================
// MAIN IMPORT FUNCTION
// ==============================================

async function importKeywords() {
  console.log('🚀 Starting English keyword import...\n');

  // Read CSV file
  const csvPath = path.join(process.cwd(), 'docs/Marketing/EN_keywords_merged_classified.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  // Read as UTF-8 (English CSV is typically UTF-8)
  const content = fs.readFileSync(csvPath, 'utf-8');

  const rows = parseCSV(content);
  console.log(`📄 Parsed ${rows.length} keywords from CSV\n`);

  // Filter and prepare for import
  const keywordsToImport: Array<{
    keyword: string;
    monthly_searches: number;
    competition: string;
    tier: number;
    intent: string;
    market: string;
    notes: string | null;
  }> = [];

  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const intentCounts = { high: 0, medium: 0, low: 0 };

  for (const row of rows) {
    tierCounts[row.tier as keyof typeof tierCounts]++;
    if (row.intent in intentCounts) {
      intentCounts[row.intent as keyof typeof intentCounts]++;
    }

    // Only import Tier 1-3
    if (row.tier <= 3) {
      keywordsToImport.push({
        keyword: row.keyword,
        monthly_searches: row.volume,
        competition: capitalizeFirst(row.competition), // Low -> Low, high -> High
        tier: row.tier,
        intent: row.intent, // Already lowercased
        market: 'en',
        notes: row.cluster || null // Store cluster in notes
      });
    }
  }

  console.log('📊 Classification Results:');
  console.log(`   Tier 1 (Direct Service): ${tierCounts[1]}`);
  console.log(`   Tier 2 (High Relevance): ${tierCounts[2]}`);
  console.log(`   Tier 3 (Secondary):      ${tierCounts[3]}`);
  console.log(`   Tier 4 (Skipped):        ${tierCounts[4]}`);
  console.log('');
  console.log('   Intent HIGH:   ', intentCounts.high);
  console.log('   Intent MEDIUM: ', intentCounts.medium);
  console.log('   Intent LOW:    ', intentCounts.low);
  console.log('');
  console.log(`✅ Importing ${keywordsToImport.length} keywords (Tier 1-3)\n`);

  // Delete existing EN keywords only (preserve FR)
  console.log('🗑️  Clearing existing EN keywords...');
  const { error: deleteError } = await supabase
    .from('content_keywords')
    .delete()
    .eq('market', 'en');

  if (deleteError) {
    console.error('❌ Error clearing EN keywords:', deleteError);
    process.exit(1);
  }

  // Insert in batches
  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < keywordsToImport.length; i += BATCH_SIZE) {
    const batch = keywordsToImport.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('content_keywords')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
      continue;
    }

    imported += batch.length;
    process.stdout.write(`\r📥 Imported: ${imported}/${keywordsToImport.length}`);
  }

  console.log('\n');

  // Verify import
  const { count: enCount } = await supabase
    .from('content_keywords')
    .select('*', { count: 'exact', head: true })
    .eq('market', 'en');

  const { count: frCount } = await supabase
    .from('content_keywords')
    .select('*', { count: 'exact', head: true })
    .eq('market', 'fr');

  const { count: totalCount } = await supabase
    .from('content_keywords')
    .select('*', { count: 'exact', head: true });

  console.log('✅ Verification:');
  console.log(`   🇬🇧 EN keywords: ${enCount}`);
  console.log(`   🇫🇷 FR keywords: ${frCount}`);
  console.log(`   📊 Total:       ${totalCount}`);

  // Show sample by tier
  console.log('\n📋 Sample EN Keywords by Tier:');

  for (const tier of [1, 2, 3]) {
    const { data: samples } = await supabase
      .from('content_keywords')
      .select('keyword, monthly_searches, intent, notes')
      .eq('market', 'en')
      .eq('tier', tier)
      .order('monthly_searches', { ascending: false })
      .limit(5);

    console.log(`\n   Tier ${tier}:`);
    samples?.forEach(s => {
      const cluster = s.notes ? ` [${s.notes}]` : '';
      console.log(`   - ${s.keyword} (${s.monthly_searches}/mo, ${s.intent})${cluster}`);
    });
  }

  console.log('\n🎉 Import complete!');
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Run
importKeywords().catch(console.error);
