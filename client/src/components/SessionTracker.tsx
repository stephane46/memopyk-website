import { useEffect } from 'react';
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';

/**
 * SessionTracker Component
 * Initializes MEMOPYK session tracking and page view tracking
 * Must be rendered INSIDE QueryClientProvider to access React Query context
 */
export function SessionTracker() {
  const { trackSession, setupPageViewTracking, setupSessionDurationTracking } = useVideoAnalytics();
  
  useEffect(() => {
    // Only track on public pages, not admin
    const isAdminPage = window.location.pathname.includes('/admin');
    
    if (!isAdminPage) {
      console.log('🔄 Initializing MEMOPYK session tracking...');
      
      // 1. Initialize session (creates user_id, captures IP, geolocation)
      trackSession();
      
      // 2. Setup page view tracking (increments page_views on navigation)
      setupPageViewTracking();
      
      // 3. Setup session duration tracking (updates session_duration every 30s)
      setupSessionDurationTracking();
      
      console.log('✅ MEMOPYK session tracking initialized');
    } else {
      console.log('🚫 Session tracking disabled on admin pages');
    }
  }, [trackSession, setupPageViewTracking, setupSessionDurationTracking]);
  
  // This component doesn't render anything
  return null;
}
