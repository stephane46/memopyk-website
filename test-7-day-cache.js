/**
 * Test the 7-day rolling cache system
 */
const fs = require('fs');
const path = require('path');

console.log('🧪 TESTING 7-DAY ROLLING CACHE SYSTEM');

// Check current analytics data size
const analyticsSessionsPath = path.join(__dirname, 'server/data/analytics-sessions.json');
const analyticsViewsPath = path.join(__dirname, 'server/data/analytics-views.json');

try {
  // Get current file sizes
  const sessionsStats = fs.statSync(analyticsSessionsPath);
  const viewsStats = fs.existsSync(analyticsViewsPath) ? fs.statSync(analyticsViewsPath) : null;
  
  console.log('📊 CURRENT DATA STATUS:');
  console.log(`   Sessions: ${(sessionsStats.size / 1024 / 1024).toFixed(2)}MB`);
  if (viewsStats) {
    console.log(`   Views: ${(viewsStats.size / 1024 / 1024).toFixed(2)}MB`);
  } else {
    console.log('   Views: File not found');
  }
  
  // Load and analyze session data
  const sessions = JSON.parse(fs.readFileSync(analyticsSessionsPath, 'utf-8'));
  console.log(`   Total sessions: ${sessions.length}`);
  
  // Find date range
  const dates = sessions.map(s => new Date(s.created_at));
  const oldestDate = new Date(Math.min(...dates));
  const newestDate = new Date(Math.max(...dates));
  
  console.log(`   Date range: ${oldestDate.toDateString()} to ${newestDate.toDateString()}`);
  
  // Calculate how many days of data we have
  const daysDiff = (newestDate - oldestDate) / (1000 * 60 * 60 * 24);
  console.log(`   Days of data: ${daysDiff.toFixed(1)}`);
  
  // Check for old data (older than 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const oldSessions = sessions.filter(s => new Date(s.created_at) < sevenDaysAgo);
  const recentSessions = sessions.filter(s => new Date(s.created_at) >= sevenDaysAgo);
  
  console.log(`   Old sessions (>7 days): ${oldSessions.length}`);
  console.log(`   Recent sessions (≤7 days): ${recentSessions.length}`);
  
  if (oldSessions.length > 0) {
    console.log('⚠️ OLD DATA DETECTED - 7-day cleanup would remove:', oldSessions.length, 'sessions');
    console.log('📝 Oldest session:', oldSessions[0].created_at);
  } else {
    console.log('✅ NO OLD DATA - All sessions are within 7-day window');
  }
  
  console.log('\n🎯 7-DAY ROLLING CACHE STRATEGY:');
  console.log('   Recent data (last 7 days) → JSON cache (instant access)');
  console.log('   Historical data (>7 days) → Supabase only (on-demand)');
  console.log('   JSON files stay small, historical data always available');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}