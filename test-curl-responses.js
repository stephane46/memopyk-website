#!/usr/bin/env node

// 🔍 DIAGNOSTIC 1: Test with curl to compare responses
const { spawn } = require('child_process');

const PRODUCTION_URL = 'https://memopyk.replit.app';

console.log('🔍 DIAGNOSTIC 1: Curl Response Comparison');
console.log('Testing VideoHero1.mp4 vs VitaminSeaC.mp4 responses...\n');

function testUrl(filename) {
  return new Promise((resolve) => {
    const url = `${PRODUCTION_URL}/api/video-proxy?filename=${filename}`;
    console.log(`Testing: ${url}`);
    
    const curl = spawn('curl', [
      '-i',
      '--max-time', '10',
      '--connect-timeout', '5',
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
      console.log(`\n=== RESPONSE FOR ${filename} ===`);
      console.log(`Exit code: ${code}`);
      if (error) {
        console.log('STDERR:', error);
      }
      
      // Extract key information
      const lines = output.split('\n');
      const statusLine = lines[0] || 'NO STATUS LINE';
      const headers = lines.slice(1, lines.findIndex(line => line.trim() === '') || 10);
      
      console.log('Status:', statusLine);
      console.log('Key Headers:');
      headers.forEach(header => {
        if (header.toLowerCase().includes('content-type') || 
            header.toLowerCase().includes('content-length') ||
            header.toLowerCase().includes('server') ||
            header.toLowerCase().includes('error')) {
          console.log('  ', header);
        }
      });
      
      // Check for error body
      const bodyStartIndex = lines.findIndex(line => line.trim() === '');
      if (bodyStartIndex > -1) {
        const body = lines.slice(bodyStartIndex + 1).join('\n').slice(0, 200);
        if (body.trim()) {
          console.log('Error body preview:', body.trim());
        }
      }
      
      console.log(`=== END ${filename} ===\n`);
      resolve({ filename, statusLine, code, error, output });
    });
  });
}

async function runTests() {
  try {
    console.log('🔍 Testing working VideoHero1.mp4...');
    const hero1Result = await testUrl('VideoHero1.mp4');
    
    console.log('🔍 Testing blocked VitaminSeaC.mp4...');
    const vitaminResult = await testUrl('VitaminSeaC.mp4');
    
    console.log('\n🔍 COMPARISON ANALYSIS:');
    console.log(`Hero1 Status: ${hero1Result.statusLine}`);
    console.log(`Vitamin Status: ${vitaminResult.statusLine}`);
    
    if (hero1Result.statusLine.includes('206') && vitaminResult.statusLine.includes('500')) {
      console.log('✅ CONFIRMED: Infrastructure blocks specific filenames');
    } else {
      console.log('❓ UNEXPECTED: Different failure pattern than expected');
    }
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

runTests();