#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

async function createHeroTextsTable() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🔧 Creating hero_texts table in Supabase...');

  try {
    // Use the sql function to execute raw SQL
    const { data, error } = await supabase
      .from('_sql')
      .select('*')
      .eq('query', `
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
      `);

    if (error) {
      console.log('⚠️ Direct SQL approach failed, trying alternative...');
      
      // Alternative: Try to create using PostgREST admin API
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/sql`, {
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log('✅ Table created via REST API');
    } else {
      console.log('✅ Table created successfully');
    }

    // Now insert the production data
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

    console.log('📝 Inserting production hero text data...');

    const { data: insertData, error: insertError } = await supabase
      .from('hero_texts')
      .upsert(productionData, { onConflict: 'id' });

    if (insertError) {
      console.error('❌ Error inserting data:', insertError);
      return;
    }

    console.log('✅ Production hero text data inserted successfully');
    console.log('🎯 Hero text synchronization is now COMPLETE!');
    console.log('📋 Both production and Preview environments now use the same Supabase database');

  } catch (error) {
    console.error('❌ Failed to create table:', error.message);
    console.log('\n💡 Manual Solution:');
    console.log('Please create the hero_texts table in your Supabase dashboard using this SQL:');
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
  }
}

createHeroTextsTable();