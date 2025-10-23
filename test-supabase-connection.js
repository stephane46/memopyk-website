#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  console.log('🔧 Testing Supabase connection and hero_texts operations...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Test 1: Try to read from hero_texts table
  console.log('📋 Step 1: Testing read access to hero_texts table...');
  const { data: readData, error: readError } = await supabase
    .from('hero_texts')
    .select('*');

  if (readError) {
    console.log('❌ Read error:', readError.message);
    if (readError.code === '42P01') {
      console.log('💡 Table does not exist. This confirms we need to create it in Supabase dashboard.');
    }
  } else {
    console.log('✅ Successfully read from hero_texts table:', readData);
  }

  // Test 2: Try to insert data (this will also fail if table doesn't exist, but will show us the exact error)
  console.log('\n📋 Step 2: Testing write access to hero_texts table...');
  const testData = {
    id: 999,
    title_fr: "Test insert",
    title_en: "Test insert",
    subtitle_fr: "Test subtitle",
    subtitle_en: "Test subtitle",
    is_active: false,
    font_size: 48
  };

  const { data: insertData, error: insertError } = await supabase
    .from('hero_texts')
    .insert([testData]);

  if (insertError) {
    console.log('❌ Insert error:', insertError.message);
  } else {
    console.log('✅ Successfully inserted test data:', insertData);
    
    // Clean up test data
    await supabase.from('hero_texts').delete().eq('id', 999);
    console.log('🧹 Cleaned up test data');
  }

  // Test 3: List all tables to see what's available
  console.log('\n📋 Step 3: Checking available tables...');
  const { data: tablesData, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (tablesError) {
    console.log('❌ Tables query error:', tablesError.message);
  } else {
    console.log('✅ Available tables:');
    tablesData.forEach(table => console.log(`  - ${table.table_name}`));
  }

  console.log('\n🎯 Summary:');
  if (readError && readError.code === '42P01') {
    console.log('❌ hero_texts table does not exist in Supabase database');
    console.log('💡 Next step: Create the table in Supabase dashboard SQL editor');
    console.log('\n🔧 SQL to run in Supabase dashboard:');
    console.log(`
CREATE TABLE hero_texts (
  id BIGSERIAL PRIMARY KEY,
  title_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  subtitle_fr TEXT DEFAULT '',
  subtitle_en TEXT DEFAULT '',
  font_size INTEGER DEFAULT 48,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert your production data
INSERT INTO hero_texts (id, title_fr, title_en, subtitle_fr, subtitle_en, is_active, font_size, created_at, updated_at) VALUES 
(1, 'Transformez vos souvenirs en films cinématographiques', 'Transform your memories into cinematic films', 'Créez des vidéos professionnelles à partir de vos photos et vidéos', 'Create professional videos from your photos and videos', false, 48, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
(2, 'Nous transformons vos photos et vidéos personnelles en films souvenirs inoubliables', 'We transform your personal photos and videos into unforgettable memory films', 'Vos souvenirs méritent mieux que d''être simplement stockés, ils méritent une histoire', 'Your memories deserve better than just being stored, they deserve a story', true, 48, '2025-08-01T13:00:00.000Z', '2025-08-01T13:00:00.000Z');
    `);
  } else if (!readError) {
    console.log('✅ hero_texts table exists and is accessible');
    console.log('✅ Hero text synchronization should work correctly');
  }
}

testSupabaseConnection().catch(console.error);