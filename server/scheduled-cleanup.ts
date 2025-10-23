import { jsonCleanup } from './json-cleanup';

/**
 * Schedule automatic JSON cleanup to maintain 7-day rolling cache
 */
export const scheduleJsonCleanup = () => {
  const now = new Date();
  const nextCleanup = new Date();
  nextCleanup.setHours(2, 0, 0, 0); // 2 AM
  
  // If 2 AM has passed today, schedule for tomorrow
  if (nextCleanup <= now) {
    nextCleanup.setDate(nextCleanup.getDate() + 1);
  }
  
  const msUntilCleanup = nextCleanup.getTime() - now.getTime();
  
  setTimeout(async () => {
    try {
      console.log('🧹 SCHEDULED JSON CLEANUP: Starting daily maintenance...');
      await jsonCleanup.cleanupAllAnalyticsFiles();
      await jsonCleanup.cleanupOldBackups();
      const stats = await jsonCleanup.getCleanupStats();
      console.log('✅ SCHEDULED JSON CLEANUP: Daily maintenance complete');
      console.log(`📊 Cache maintained: ${stats.totalFiles} files, ${stats.totalSizeMB}MB total`);
      
      // Schedule next cleanup in 24 hours
      scheduleJsonCleanup();
    } catch (error) {
      console.error('❌ SCHEDULED JSON CLEANUP failed:', error);
      // Still schedule next cleanup even if this one fails
      scheduleJsonCleanup();
    }
  }, msUntilCleanup);
  
  console.log(`🕐 SCHEDULED JSON CLEANUP: Next cleanup at ${nextCleanup.toLocaleString()}`);
  console.log(`⏰ Time until cleanup: ${Math.round(msUntilCleanup / 1000 / 60)} minutes`);
};

/**
 * Run immediate cleanup for testing
 */
export const runImmediateCleanup = async () => {
  try {
    console.log('🧹 IMMEDIATE JSON CLEANUP: Starting manual cleanup...');
    await jsonCleanup.cleanupAllAnalyticsFiles();
    await jsonCleanup.cleanupOldBackups();
    const stats = await jsonCleanup.getCleanupStats();
    console.log('✅ IMMEDIATE JSON CLEANUP: Manual cleanup complete');
    console.log(`📊 Current cache state: ${stats.totalFiles} files, ${stats.totalSizeMB}MB total`);
    return stats;
  } catch (error) {
    console.error('❌ IMMEDIATE JSON CLEANUP failed:', error);
    throw error;
  }
};