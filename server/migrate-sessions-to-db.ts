import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './db';
import { analyticsSessions } from '../shared/schema';

const DATA_DIR = join(process.cwd(), 'server', 'data');

async function migrateSessions() {
  console.log('🚀 Starting session migration from JSON to database...');
  
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
    
    // Insert sessions in batches of 100
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      
      try {
        // Filter out sessions without session_id
        const validSessions = batch.filter((session: any) => session.session_id);
        
        if (validSessions.length === 0) {
          console.log(`⚠️  Batch ${Math.floor(i / batchSize) + 1}: All sessions invalid (missing session_id)`);
          errorCount += batch.length;
          continue;
        }
        
        // Map JSON fields to database schema
        const mappedSessions = validSessions.map((session: any) => ({
          sessionId: session.session_id,
          userId: session.user_id || null,
          ipAddress: session.ip_address || null,
          userAgent: session.user_agent || null,
          referrer: session.referrer || null,
          language: session.language || null,
          countryCode: session.country_code || null,
          countryName: session.country_name || session.country || null,
          deviceCategory: session.device_category || null,
          screenResolution: session.screen_resolution || null,
          timezone: session.timezone || null,
          firstSeenAt: session.first_seen_at ? new Date(session.first_seen_at) : null,
          lastSeenAt: session.last_seen_at ? new Date(session.last_seen_at) : null,
          sessionDuration: session.session_duration || session.duration || 0,
          pageCount: session.page_count || session.page_views || 1,
          isBounce: session.is_bounce || false,
          isReturning: session.is_returning || false,
          country: session.country || null,
          countryIso2: session.country_iso2 || null,
          countryIso3: session.country_iso3 || null,
          city: session.city || null,
          endedAt: session.ended_at ? new Date(session.ended_at) : null,
          duration: session.duration || 0,
          pageViews: session.page_views || 0,
          isBot: session.is_bot || false,
          isTestData: session.is_test_data || false,
          createdAt: session.created_at ? new Date(session.created_at) : new Date(),
          updatedAt: session.updated_at ? new Date(session.updated_at) : new Date()
        }));
        
        // Insert batch
        await db.insert(analyticsSessions).values(mappedSessions).onConflictDoNothing();
        successCount += validSessions.length;
        errorCount += (batch.length - validSessions.length);
        console.log(`✅ Migrated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sessions.length / batchSize)} (${successCount}/${sessions.length})`);
      } catch (error: any) {
        errorCount += batch.length;
        console.error(`❌ Error migrating batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📈 Total: ${sessions.length}`);
    
    // Verify count in database
    const count = await db.select().from(analyticsSessions);
    console.log(`\n🗄️  Database now contains ${count.length} sessions`);
    
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
