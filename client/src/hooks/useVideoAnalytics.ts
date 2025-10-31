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
      
      // FIXED: Store the session ID for duration tracking
      if (data?.session?.session_id) {
        localStorage.setItem('memopyk-current-session-id', data.session.session_id);
        console.log('📊 SESSION TRACKING: Stored session ID for duration tracking:', data.session.session_id);
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
    
    const viewData = {
      video_id: videoId,
      duration_watched: durationWatched,
      completed: completed,
      language,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
    };
    
    
    trackVideoView.mutate(viewData);
  }, [trackVideoView]);

  // Helper function to track session with automatic data collection and deduplication
  const trackSessionWithDefaults = () => {
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
    
    const sessionData = {
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
  };

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

  return {
    trackVideoView: trackVideoViewWithDefaults,
    trackSession: trackSessionWithDefaults,
    // Raw mutation hooks for manual usage
    trackVideoViewMutation: trackVideoView,
    trackSessionMutation: trackSession,
  };
};