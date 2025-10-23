#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function setupHeroTextsTable() {
  // Use the exact same configuration as the hybrid storage system
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🔧 Setting up hero_texts table in Supabase database...');
  console.log(`📋 Using URL: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);

  try {
    // Try to create the table using the rest API approach
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS hero_texts (
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
        `
      })
    });

    console.log('📋 Trying direct table creation via SQL...');
    
    // Alternative approach: Use psql command if available
    const { exec } = require('child_process');
    
    // Extract connection details from Supabase URL
    const url = new URL(process.env.SUPABASE_URL);
    const projectRef = url.hostname.split('.')[0];
    
    console.log(`📋 Project reference: ${projectRef}`);
    
    // First, let's check if the table already exists by trying to select from it
    console.log('🔍 Checking if hero_texts table exists...');
    
    const { data: testData, error: testError } = await supabase
      .from('hero_texts')
      .select('count')
      .limit(1);

    if (testError && testError.code === '42P01') {
      console.log('❌ Table does not exist, we need to create it');
      
      // Since we can't create tables via the API, let's try a workaround
      // We'll use the admin API endpoint if available
      console.log('🔄 Attempting alternative table creation...');
      
      // Try using the built-in RPC functions that might be available
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('exec', {
          sql: `
            CREATE TABLE IF NOT EXISTS hero_texts (
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
          `
        });

      if (rpcError) {
        console.log('❌ RPC method failed, providing manual instructions');
        console.log('\n💡 MANUAL SOLUTION REQUIRED:');
        console.log('Please go to your Supabase dashboard and run this SQL in the SQL Editor:');
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

-- Insert production data
INSERT INTO hero_texts (id, title_fr, title_en, subtitle_fr, subtitle_en, is_active, font_size, created_at, updated_at) VALUES 
(1, 'Transformez vos souvenirs en films cinématographiques', 'Transform your memories into cinematic films', 'Créez des vidéos professionnelles à partir de vos photos et vidéos', 'Create professional videos from your photos and videos', false, 48, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z'),
(2, 'Nous transformons vos photos et vidéos personnelles en films souvenirs inoubliables', 'We transform your personal photos and videos into unforgettable memory films', 'Vos souvenirs méritent mieux que d''être simplement stockés, ils méritent une histoire', 'Your memories deserve better than just being stored, they deserve a story', true, 48, '2025-08-01T13:00:00.000Z', '2025-08-01T13:00:00.000Z');
        `);
        
        console.log('\n🔗 Steps to create table manually:');
        console.log('1. Go to https://supabase.com/dashboard/projects');
        console.log('2. Select your project');  
        console.log('3. Go to SQL Editor');
        console.log('4. Paste and run the SQL above');
        console.log('5. The hero text synchronization will work automatically');
        
        return false;
      } else {
        console.log('✅ Table created via RPC');
      }
    } else if (!testError) {
      console.log('✅ Table already exists');
    }

    // Now insert the production data
    console.log('📝 Inserting production hero text data...');
    
    const productionData = [
      {
        id: 1,
        title_fr: "Transformez vos souvenirs en films cinématographiques",
        title_en: "Transform your memories into cinematic films",
        subtitle_fr: "Créez des vidéos professionnelles à partir de vos photos et vidéos", 
        subtitle_en: "Create professional videos from your photos and videos",
        is_active: false,
        font_size: 48,
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-01-01T00:00:00.000Z"
      },
      {
        id: 2,
        title_fr: "Nous transformons vos photos et vidéos personnelles en films souvenirs inoubliables",
        title_en: "We transform your personal photos and videos into unforgettable memory films",
        subtitle_fr: "Vos souvenirs méritent mieux que d'être simplement stockés, ils méritent une histoire",
        subtitle_en: "Your memories deserve better than just being stored, they deserve a story", 
        is_active: true,
        font_size: 48,
        created_at: "2025-08-01T13:00:00.000Z",
        updated_at: "2025-08-01T13:00:00.000Z"
      }
    ];

    const { data: insertData, error: insertError } = await supabase
      .from('hero_texts')
      .upsert(productionData, { onConflict: 'id' })
      .select();

    if (insertError) {
      console.error('❌ Error inserting data:', insertError);
      
      if (insertError.code === '42P01') {
        console.log('\n❌ Table still does not exist. Manual creation required.');
        console.log('Please create the table manually as shown above.');
      }
      
      return false;
    }

    console.log('✅ Production data inserted successfully:', insertData);
    console.log('🎯 Hero text database synchronization COMPLETE!'); 
    console.log('📋 Both production and Preview environments now use the same Supabase database');
    
    return true;
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    return false;
  }
}

setupHeroTextsTable();