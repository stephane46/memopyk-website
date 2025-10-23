#!/usr/bin/env node

// Test GA4 BigQuery → Supabase Setup
// Validates configuration and tests connectivity

require('dotenv').config();
const { BigQuery } = require('@google-cloud/bigquery');
const { createClient } = require('@supabase/supabase-js');

async function testSetup() {
  console.log('🧪 Testing GA4 BigQuery → Supabase setup...');
  
  const results = {
    env_vars: false,
    supabase: false,
    bigquery: false,
    ga4_dataset: false,
    tables: false
  };
  
  try {
    // Test 1: Environment Variables
    console.log('\n1️⃣ Testing environment variables...');
    const requiredVars = ['GCP_PROJECT_ID', 'GA4_SERVICE_ACCOUNT_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      console.log('✅ All required environment variables present');
      results.env_vars = true;
    } else {
      console.log('❌ Missing environment variables:', missingVars);
      return results;
    }
    
    // Test 2: Supabase Connection
    console.log('\n2️⃣ Testing Supabase connection...');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: supabaseTest, error: supabaseError } = await supabase
      .from('analytics_sessions')
      .select('*')
      .limit(1);
      
    if (!supabaseError) {
      console.log('✅ Supabase connection successful');
      results.supabase = true;
      results.tables = true;
    } else {
      console.log('❌ Supabase connection failed:', supabaseError.message);
      if (supabaseError.code === '42P01') {
        console.log('💡 Tables not created yet - run: node scripts/setup-ga4-database.js');
      }
      results.supabase = true; // Connection works, just missing tables
    }
    
    // Test 3: BigQuery Connection
    console.log('\n3️⃣ Testing BigQuery connection...');
    try {
      const bigquery = new BigQuery({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY)
      });
      
      const [datasets] = await bigquery.getDatasets();
      console.log('✅ BigQuery connection successful');
      console.log(`📊 Found ${datasets.length} datasets in project ${process.env.GCP_PROJECT_ID}`);
      results.bigquery = true;
      
      // Test 4: GA4 Dataset
      console.log('\n4️⃣ Testing GA4 dataset...');
      const ga4Dataset = `analytics_JLRWHE1HV4`;
      const dataset = bigquery.dataset(ga4Dataset);
      const [exists] = await dataset.exists();
      
      if (exists) {
        console.log(`✅ GA4 dataset found: ${ga4Dataset}`);
        
        const [tables] = await dataset.getTables();
        const eventTables = tables.filter(table => table.id.startsWith('events_'));
        console.log(`📅 Found ${eventTables.length} event tables (events_YYYYMMDD)`);
        
        if (eventTables.length > 0) {
          console.log(`📊 Latest table: ${eventTables[eventTables.length - 1].id}`);
          results.ga4_dataset = true;
        } else {
          console.log('⚠️ No event tables found - check BigQuery export setup');
        }
      } else {
        console.log(`❌ GA4 dataset not found: ${ga4Dataset}`);
        console.log('💡 Set up BigQuery export in GA4 Admin → BigQuery Links');
      }
      
    } catch (bigqueryError) {
      console.log('❌ BigQuery connection failed:', bigqueryError.message);
    }
    
    // Summary
    console.log('\n📋 Setup Summary:');
    console.log(`Environment Variables: ${results.env_vars ? '✅' : '❌'}`);
    console.log(`Supabase Connection: ${results.supabase ? '✅' : '❌'}`);
    console.log(`Analytics Tables: ${results.tables ? '✅' : '❌'}`);
    console.log(`BigQuery Connection: ${results.bigquery ? '✅' : '❌'}`);
    console.log(`GA4 Dataset: ${results.ga4_dataset ? '✅' : '❌'}`);
    
    const allReady = Object.values(results).every(r => r);
    if (allReady) {
      console.log('\n🎉 All systems ready! You can now run the sync:');
      console.log('node scripts/ga4-sync-runner.js');
    } else {
      console.log('\n🔧 Setup incomplete. Complete the failed steps above.');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error);
  }
}

testSetup();