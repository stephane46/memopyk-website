// Test production health endpoint
const https = require('https');

const healthUrl = 'https://memopyk.replit.app/api/video-proxy/health';

console.log('🏥 Testing production health endpoint...');

https.get(healthUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      try {
        const health = JSON.parse(data);
        console.log('\n📊 PRODUCTION VERSION:');
        console.log('Version:', health.deployment?.version || 'Unknown');
        console.log('Timestamp:', health.timestamp);
        console.log('Cache files:', health.cache?.fileCount || 'Unknown');
      } catch (e) {
        console.log('Failed to parse JSON:', data);
      }
    } else {
      console.log('Error response:', data);
    }
  });
}).on('error', (error) => {
  console.error('Request error:', error.message);
});