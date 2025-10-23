#!/usr/bin/env node

/**
 * MEMOPYK Analytics Data Fix v1.0.159
 * 
 * CRITICAL FIX: Correct wrongly flagged analytics sessions
 * 
 * Issue: Real user sessions were incorrectly flagged as test_data=true
 * because they had Unknown countries or 0.0.0.0 IPs due to failed 
 * geolocation, causing empty analytics dashboard.
 * 
 * This script re-evaluates existing sessions with the new, more intelligent
 * test data detection logic.
 */

const fs = require('fs');
const path = require('path');

// More intelligent test data detection (same logic as in hybrid-storage.ts)
function isTestData(data) {
  const ip = data.ip_address || '0.0.0.0';
  const pageUrl = data.page_url || '';
  const referrer = data.referrer || '';
  const userAgent = (data.user_agent || '').toLowerCase();
  const country = data.country || 'Unknown';
  const sessionId = data.session_id || '';
  const screenRes = data.screen_resolution || '';

  // More intelligent test data detection
  // Don't flag real production traffic as test data
  const isRealProduction = (
    // Has real production domain patterns
    (pageUrl.includes('replit.dev') && !pageUrl.includes('localhost')) ||
    pageUrl.includes('replit.app') ||
    // Has real browser user agent (not headless/bot)
    (userAgent.includes('chrome') || userAgent.includes('firefox') || userAgent.includes('safari') || userAgent.includes('edge')) &&
    !userAgent.includes('headless') &&
    // Has realistic screen resolution
    screenRes && screenRes !== '1280x720' && !screenRes.includes('x0')
  );

  // If it looks like real production traffic, don't flag as test
  if (isRealProduction) {
    return false;
  }

  return (
    // Clear development indicators
    ip.startsWith('127.') ||
    ip.startsWith('192.168.') ||
    pageUrl.includes('localhost') ||
    // Development/test referrers
    referrer.includes('workspace_iframe') ||
    // Automated/bot traffic
    userAgent.includes('headless') ||
    userAgent.includes('bot') ||
    userAgent.includes('crawler') ||
    userAgent.includes('spider') ||
    userAgent.includes('automated') ||
    // Explicit test identifiers
    sessionId.startsWith('TEST_') ||
    sessionId.startsWith('DEV_') ||
    sessionId === 'test_session' ||
    country === 'Test' ||
    userAgent.includes('test')
  );
}

async function fixAnalyticsData() {
  try {
    console.log('🔧 MEMOPYK Analytics Fix v1.0.159: Correcting test data flags');
    
    const dataPath = path.join(__dirname, 'server', 'data', 'analytics-sessions.json');
    
    if (!fs.existsSync(dataPath)) {
      console.log('❌ Analytics sessions file not found:', dataPath);
      return;
    }
    
    // Load existing data
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const sessions = JSON.parse(rawData);
    
    console.log(`📊 Found ${sessions.length} existing analytics sessions`);
    
    let corrected = 0;
    let realSessionsFound = 0;
    
    // Re-evaluate each session with new logic
    sessions.forEach((session, index) => {
      const oldFlag = session.is_test_data;
      const newFlag = isTestData(session);
      
      if (oldFlag !== newFlag) {
        console.log(`🔄 Correcting session ${index + 1}:`);
        console.log(`   URL: ${session.page_url}`);
        console.log(`   User Agent: ${session.user_agent}`);
        console.log(`   Screen: ${session.screen_resolution}`);
        console.log(`   Was: ${oldFlag ? 'TEST' : 'REAL'} → Now: ${newFlag ? 'TEST' : 'REAL'}`);
        
        session.is_test_data = newFlag;
        corrected++;
      }
      
      if (!newFlag) {
        realSessionsFound++;
      }
    });
    
    // Save corrected data
    fs.writeFileSync(dataPath, JSON.stringify(sessions, null, 2));
    
    console.log('✅ Analytics data fix completed:');
    console.log(`   📈 Total sessions: ${sessions.length}`);
    console.log(`   🔧 Corrections made: ${corrected}`);
    console.log(`   👥 Real user sessions: ${realSessionsFound}`);
    console.log(`   🧪 Test data sessions: ${sessions.length - realSessionsFound}`);
    
    if (realSessionsFound > 0) {
      console.log('🎉 SUCCESS: Real user data found! Analytics dashboard should now show countries and languages.');
    } else {
      console.log('⚠️  No real user sessions found after correction. Dashboard may still be empty.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing analytics data:', error);
    process.exit(1);
  }
}

// Run the fix
fixAnalyticsData();