import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useVideoAnalytics } from '../../hooks/useVideoAnalytics';
import { Button } from '../ui/button';

interface HeroVideo {
  id: number;
  title_fr: string;
  title_en: string;
  url_en: string;
  url_fr: string;
  order_index: number;
  is_active: boolean;
}

interface HeroText {
  id: number;
  title_fr: string;
  title_en: string;
  subtitle_fr: string;
  subtitle_en: string;
  font_size: number;
  font_size_desktop?: number;
  font_size_tablet?: number;
  font_size_mobile?: number;
  title_mobile_fr?: string;
  title_mobile_en?: string;
  title_desktop_fr?: string;
  title_desktop_en?: string;
  is_active: boolean;
}

export function HeroVideoSection() {
  const { language } = useLanguage();
  const { trackVideoView } = useVideoAnalytics();
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    // Initialize with correct screen size to prevent flash
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 640) return 'mobile';
      if (width < 1024) return 'tablet';
      return 'desktop';
    }
    return 'mobile';
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Detect screen size on mount and resize
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const previousSize = screenSize;
      let newSize: 'mobile' | 'tablet' | 'desktop';
      
      if (width < 640) {
        newSize = 'mobile';
      } else if (width < 1024) {
        newSize = 'tablet';
      } else {
        newSize = 'desktop';
      }
      
      if (previousSize !== newSize) {
        setScreenSize(newSize);
      }
    };
    
    updateScreenSize(); // Set initial size
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, [screenSize]);

  // Fetch hero videos
  const { data: heroVideos = [] } = useQuery<HeroVideo[]>({
    queryKey: ['/api/hero-videos'],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch hero text settings - stable caching to prevent flickering
  const { data: heroTextData = [] } = useQuery<HeroText[]>({
    queryKey: ['/api/hero-text', language],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to prevent constant refetching
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (was cacheTime in v4)
  });

  // Debug logging removed - anti-flickering solution implemented

  const activeVideos = heroVideos.filter((video: HeroVideo) => video.is_active)
    .sort((a: HeroVideo, b: HeroVideo) => a.order_index - b.order_index);
  
  const activeHeroText = heroTextData.find((text: HeroText) => text.is_active);
  const currentVideo = activeVideos[currentVideoIndex];

  // Auto-advance to next video when current video ends
  const handleVideoEnded = () => {
    if (activeVideos.length > 1) {
      const nextIndex = (currentVideoIndex + 1) % activeVideos.length;
      setCurrentVideoIndex(nextIndex);
    }
  };



  // Reset video index when videos change
  useEffect(() => {
    setCurrentVideoIndex(0);
  }, [activeVideos.length]);



  // Hero videos auto-play, so no need to track them - analytics should focus on user-initiated gallery video views

  // Handle video navigation
  const goToVideo = (index: number) => {
    setCurrentVideoIndex(index);
  };

  const goToPrevious = () => {
    const newIndex = currentVideoIndex === 0 ? activeVideos.length - 1 : currentVideoIndex - 1;
    goToVideo(newIndex);
  };

  const goToNext = () => {
    const newIndex = (currentVideoIndex + 1) % activeVideos.length;
    goToVideo(newIndex);
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoLoad = () => {
    const video = videoRef.current;
    if (video && isPlaying) {
      video.play().catch(() => {
        // Auto-play might be blocked, that's okay
      });
    }
  };

  // Touch gesture handlers for mobile navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && activeVideos.length > 1) {
      goToNext();
    }
    if (isRightSwipe && activeVideos.length > 1) {
      goToPrevious();
    }
  };

  if (!currentVideo) {
    return (
      <section className="relative h-[calc(100vh-4rem)] bg-gradient-memopyk">
        {/* Silent loading - no message to avoid drawing attention to wait time */}
      </section>
    );
  }

  const videoUrl = language === 'fr-FR' ? currentVideo.url_fr : currentVideo.url_en;


  return (
    <section 
      className="relative h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-memopyk-navy to-memopyk-dark-blue"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Video */}
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          key={videoUrl}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop={false}
          playsInline
          preload="metadata" // Smart Preloading: loads video info without downloading entire file
          crossOrigin="anonymous"
          onLoadedData={handleVideoLoad}
          onError={(e) => {
            console.error('🚨 Hero Video Error:', e);
            console.error('   - Video URL:', videoUrl);
            console.error('   - Video Proxy URL:', `/api/video-proxy?filename=${videoUrl}`);
          }}
          onEnded={handleVideoEnded}
          onCanPlay={() => {
            // Ensure video starts playing for external preview
            const video = videoRef.current;
            if (video && isPlaying) {
              video.play().catch(console.warn);
            }
          }}
          onLoadStart={() => {
            // Video loading started
          }}
          onPlay={() => {
            // Video playback started
          }}
        >
          <source src={`/api/video-proxy?filename=${videoUrl}`} type="video/mp4" />
        </video>
        
        {/* Video Overlay */}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Silent loading - no visual indicator to avoid drawing attention to wait time */}

      {/* Hero Text Content - Mobile Optimized for Better Fit */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-3 sm:px-6 lg:px-8">
        {/* Semi-transparent background for optimal text contrast across all lighting conditions */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl pt-1.5 pb-2 px-4 sm:pt-2 sm:pb-3 sm:px-6 border border-white/10 inline-block max-w-[90vw]">
          <h1 
            className="font-playfair font-bold mb-0 
                       text-lg sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl
                       transition-none" 
            style={{ 
              textShadow: '3px 3px 6px rgba(0,0,0,0.9)',
              lineHeight: '1.4',
              // CSS responsive typography - no JavaScript font switching to prevent flickering
            }}
          >
            {(() => {
              // Use separate mobile and desktop fields for responsive display
              const mobileText = language === 'fr-FR' 
                ? (activeHeroText?.title_mobile_fr || activeHeroText?.title_fr || "Nous transformons\nvos photos et vidéos personnelles\nen films souvenirs inoubliables")
                : (activeHeroText?.title_mobile_en || activeHeroText?.title_en || "We transform\nyour personal photos and videos\ninto unforgettable souvenir film");
                
              const desktopText = language === 'fr-FR' 
                ? (activeHeroText?.title_desktop_fr || activeHeroText?.title_fr || "Nous transformons vos photos et vidéos personnelles\nen films souvenirs inoubliables")
                : (activeHeroText?.title_desktop_en || activeHeroText?.title_en || "We transform your personal photos and videos\ninto unforgettable souvenir films");
              
              // Process mobile text
              let processedMobileText = mobileText;
              if (processedMobileText.includes('\\n')) {
                processedMobileText = processedMobileText.replace(/\\n/g, '\n');
              }
              
              // Process desktop text
              let processedDesktopText = desktopText;
              if (processedDesktopText.includes('\\n')) {
                processedDesktopText = processedDesktopText.replace(/\\n/g, '\n');
              }
              
              return (
                <>
                  {/* Mobile: Use mobile-specific text */}
                  <span className="block sm:hidden">
                    {processedMobileText.split('\n').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < processedMobileText.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </span>
                  {/* Desktop: Use desktop-specific text */}
                  <span className="hidden sm:block">
                    {processedDesktopText.split('\n').map((line, index) => (
                      <React.Fragment key={index}>
                        {line}
                        {index < processedDesktopText.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </span>
                </>
              );
            })()}
          </h1>
          
          {/* Only render subtitle if it exists and is not empty */}
          {activeHeroText && ((language === 'fr-FR' && activeHeroText.subtitle_fr && activeHeroText.subtitle_fr.trim()) || 
                              (language === 'en-US' && activeHeroText.subtitle_en && activeHeroText.subtitle_en.trim())) && (
            <p 
              className="mb-4 sm:mb-6 lg:mb-8 text-white/95 font-poppins leading-snug text-sm sm:text-base lg:text-xl"
              style={{ 
                textShadow: '2px 2px 4px rgba(0,0,0,0.9)' 
              }}
            >
              {(() => {
                const text = language === 'fr-FR' 
                  ? activeHeroText.subtitle_fr
                  : activeHeroText.subtitle_en;
                
                // Handle multiple escaping scenarios: raw newlines, \n, \\n
                let processedText = text;
                if (processedText.includes('\\n')) {
                  processedText = processedText.replace(/\\n/g, '\n');
                }
                return processedText.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < processedText.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ));
              })()}
            </p>
          )}
        </div>
        
        {/* CTA Button - Outside the overlay background for better visual separation */}
        <div className="flex justify-center items-center mt-6 sm:mt-8 lg:mt-10">
          <Button 
            size="default" 
            className="relative inline-flex items-center gap-2 bg-memopyk-orange hover:bg-memopyk-dark-blue text-white px-4 py-2 sm:px-8 sm:py-4 rounded-full font-semibold text-sm sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg sm:shadow-2xl cursor-pointer border-2 border-white/20 backdrop-blur-sm overflow-hidden group"
            onClick={() => {
              const element = document.getElementById('how-it-works');
              if (element) {
                const headerHeight = 64; // Fixed header height (h-16 = 4rem = 64px)
                const elementPosition = element.offsetTop;
                const offsetPosition = elementPosition - headerHeight;

                window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth'
                });
              }
            }}
          >
            {/* Orange pill overlay effect */}
            <div className="absolute inset-0 bg-memopyk-orange rounded-full"></div>
            <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Button content */}
            <span className="relative z-10 font-semibold tracking-wide">
              {language === 'fr-FR' ? 'Comment ça marche' : 'How it works'}
            </span>
            
            {/* Animated shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-white/20 rounded-full"></div>
          </Button>
        </div>
      </div>

      {/* Video Controls - Always show when multiple videos available */}
      {activeVideos.length > 1 && (
        <>
          {/* Navigation Arrows - Large orange arrows */}
          <Button
            variant="ghost"
            size="lg"
            className="hidden sm:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 text-memopyk-orange hover:text-memopyk-orange/80 z-20 p-0 bg-transparent hover:bg-transparent"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-16 w-16 lg:h-24 lg:w-24 drop-shadow-lg" strokeWidth={1.5} />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="hidden sm:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 text-memopyk-orange hover:text-memopyk-orange/80 z-20 p-0 bg-transparent hover:bg-transparent"
            onClick={goToNext}
          >
            <ChevronRight className="h-16 w-16 lg:h-24 lg:w-24 drop-shadow-lg" strokeWidth={1.5} />
          </Button>

          {/* Video Indicators - Orange outlines and fills */}
          <div className="absolute bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 flex space-x-3 sm:space-x-4 z-20">
            {activeVideos.map((_, index) => (
              <button
                key={index}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all duration-300 border-2 border-memopyk-orange ${
                  index === currentVideoIndex 
                    ? 'bg-memopyk-orange shadow-lg !bg-memopyk-orange' 
                    : 'bg-transparent hover:bg-memopyk-orange/30'
                }`}
                onClick={() => goToVideo(index)}
                aria-label={`Go to video ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}






    </section>
  );
}