#!/usr/bin/env node

// 🔍 SYSTEMATIC FILENAME PATTERN TEST
// Testing to determine exact Replit filtering rules

const { spawn } = require('child_process');

const PRODUCTION_URL = 'https://memopyk.replit.app';

const TEST_FILENAMES = [
  // Known working
  'VideoHero1.mp4',
  'VideoHero2.mp4', 
  'VideoHero3.mp4',
  
  // Pattern tests
  'VideoHero4.mp4',
  'VideoHero99.mp4',
  'VideoHeroX.mp4',
  'VideoHero1_test.mp4',
  'ZVideoHero1.mp4',
  
  // Additional pattern variations
  'videohero1.mp4',        // lowercase
  'VIDEOHERO1.mp4',        // uppercase
  'VideoHero.mp4',         // no number
  'VideoHero0.mp4',        // zero
  'VideoHero10.mp4',       // two digits
  'MyVideoHero1.mp4',      // prefix
  'VideoHero1.avi',        // different extension
  'VideoHero1.mp4.test',   // suffix
  
  // Known failing for comparison
  'VitaminSeaC.mp4',
  'PomGalleryC.mp4'
];

console.log('🔍 SYSTEMATIC FILENAME PATTERN ANALYSIS');
console.log('Testing Replit infrastructure filtering rules...\n');

function testFilename(filename) {
  return new Promise((resolve) => {
    const url = `${PRODUCTION_URL}/api/video-proxy?filename=${filename}`;
    
    const curl = spawn('curl', [
      '-s',
      '-o', '/dev/null',
      '-w', '%{http_code}',
      '--max-time', '5',
      '--connect-timeout', '3',
      url
    ]);
    
    let output = '';
    let error = '';
    
    curl.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    curl.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    curl.on('close', (code) => {
      const httpCode = output.trim();
      const status = httpCode === '200' || httpCode === '206' ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${httpCode.padStart(3)} | ${filename}`);
      
      resolve({ 
        filename, 
        httpCode, 
        success: httpCode === '200' || httpCode === '206',
        curlExitCode: code 
      });
    });
  });
}

async function runSystematicTest() {
  console.log('Status | Code | Filename');
  console.log('-------|------|----------');
  
  const results = [];
  
  for (const filename of TEST_FILENAMES) {
    const result = await testFilename(filename);
    results.push(result);
    
    // Small delay to avoid overwhelming server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n🔍 PATTERN ANALYSIS:');
  
  const working = results.filter(r => r.success);
  const failing = results.filter(r => !r.success);
  
  console.log(`\n✅ WORKING (${working.length}):`);
  working.forEach(r => console.log(`   ${r.filename}`));
  
  console.log(`\n❌ FAILING (${failing.length}):`);
  failing.forEach(r => console.log(`   ${r.filename}`));
  
  console.log('\n🔍 FILTERING RULE ANALYSIS:');
  
  // Test exact match hypothesis
  const exactMatches = ['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'];
  const exactMatchResults = working.filter(r => exactMatches.includes(r.filename));
  
  if (exactMatchResults.length === exactMatches.length && working.length === exactMatches.length) {
    console.log('📍 EXACT MATCH: Only VideoHero1/2/3.mp4 work (hardcoded whitelist)');
  } else if (working.some(r => r.filename.startsWith('VideoHero') && !exactMatches.includes(r.filename))) {
    console.log('📍 PREFIX PATTERN: VideoHero*.mp4 pattern matching detected');
  } else if (working.length > exactMatches.length) {
    console.log('📍 COMPLEX RULE: More sophisticated filtering detected');
  } else {
    console.log('📍 UNKNOWN PATTERN: Results need manual analysis');
  }
  
  return results;
}

runSystematicTest().catch(console.error);