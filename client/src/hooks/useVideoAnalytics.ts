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
      if (!VIDEO_ANALYTICS_ENABLED) {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/video-view'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/sessions'] });
    },
    onError: (error) => {
      console.error('Video tracking error:', error);
    },
  });

  const trackSession = useMutation({
    mutationFn: async (data: SessionData) => {
      try {
        const response = await fetch('/api/analytics/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Session tracking failed:', response.status, errorText);
          throw new Error(`Failed to track session: ${response.status} - ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Session tracking fetch error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      const sessionId = data?.session?.id || data?.session?.session_id;
      if (sessionId) {
        localStorage.setItem('memopyk-current-session-id', sessionId);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/sessions'] });
    },
    onError: (error) => {
      console.error('Session tracking error:', error);
    },
  });

  // Helper function to track video view with duplicate prevention
  const trackVideoViewWithDefaults = useCallback((videoId: string, durationWatched?: number, completed?: boolean) => {
    // Skip tracking for hero videos (auto-play videos don't provide meaningful engagement data)
    if (['VideoHero1.mp4', 'VideoHero2.mp4', 'VideoHero3.mp4'].includes(videoId)) {
      return;
    }

    const language = (localStorage.getItem('memopyk-language') as 'en-US' | 'fr-FR') || 'fr-FR';
    const sessionId = localStorage.getItem('memopyk-current-session-id');

    // For completion events, check if already completed in this session
    if (completed) {
      const completionKey = `video-completed-${sessionId}-${videoId}`;
      if (localStorage.getItem(completionKey)) {
        return;
      }
      localStorage.setItem(completionKey, 'true');
    }

    // Duplicate prevention — 60 second window for non-completion events
    const lastTracked = localStorage.getItem(`last-tracked-${videoId}`);
    const now = Date.now();
    if (lastTracked && now - parseInt(lastTracked) < 60000) {
      return;
    }

    localStorage.setItem(`last-tracked-${videoId}`, now.toString());

    const viewData = {
      video_id: videoId,
      duration_watched: durationWatched,
      completed: completed,
      language,
      page_url: window.location.href,
      referrer: document.referrer || undefined,
      session_id: sessionId || undefined,
    };

    trackVideoView.mutate(viewData);
  }, [trackVideoView]);

  // Generate or retrieve persistent user ID
  const getUserId = (): string => {
    const USER_ID_KEY = 'memopyk-user-id';
    let userId = localStorage.getItem(USER_ID_KEY);

    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(USER_ID_KEY, userId);
    }

    return userId;
  };

  // Helper function to track session with automatic data collection and deduplication
  const trackSessionWithDefaults = useCallback(() => {
    // Admin page exclusion
    if (window.location.pathname.includes('/admin') || window.location.pathname.endsWith('/admin')) {
      return;
    }

    // Development environment exclusion
    const isDevelopment = window.location.hostname.includes('replit.dev') ||
                         window.location.hostname.includes('localhost') ||
                         window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
      return;
    }

    // Session deduplication — 30 second window
    const sessionKey = 'memopyk-session-tracked';
    const sessionStartKey = 'memopyk-session-start';
    const lastSessionTime = localStorage.getItem(sessionKey);
    const now = Date.now();

    if (lastSessionTime && now - parseInt(lastSessionTime) < 30000) {
      return;
    }

    localStorage.setItem(sessionStartKey, now.toString());
    localStorage.setItem(sessionKey, now.toString());

    const language = (localStorage.getItem('memopyk-language') as 'en-US' | 'fr-FR') || 'fr-FR';
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

    trackSession.mutate(sessionData);

    setupSessionDurationTracking();
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

      // Ignore stale sessions (older than 2 hours)
      const MAX_SESSION_AGE = 2 * 60 * 60 * 1000;
      if (sessionAge > MAX_SESSION_AGE) {
        localStorage.removeItem(sessionStartKey);
        localStorage.removeItem(sessionIdKey);
        return;
      }

      const duration = Math.round(sessionAge / 1000);
      const sessionId = localStorage.getItem(sessionIdKey);

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
        console.warn('Failed to update session duration:', error);
      }
    };

    const handleBeforeUnload = () => {
      updateSessionDuration();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateSessionDuration();
      }
    };

    if (!(window as any).memopykSessionListenersAdded) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      (window as any).memopykSessionListenersAdded = true;

      // Update duration every 30 seconds
      setInterval(updateSessionDuration, 30000);
    }
  };

  // Page view tracking for SPA navigation
  const setupPageViewTracking = () => {
    if ((window as any).memopykPageViewListenersAdded) {
      return;
    }

    const sessionIdKey = 'memopyk-current-session-id';
    let pageCount = 1;

    const trackPageView = async () => {
      const sessionId = localStorage.getItem(sessionIdKey);
      if (!sessionId) return;

      pageCount++;

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
        console.warn('Failed to track page view:', error);
      }
    };

    let lastPath = window.location.pathname;

    const checkRouteChange = () => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        trackPageView();
      }
    };

    const observer = new MutationObserver(checkRouteChange);
    observer.observe(document.querySelector('body')!, {
      childList: true,
      subtree: true
    });

    window.addEventListener('popstate', trackPageView);
    (window as any).memopykPageViewListenersAdded = true;
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
