import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const DATA_DIR = join(process.cwd(), 'server', 'data');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateSessions() {
  console.log('🚀 Starting session migration from JSON to Supabase...');
  
  try {
    // Read JSON file
    const filePath = join(DATA_DIR, 'analytics-sessions.json');
    const jsonData = readFileSync(filePath, 'utf-8');
    const sessions = JSON.parse(jsonData);
    
    console.log(`📊 Found ${sessions.length} sessions in JSON file`);
    
    if (sessions.length === 0) {
      console.log('✅ No sessions to migrate');
      return;
    }
    
    // Filter out invalid sessions first
    const validSessions = sessions.filter((session: any) => session.session_id);
    console.log(`✅ ${validSessions.length} valid sessions (${sessions.length - validSessions.length} skipped - missing session_id)`);
    
    // Insert sessions in batches of 100
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < validSessions.length; i += batchSize) {
      const batch = validSessions.slice(i, i + batchSize);
      
      try {
        // Map JSON fields to Supabase schema
        const mappedSessions = batch.map((session: any) => ({
          session_id: session.session_id,
          user_id: session.user_id || null,
          ip_address: session.ip_address || null,
          user_agent: session.user_agent || null,
          referrer: session.referrer || null,
          language: session.language || null,
          country_code: session.country_code || null,
          country_name: session.country_name || session.country || null,
          device_category: session.device_category || null,
          screen_resolution: session.screen_resolution || null,
          timezone: session.timezone || null,
          first_seen_at: session.first_seen_at || session.created_at || null,
          last_seen_at: session.last_seen_at || session.updated_at || null,
          session_duration: session.session_duration || session.duration || 0,
          page_count: session.page_count || session.page_views || 1,
          is_bounce: session.is_bounce || false,
          is_returning: session.is_returning || false,
          country: session.country || null,
          country_iso2: session.country_iso2 || null,
          country_iso3: session.country_iso3 || null,
          city: session.city || null,
          ended_at: session.ended_at || null,
          duration: session.duration || 0,
          page_views: session.page_views || 0,
          is_bot: session.is_bot || false,
          is_test_data: session.is_test_data || false,
          created_at: session.created_at || new Date().toISOString(),
          updated_at: session.updated_at || new Date().toISOString()
        }));
        
        // Insert batch into Supabase (ignore conflicts)
        const { error } = await supabase
          .from('analytics_sessions')
          .upsert(mappedSessions, { onConflict: 'session_id', ignoreDuplicates: true });
        
        if (error) {
          throw error;
        }
        
        successCount += batch.length;
        console.log(`✅ Migrated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validSessions.length / batchSize)} (${successCount}/${validSessions.length})`);
      } catch (error: any) {
        errorCount += batch.length;
        console.error(`❌ Error migrating batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  ⏭️  Skipped: ${sessions.length - validSessions.length}`);
    console.log(`  📈 Total: ${sessions.length}`);
    
    // Verify count in Supabase
    const { count, error } = await supabase
      .from('analytics_sessions')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error counting sessions:', error);
    } else {
      console.log(`\n🗄️  Supabase now contains ${count} sessions`);
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run migration
migrateSessions()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
