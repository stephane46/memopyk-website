#!/usr/bin/env node

// Test production deployment v1.0.10 with maximum debugging
const https = require('https');

console.log('🔍 PRODUCTION TEST v1.0.10 - Maximum Debug Verification\n');

// Test 1: Verify version is updated to v1.0.10
function testVersionUpdate() {
  return new Promise((resolve) => {
    console.log('📊 Testing version update...');
    https.get('https://memopyk.replit.app/api/video-proxy/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          const version = health.deployment?.version || 'Unknown';
          console.log(`   Version: ${version}`);
          
          if (version.includes('v1.0.10')) {
            console.log('   ✅ SUCCESS - v1.0.10 deployed to production');
            resolve(true);
          } else {
            console.log('   ❌ FAILURE - Still showing old version');
            resolve(false);
          }
        } catch (error) {
          console.log(`   ❌ Error parsing health response: ${error.message}`);
          resolve(false);
        }
      });
    }).on('error', (error) => {
      console.log(`   ❌ Health check failed: ${error.message}`);
      resolve(false);
    });
  });
}

// Test 2: Test the problematic video with Range request
function testProblematicVideo() {
  return new Promise((resolve) => {
    console.log('\n🎯 Testing problematic video with Range request...');
    const url = 'https://memopyk.replit.app/api/video-proxy?filename=1753390495474-Pom%20Gallery%20%28RAV%20AAA_001%29%20compressed.mp4';
    
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1023',
        'User-Agent': 'Mozilla/5.0 Test Browser'
      }
    }, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Content-Length: ${res.headers['content-length']}`);
      console.log(`   Content-Range: ${res.headers['content-range']}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      
      let data = '';
      let dataLength = 0;
      res.on('data', chunk => {
        dataLength += chunk.length;
        if (dataLength < 100) data += chunk.toString('hex').substring(0, 40);
      });
      
      res.on('end', () => {
        console.log(`   Data received: ${dataLength} bytes`);
        console.log(`   Data preview: ${data}...`);
        
        if (res.statusCode === 206 && dataLength > 0) {
          console.log('   ✅ SUCCESS - Video serving correctly with Range request');
          resolve(true);
        } else if (res.statusCode === 500) {
          console.log('   ❌ FAILURE - Still getting 500 error');
          resolve(false);
        } else {
          console.log(`   ❓ UNEXPECTED - Status ${res.statusCode}, ${dataLength} bytes`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ Request failed: ${error.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

// Test 3: Test HEAD request to check if video exists
function testVideoHead() {
  return new Promise((resolve) => {
    console.log('\n🔍 Testing HEAD request for video metadata...');
    const url = 'https://memopyk.replit.app/api/video-proxy?filename=1753390495474-Pom%20Gallery%20%28RAV%20AAA_001%29%20compressed.mp4';
    
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Accept-Ranges: ${res.headers['accept-ranges']}`);
      console.log(`   Content-Length: ${res.headers['content-length']}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      
      if (res.statusCode === 200) {
        console.log('   ✅ SUCCESS - Video metadata available');
        resolve(true);
      } else {
        console.log(`   ❌ FAILURE - HEAD request failed with ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log(`   ❌ HEAD request failed: ${error.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

async function runProductionTest() {
  console.log('🚀 Starting comprehensive production test...\n');
  
  const versionTest = await testVersionUpdate();
  const videoTest = await testProblematicVideo();
  const headTest = await testVideoHead();
  
  console.log('\n📊 PRODUCTION TEST RESULTS:');
  console.log(`   Version update: ${versionTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Video serving: ${videoTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Video metadata: ${headTest ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = versionTest && videoTest && headTest;
  console.log(`\n🎯 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (!allPassed) {
    console.log('\n💡 TROUBLESHOOTING STEPS:');
    if (!versionTest) console.log('   - Check if deployment actually updated to v1.0.10');
    if (!videoTest) console.log('   - Check server logs for detailed error information');
    if (!headTest) console.log('   - Verify video exists in cache or Supabase storage');
    console.log('   - Look for extensive debug output in production logs');
  } else {
    console.log('\n🎉 Production deployment v1.0.10 working correctly!');
  }
}

runProductionTest();