#!/usr/bin/env node

// Simple test to verify FAQ PATCH endpoint behavior
const https = require('https');

const testData = JSON.stringify({
  is_active: false
});

const options = {
  hostname: 'new.memopyk.com',
  port: 443,
  path: '/api/faqs/test-nonexistent-id-should-fail-gracefully',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

console.log('🧪 Testing FAQ PATCH endpoint on production...');
console.log('🔍 Using non-existent ID to avoid affecting real data');

const req = https.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📦 Response Body:', data);
    
    if (res.statusCode === 500 || res.statusCode === 404) {
      console.log('✅ Good! Non-existent ID correctly returns error (not deleting random FAQs)');
    } else if (res.statusCode === 200) {
      console.log('⚠️  Unexpected: Got success with non-existent ID');
    }
    
    console.log('🏁 Test complete');
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.write(testData);
req.end();