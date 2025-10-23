#!/usr/bin/env node

/**
 * UNIFIED BUCKET MIGRATION v1.0.16
 * Creates memopyk-videos bucket and migrates all files from memopyk-gallery
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUnifiedBucket() {
  try {
    console.log('🚀 UNIFIED BUCKET MIGRATION v1.0.16 - Starting...');
    
    // 1. Create the new unified bucket
    console.log('📦 Creating memopyk-videos bucket...');
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('memopyk-videos', {
      public: true,
      fileSizeLimit: 1024 * 1024 * 100, // 100MB per file
      allowedMimeTypes: ['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
    });

    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Error creating bucket:', bucketError);
      return;
    }

    if (bucketError?.message.includes('already exists')) {
      console.log('✅ memopyk-videos bucket already exists');
    } else {
      console.log('✅ memopyk-videos bucket created successfully');
    }

    // 2. List all files in the old bucket
    console.log('📋 Listing files in memopyk-gallery bucket...');
    const { data: existingFiles, error: listError } = await supabase.storage
      .from('memopyk-gallery')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('❌ Error listing files:', listError);
      return;
    }

    console.log(`📁 Found ${existingFiles.length} files in memopyk-gallery:`);
    existingFiles.forEach(file => {
      console.log(`   - ${file.name} (${(file.metadata.size / 1024 / 1024).toFixed(2)}MB)`);
    });

    // 3. Copy each file to the new bucket
    console.log('🔄 Starting file migration...');
    let successCount = 0;
    let errorCount = 0;

    for (const file of existingFiles) {
      try {
        console.log(`📋 Migrating: ${file.name}...`);
        
        // Download file from old bucket
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('memopyk-gallery')
          .download(file.name);

        if (downloadError) {
          console.error(`❌ Download error for ${file.name}:`, downloadError);
          errorCount++;
          continue;
        }

        // Upload to new bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('memopyk-videos')
          .upload(file.name, fileData, {
            upsert: true,
            contentType: file.metadata.mimetype
          });

        if (uploadError) {
          console.error(`❌ Upload error for ${file.name}:`, uploadError);
          errorCount++;
          continue;
        }

        console.log(`✅ Migrated: ${file.name}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Migration error for ${file.name}:`, error);
        errorCount++;
      }
    }

    // 4. Verify migration
    console.log('🔍 Verifying migration...');
    const { data: newFiles, error: verifyError } = await supabase.storage
      .from('memopyk-videos')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      return;
    }

    console.log('\n📊 MIGRATION RESULTS:');
    console.log(`✅ Successfully migrated: ${successCount} files`);
    console.log(`❌ Failed migrations: ${errorCount} files`);
    console.log(`📁 Total files in memopyk-videos: ${newFiles.length}`);
    
    console.log('\n📋 Files in memopyk-videos bucket:');
    newFiles.forEach(file => {
      console.log(`   - ${file.name} (${(file.metadata.size / 1024 / 1024).toFixed(2)}MB)`);
    });

    // 5. Test access to a sample file
    console.log('\n🧪 Testing unified bucket access...');
    if (newFiles.length > 0) {
      const testFile = newFiles[0];
      const publicUrl = supabase.storage
        .from('memopyk-videos')
        .getPublicUrl(testFile.name);
      
      console.log(`🔗 Sample public URL: ${publicUrl.data.publicUrl}`);
      
      // Test download
      const { data: testData, error: testError } = await supabase.storage
        .from('memopyk-videos')
        .download(testFile.name);
      
      if (testError) {
        console.error('❌ Test download failed:', testError);
      } else {
        console.log(`✅ Test download successful: ${testFile.name} (${testData.size} bytes)`);
      }
    }

    console.log('\n🎉 UNIFIED BUCKET MIGRATION COMPLETE!');
    console.log('🚀 System is now ready to use memopyk-videos for all media assets');
    console.log('📝 Next: Update cache system to use new bucket URLs');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
createUnifiedBucket();