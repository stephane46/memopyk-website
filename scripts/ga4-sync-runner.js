#!/usr/bin/env node

// GA4 BigQuery → Supabase Daily Sync Runner
// Run this script daily at 00:15 to sync yesterday's GA4 data

require('dotenv').config();
const GA4SyncService = require('../server/ga4-sync-service');

async function runDailySync() {
  console.log('🚀 Starting GA4 → Supabase daily sync...');
  console.log('⏰ Started at:', new Date().toISOString());
  
  // Validate required environment variables
  const requiredEnvVars = [
    'GCP_PROJECT_ID',
    'GA4_SERVICE_ACCOUNT_KEY',
    'SUPABASE_URL', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
  }
  
  const syncService = new GA4SyncService();
  
  try {
    const result = await syncService.syncYesterdayData();
    
    if (result.success) {
      console.log('✅ Daily sync completed successfully');
      console.log('📊 Summary:', result.recordsProcessed);
      process.exit(0);
    } else {
      console.error('❌ Daily sync failed:', result.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error during sync:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the sync
runDailySync();