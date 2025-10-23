// Direct test of qActualWatchTimeByVideo function
import { qActualWatchTimeByVideo } from './server/ga4-service.js';

async function testWatchTime() {
  try {
    console.log('🔍 Testing qActualWatchTimeByVideo directly...');
    const result = await qActualWatchTimeByVideo('2024-08-01', '2025-12-31', 'all');
    console.log('✅ qActualWatchTimeByVideo SUCCESS:', result);
  } catch (error) {
    console.log('❌ qActualWatchTimeByVideo FAILED:', error.message);
  }
}

testWatchTime();