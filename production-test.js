// Test production gallery video endpoint
const https = require('https');

const testUrl = 'https://memopyk.replit.app/api/video-proxy?filename=1753390495474-Pom%20Gallery%20(RAV%20AAA_001)%20compressed.mp4';

console.log('🧪 Testing production gallery video endpoint...');
console.log('URL:', testUrl);

const options = {
  headers: {
    'Range': 'bytes=0-',
    'User-Agent': 'Production-Test/1.0'
  }
};

const req = https.get(testUrl, options, (res) => {
  console.log('\n📊 PRODUCTION RESPONSE:');
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 500) {
      console.log('\n❌ ERROR RESPONSE BODY:');
      console.log(data.substring(0, 500) + '...');
    } else if (res.statusCode === 206) {
      console.log('\n✅ SUCCESS - Partial content response');
      console.log('Data length:', data.length);
    } else {
      console.log('\n📄 RESPONSE BODY:');
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
});

req.setTimeout(10000, () => {
  console.error('❌ Request timeout');
  req.destroy();
});