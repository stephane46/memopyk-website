/**
 * Import FR keyword clusters from classified CSV
 *
 * CSV format (from GKP + classification):
 * "Keyword","Currency","Avg. monthly searches",...,"cluster","confidence"
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
  Keyword: string;  // Capital K from CSV header
  cluster: string;
  confidence?: string;
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
  let noCluster = 0;
  const errors: string[] = [];
  const notFound: string[] = [];

  for (const row of records) {
    // Use "Keyword" (capital K) from CSV header
    const keyword = row.Keyword;
    const cluster = row.cluster;

    if (!keyword) {
      skipped++;
      continue;
    }

    if (!cluster) {
      noCluster++;
      continue;
    }

    const keywordLower = keyword.toLowerCase().trim();
    const keywordId = keywordMap.get(keywordLower);

    if (!keywordId) {
      notFound.push(keyword);
      skipped++;
      continue;
    }

    matched++;

    // Update cluster
    const { error: updateError } = await supabase
      .from('content_keywords')
      .update({ cluster: cluster.trim() })
      .eq('id', keywordId);

    if (updateError) {
      errors.push(`${keyword}: ${updateError.message}`);
    } else {
      updated++;
    }
  }

  // Report
  console.log('\n📊 Import Summary:');
  console.log(`   CSV rows:     ${records.length}`);
  console.log(`   Matched:      ${matched}`);
  console.log(`   Updated:      ${updated}`);
  console.log(`   No cluster:   ${noCluster} (empty cluster field)`);
  console.log(`   Not in DB:    ${notFound.length}`);
  console.log(`   Skipped:      ${skipped}`);

  if (notFound.length > 0 && notFound.length <= 20) {
    console.log(`\n⚠️  Keywords not found in DB:`);
    notFound.forEach(k => console.log(`   - ${k}`));
  } else if (notFound.length > 20) {
    console.log(`\n⚠️  ${notFound.length} keywords not found in DB (showing first 10):`);
    notFound.slice(0, 10).forEach(k => console.log(`   - ${k}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`   ${e}`));
    if (errors.length > 10) console.log(`   ... and ${errors.length - 10} more`);
  }

  console.log('\n✅ Done!');
}

importFrClusters().catch(console.error);
