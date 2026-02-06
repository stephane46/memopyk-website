/**
 * Import FR keyword clusters from classified CSV
 *
 * CSV format expected:
 * keyword,cluster
 * "organiser ses photos numériques","photo_organization"
 * "cadeau anniversaire mariage","gift_anniversary"
 * ...
 *
 * Usage: npx tsx scripts/import-fr-clusters.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const CSV_PATH = 'docs/Marketing/FR_keywords_classified.csv';

interface CsvRow {
  keyword: string;
  cluster: string;
}

async function importFrClusters() {
  console.log('📂 Reading CSV:', CSV_PATH);

  // Read and parse CSV
  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const records: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📊 Found ${records.length} rows in CSV`);

  // Get all FR keywords from database
  const { data: dbKeywords, error: fetchError } = await supabase
    .from('content_keywords')
    .select('id, keyword')
    .eq('market', 'fr');

  if (fetchError) {
    console.error('Error fetching keywords:', fetchError);
    process.exit(1);
  }

  console.log(`🗄️  Found ${dbKeywords?.length || 0} FR keywords in database`);

  // Create lookup map (lowercase keyword → id)
  const keywordMap = new Map<string, string>();
  for (const kw of dbKeywords || []) {
    keywordMap.set(kw.keyword.toLowerCase(), kw.id);
  }

  // Process updates
  let matched = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of records) {
    if (!row.keyword || !row.cluster) {
      skipped++;
      continue;
    }

    const keywordLower = row.keyword.toLowerCase().trim();
    const keywordId = keywordMap.get(keywordLower);

    if (!keywordId) {
      skipped++;
      continue;
    }

    matched++;

    // Update cluster
    const { error: updateError } = await supabase
      .from('content_keywords')
      .update({ cluster: row.cluster.trim() })
      .eq('id', keywordId);

    if (updateError) {
      errors.push(`${row.keyword}: ${updateError.message}`);
    } else {
      updated++;
    }
  }

  // Report
  console.log('\n📊 Import Summary:');
  console.log(`   CSV rows: ${records.length}`);
  console.log(`   Matched:  ${matched}`);
  console.log(`   Updated:  ${updated}`);
  console.log(`   Skipped:  ${skipped} (not found in DB or empty)`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`   ${e}`));
    if (errors.length > 10) console.log(`   ... and ${errors.length - 10} more`);
  }

  console.log('\n✅ Done!');
}

importFrClusters().catch(console.error);
