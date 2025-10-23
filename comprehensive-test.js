#!/usr/bin/env node

// Comprehensive test to simulate production scenario
const http = require('http');
const fs = require('fs');
const path = require('path');

const problemFilename = '1753390495474-Pom Gallery (RAV AAA_001) compressed.mp4';
const cacheDir = path.join(__dirname, 'server', 'cache', 'videos');

console.log('🧪 COMPREHENSIVE PRODUCTION SIMULATION TEST\n');

// Step 1: Remove the problematic video from cache to simulate production start
function removeCachedFile() {
  const files = fs.readdirSync(cacheDir);
  let removed = false;
  
  for (const file of files) {
    const filePath = path.join(cacheDir, file);
    try {
      // Check if this cached file corresponds to our problem video
      const stats = fs.statSync(filePath);
      if (stats.size === 49069681) { // Known size of the problem video
        fs.unlinkSync(filePath);
        console.log(`🗑️ Removed cached file: ${file} (${stats.size} bytes)`);
        removed = true;
        break;
      }
    } catch (err) {
      // Ignore errors
    }
  }
  
  if (!removed) {
    console.log('ℹ️ No cached file found to remove');
  }
  
  return removed;
}

// Step 2: Test video proxy with missing cache (forces fallback)
function testVideoProxy(filename, testName) {
  return new Promise((resolve) => {
    const encodedFilename = encodeURIComponent(filename);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/video-proxy?filename=${encodedFilename}`,
      method: 'GET',
      headers: {
        'Range': 'bytes=0-1023'
      }
    };

    console.log(`\n📡 ${testName}:`);
    console.log(`   Requesting: ${filename}`);
    console.log(`   URL: http://localhost:5000/api/video-proxy?filename=${encodedFilename}`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => {
        data += chunk.toString('hex').substring(0, 20);
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        if (res.statusCode === 206) {
          console.log(`   ✅ SUCCESS - Video data received (${data}...)`);
          console.log(`   📦 Video should now be cached locally`);
        } else if (res.statusCode === 500) {
          console.log(`   ❌ FAILED - 500 Internal Server Error`);
        } else {
          console.log(`   ⚠️ Unexpected status: ${res.statusCode}`);
        }
        resolve(res.statusCode);
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ ERROR: ${err.message}`);
      resolve(0);
    });

    req.end();
  });
}

// Step 3: Verify caching worked
function verifyCaching() {
  const files = fs.readdirSync(cacheDir);
  console.log(`\n📊 Cache verification:`);
  console.log(`   Files in cache: ${files.length}`);
  
  for (const file of files) {
    const filePath = path.join(cacheDir, file);
    const stats = fs.statSync(filePath);
    if (stats.size === 49069681) {
      console.log(`   ✅ Problem video found in cache: ${file} (${stats.size} bytes)`);
      return true;
    }
  }
  
  console.log(`   ❌ Problem video not found in cache`);
  return false;
}

// Run comprehensive test
async function runTest() {
  console.log('Phase 1: Simulate production empty cache');
  const wasRemoved = removeCachedFile();
  
  console.log('\nPhase 2: Test fallback mechanism (what happens in production)');
  const result = await testVideoProxy(problemFilename, 'Production Simulation Test');
  
  // Small delay to allow caching to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\nPhase 3: Verify automatic caching worked');
  const cached = verifyCaching();
  
  console.log('\nPhase 4: Test cached serving (subsequent requests)');
  const result2 = await testVideoProxy(problemFilename, 'Cached Serving Test');
  
  console.log('\n🎯 COMPREHENSIVE TEST RESULTS:');
  console.log(`   Cache removal: ${wasRemoved ? 'SUCCESS' : 'SKIPPED'}`);
  console.log(`   Fallback download: ${result === 206 ? 'SUCCESS' : 'FAILED'}`);
  console.log(`   Automatic caching: ${cached ? 'SUCCESS' : 'FAILED'}`);
  console.log(`   Cached serving: ${result2 === 206 ? 'SUCCESS' : 'FAILED'}`);
  
  const allPassed = result === 206 && cached && result2 === 206;
  console.log(`\n🚀 PRODUCTION READINESS: ${allPassed ? 'VERIFIED ✅' : 'FAILED ❌'}`);
  
  if (allPassed) {
    console.log('\n✅ All tests passed - Ready for production deployment');
    console.log('   Gallery videos will work correctly in production');
    console.log('   First visitors trigger caching, subsequent visitors get instant performance');
  } else {
    console.log('\n❌ Tests failed - Production deployment not recommended');
  }
}

runTest();