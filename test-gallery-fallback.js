#!/usr/bin/env node

// Test the gallery video fallback logic by making direct requests
// This simulates what happens in production when cache is empty

const http = require('http');

const testGalleryVideos = [
  'gallery_Our_vitamin_sea_rework_2_compressed.mp4',
  '1753390495474-Pom%20Gallery%20(RAV%20AAA_001)%20compressed.mp4'
];

console.log('🧪 Testing gallery video fallback logic...\n');

function testVideoProxy(filename) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/video-proxy?filename=${encodeURIComponent(filename)}`,
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1023'  // Small range request
      }
    };

    const req = http.request(options, (res) => {
      console.log(`${filename}: HTTP ${res.statusCode}`);
      if (res.statusCode === 206) {
        console.log(`  ✅ Success - serving from cache`);
      } else if (res.statusCode === 500) {
        console.log(`  ❌ FAILED - 500 error`);
      }
      resolve(res.statusCode);
    });

    req.on('error', (err) => {
      console.log(`${filename}: ERROR - ${err.message}`);
      resolve(0);
    });

    req.end();
  });
}

async function runTests() {
  for (const filename of testGalleryVideos) {
    await testVideoProxy(filename);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  }
  
  console.log('\n🎯 Test complete. Check server logs for detailed encoding information.');
}

runTests();