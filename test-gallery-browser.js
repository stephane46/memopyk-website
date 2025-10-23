#!/usr/bin/env node

/**
 * Test gallery video with browser-like headers
 */

const https = require('https');

console.log('🧪 Testing gallery video with browser headers...\n');

const videoUrl = 'https://memopyk.replit.app/api/video-proxy?filename=gallery_Our_vitamin_sea_rework_2_compressed.mp4';

console.log('📡 Requesting:', videoUrl);
console.log('');

// Test with exact browser headers
https.get(videoUrl, { 
  headers: {
    'Range': 'bytes=0-',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
    'Accept': '*/*',
    'Accept-Encoding': 'identity;q=1, *;q=0',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://memopyk.replit.app/',
    'Origin': 'https://memopyk.replit.app'
  }
}, (res) => {
  console.log('📊 Response Status:', res.statusCode);
  console.log('📋 Response Headers:', JSON.stringify(res.headers, null, 2));
  
  let body = '';
  let dataSize = 0;
  
  res.on('data', (chunk) => {
    dataSize += chunk.length;
    if (body.length < 1000) {
      body += chunk;
    }
  });
  
  res.on('end', () => {
    if (res.statusCode === 500) {
      console.log('\n❌ ERROR 500 - Server Error Response:');
      try {
        const error = JSON.parse(body);
        console.log(JSON.stringify(error, null, 2));
      } catch (e) {
        console.log(body.substring(0, 500));
      }
    } else if (res.statusCode === 206) {
      console.log('\n✅ SUCCESS - Video is serving correctly');
      console.log('Content-Type:', res.headers['content-type']);
      console.log('Content-Range:', res.headers['content-range']);
      console.log('Data received:', dataSize, 'bytes');
    } else {
      console.log('\n⚠️  Unexpected status:', res.statusCode);
      console.log('Body:', body.substring(0, 500));
    }
  });
}).on('error', (err) => {
  console.error('Request failed:', err);
});