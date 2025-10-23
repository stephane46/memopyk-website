/**
 * DATABASE STATIC IMAGE SYNC FIX v1.0.129
 * 
 * ISSUE: PostgreSQL database has different static_image_url_en and static_image_url_fr
 * for items with use_same_video: true, causing 9 static images instead of 6.
 * 
 * SOLUTION: Update PostgreSQL database directly to sync the static image URLs.
 */

const { Pool } = require('pg');

console.log('🔧 DATABASE STATIC IMAGE SYNC FIX v1.0.129 - Starting...');

// Create PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixStaticImageUrls() {
  const client = await pool.connect();
  
  try {
    // Get all gallery items with use_same_video: true
    const result = await client.query(`
      SELECT id, title_en, use_same_video, static_image_url_en, static_image_url_fr 
      FROM gallery_items 
      WHERE use_same_video = true
    `);
    
    console.log(`📊 Found ${result.rows.length} items with use_same_video: true`);
    
    let fixedCount = 0;
    const orphanedImages = [];
    
    for (const item of result.rows) {
      console.log(`\n🔍 Checking: "${item.title_en}"`);
      console.log(`   - static_image_url_en: ${item.static_image_url_en || 'NONE'}`);
      console.log(`   - static_image_url_fr: ${item.static_image_url_fr || 'NONE'}`);
      
      if (item.static_image_url_en && item.static_image_url_fr && 
          item.static_image_url_en !== item.static_image_url_fr) {
        
        console.log(`   ⚠️  MISMATCH DETECTED! Fixing...`);
        
        // Use English URL as canonical
        const canonicalUrl = item.static_image_url_en;
        
        // Extract filename from French URL to mark as orphaned
        if (item.static_image_url_fr.includes('/')) {
          const frFilename = item.static_image_url_fr.split('/').pop();
          orphanedImages.push(frFilename);
          console.log(`   🗑️  Marking as orphaned: ${frFilename}`);
        }
        
        // Update database
        await client.query(`
          UPDATE gallery_items 
          SET static_image_url_fr = $1, updated_at = CURRENT_TIMESTAMP 
          WHERE id = $2
        `, [canonicalUrl, item.id]);
        
        console.log(`   ✅ FIXED! Both EN and FR now use: ${canonicalUrl}`);
        fixedCount++;
      } else if (item.static_image_url_en === item.static_image_url_fr) {
        console.log(`   ✅ Already consistent`);
      } else {
        console.log(`   ⚠️  Missing URLs`);
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   - Items fixed: ${fixedCount}`);
    console.log(`   - Orphaned images identified: ${orphanedImages.length}`);
    if (orphanedImages.length > 0) {
      console.log(`   - Orphaned files: ${orphanedImages.join(', ')}`);
    }
    
    console.log(`\n🎯 Expected result: Static image count should drop to 6`);
    console.log(`🔧 DATABASE STATIC IMAGE SYNC FIX v1.0.129 - Complete!`);
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixStaticImageUrls();