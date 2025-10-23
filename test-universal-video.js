#!/usr/bin/env node

/**
 * UNIVERSAL VIDEO PROXY TEST v1.0.40
 * 
 * Tests the video proxy with various filename patterns to validate
 * the universal system can handle any valid filename without restrictions.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test files with various patterns
const TEST_FILES = [
  // Existing files from Supabase
  'VitaminSeaC.mp4',
  'PomGalleryC.mp4', 
  'safari-1.mp4',
  'VideoHero1.mp4',
  'VideoHero2.mp4',
  'VideoHero3.mp4',
  
  // Various filename patterns (these may not exist but should handle gracefully)
  'wedding-gallery-rome-2025-teaser.mp4',
  'family_trip_BW.mp4',
  'celebration-video-HD.mp4',
  'memory-film-v2.mp4',
  'UPPERCASE-VIDEO.mp4'
];

async function testVideoProxy(filename) {
  console.log(`\n🧪 Testing: ${filename}`);
  
  try {
    const url = `${BASE_URL}/api/video-proxy?filename=${encodeURIComponent(filename)}`;
    console.log(`   Request: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Range': 'bytes=0-1023', // Request first 1KB
        'User-Agent': 'MEMOPYK-UniversalTest/1.0'
      }
    });
    
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    console.log(`   Content-Length: ${response.headers.get('content-length')}`);
    console.log(`   Content-Range: ${response.headers.get('content-range')}`);
    console.log(`   Accept-Ranges: ${response.headers.get('accept-ranges')}`);
    
    if (response.ok) {
      console.log(`   ✅ SUCCESS: Video proxy working for ${filename}`);
      return true;
    } else {
      const errorData = await response.text();
      console.log(`   ❌ FAILED: ${errorData.substring(0, 200)}...`);
      return false;
    }
    
  } catch (error) {
    console.log(`   💥 ERROR: ${error.message}`);
    return false;
  }
}

async function runUniversalTest() {
  console.log('🚀 UNIVERSAL VIDEO PROXY TEST v1.0.40');
  console.log('Testing video proxy with various filename patterns...\n');
  
  let successCount = 0;
  let totalCount = TEST_FILES.length;
  
  for (const filename of TEST_FILES) {
    const success = await testVideoProxy(filename);
    if (success) successCount++;
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 UNIVERSAL TEST RESULTS:`);
  console.log(`   Total files tested: ${totalCount}`);
  console.log(`   Successful responses: ${successCount}`);
  console.log(`   Failed responses: ${totalCount - successCount}`);
  console.log(`   Success rate: ${Math.round((successCount / totalCount) * 100)}%`);
  
  if (successCount === totalCount) {
    console.log(`   🎉 PERFECT: All files handled successfully!`);
  } else if (successCount >= 6) { // The 6 known existing files
    console.log(`   ✅ GOOD: All existing files work, unknown files handled gracefully`);
  } else {
    console.log(`   ⚠️ ISSUES: Some existing files are failing - needs investigation`);
  }
  
  console.log('\n✅ Universal video proxy validation complete');
}

// Run the test
runUniversalTest().catch(console.error);