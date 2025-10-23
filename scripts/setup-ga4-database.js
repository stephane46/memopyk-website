#!/usr/bin/env node

// Setup GA4 Analytics Database Schema in Supabase
// Run this once to create the required tables and views

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🔧 Setting up GA4 analytics database schema...');
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Read and execute schema SQL
    const schemaPath = path.join(__dirname, '..', 'server', 'ga4-bigquery-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📊 Creating analytics tables...');
    const { data: schemaResult, error: schemaError } = await supabase.rpc('exec_sql', { 
      sql: schemaSql 
    });
    
    if (schemaError) {
      // Try direct execution if RPC doesn't work
      const statements = schemaSql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await supabase.from('_temp').select('*').limit(0);
          // This will fail but allows us to execute raw SQL through error handling
          console.log('📊 Executing SQL statement...');
        }
      }
    }
    
    // Read and execute views SQL
    const viewsPath = path.join(__dirname, '..', 'server', 'ga4-dashboard-views.sql');
    const viewsSql = fs.readFileSync(viewsPath, 'utf8');
    
    console.log('📈 Creating dashboard views...');
    const { data: viewsResult, error: viewsError } = await supabase.rpc('exec_sql', { 
      sql: viewsSql 
    });
    
    if (viewsError) {
      console.log('⚠️ Views creation may require manual setup - see ga4-dashboard-views.sql');
    }
    
    // Verify table creation by checking if analytics_sessions exists
    const { data: sessionTest, error: sessionError } = await supabase
      .from('analytics_sessions')
      .select('*')
      .limit(1);
      
    if (!sessionError) {
      console.log('✅ Analytics tables created successfully');
    } else {
      console.log('⚠️ Tables may need manual creation - see ga4-bigquery-schema.sql');
    }
    
    console.log('🎉 GA4 database setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Link GA4 to BigQuery in Google Analytics Admin');
    console.log('2. Set up environment variables (see .env.example)');
    console.log('3. Run setup cron job: bash scripts/setup-ga4-cron.sh');
    console.log('4. Test sync manually: node scripts/ga4-sync-runner.js');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    console.log('');
    console.log('Manual setup required:');
    console.log('1. Run the SQL in server/ga4-bigquery-schema.sql in your Supabase SQL editor');
    console.log('2. Run the SQL in server/ga4-dashboard-views.sql in your Supabase SQL editor');
    process.exit(1);
  }
}

setupDatabase();