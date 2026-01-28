import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';

interface HeroText {
  id: number;
  title_fr: string;
  title_en: string;
  title_mobile_fr?: string;
  title_mobile_en?: string;
  title_desktop_fr?: string;
  title_desktop_en?: string;
  subtitle_fr: string;
  subtitle_en: string;
  font_size: number;
  font_size_desktop?: number;
  font_size_tablet?: number;
  font_size_mobile?: number;
  is_active: boolean;
}

export function SimpleHeroVideoSection() {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Force mobile detection in React state
  const [isMobileSize, setIsMobileSize] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsMobileSize(window.innerWidth < 640);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Fetch hero text settings for overlay with proper loading states
  const { data: heroTextData = [], isLoading: heroTextLoading } = useQuery<HeroText[]>({
    queryKey: ['/api/hero-text', language],
    staleTime: 5 * 60 * 1000,
  });

  const activeHeroText = heroTextData.find(text => text.is_active);
  
  // Prevent flicker by not showing content until data is loaded
  const [isTextReady, setIsTextReady] = useState(false);
  
  useEffect(() => {
    if (!heroTextLoading && heroTextData.length > 0) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => setIsTextReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [heroTextLoading, heroTextData]);

  const handleVideoCanPlay = () => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Auto-play might be blocked, that's okay
      });
    }
  };

  // Use VideoHero1.mp4 as the single hero video
  const videoSrc = `/api/video-proxy?filename=VideoHero1.mp4`;

  return (
    <section className="relative w-full h-screen overflow-hidden">
      {/* Simple single video background */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onCanPlay={handleVideoCanPlay}
      />

      {/* Text overlay with anti-flicker loading */}
      <div className="absolute inset-0 flex items-center justify-center text-center text-white px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl w-full">
          {/* === Anti-flicker hero title with smooth loading === */}
<h1
  className={`font-playfair font-bold mb-4 sm:mb-6 lg:mb-8 mx-auto transition-opacity duration-300 ${
    isTextReady ? 'opacity-100' : 'opacity-90'
  } ${isMobileSize ? 'hero-text-mobile' : 'hero-text-desktop'}`}
  style={{ 
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    minHeight: isMobileSize ? '55px' : '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    fontSize: isMobileSize ? '18px' : '40px',
    lineHeight: isMobileSize ? '1.0' : '1.1'
  }}
>
  {(() => {
    // Get loaded text from API - prioritize desktop/mobile specific fields
    const getLoadedText = () => {
      if (!activeHeroText) return "";
      
      if (isMobileSize) {
        return language === 'fr-FR' 
          ? (activeHeroText.title_mobile_fr || activeHeroText.title_fr || "")
          : (activeHeroText.title_mobile_en || activeHeroText.title_en || "");
      } else {
        return language === 'fr-FR' 
          ? (activeHeroText.title_desktop_fr || activeHeroText.title_fr || "")
          : (activeHeroText.title_desktop_en || activeHeroText.title_en || "");
      }
    };
    
    const loadedText = getLoadedText();
    
    // Use loaded text if available and ready, otherwise show minimal placeholder
    const sourceText = isTextReady && loadedText.trim()
      ? loadedText
      : (language === 'fr-FR' 
          ? (isMobileSize ? "Films\nsouvenirs" : "Nous transformons\nvos photos et vidéos personnelles\nen films souvenirs inoubliables")
          : (isMobileSize ? "Memory\nfilms" : "We transform\nyour personal photos and videos\ninto unforgettable souvenir films"));
    
    // Split into lines for proper rendering
    const lines = sourceText.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);

    return lines.map((line: string, idx: number) => (
      <div 
        key={idx} 
        className="hero-line"
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          margin: 0,
          padding: 0
        }}
      >
        {line}
      </div>
    ));
  })()}
</h1>
          
          {activeHeroText && (
            <p 
              className="text-sm sm:text-lg lg:text-xl max-w-sm sm:max-w-4xl mx-auto opacity-90 leading-snug sm:leading-normal"
              style={{ 
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}
            >
              {language === 'fr-FR' 
                ? activeHeroText.subtitle_fr 
                : activeHeroText.subtitle_en
              }
            </p>
          )}
        </div>
      </div>
    </section>
  );
}