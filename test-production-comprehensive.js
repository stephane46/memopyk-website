#!/usr/bin/env node

const https = require('https');

console.log('🧪 COMPREHENSIVE PRODUCTION TEST v1.0.10');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// Test health endpoint first
const healthUrl = 'https://memopyk-gallery-video-fix-v1-0-10-maximum-debug-deployment.707bafce.repl.co/api/video-proxy/health';
console.log('1. Testing health endpoint:', healthUrl);

https.get(healthUrl, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('   Status:', res.statusCode);
    console.log('   Response:', body.substring(0, 200));
    console.log('');
    
    // Now test the problematic video
    testGalleryVideo();
  });
}).on('error', (err) => {
  console.error('   Health check failed:', err.message);
  testGalleryVideo();
});

function testGalleryVideo() {
  const videoUrl = 'https://memopyk-gallery-video-fix-v1-0-10-maximum-debug-deployment.707bafce.repl.co/api/video-proxy?filename=1753390495474-Pom%20Gallery%20(RAV%20AAA_001)%20compressed.mp4';
  
  console.log('2. Testing gallery video:', videoUrl);
  console.log('   Decoded filename: 1753390495474-Pom Gallery (RAV AAA_001) compressed.mp4');
  console.log('   Encoded in URL: 1753390495474-Pom%20Gallery%20(RAV%20AAA_001)%20compressed.mp4');
  console.log('');
  
  https.get(videoUrl, { 
    headers: {
      'Range': 'bytes=0-1023',
      'User-Agent': 'Mozilla/5.0 Test Script v1.0.10'
    }
  }, (res) => {
    console.log('   Response Status:', res.statusCode);
    console.log('   Response Headers:', JSON.stringify(res.headers, null, 2));
    
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 500) {
        console.log('   ❌ FAILED with 500 error');
        console.log('   Error response:');
        try {
          const error = JSON.parse(body);
          console.log(JSON.stringify(error, null, 2));
        } catch {
          console.log(body.substring(0, 500));
        }
      } else if (res.statusCode === 206) {
        console.log('   ✅ SUCCESS! Video is working');
      }
      
      // Test the first gallery video too
      testFirstGalleryVideo();
    });
  }).on('error', (err) => {
    console.error('   Request failed:', err.message);
    testFirstGalleryVideo();
  });
}

function testFirstGalleryVideo() {
  console.log('');
  console.log('3. Testing first gallery video (without special chars):');
  const firstVideoUrl = 'https://memopyk-gallery-video-fix-v1-0-10-maximum-debug-deployment.707bafce.repl.co/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4';
  
  https.get(firstVideoUrl, { 
    headers: {
      'Range': 'bytes=0-1023',
      'User-Agent': 'Mozilla/5.0 Test Script'
    }
  }, (res) => {
    console.log('   Response Status:', res.statusCode);
    if (res.statusCode === 206) {
      console.log('   ✅ First gallery video works fine');
    } else {
      console.log('   ❌ Even first gallery video fails');
    }
  }).on('error', (err) => {
    console.error('   Request failed:', err.message);
  });
}