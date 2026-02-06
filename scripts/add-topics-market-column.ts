import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function addMarketColumn() {
  console.log('Adding market column to content_topics...');

  // Step 1: Add the column (if it doesn't exist)
  // Using raw SQL via RPC or direct query
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE content_topics
      ADD COLUMN IF NOT EXISTS market TEXT DEFAULT 'fr' NOT NULL;
    `
  });

  if (alterError) {
    // If RPC doesn't exist, try direct approach
    console.log('RPC not available, column may already exist or needs manual creation');
    console.log('Checking if column exists by trying an update...');
  }

  // Step 2: Update all existing topics to 'en' (they're English content)
  console.log('Setting all existing topics to market = "en"...');

  const { data, error: updateError } = await supabase
    .from('content_topics')
    .update({ market: 'en' })
    .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows
    .select('id');

  if (updateError) {
    console.error('Error updating topics:', updateError);

    // Check if it's because column doesn't exist
    if (updateError.message.includes('column') || updateError.code === '42703') {
      console.log('\n⚠️  Column "market" does not exist yet.');
      console.log('Please run this SQL in Supabase SQL Editor:');
      console.log(`
  ALTER TABLE content_topics
  ADD COLUMN market TEXT DEFAULT 'fr' NOT NULL;

  UPDATE content_topics SET market = 'en';
      `);
      process.exit(1);
    }
    throw updateError;
  }

  console.log(`✅ Updated ${data?.length || 0} topics to market = 'en'`);
}

addMarketColumn().catch(console.error);
