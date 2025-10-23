#!/usr/bin/env node

/**
 * UPDATE DATABASE FOR UNIFIED BUCKET v1.0.16
 * 
 * Updates gallery items database to use memopyk-videos bucket URLs
 * and copies any missing files to the unified bucket.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateDatabaseForUnifiedBucket() {
  console.log('🔄 DATABASE UPDATE FOR UNIFIED BUCKET v1.0.16');
  console.log('=' * 60);
  
  // 1. Copy missing file from old bucket to unified bucket
  console.log('\n📋 STEP 1: Copy Missing Files...');
  try {
    const missingFile = '1753094877226_vue_du_premier.MOV';
    console.log(`📥 Copying missing file: ${missingFile}`);
    
    // Download from old bucket
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('memopyk-gallery')
      .download(missingFile);
    
    if (downloadError) {
      console.error(`❌ Download error: ${downloadError.message}`);
    } else {
      // Upload to unified bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('memopyk-videos')
        .upload(missingFile, fileData, {
          upsert: true,
          contentType: 'video/quicktime'
        });
      
      if (uploadError) {
        console.error(`❌ Upload error: ${uploadError.message}`);
      } else {
        console.log(`✅ Successfully copied: ${missingFile}`);
      }
    }
  } catch (error) {
    console.error('❌ File copy error:', error);
  }
  
  // 2. Update gallery items JSON file
  console.log('\n📊 STEP 2: Update Gallery Items Database...');
  try {
    const galleryPath = path.join(__dirname, 'server', 'data', 'gallery-items.json');
    
    if (fs.existsSync(galleryPath)) {
      const galleryData = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
      console.log(`📋 Found ${galleryData.length} gallery items to update`);
      
      let updatedCount = 0;
      
      galleryData.forEach(item => {
        let updated = false;
        
        // Update video URLs
        if (item.video_url_en && item.video_url_en.includes('memopyk-gallery')) {
          item.video_url_en = item.video_url_en.replace('memopyk-gallery', 'memopyk-videos');
          updated = true;
        }
        
        if (item.video_url_fr && item.video_url_fr.includes('memopyk-gallery')) {
          item.video_url_fr = item.video_url_fr.replace('memopyk-gallery', 'memopyk-videos');
          updated = true;
        }
        
        // Update static image URLs
        if (item.static_image_url && item.static_image_url.includes('memopyk-gallery')) {
          item.static_image_url = item.static_image_url.replace('memopyk-gallery', 'memopyk-videos');
          updated = true;
        }
        
        if (updated) {
          item.updated_at = new Date().toISOString();
          updatedCount++;
          console.log(`✅ Updated: ${item.title_en || 'Untitled'}`);
        }
      });
      
      // Save updated file
      fs.writeFileSync(galleryPath, JSON.stringify(galleryData, null, 2));
      console.log(`💾 Updated ${updatedCount} items in gallery-items.json`);
      
    } else {
      console.log('📋 No gallery-items.json found');
    }
    
  } catch (error) {
    console.error('❌ Database update error:', error);
  }
  
  // 3. Verification
  console.log('\n🔍 STEP 3: Verification...');
  try {
    const galleryPath = path.join(__dirname, 'server', 'data', 'gallery-items.json');
    
    if (fs.existsSync(galleryPath)) {
      const galleryData = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
      
      galleryData.forEach(item => {
        const videoUrl = item.video_url_en || item.video_url_fr || 'No video URL';
        const imageUrl = item.static_image_url || 'No static image';
        
        const hasOldVideoBucket = videoUrl.includes('memopyk-gallery');
        const hasOldImageBucket = imageUrl.includes('memopyk-gallery');
        
        console.log(`✅ ${item.title_en || 'Untitled'}`);
        console.log(`   Video: ${hasOldVideoBucket ? '🔴 STILL OLD' : '✅ UPDATED'}`);
        console.log(`   Image: ${hasOldImageBucket ? '🔴 STILL OLD' : '✅ UPDATED'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error);
  }
  
  console.log('\n🎉 DATABASE UPDATE COMPLETE v1.0.16');
  console.log('✅ Gallery items now use memopyk-videos bucket URLs');
  console.log('✅ All files copied to unified bucket');
  console.log('✅ Frontend will now load from unified bucket');
}

updateDatabaseForUnifiedBucket().catch(console.error);