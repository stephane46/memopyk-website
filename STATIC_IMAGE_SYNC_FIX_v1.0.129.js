/**
 * STATIC IMAGE SYNC FIX v1.0.129
 * 
 * ISSUE: Gallery items with use_same_video: true have different static_image_url_en 
 * and static_image_url_fr, causing 9 static images instead of the expected 6.
 * 
 * SOLUTION: For items with use_same_video: true, ensure both EN and FR use the same
 * static image URL (prioritizing the EN version), then cleanup orphaned images.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 STATIC IMAGE SYNC FIX v1.0.129 - Starting...');

// Read the gallery items
const jsonPath = path.join(__dirname, 'server', 'storage', 'gallery-items.json');
console.log(`📂 Reading: ${jsonPath}`);

let rawData;
try {
  rawData = fs.readFileSync(jsonPath, 'utf8');
} catch (error) {
  console.error(`❌ Failed to read gallery items: ${error.message}`);
  process.exit(1);
}

const items = JSON.parse(rawData);
console.log(`📊 Found ${items.length} gallery items`);

let fixedCount = 0;
const orphanedImages = [];

items.forEach((item, index) => {
  console.log(`\n🔍 Checking item ${index + 1}: "${item.title_en}"`);
  console.log(`   - use_same_video: ${item.use_same_video}`);
  console.log(`   - static_image_url_en: ${item.static_image_url_en || 'NONE'}`);
  console.log(`   - static_image_url_fr: ${item.static_image_url_fr || 'NONE'}`);
  
  if (item.use_same_video === true) {
    const urlEn = item.static_image_url_en;
    const urlFr = item.static_image_url_fr;
    
    if (urlEn && urlFr && urlEn !== urlFr) {
      console.log(`   ⚠️  MISMATCH DETECTED! EN ≠ FR when use_same_video: true`);
      
      // Use the English URL as the canonical version
      const canonicalUrl = urlEn;
      
      // Extract filename from French URL to mark as orphaned
      if (urlFr.includes('/')) {
        const frFilename = urlFr.split('/').pop();
        orphanedImages.push(frFilename);
        console.log(`   🗑️  Marking French-specific image as orphaned: ${frFilename}`);
      }
      
      // Set both to use the same URL
      item.static_image_url_fr = canonicalUrl;
      item.updated_at = new Date().toISOString();
      
      console.log(`   ✅ FIXED! Both EN and FR now use: ${canonicalUrl}`);
      fixedCount++;
    } else if (urlEn === urlFr) {
      console.log(`   ✅ Already consistent - both use same URL`);
    } else {
      console.log(`   ⚠️  Missing static image URLs`);
    }
  } else {
    console.log(`   ℹ️  use_same_video: false - different URLs are expected`);
  }
});

if (fixedCount > 0) {
  console.log(`\n💾 Saving ${fixedCount} fixes to gallery items...`);
  fs.writeFileSync(jsonPath, JSON.stringify(items, null, 2));
  console.log(`✅ Gallery items updated successfully`);
} else {
  console.log(`\n✅ No fixes needed - all items are already consistent`);
}

console.log(`\n📊 SUMMARY:`);
console.log(`   - Items fixed: ${fixedCount}`);
console.log(`   - Orphaned images identified: ${orphanedImages.length}`);
if (orphanedImages.length > 0) {
  console.log(`   - Orphaned files: ${orphanedImages.join(', ')}`);
}

console.log(`\n🎯 Expected result: Static image count should drop to 6 (one per gallery item)`);
console.log(`🔧 STATIC IMAGE SYNC FIX v1.0.129 - Complete!`);