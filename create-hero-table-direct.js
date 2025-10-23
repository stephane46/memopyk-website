#!/usr/bin/env node

const { Pool } = require('pg');

async function createHeroTextsTable() {
  console.log('🔧 Connecting to PostgreSQL database using DATABASE_URL...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Create the table
    console.log('📋 Creating hero_texts table...');
    await client.query(`
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
    
    console.log('✅ Table created successfully');

    // Insert production data
    console.log('📝 Inserting production data...');
    await client.query(`
      INSERT INTO hero_texts (id, title_fr, title_en, subtitle_fr, subtitle_en, is_active, font_size, created_at, updated_at) 
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9),
        ($10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (id) DO UPDATE SET
        title_fr = EXCLUDED.title_fr,
        title_en = EXCLUDED.title_en,
        subtitle_fr = EXCLUDED.subtitle_fr,
        subtitle_en = EXCLUDED.subtitle_en,
        is_active = EXCLUDED.is_active,
        font_size = EXCLUDED.font_size,
        updated_at = EXCLUDED.updated_at;
    `, [
      1, "Transformez vos souvenirs en films cinématographiques", "Transform your memories into cinematic films", 
      "Créez des vidéos professionnelles à partir de vos photos et vidéos", "Create professional videos from your photos and videos", 
      false, 48, "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z",
      
      2, "Nous transformons vos photos et vidéos personnelles en films souvenirs inoubliables", 
      "We transform your personal photos and videos into unforgettable memory films",
      "Vos souvenirs méritent mieux que d'être simplement stockés, ils méritent une histoire",
      "Your memories deserve better than just being stored, they deserve a story",
      true, 48, "2025-08-01T13:00:00.000Z", "2025-08-01T13:00:00.000Z"
    ]);

    console.log('✅ Production data inserted successfully');

    // Verify the data
    const result = await client.query('SELECT * FROM hero_texts ORDER BY id');
    console.log('🔍 Verification - Data in table:');
    result.rows.forEach(row => {
      console.log(`  ID ${row.id}: "${row.title_fr}" (active: ${row.is_active})`);
    });

    client.release();
    console.log('🎯 Hero text database synchronization COMPLETE!');
    console.log('📋 Both production and Preview environments now use the same Supabase database');
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

createHeroTextsTable();