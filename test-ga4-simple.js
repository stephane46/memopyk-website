// Quick test of GA4 basic functionality
import { qPlays } from './server/ga4-service.js';

async function testGA4() {
  console.log('Testing GA4 service with simple query...');
  
  try {
    // Test with current date
    const today = new Date().toISOString().split('T')[0];
    console.log(`Testing with date: ${today}`);
    
    const result = await qPlays(today, today, 'all');
    console.log('Success! Result:', result);
  } catch (error) {
    console.error('GA4 Error:', error.message);
    console.error('Full error:', error);
  }
}

testGA4();