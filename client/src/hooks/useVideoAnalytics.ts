import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiRequest } from '../lib/queryClient';

// Feature flag for video analytics - ENABLED to track visitor sessions for detailed analytics
const VIDEO_ANALYTICS_ENABLED = import.meta.env.VITE_VIDEO_ANALYTICS_ENABLED === 'true' || true;

interface VideoViewData {
  video_id: string;
  duration_watched?: number;
  completed?: boolean;
  language: 'en-US' | 'fr-FR';
  page_url?: string;
  referrer?: string;
}

interface SessionData {
  language: 'en-US' | 'fr-FR';
  page_url: string;
  user_agent?: string;
  screen_resolution?: string;
  timezone?: string;
  referrer?: string;
}

export const useVideoAnalytics = () => {
  const queryClient = useQueryClient();

  const trackVideoView = useMutation({
    mutationFn: async (data: VideoViewData) => {
      // LOCAL ANALYTICS ENABLED - Independent dual tracking system (LOCAL + GA4)
      if (!VIDEO_ANALYTICS_ENABLED) {
        console.log('📊 VIDEO ANALYTICS DISABLED: VITE_VIDEO_ANALYTICS_ENABLED environment variable not set');
        return { success: true, disabled: true };
      }
      
      
      const response = await fetch('/api/analytics/video-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Video tracking failed:', response.status, errorText);
        throw new Error(`Failed to track video view: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      // 🚨 FIXED: Only invalidate specific analytics endpoints, NOT gallery!
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/video-view'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/sessions'] });
    },
    onError: (error) => {
      console.error('Video tracking error:', error);
    },
  });

  const trackSession = useMutation({
    mutationFn: async (data: SessionData) => {
      console.log('📊 PRODUCTION ANALYTICS: Making session tracking request to /api/analytics/session');
      console.log('📊 PRODUCTION ANALYTICS: Request payload:', JSON.stringify(data, null, 2));
      
      try {
        const response = await fetch('/api/analytics/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        console.log('📊 PRODUCTION ANALYTICS: Session request response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('📊 PRODUCTION ANALYTICS: Session tracking failed:', response.status, errorText);
          throw new Error(`Failed to track session: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📊 PRODUCTION ANALYTICS: Session tracked successfully:', result);
        return result;
      } catch (error) {
        console.error('📊 PRODUCTION ANALYTICS: Fetch error during session tracking:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('📊 PRODUCTION ANALYTICS: Session mutation success:', data);
      
      // CRITICAL FIX: Backend returns "id" not "session_id"
      const sessionId = data?.session?.id || data?.session?.session_id;
      if (sessionId) {
        localStorage.setItem('memopyk-current-session-id', sessionId);
        console.log('📊 SESSION TRACKING: Stored session ID for duration tracking:', sessionId);
      } else {
        console.error('📊 SESSION TRACKING: No session ID found in response!', data);
      }
      
      // 🚨 FIXED: Only invalidate sessions, NOT gallery!
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/sessions'] });
    },
    onError: (error) => {
      console.error('📊 PRODUCTION ANALYTICS: Session tracking error:', error);
    },
  });

  // Helper function to track video view with duplicate prevention (reduced for better production testing)
  const trackVideoViewWithDefaults = useCallback((videoId: string, durationWatched?: number, completed?: boolean) => {
    // Skip tracking for hero videos (auto-play videos don't provide meaningful engagement data)
    if (['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(videoId)) {
      console.log(`📊 PRODUCTION ANALYTICS: Skipping analytics tracking for hero video: ${videoId} (auto-play videos excluded from analytics)`);
      return;
    }
    
    
    const language = (localStorage.getItem('memopyk-language') as 'en-US' | 'fr-FR') || 'fr-FR';
    
    // Reduced duplicate prevention - 10 second window for better production testing
    const lastTracked = localStorage.getItem(`last-tracked-${videoId}`);
    const now = Date.now();
    if (lastTracked && now - parseInt(lastTracked) < 10000) {
      return; // Skip if tracked within last 10 seconds
    }
    
    localStorage.setItem(`last-tracked-${videoId}`, now.toString());
    
    // Get current session ID from localStorage to link events to sessions
    const sessionId = localStorage.getItem('memopyk-current-session-id');
    
    const viewData = {
      video_id: videoId,
      duration_watched: durationWatched,
      completed: completed,
      language,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
      session_id: sessionId || undefined, // Link video view to active session
    };
    
    console.log('📊 VIDEO VIEW: Tracking with session linkage:', { videoId, sessionId: sessionId || 'no-session' });
    trackVideoView.mutate(viewData);
  }, [trackVideoView]);

  // Generate or retrieve persistent user ID
  const getUserId = (): string => {
    const USER_ID_KEY = 'memopyk-user-id';
    let userId = localStorage.getItem(USER_ID_KEY);
    
    if (!userId) {
      // Generate a unique user ID using timestamp + random string
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(USER_ID_KEY, userId);
      console.log('📊 USER ID: Generated new persistent user ID:', userId);
    } else {
      console.log('📊 USER ID: Retrieved existing user ID:', userId);
    }
    
    return userId;
  };

  // Helper function to track session with automatic data collection and deduplication
  const trackSessionWithDefaults = useCallback(() => {
    // Admin page exclusion - automatically exclude admin visits from analytics
    if (window.location.pathname.includes('/admin') || window.location.pathname.endsWith('/admin')) {
      console.log('📊 PRODUCTION ANALYTICS: Skipping session tracking - admin page detected');
      return;
    }
    
    // Development environment exclusion - exclude Replit preview and localhost
    const isDevelopment = window.location.hostname.includes('replit.dev') || 
                         window.location.hostname.includes('localhost') ||
                         window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
      console.log('📊 PRODUCTION ANALYTICS: Skipping session tracking - development environment detected');
      return;
    }
    
    // Session deduplication to prevent analytics overload (reduced from 1 hour to 10 minutes for better production tracking)
    const sessionKey = 'memopyk-session-tracked';
    const sessionStartKey = 'memopyk-session-start';
    const lastSessionTime = localStorage.getItem(sessionKey);
    const now = Date.now();
    
    // Reduced to 30 seconds for better production testing and country change detection
    if (lastSessionTime && now - parseInt(lastSessionTime) < 30000) {
      console.log(`⏭️ PRODUCTION ANALYTICS: Skipping session tracking - already tracked ${Math.round((now - parseInt(lastSessionTime)) / 1000)}s ago`);
      return;
    }
    
    console.log('📊 PRODUCTION ANALYTICS: Tracking new visitor session');
    console.log('📊 PRODUCTION ANALYTICS: Environment:', import.meta.env.NODE_ENV || 'production');
    console.log('📊 PRODUCTION ANALYTICS: Current URL:', window.location.href);
    
    // Store session start time for duration calculation (reset for each new visit)
    localStorage.setItem(sessionStartKey, now.toString());
    console.log('📊 SESSION DURATION: Session start time recorded');
    
    localStorage.setItem(sessionKey, now.toString());
    
    const language = (localStorage.getItem('memopyk-language') as 'en-US' | 'fr-FR') || 'fr-FR';
    
    // Get or generate persistent user ID
    const userId = getUserId();
    
    const sessionData = {
      user_id: userId,
      language,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer || undefined,
    };
    
    console.log('📊 PRODUCTION ANALYTICS: Sending session data:', sessionData);
    
    trackSession.mutate(sessionData);
    
    // Set up session duration tracking
    setupSessionDurationTracking();
    
    // Set up page view tracking
    setupPageViewTracking();
  }, [trackSession.mutate]);

  // Session duration tracking with page visibility API
  const setupSessionDurationTracking = () => {
    const sessionStartKey = 'memopyk-session-start';
    const sessionIdKey = 'memopyk-current-session-id';
    
    const updateSessionDuration = async () => {
      const sessionStart = localStorage.getItem(sessionStartKey);
      if (!sessionStart) return;
      
      const startTime = parseInt(sessionStart);
      const now = Date.now();
      const sessionAge = now - startTime;
      
      // CRITICAL FIX: Ignore stale sessions (older than 2 hours)
      // Prevents impossible durations like 40h+ from old unclosed sessions
      const MAX_SESSION_AGE = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      if (sessionAge > MAX_SESSION_AGE) {
        console.warn(`🚫 SESSION DURATION: Ignoring stale session (${Math.round(sessionAge / 3600000)}h old) - resetting`);
        localStorage.removeItem(sessionStartKey);
        localStorage.removeItem(sessionIdKey);
        return;
      }
      
      const duration = Math.round(sessionAge / 1000);
      const sessionId = localStorage.getItem(sessionIdKey);
      
      console.log(`📊 SESSION DURATION: Current session duration: ${duration}s for session: ${sessionId || 'none'}`);
      
      // Send session duration update to backend with session ID
      try {
        await fetch('/api/analytics/session-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            duration,
            sessionId: sessionId 
          })
        });
      } catch (error) {
        console.warn('📊 SESSION DURATION: Failed to update session duration:', error);
      }
    };
    
    // Update session duration on page unload
    const handleBeforeUnload = () => {
      updateSessionDuration();
      console.log('📊 SESSION DURATION: Session ending, final duration recorded');
    };
    
    // Update session duration when page becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateSessionDuration();
        console.log('📊 SESSION DURATION: Page hidden, duration updated');
      }
    };
    
    // Set up event listeners if not already done
    if (!(window as any).memopykSessionListenersAdded) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      (window as any).memopykSessionListenersAdded = true;
      
      // Update duration every 30 seconds
      setInterval(updateSessionDuration, 30000);
      console.log('📊 SESSION DURATION: Tracking setup complete - updates every 30s');
    }
  };

  // Page view tracking for SPA navigation
  const setupPageViewTracking = () => {
    // Idempotent guard: prevent duplicate observers/listeners
    if ((window as any).memopykPageViewListenersAdded) {
      console.log('📊 PAGE VIEW: Tracking already initialized, skipping duplicate setup');
      return;
    }
    
    const sessionIdKey = 'memopyk-current-session-id';
    let pageCount = 1; // First page view already counted in session creation
    
    const trackPageView = async () => {
      const sessionId = localStorage.getItem(sessionIdKey);
      if (!sessionId) {
        console.log('📊 PAGE VIEW: No active session, skipping page view tracking');
        return;
      }
      
      pageCount++;
      console.log(`📊 PAGE VIEW: Tracking page view #${pageCount} for session ${sessionId}`);
      
      try {
        await fetch('/api/analytics/session-page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sessionId,
            pageUrl: window.location.href,
            pageCount
          })
        });
      } catch (error) {
        console.warn('📊 PAGE VIEW: Failed to track page view:', error);
      }
    };
    
    // Track page views on route changes
    let lastPath = window.location.pathname;
    
    const checkRouteChange = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        console.log(`📊 PAGE VIEW: Route changed from ${lastPath} to ${currentPath}`);
        lastPath = currentPath;
        trackPageView();
      }
    };
    
    // Use MutationObserver to detect SPA route changes
    const observer = new MutationObserver(checkRouteChange);
    observer.observe(document.querySelector('body')!, { 
      childList: true, 
      subtree: true 
    });
    
    // Also track on popstate (browser back/forward)
    window.addEventListener('popstate', trackPageView);
    
    // Mark as initialized
    (window as any).memopykPageViewListenersAdded = true;
    
    console.log('📊 PAGE VIEW: Page view tracking initialized');
  };

  return {
    trackVideoView: trackVideoViewWithDefaults,
    trackSession: trackSessionWithDefaults,
    setupPageViewTracking,
    setupSessionDurationTracking,
    // Raw mutation hooks for manual usage
    trackVideoViewMutation: trackVideoView,
    trackSessionMutation: trackSession,
  };
};