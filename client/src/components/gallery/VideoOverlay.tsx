import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, X, ImageIcon, Clock } from 'lucide-react';
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';
import { fireGA } from '@/lib/analytics';
import { mpSend } from '@/analytics/mp';

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
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showThumbnail, setShowThumbnail] = useState(!!thumbnailUrl);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoStartTimeRef = useRef<number>(Date.now());
  const thumbnailStartTimeRef = useRef<number>(Date.now());
  const videoReadyRef = useRef<boolean>(false);
  const milestonesTrackedRef = useRef<Set<number>>(new Set());
  const videoStartSentRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Constants - moved to module level for clarity
  const MINIMUM_THUMBNAIL_DISPLAY_TIME = 2000;
  const HEARTBEAT_INTERVAL = 15000;
  const CONTROLS_HIDE_DELAY = 3000;
  const VIDEO_MILESTONES = [10, 25, 50, 75, 90];
  
  // Stable values from props - memoized to prevent re-renders
  const stableProps = useMemo(() => ({
    videoUrl,
    title,
    width,
    height,
    orientation
  }), [videoUrl, title, width, height, orientation]);
  
  // Language detection - memoized to prevent re-reads
  const language = useMemo(() => localStorage.getItem('language') || 'en-US', []);
  
  // Analytics tracking
  const { trackVideoView } = useVideoAnalytics();
  
  // Feature flag
  const VIDEO_ANALYTICS_ENABLED = import.meta.env.VITE_VIDEO_ANALYTICS_ENABLED === 'true' || false;
  
  // Stable video ID extraction - memoized
  const videoId = useMemo(() => {
    if (stableProps.videoUrl.includes('filename=')) {
      return stableProps.videoUrl.split('filename=')[1].split('&')[0];
    }
    return stableProps.videoUrl.split('/').pop()?.split('?')[0] || 'unknown';
  }, [stableProps.videoUrl]);

  // QA alias system - read once at app boot
  const qaAlias = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('vidAlias');
  }, []);

  // Send video ID with QA alias if present
  const sendVideoId = useMemo(() => {
    return qaAlias ? `${videoId}#${qaAlias}` : videoId;
  }, [videoId, qaAlias]);

  // Stable video dimensions calculation - memoized
  const videoDimensions = useMemo(() => {
    const viewportRatio = 90;
    const isMobileDevice = window.innerWidth <= 640;
    const aspectRatio = stableProps.width / stableProps.height;
    
    if (isMobileDevice) {
      const maxWidth = (window.innerWidth * viewportRatio) / 100;
      const containerWidth = maxWidth;
      const containerHeight = containerWidth / aspectRatio;
      return { width: containerWidth, height: containerHeight };
    } else {
      const maxWidth = (window.innerWidth * viewportRatio) / 100;
      const maxHeight = (window.innerHeight * viewportRatio) / 100;
      
      const widthConstrainedWidth = maxWidth;
      const widthConstrainedHeight = maxWidth / aspectRatio;
      const heightConstrainedHeight = maxHeight;
      const heightConstrainedWidth = maxHeight * aspectRatio;
      
      if (widthConstrainedHeight <= maxHeight) {
        return { width: widthConstrainedWidth, height: widthConstrainedHeight };
      } else {
        return { width: heightConstrainedWidth, height: heightConstrainedHeight };
      }
    }
  }, [stableProps.width, stableProps.height]); // Only recalculate if video dimensions change

  // Session ID management - stable function
  const getOrCreateSessionId = useCallback(() => {
    let baseSessionId = localStorage.getItem('memopyk-base-session-id');
    if (!baseSessionId) {
      baseSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('memopyk-base-session-id', baseSessionId);
    }
    
    let tabId = sessionStorage.getItem('memopyk-tab-id');
    if (!tabId) {
      tabId = Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('memopyk-tab-id', tabId);
    }
    
    const videoSessionKey = `memopyk-video-session-${videoId}`;
    let videoSessionId = sessionStorage.getItem(videoSessionKey);
    if (!videoSessionId) {
      videoSessionId = `${videoId}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      sessionStorage.setItem(videoSessionKey, videoSessionId);
    }
    
    const clientSessionId = `${baseSessionId}:${tabId}:${videoSessionId}`;
    localStorage.setItem('memopyk-current-session-id', clientSessionId);
    return clientSessionId;
  }, [videoId]);

  // Heartbeat system - stable functions
  const sendHeartbeat = useCallback(async (forceImmediate = false) => {
    if (!mountedRef.current) return;
    
    try {
      const sessionId = getOrCreateSessionId();
      const video = videoRef.current;
      
      if (!video || (!forceImmediate && (!isFinite(video.duration) || video.duration <= 0))) {
        return;
      }
      
      const videoDuration = isFinite(video.duration) && video.duration > 0 ? video.duration : video.currentTime || 1;
      const progressPct = Math.max(0, Math.min(100, Math.round((video.currentTime / videoDuration) * 100)));
      
      const heartbeatData = {
        sessionId,
        videoId,
        videoTitle: stableProps.title,
        progressPct,
        currentTime: Math.round(video.currentTime),
        device: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        country: 'Unknown',
        ts: Date.now()
      };
      
      const response = await fetch('/api/tracker/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heartbeatData)
      });
      
      if (response.ok) {
      }
    } catch (error) {
      console.warn('⚠ Heartbeat error:', error);
    }
  }, [sendVideoId, getOrCreateSessionId, stableProps.title]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    sendHeartbeat(true);
    heartbeatIntervalRef.current = setInterval(() => sendHeartbeat(false), 15000);
  }, [sendHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Controls timer - stable function
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

  // Progress tracking - stable function with no external dependencies
  const updateProgress = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration) || video.duration <= 0) return;
    
    const progressValue = (video.currentTime / video.duration) * 100;
    setProgress(progressValue);
    setCurrentTime(video.currentTime);
    setDuration(video.duration);
    
    // Milestone tracking
    const milestones = VIDEO_MILESTONES;
    for (const milestone of milestones) {
      if (progressValue >= milestone && !milestonesTrackedRef.current.has(milestone)) {
        milestonesTrackedRef.current.add(milestone);
        
        await mpSend('video_progress', {
          progress_percent: milestone,
          video_id: sendVideoId,
          video_title: stableProps.title,
          current_time: Math.round(video.currentTime),
          duration_sec: Math.round(video.duration || 0),
          locale: language
        }).catch(console.warn);
      }
    }
  }, [sendVideoId, stableProps.title, language]);

  // Event handlers - stable functions
  const handlePlay = useCallback(async () => {
    setIsPlaying(true);
    resetControlsTimer();
    
    if (!videoStartSentRef.current) {
      await mpSend('video_start', {
        video_id: sendVideoId,
        video_title: stableProps.title,
        duration_sec: Math.round(duration || 0),
        position_sec: Math.round(currentTime || 0),
        locale: language
      }).catch(console.warn);
      videoStartSentRef.current = true;
    }
    
    if (VIDEO_ANALYTICS_ENABLED && trackVideoView) {
      trackVideoView(videoId, 0, false);
    }
    
    startHeartbeat();
  }, [resetControlsTimer, sendVideoId, stableProps.title, duration, currentTime, language, VIDEO_ANALYTICS_ENABLED, trackVideoView, startHeartbeat]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    setShowControls(true);
    stopHeartbeat();
  }, [stopHeartbeat]);

  const handleEnded = useCallback(async () => {
    setIsPlaying(false);
    setProgress(100);
    setShowControls(true);
    
    if (duration > 0) {
      await mpSend('video_complete', {
        video_id: sendVideoId,
        video_title: stableProps.title,
        duration_sec: Math.round(duration),
        current_time: Math.round(duration),
        completion_rate: 100,
        locale: language
      }).catch(console.warn);
    }
    
    if (VIDEO_ANALYTICS_ENABLED) {
      const watchedDuration = Math.round(currentTime);
      const completionRate = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
      const isCompleted = completionRate >= 90;
      trackVideoView(videoId, watchedDuration, isCompleted);
    }
    
    stopHeartbeat();
  }, [currentTime, duration, sendVideoId, stableProps.title, language, trackVideoView, VIDEO_ANALYTICS_ENABLED, stopHeartbeat]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  }, []);

  const startVideoPlayback = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setShowThumbnail(false);
      video.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('⚠ AUTO-PLAY FAILED:', error);
      });
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    const video = videoRef.current;
    if (video && showThumbnail) {
      videoReadyRef.current = true;
      const timeElapsed = Date.now() - thumbnailStartTimeRef.current;
      const remainingTime = Math.max(0, MINIMUM_THUMBNAIL_DISPLAY_TIME - timeElapsed);
      setTimeout(startVideoPlayback, remainingTime);
    }
  }, [startVideoPlayback, showThumbnail]);

  const handleCanPlayThrough = useCallback(() => {
    const video = videoRef.current;
    if (video && showThumbnail) {
      videoReadyRef.current = true;
      const timeElapsed = Date.now() - thumbnailStartTimeRef.current;
      const remainingTime = Math.max(0, MINIMUM_THUMBNAIL_DISPLAY_TIME - timeElapsed);
      setTimeout(startVideoPlayback, remainingTime);
    }
  }, [startVideoPlayback, showThumbnail]);

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

  const handleCloseWithAnalytics = useCallback(() => {
    
    const video = videoRef.current;
    if (!video) {
      onClose();
      return;
    }
    
    const actualCurrentTime = video.currentTime;
    const actualDuration = video.duration;
    
    if (!isNaN(actualDuration) && actualDuration > 0 && actualCurrentTime > 0) {
      const finalWatchTime = Math.round(actualCurrentTime);
      const completionRate = Math.round((actualCurrentTime / actualDuration) * 100);
      
      if (completionRate >= 90) {
        fireGA('video_complete', {
          video_id: videoId,
          video_title: stableProps.title,
          duration_sec: Math.round(actualDuration),
          current_time: finalWatchTime,
          completion_rate: completionRate,
          locale: language,
          debug_mode: window.location.search.includes('ga_debug=1') || localStorage.getItem('ga_debug') === '1'
        });
      }
    }
    
    if (VIDEO_ANALYTICS_ENABLED) {
      const watchedDuration = Math.round(actualCurrentTime);
      const completionRate = actualDuration > 0 ? Math.round((actualCurrentTime / actualDuration) * 100) : 0;
      const isCompleted = completionRate >= 90;
      trackVideoView(videoId, watchedDuration, isCompleted);
    }
    
    onClose();
  }, [videoId, stableProps.title, language, trackVideoView, onClose, VIDEO_ANALYTICS_ENABLED]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseWithAnalytics();
    }
  }, [handleCloseWithAnalytics]);

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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // MOUNT ONCE ONLY - Initialization effect
  useEffect(() => {
    
    videoStartTimeRef.current = Date.now();
    thumbnailStartTimeRef.current = Date.now();
    videoReadyRef.current = false;
    mountedRef.current = true;
    
    const video = videoRef.current;
    if (video && thumbnailUrl) {
      video.load();
    }
    
    return () => {
      mountedRef.current = false;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, []); // NO DEPENDENCIES - run once only

  // Keyboard event handler setup - separate effect to avoid dependencies
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

  // Resize handler - REMOVED to prevent constant re-renders
  // The videoDimensions are now calculated once on mount and only change if video dimensions change

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 ease-out"
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
        {/* Thumbnail Display */}
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
            
            {/* Centered overlays */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-2 sm:p-4">
              <div className="text-center space-y-3 sm:space-y-8 animate-fade-in max-w-full">
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
                
                {stableProps.title && (
                  <div className="px-3 sm:px-8">
                    <h3 className="text-white font-bold text-lg sm:text-3xl leading-tight drop-shadow-lg text-center break-words">
                      {stableProps.title}
                    </h3>
                  </div>
                )}
                
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
          onPlay={handlePlay}
          onPause={handlePause}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={updateProgress}
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
          <source src={stableProps.videoUrl} type="video/mp4" />
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

        {/* Control Bar */}
        {!showThumbnail && (
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 transition-opacity duration-300 z-30 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={handleVideoClick}
                className="text-white hover:text-blue-400 transition-colors p-1"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>

              {/* Progress Bar */}
              <div className="flex-1 relative group">
                <div
                  className="w-full h-1 bg-white/30 rounded-full cursor-pointer group-hover:h-2 transition-all"
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Time Display */}
              <div className="text-white text-xs sm:text-sm font-mono">
                <span>{formatTime(currentTime)}</span>
                <span className="text-white/60"> / </span>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Volume Button */}
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors p-1"
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              {/* Close Button */}
              <button
                onClick={handleCloseWithAnalytics}
                className="text-white hover:text-red-400 transition-colors p-1 ml-1"
                aria-label="Close video"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}