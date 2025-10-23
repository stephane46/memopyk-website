#!/usr/bin/env node

/**
 * Test gallery video directly on production
 */

const https = require('https');

console.log('🧪 Testing gallery video on production deployment...\n');

const videoUrl = 'https://memopyk.replit.app/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4';

console.log('📡 Requesting:', videoUrl);
console.log('');

https.get(videoUrl, { 
  headers: {
    'Range': 'bytes=0-1000',
    'User-Agent': 'MEMOPYK-Test/1.0'
  }
}, (res) => {
  console.log('📊 Response Status:', res.statusCode);
  console.log('📋 Response Headers:', JSON.stringify(res.headers, null, 2));
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 500) {
      console.log('\n❌ ERROR 500 - Server Error Response:');
      try {
        const error = JSON.parse(body);
        console.log(JSON.stringify(error, null, 2));
      } catch (e) {
        console.log(body);
      }
    } else if (res.statusCode === 206) {
      console.log('\n✅ SUCCESS - Video is serving correctly');
      console.log('Content-Type:', res.headers['content-type']);
      console.log('Content-Range:', res.headers['content-range']);
    } else {
      console.log('\n⚠️  Unexpected status:', res.statusCode);
      console.log('Body:', body);
    }
  });
}).on('error', (err) => {
  console.error('Request failed:', err);
});