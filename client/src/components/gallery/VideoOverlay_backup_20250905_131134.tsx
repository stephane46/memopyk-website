import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, X, ImageIcon, Clock } from 'lucide-react';
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';
import { fireGA } from '@/lib/analytics';
// Direct GA4 calls with fireGA function

interface VideoOverlayProps {
  videoUrl: string;
  title: string;
  sourceText?: string;
  durationText?: string;
  onClose: () => void;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
  isInstantReady?: boolean;
  preloadedElement?: HTMLVideoElement | null;
  thumbnailUrl?: string;
}

export default function VideoOverlay({ 
  videoUrl, 
  title, 
  sourceText,
  durationText,
  onClose, 
  orientation, 
  width, 
  height, 
  isInstantReady = false, 
  preloadedElement = null,
  thumbnailUrl 
}: VideoOverlayProps) {
  console.log('🎬🎬🎬 VideoOverlay MOUNTED with GA4 tracking!', videoUrl);
  
  // VideoOverlay mounted
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showThumbnail, setShowThumbnail] = useState(!!thumbnailUrl);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoStartTimeRef = useRef<number>(Date.now());
  const thumbnailStartTimeRef = useRef<number>(Date.now());
  const videoReadyRef = useRef<boolean>(false);
  const milestonesTrackedRef = useRef<Set<number>>(new Set());
  
  // Minimum thumbnail display time (2 seconds)
  const MINIMUM_THUMBNAIL_DISPLAY_TIME = 2000;
  
  // Language detection for source text
  const language = localStorage.getItem('language') || 'en-US';
  
  // Analytics tracking - LOCAL ANALYTICS: Track gallery video views
  const { trackVideoView } = useVideoAnalytics();

  // Use centralized fireGA function from @/lib/analytics (no local shadow)

  // Track if video_start has been sent for this session
  const videoStartSentRef = useRef(false);
  
  // Create stable refs for props to avoid dependency issues
  const videoUrlRef = useRef(videoUrl);
  const titleRef = useRef(title);
  
  // Update refs when props change, but don't trigger re-renders
  videoUrlRef.current = videoUrl;
  titleRef.current = title;
  
  // Feature flag for video analytics - Use environment variable as intended
  const VIDEO_ANALYTICS_ENABLED = import.meta.env.VITE_VIDEO_ANALYTICS_ENABLED === 'true' || false;
  
  // Extract video ID from URL - stable reference for session tracking
  const getVideoId = useCallback(() => {
    const currentVideoUrl = videoUrlRef.current;
    if (currentVideoUrl.includes('filename=')) {
      return currentVideoUrl.split('filename=')[1].split('&')[0];
    }
    return currentVideoUrl.split('/').pop()?.split('?')[0] || 'unknown';
  }, []); // No dependencies - uses ref

  // ENHANCED THUMBNAIL-TO-VIDEO SYSTEM v1.0.174 with minimum display time - MOUNT ONCE ONLY
  useEffect(() => {
    console.log('🎬 VideoOverlay MOUNTED - Setting up video element');
    console.log('🎬 Video URL:', videoUrl);
    console.log('🎬 Video ref exists:', !!videoRef.current);
    
    videoStartTimeRef.current = Date.now();
    thumbnailStartTimeRef.current = Date.now();
    videoReadyRef.current = false;
    // Don't reset milestones on every re-mount - only reset for truly new videos
    console.log('🎬 VideoOverlay effect running - NOT clearing milestones (prevent reset on re-mount)');
    
    // Test if video element exists after a small delay
    setTimeout(() => {
      console.log('🎬 DELAYED CHECK - Video ref exists:', !!videoRef.current);
      if (videoRef.current) {
        console.log('🎬 Video element properties:', {
          src: videoRef.current.src,
          readyState: videoRef.current.readyState,
          duration: videoRef.current.duration,
          currentTime: videoRef.current.currentTime
        });
      }
    }, 1000);
    
    // Start video buffering immediately for faster transition
    const video = videoRef.current;
    if (video && thumbnailUrl) {
      video.load(); // Force immediate buffering
    }
    
    return () => {
      // LIVE VIEW TRACKING: Stop heartbeat on component unmount
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, []); // Run once on mount only

  // Enhanced error handling
  const handleVideoError = useCallback((e: any) => {
    console.error('VideoOverlay Error:', e.target?.error);
  }, []); // No dependencies needed

  // Mobile detection - same logic as GallerySection
  const getIsMobile = useCallback(() => {
    return window.innerWidth <= 640; // Matches GallerySection mobile detection
  }, []);

  // Viewport sizing ratio
  const getViewportRatio = useCallback(() => {
    return 90; // 90% of viewport for all devices
  }, []);

  // Calculate video container dimensions - FIXED to use proper viewport constraints
  const getVideoDimensions = useCallback(() => {
    const viewportRatio = getViewportRatio();
    const isMobileDevice = getIsMobile();
    
    // Calculate aspect ratio from video dimensions
    const aspectRatio = width / height;
    

    
    // CRITICAL FIX: Use viewport-based sizing for both mobile and desktop
    if (isMobileDevice) {
      // MOBILE: Use WIDTH constraint (90% of screen width) to prevent landscape videos from being too wide
      const maxWidth = (window.innerWidth * viewportRatio) / 100;
      const containerWidth = maxWidth;
      const containerHeight = containerWidth / aspectRatio;
      
      console.log(`🎬 ${orientation.toUpperCase()} VIDEO - MOBILE WIDTH CONSTRAINED:`, {
        title,
        orientation,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        viewportRatio,
        maxWidth,
        containerWidth,
        containerHeight,
        aspectRatio,
        videoWidth: width,
        videoHeight: height,
        constraint: 'mobile width-based (90% viewport)'
      });
      
      return { width: containerWidth, height: containerHeight };
    } else {
      // DESKTOP: Use both width AND height constraints, pick the smaller result
      const maxWidth = (window.innerWidth * viewportRatio) / 100;
      const maxHeight = (window.innerHeight * viewportRatio) / 100;
      
      // Calculate dimensions for both constraints
      const widthConstrainedWidth = maxWidth;
      const widthConstrainedHeight = maxWidth / aspectRatio;
      
      const heightConstrainedHeight = maxHeight;
      const heightConstrainedWidth = maxHeight * aspectRatio;
      
      // Use whichever constraint results in smaller dimensions (fits in viewport)
      let containerWidth, containerHeight, activeConstraint;
      
      if (widthConstrainedHeight <= maxHeight) {
        // Width constraint works - video fits height-wise
        containerWidth = widthConstrainedWidth;
        containerHeight = widthConstrainedHeight;
        activeConstraint = 'width-constrained';
      } else {
        // Height constraint needed - video would be too tall
        containerWidth = heightConstrainedWidth;
        containerHeight = heightConstrainedHeight;
        activeConstraint = 'height-constrained';
      }
      
      console.log(`🎬 ${orientation.toUpperCase()} VIDEO - DESKTOP DUAL CONSTRAINT (90% VIEWPORT):`, {
        title,
        orientation,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        viewportRatio,
        maxWidth,
        maxHeight,
        aspectRatio,
        widthConstrainedDims: `${widthConstrainedWidth}x${widthConstrainedHeight}`,
        heightConstrainedDims: `${heightConstrainedWidth}x${heightConstrainedHeight}`,
        finalDims: `${containerWidth}x${containerHeight}`,
        activeConstraint,
        videoWidth: width,
        videoHeight: height
      });
      
      return { width: containerWidth, height: containerHeight };
    }
  }, [orientation, width, height, getViewportRatio, getIsMobile]); // Removed title dependency

  const [videoDimensions, setVideoDimensions] = useState(() => getVideoDimensions());

  // Debounced resize handler - FIXED: Use stable ref to prevent re-render loop
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Use getVideoDimensions directly in the callback to avoid dependency issues
        const viewportRatio = 90; // 90% of viewport for all devices
        const isMobileDevice = window.innerWidth <= 640;
        const aspectRatio = width / height;
        
        let containerWidth, containerHeight;
        
        if (isMobileDevice) {
          const maxWidth = (window.innerWidth * viewportRatio) / 100;
          containerWidth = maxWidth;
          containerHeight = containerWidth / aspectRatio;
        } else {
          const maxWidth = (window.innerWidth * viewportRatio) / 100;
          const maxHeight = (window.innerHeight * viewportRatio) / 100;
          
          const widthConstrainedWidth = maxWidth;
          const widthConstrainedHeight = maxWidth / aspectRatio;
          const heightConstrainedHeight = maxHeight;
          const heightConstrainedWidth = maxHeight * aspectRatio;
          
          if (widthConstrainedHeight <= maxHeight) {
            containerWidth = widthConstrainedWidth;
            containerHeight = widthConstrainedHeight;
          } else {
            containerWidth = heightConstrainedWidth;
            containerHeight = heightConstrainedHeight;
          }
        }
        
        setVideoDimensions({ width: containerWidth, height: containerHeight });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [width, height]); // Only depend on stable props, not functions

  // Auto-hide controls after 2 seconds
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2000);
    }
  }, [isPlaying]);

  // Progress tracking - using timeupdate event for reliability with GA4 analytics
  const updateProgress = useCallback(() => {
    console.log('🎯 updateProgress called'); // Debug: Check if function is called
    const video = videoRef.current;
    console.log('🎯 Video ref exists:', !!video, 'Duration:', video?.duration); // Debug video state
    if (video && !isNaN(video.duration) && video.duration > 0) {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress);
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
      
      // GA4 Analytics: Extract data inside callback to avoid dependencies
      const videoId = getVideoId();
        
      // Milestone tracking - Track progress at 10%, 25%, 50%, 75%, 90%
      const milestones = [10, 25, 50, 75, 90];
      for (const milestone of milestones) {
        if (progress >= milestone && !milestonesTrackedRef.current.has(milestone)) {
          milestonesTrackedRef.current.add(milestone);
          console.log(`🎯🎯🎯 FIRING GA4 video_progress event: ${milestone}% for ${videoId}`);
          console.log(`🎬 VIDEO PROGRESS: ${milestone}% reached (${Math.round(video.currentTime)}s/${Math.round(video.duration)}s)`);
          console.log('🎯🎯🎯 fireGA function exists?', typeof fireGA);
          console.log('🔍 MILESTONE TRACKING STATE:', Array.from(milestonesTrackedRef.current));
          
          fireGA('video_progress', {
            video_id: videoId,
            video_title: titleRef.current,
            progress_percent: milestone,
            current_time: Math.round(video.currentTime),
            duration_sec: video.duration || 0,
            locale: language,
            debug_mode: window.location.search.includes('ga_debug=1') || localStorage.getItem('ga_debug') === '1'
          });
          console.log(`✅ GA4 video_progress event sent: ${milestone}%`);
        }
      }
    }
  }, []); // No dependencies - uses refs

  // Heartbeat system for Live View tracking with concurrent sessions support
  const getOrCreateSessionId = useCallback(() => {
    // Get or create base session ID (persistent per device)
    let baseSessionId = localStorage.getItem('memopyk-base-session-id');
    if (!baseSessionId) {
      baseSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('memopyk-base-session-id', baseSessionId);
    }
    
    // Get or create tab ID (unique per tab/session)
    let tabId = sessionStorage.getItem('memopyk-tab-id');
    if (!tabId) {
      tabId = Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('memopyk-tab-id', tabId);
    }
    
    // Create stable session ID per video per browser tab - prevents duplicates
    const videoId = getVideoId();
    const videoSessionKey = `memopyk-video-session-${videoId}`;
    
    let videoSessionId = sessionStorage.getItem(videoSessionKey);
    if (!videoSessionId) {
      videoSessionId = `${videoId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      sessionStorage.setItem(videoSessionKey, videoSessionId);
    }
    
    // Combine to create stable unique clientSessionId per video
    const clientSessionId = `${baseSessionId}:${tabId}:${videoSessionId}`;
    
    // Keep the legacy key updated for backward compatibility
    localStorage.setItem('memopyk-current-session-id', clientSessionId);
    
    return clientSessionId;
  }, [getVideoId]);

  const sendHeartbeat = useCallback(async (forceImmediate = false) => {
    try {
      const sessionId = getOrCreateSessionId();
      const videoId = getVideoId();
      const video = videoRef.current;
      
      // Allow immediate heartbeat even if duration unknown for admin visibility
      if (!video || (!forceImmediate && (!isFinite(video.duration) || video.duration <= 0))) {
        console.log('💓 Heartbeat skipped - video duration not available yet');
        return;
      }
      
      // For immediate heartbeats without duration, use current time
      const videoDuration = isFinite(video.duration) && video.duration > 0 ? video.duration : video.currentTime || 1;
      
      // Calculate progress percentage (use videoDuration which handles missing duration)
      const progressPct = Math.max(0, Math.min(100, Math.round((video.currentTime / videoDuration) * 100)));
      
      const heartbeatData = {
        sessionId,
        videoId,
        videoTitle: title,
        progressPct, // Use progressPct instead of progress
        currentTime: Math.round(video.currentTime),
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        country: 'Unknown', // Will be enriched server-side
        ts: Date.now()
      };
      
      const response = await fetch('/api/tracker/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heartbeatData)
      });
      
      if (!response.ok) {
        console.warn('❌ Heartbeat failed:', response.status);
      } else {
        console.log('💓 Heartbeat sent for session:', sessionId.substring(0, 12) + '...', forceImmediate ? '(IMMEDIATE)' : '');
      }
    } catch (error) {
      console.warn('❌ Heartbeat error:', error);
    }
  }, [getOrCreateSessionId, getVideoId]); // Removed title dependency

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    // Send immediate heartbeat on start (force it even without duration)
    sendHeartbeat(true);
    
    // Then send heartbeat every 15 seconds
    heartbeatIntervalRef.current = setInterval(() => sendHeartbeat(false), 15000);
    console.log('💓 Heartbeat started - immediate + every 15s');
  }, [sendHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
      console.log('💓 Heartbeat stopped');
    }
  }, []);

  // Video event handlers - Following stable dependency pattern
  const handlePlay = useCallback(() => {
    console.log('🎬 VIDEO PLAY EVENT: handlePlay fired');
    setIsPlaying(true);
    resetControlsTimer();
    
    // Extract videoId for all tracking
    const videoId = getVideoId();
    
    // GA4 Analytics: Track video_start only once per session
    if (!videoStartSentRef.current) {
      console.log('🚀🚀🚀 FIRING GA4 video_start event for:', videoId);
      console.log('🚀🚀🚀 fireGA function exists?', typeof fireGA);
      fireGA('video_start', {
        video_id: videoId,
        video_title: titleRef.current,
        duration_sec: duration || 0,
        position_sec: currentTime || 0,
        locale: language,
        debug_mode: window.location.search.includes('ga_debug=1') || localStorage.getItem('ga_debug') === '1'
      });
      console.log('✅ GA4 video_start event sent');
      
      videoStartSentRef.current = true;
    } else {
      console.log('⏭️ video_start already sent for this session');
    }
    
    // LOCAL ANALYTICS: Track video view start - CRITICAL FIX
    if (VIDEO_ANALYTICS_ENABLED && trackVideoView) {
      console.log(`📊 LOCAL ANALYTICS: Tracking video view start for ${videoId}`);
      trackVideoView(videoId, 0, false);
    }
    
    // LIVE VIEW TRACKING: Start heartbeat system for real-time tracking
    startHeartbeat();
  }, [resetControlsTimer, VIDEO_ANALYTICS_ENABLED, trackVideoView, duration, currentTime, language, startHeartbeat]); // Removed title, videoUrl dependencies

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setShowControls(true);
    
    // LIVE VIEW TRACKING: Stop heartbeat when video is paused
    stopHeartbeat();
    
    // Note: We don't send video_complete on pause - only on actual completion
  }, [stopHeartbeat]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setProgress(100);
    setShowControls(true);
    
    // GA4 Analytics: Track video_complete when video naturally ends
    const videoId = getVideoId();
      
    if (duration > 0) {
      console.log('🎬 VIDEO ENDED: Natural completion detected');
      console.log('🚀🚀🚀 FIRING GA4 video_complete event for:', videoId);
      fireGA('video_complete', {
        video_id: videoId,
        video_title: titleRef.current,
        duration_sec: Math.round(duration),
        current_time: Math.round(duration), // Video fully completed
        completion_rate: 100,
        locale: language,
        debug_mode: window.location.search.includes('ga_debug=1') || localStorage.getItem('ga_debug') === '1'
      });
      console.log('✅ GA4 video_complete event sent (natural ending)');
    }
    
    // Old VIDEO ANALYTICS DISABLED - Switch to GA4-only for video analytics
    if (VIDEO_ANALYTICS_ENABLED) {
      const watchedDuration = Math.round(currentTime);
      const completionRate = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
      const isCompleted = completionRate >= 90;

      trackVideoView(videoId, watchedDuration, isCompleted);
    }
    
    // LIVE VIEW TRACKING: Stop heartbeat when video ends
    stopHeartbeat();
  }, [currentTime, duration, trackVideoView, VIDEO_ANALYTICS_ENABLED, language, stopHeartbeat]); // Removed title, videoUrl dependencies

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  }, []);

  // Simple function to start video after brief thumbnail display
  const startVideoPlayback = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setShowThumbnail(false);
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('❌ AUTO-PLAY FAILED:', error);
      });
    }
  }, []);

  // Simple video ready handler with proper 2-second minimum display
  const handleCanPlay = useCallback(() => {
    const video = videoRef.current;
    if (video && showThumbnail) {
      videoReadyRef.current = true;
      
      // Calculate time already elapsed since thumbnail started showing
      const timeElapsed = Date.now() - thumbnailStartTimeRef.current;
      const remainingTime = Math.max(0, MINIMUM_THUMBNAIL_DISPLAY_TIME - timeElapsed);
      
      // Start playback after ensuring minimum 2-second thumbnail display
      setTimeout(startVideoPlayback, remainingTime);
    }
  }, [startVideoPlayback, showThumbnail, MINIMUM_THUMBNAIL_DISPLAY_TIME]);

  // Handle when enough data is loaded for smooth playback with proper timing
  const handleCanPlayThrough = useCallback(() => {
    const video = videoRef.current;
    if (video && showThumbnail) {
      videoReadyRef.current = true;
      
      // Calculate time already elapsed since thumbnail started showing
      const timeElapsed = Date.now() - thumbnailStartTimeRef.current;
      const remainingTime = Math.max(0, MINIMUM_THUMBNAIL_DISPLAY_TIME - timeElapsed);
      
      // Start playback after ensuring minimum 2-second thumbnail display
      setTimeout(startVideoPlayback, remainingTime);
    }
  }, [startVideoPlayback, showThumbnail, MINIMUM_THUMBNAIL_DISPLAY_TIME]);

  // Control handlers
  const handleVideoClick = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play().catch(console.warn);
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (video) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * video.duration;
      video.currentTime = newTime;
      setProgress(percentage * 100);
      setCurrentTime(newTime);
    }
  }, []);

  // Enhanced close handler with analytics tracking
  const handleCloseWithAnalytics = useCallback(() => {
    console.log('🔥🔥🔥 HANDLECLOSEWITHANALYTICS CALLED! 🔥🔥🔥');
    
    const video = videoRef.current;
    if (!video) {
      console.log('🔥 NO VIDEO REF - CALLING onClose()');
      onClose();
      return;
    }
    
    // GA4 Analytics: Read current time directly from video element for accuracy
    const videoId = getVideoId();
    const actualCurrentTime = video.currentTime;
    const actualDuration = video.duration;
    
    console.log(`📊 GA4 VIDEO CLOSE DEBUG: duration=${actualDuration}, currentTime=${actualCurrentTime}, videoId=${videoId}`);
    
    if (!isNaN(actualDuration) && actualDuration > 0 && actualCurrentTime > 0) {
      const finalWatchTime = Math.round(actualCurrentTime);
      const completionRate = Math.round((actualCurrentTime / actualDuration) * 100);
      
      console.log(`📊 GA4 VIDEO CLOSE: ${videoId} watched ${finalWatchTime}s (${completionRate}% completion)`);
      
      // Only send video_complete if user watched significant amount (90%+) 
      if (completionRate >= 90) {
        fireGA('video_complete', {
          video_id: videoId,
          video_title: titleRef.current,
          duration_sec: Math.round(actualDuration),
          current_time: finalWatchTime,
          completion_rate: completionRate,
          locale: language,
          debug_mode: window.location.search.includes('ga_debug=1') || localStorage.getItem('ga_debug') === '1'
        });
      }
    } else {
      console.log(`📊 GA4 VIDEO CLOSE: No tracking - duration:${actualDuration}, currentTime:${actualCurrentTime}`);
    }
    
    // OLD VIDEO ANALYTICS DISABLED - Switch to GA4-only for video analytics
    if (VIDEO_ANALYTICS_ENABLED) {
      // Track analytics when user manually closes the video - also read from video element
      const watchedDuration = Math.round(actualCurrentTime);
      const completionRate = actualDuration > 0 ? Math.round((actualCurrentTime / actualDuration) * 100) : 0;
      const isCompleted = completionRate >= 90; // Consider 90%+ as completed
      
      console.log(`📊 VIDEO CLOSED ANALYTICS: ${videoId} watched ${watchedDuration}s (${completionRate}% completion)`);
      trackVideoView(videoId, watchedDuration, isCompleted);
    } else {
      console.log('📊 VIDEO ANALYTICS DISABLED: Custom video tracking paused, switching to GA4-only');
    }
    
    // Call original close function
    onClose();
  }, [getVideoId, trackVideoView, onClose, VIDEO_ANALYTICS_ENABLED]); // Removed title dependency

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseWithAnalytics();
    }
  }, [handleCloseWithAnalytics]);

  // Keyboard controls
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    
    const video = videoRef.current;
    if (!video) return;

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        if (isPlaying) {
          video.pause();
        } else {
          video.play().catch(console.warn);
        }
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case 'Escape':
        e.preventDefault();
        handleCloseWithAnalytics();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
        break;
    }
  }, [isPlaying, toggleMute, handleCloseWithAnalytics]);

  useEffect(() => {
    const overlayElement = overlayRef.current;
    
    if (overlayElement) {
      overlayElement.focus();
      overlayElement.addEventListener('keydown', handleKeyDown);
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      if (overlayElement) {
        overlayElement.removeEventListener('keydown', handleKeyDown);
      }
      document.removeEventListener('keydown', handleKeyDown);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [handleKeyDown]);

  // Component cleanup - No additional tracking needed (handled by onClose)
  useEffect(() => {
    return () => {
      // Cleanup handled by onClose handler
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 ease-out"
      style={{
        '--viewport-ratio': `${getViewportRatio()}%`,
      } as React.CSSProperties}
      onClick={handleOverlayClick}
      tabIndex={0}
      role="dialog"
      aria-label="Video player overlay"
    >
      {/* Video Container */}
      <div
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
        style={{
          width: `${videoDimensions.width}px`,
          height: `${videoDimensions.height}px`,
        }}
        onMouseMove={resetControlsTimer}
      >
        {/* Thumbnail Display - Shows initially while video buffers */}
        {showThumbnail && thumbnailUrl && (
          <div 
            className="absolute inset-0 z-20 bg-black flex items-center justify-center transition-opacity duration-300"
            style={{
              opacity: showThumbnail ? 1 : 0,
              pointerEvents: showThumbnail ? 'auto' : 'none'
            }}
          >
            <img
              src={thumbnailUrl}
              alt="Video preview"
              className="w-full h-full"
              style={{
                width: `${videoDimensions.width}px`,
                height: `${videoDimensions.height}px`,
                objectFit: 'cover',
                display: 'block'
              }}
            />
            
            {/* Centered animated overlays - all appear simultaneously */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-2 sm:p-4">
              <div className="text-center space-y-3 sm:space-y-8 animate-fade-in max-w-full">
                {/* Source count (photos & videos) - Mobile responsive */}
                {sourceText && (
                  <div className="flex justify-center">
                    <div className="bg-black/70 backdrop-blur-sm text-white text-xs sm:text-base px-3 sm:px-6 py-2 sm:py-4 rounded-full flex flex-col items-center justify-center max-w-full">
                      <div className="font-medium leading-tight whitespace-nowrap flex items-center gap-2 sm:gap-3">
                        <ImageIcon className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
                        <span className="truncate">{sourceText}</span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-300 mt-1">
                        {language === 'fr-FR' ? 'fournies par Client' : 'provided by Client'}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Title - Mobile responsive */}
                {title && (
                  <div className="px-3 sm:px-8">
                    <h3 className="text-white font-bold text-lg sm:text-3xl leading-tight drop-shadow-lg text-center break-words">
                      {title}
                    </h3>
                  </div>
                )}
                
                {/* Duration - Mobile responsive */}
                {durationText && (
                  <div className="flex justify-center">
                    <div className="bg-black/70 backdrop-blur-sm text-white text-xs sm:text-base px-3 sm:px-6 py-2 rounded-full flex items-center gap-2 sm:gap-3">
                      <Clock className="w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
                      <span className="font-medium">{durationText}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
            backgroundColor: 'black'
          }}
          controls={false}
          onClick={handleVideoClick}
          onMouseMove={resetControlsTimer}
          onPlay={() => {
            console.log('🎯 VIDEO PLAY EVENT FIRED');
            handlePlay();
          }}
          onPause={() => {
            console.log('🎯 VIDEO PAUSE EVENT FIRED');
            handlePause();
          }}
          onLoadedMetadata={() => {
            console.log('🎯 VIDEO METADATA LOADED');
            handleLoadedMetadata();
          }}
          onTimeUpdate={(e) => {
            console.log('🎯 TIMEUPDATE EVENT FIRED - Current time:', e.currentTarget.currentTime);
            updateProgress();
          }}
          onError={handleVideoError}
          onCanPlay={handleCanPlay}
          onCanPlayThrough={handleCanPlayThrough}
          onEnded={handleEnded}
          preload="auto"
          playsInline
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
          onContextMenu={(e) => e.preventDefault()}
        >
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Center Play/Pause Overlay */}
        {!isPlaying && !showThumbnail && (
          <div className="absolute inset-0 flex items-center justify-center z-25">
            <button
              onClick={handleVideoClick}
              className="bg-black/50 hover:bg-black/70 rounded-full p-4 transition-all duration-200 transform hover:scale-110"
              aria-label="Play video"
            >
              <Play size={48} className="text-white ml-1" />
            </button>
          </div>
        )}

        {/* Control Bar - Only show after video starts playing (not during thumbnail) */}
        {!showThumbnail && (
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 transition-opacity duration-300 z-30 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
          {/* Time Display */}
          <div className="flex justify-between items-center text-white text-xs sm:text-sm mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Progress Bar */}
          <div
            className="w-full bg-white/20 rounded-full h-1 sm:h-2 mb-2 sm:mb-4 cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="bg-white rounded-full h-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleVideoClick}
              className="text-white hover:text-white/80 transition-colors p-1 sm:p-2"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" /> : <Play size={20} className="sm:w-6 sm:h-6" />}
            </button>

            <button
              onClick={toggleMute}
              className="text-white hover:text-white/80 transition-colors p-1 sm:p-2"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX size={16} className="sm:w-5 sm:h-5" /> : <Volume2 size={16} className="sm:w-5 sm:h-5" />}
            </button>
          </div>
          </div>
        )}

        {/* Close Button - Mobile Only */}
        <button
          onClick={handleCloseWithAnalytics}
          className="absolute top-2 right-2 sm:hidden text-white hover:text-white/80 transition-colors bg-black/50 rounded-full p-2 z-30"
          aria-label="Close video"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}