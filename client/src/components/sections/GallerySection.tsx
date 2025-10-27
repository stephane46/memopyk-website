import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Star, ArrowRight, Image as ImageIcon, Film, Users, Clock, Smartphone, Monitor, Instagram, Phone, Edit } from "lucide-react";
import VideoOverlay from "@/components/gallery/VideoOverlay";
import { MobileEnhancedGallery } from "@/components/mobile/MobileEnhancedGallery";
import { LazyImage } from "@/components/ui/LazyImage";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { trackCtaClick } from "@/lib/analytics";
import { trackEvent } from "@/utils/analytics";
// Removed useVideoAnalytics import - not used in GallerySection, causing unnecessary re-renders

// Gallery item interface using camelCase (transformed from API snake_case)
interface GalleryItem {
  id: string | number;
  titleEn: string;
  titleFr: string;
  priceEn: string;
  priceFr: string;
  sourceEn: string; // "80 photos & 10 videos" - top overlay
  sourceFr: string; // "80 photos et 10 vidéos" - top overlay
  durationEn: string; // "2 minutes" - duration with film icon (up to 5 lines)
  durationFr: string; // "2 minutes" - duration with film icon (up to 5 lines)
  situationEn: string; // "The Client is a wife..." - client description (up to 5 lines)
  situationFr: string; // "Le client est une épouse..." - client description (up to 5 lines)
  storyEn: string; // "This film shows..." - story description (up to 5 lines)
  storyFr: string; // "Ce film montre..." - story description (up to 5 lines)
  sorryMessageEn: string; // "Sorry, we cannot show you the video at this stage"
  sorryMessageFr: string; // "Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade"
  formatPlatformEn: string; // "Social Media", "Social Feed", "Professional"
  formatPlatformFr: string; // "Réseaux Sociaux", "Flux Social", "Professionnel"
  formatTypeEn: string; // "Mobile Stories", "Instagram Posts", "TV & Desktop"
  formatTypeFr: string; // "Stories Mobiles", "Posts Instagram", "TV & Bureau"
  videoUrlEn: string;
  videoUrlFr: string;
  videoFilename: string; // CRITICAL: timestamp-prefixed filename (1753736019450-VitaminSeaC.mp4)
  videoWidth: number;
  videoHeight: number;
  videoOrientation: string;
  imageUrlEn: string;
  imageUrlFr: string;
  staticImageUrlEn: string | null; // 300x200 cropped English thumbnail (with -C suffix)
  staticImageUrlFr: string | null; // 300x200 cropped French thumbnail (with -C suffix)
  staticImageUrl: string | null; // DEPRECATED: Legacy field
  useSameVideo: boolean; // Shared mode indicator
  orderIndex: number;
  isActive: boolean;
  lightboxVideoUrl?: string; // Infrastructure workaround URL for lightbox display
  thumbnailUrl?: string; // Thumbnail URL for instant display during video loading
  isInstantReady?: boolean; // Indicates if video uses preloaded element for instant playbook
  preloadedElement?: HTMLVideoElement; // The actual preloaded video element
  // Memoized values to prevent remounting in VideoOverlay
  memoizedTitle?: string;
  memoizedSource?: string;
  memoizedDuration?: string;
  memoizedWidth?: number;
  memoizedHeight?: number;
  memoizedOrientation?: 'portrait' | 'landscape';
}

export default function GallerySection() {
  const { language } = useLanguage();
  
  const [flippedCards, setFlippedCards] = useState<Set<string | number>>(new Set());
  const galleryRef = useRef<HTMLDivElement>(null);
  const [lightboxVideo, setLightboxVideo] = useState<GalleryItem | null>(null);
  // 🚨 CRITICAL FIX: Make mobile detection static to prevent re-renders
  const [isMobile] = useState(() => {
    // Only check once on mount - no reactive updates
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobileViewport;
  });
  const [preloadedVideos, setPreloadedVideos] = useState<Set<string>>(new Set());
  // 🚨 CRITICAL FIX: Remove unused hooks that might cause re-renders
  // const networkStatus = useNetworkStatus();
  // const { orientation } = useDeviceOrientation();
  
  // 🚨 DISABLED: Animation state causing constant re-renders!
  // const [animationStates, setAnimationStates] = useState({
  //   firstText: false,
  //   secondText: false
  // });
  const animationStates = { firstText: true, secondText: true }; // Always show text
  const firstTextRef = useRef<HTMLDivElement>(null);
  const secondTextRef = useRef<HTMLDivElement>(null);
  
  // 📊 Video analytics removed from GallerySection - handled directly in VideoOverlay

  // Fetch CTA settings for the call-to-action section
  const { data: ctaSettings = [] } = useQuery({
    queryKey: ['/api/cta'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Detect mobile viewport - Responsive mobile detection
  // 🚨 REMOVED: Resize listener that was causing constant re-renders
  // Mobile detection is now static - no reactive updates needed for gallery
  

  // 🚨 CACHE SYNCHRONIZATION FIX v1.0.111 - Browser storage cache busting
  useEffect(() => {
    
    // Clear any browser-cached gallery data on component mount
    const clearBrowserCache = () => {
      try {
        // Clear localStorage items that might cache gallery data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('gallery') || key.includes('react-query')) {
            localStorage.removeItem(key);
          }
        });
        // Clear sessionStorage as well
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('gallery') || key.includes('react-query')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn("Cache clear failed:", e);
      }
    };
    
    clearBrowserCache();
  }, []);
  
  // 🚨 REMOVED: refreshKey state that was causing constant re-renders
  // const [refreshKey, setRefreshKey] = useState(0);
  
  const { data: rawData = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/gallery'], // 🚨 CACHE SYNC FIX v1.0.125 - Use same key as admin
    staleTime: Infinity, // Never consider data stale - this is a company presentation, not YouTube
    gcTime: Infinity, // Keep cache forever until manual refresh
    refetchOnMount: false, // Don't refetch on mount - use cached data
    refetchOnWindowFocus: false, // Never refetch on focus
    refetchInterval: false, // No automatic polling
    retry: 2, // Retry on failure
  });
  
  // 🚨 CRITICAL FIX: Disable storage/admin listeners causing constant re-renders
  // These event listeners were triggering setRefreshKey constantly
  useEffect(() => {
    // All storage/admin refresh logic disabled to prevent VideoOverlay remounting
  }, []);

  // Process and transform data
  const galleryItems = React.useMemo(() => {
    // 🚨 PERFORMANCE FIX: Removed excessive console logging that was causing re-renders!
    
    // 🚨 CRITICAL FIX: Ensure rawData is always an array before calling .filter()
    const safeRawData = Array.isArray(rawData) ? rawData : [];
    
    const filteredData = safeRawData
      .filter((item: any) => item.is_active)
      .sort((a: any, b: any) => a.order_index - b.order_index);
    
    return filteredData.map((item: any) => ({
      // Convert snake_case API response to camelCase for TypeScript compatibility
      id: item.id,
      titleEn: item.title_en,
      titleFr: item.title_fr,
      priceEn: item.price_en,
      priceFr: item.price_fr,
      sourceEn: item.source_en,
      sourceFr: item.source_fr,
      durationEn: item.duration_en,
      durationFr: item.duration_fr,
      situationEn: item.situation_en,
      situationFr: item.situation_fr,
      storyEn: item.story_en,
      storyFr: item.story_fr,
      sorryMessageEn: item.sorry_message_en,
      sorryMessageFr: item.sorry_message_fr,
      formatPlatformEn: item.format_platform_en,
      formatPlatformFr: item.format_platform_fr,
      formatTypeEn: item.format_type_en,
      formatTypeFr: item.format_type_fr,
      videoUrlEn: item.video_url_en,
      videoUrlFr: item.video_url_fr,
      videoFilename: item.video_filename || item.video_url_en || item.video_url_fr, // TIMESTAMP PREFIX FIX
      videoWidth: item.video_width,
      videoHeight: item.video_height,
      videoOrientation: item.video_orientation,
      imageUrlEn: item.image_url_en,
      imageUrlFr: item.image_url_fr,
      staticImageUrlEn: item.static_image_url_en,
      staticImageUrlFr: item.static_image_url_fr,
      staticImageUrl: item.static_image_url, // Legacy field
      useSameVideo: item.use_same_video, // Shared mode indicator
      orderIndex: item.order_index,
      isActive: item.is_active
    }));
  }, [rawData]);

  // 🎬 Animation observers - FIXED: Removed galleryItems dependency to prevent VideoOverlay remounting!
  const galleryItemsLength = React.useMemo(() => {
    return Array.isArray(galleryItems) ? galleryItems.length : 0;
  }, [galleryItems]);
  
  // 🚨 CRITICAL FIX: Completely disable animation observers to stop re-renders
  // These IntersectionObservers were causing constant state updates
  useEffect(() => {
    // All animation logic disabled - text always visible
  }, []);

  // Add gallery video logging similar to hero videos
  useEffect(() => {
    // 🚨 CRITICAL FIX: Ensure galleryItems is always an array before calling .map()
    const safeGalleryItems = Array.isArray(galleryItems) ? galleryItems : [];
    if (safeGalleryItems.length > 0) {
      const galleryVideoFilenames = safeGalleryItems.map(item => {
        const videoUrl = language === 'fr-FR' ? item.videoUrlFr : item.videoUrlEn;
        return videoUrl && videoUrl.includes('/') ? videoUrl.split('/').pop() : (videoUrl || 'no-video');
      });
    }
  }, [galleryItems, language]);

  // Add click-outside detection for flipped cards
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is outside gallery or on empty space within gallery grid
      const isOutsideGallery = galleryRef.current && !galleryRef.current.contains(target);
      const isOnCard = target.closest('[data-gallery-card]');
      const isInGallery = galleryRef.current && galleryRef.current.contains(target);
      
      // Close flipped cards if clicking outside gallery OR clicking on empty space within gallery
      if ((isOutsideGallery || (isInGallery && !isOnCard)) && flippedCards.size > 0) {
        setFlippedCards(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [flippedCards]);

  // Add scroll-out-of-view detection for flipped cards
  useEffect(() => {
    if (flippedCards.size === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            // Card is out of view, check if it's flipped
            const cardElement = entry.target as HTMLElement;
            const cardId = cardElement.getAttribute('data-card-id');
            
            if (cardId && flippedCards.has(cardId)) {
              setFlippedCards(prev => {
                const newSet = new Set(prev);
                newSet.delete(cardId);
                return newSet;
              });
            }
          }
        });
      },
      {
        // Trigger when card is completely out of viewport
        threshold: 0,
        // Add some margin to trigger before card is completely out
        rootMargin: '-50px 0px -50px 0px'
      }
    );

    // Observe all flipped cards
    flippedCards.forEach(cardId => {
      const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
      if (cardElement) {
        observer.observe(cardElement);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [flippedCards]);



  const content = {
    'fr-FR': {
      title: "Galerie",
      subtitle: "",
      description: "",
      viewAll: "Voir Toute la Galerie",
      preview: "Aperçu",
      startingFrom: "À partir de",
      featured: "Recommandé",
      newItem: "Nouveau",
      video: "Vidéo",
      image: "Image"
    },
    'en-US': {
      title: "Gallery",
      subtitle: "",
      description: "",
      viewAll: "View Full Gallery",
      preview: "Preview",
      startingFrom: "Starting from",
      featured: "Featured",
      newItem: "New",
      video: "Video",
      image: "Image"
    }
  };

  const t = content[language];

  const getImageUrl = (item: GalleryItem) => {
    // 🎯 CROPPING FIX: Always prioritize language-specific cropped images over legacy staticImageUrl
    const croppedThumb = item.useSameVideo
      ? item.staticImageUrlEn  // Use English version for shared mode
      : (language === 'fr-FR' ? item.staticImageUrlFr : item.staticImageUrlEn);

    if (croppedThumb && croppedThumb.trim() !== '') {
      console.log(`🔍 PUBLIC GALLERY: Using cropped image for ${language}: ${croppedThumb}`);
      return croppedThumb; // Properly cropped user images
    }
    
    // Legacy fallback for old items that only have staticImageUrl
    if (item.staticImageUrl) {
      console.log(`🔍 PUBLIC GALLERY: Using legacy staticImageUrl: ${item.staticImageUrl}`);
      return item.staticImageUrl;
    }

    // Final fallback to original images
    const originalImage = item.imageUrlEn || "";
    console.log(`🔍 PUBLIC GALLERY: Using original image fallback: ${originalImage}`);
    return originalImage;
  };

  const getItemTitle = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.titleFr : item.titleEn;
  };

  const getItemPrice = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.priceFr : item.priceEn;
  };

  const getItemSource = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.sourceFr : item.sourceEn;
  };

  const getItemDuration = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.durationFr : item.durationEn;
  };

  const getItemSituation = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.situationFr : item.situationEn;
  };

  const getItemStory = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.storyFr : item.storyEn;
  };

  const getItemSorryMessage = (item: GalleryItem) => {
    return language === 'fr-FR' ? item.sorryMessageFr : item.sorryMessageEn;
  };

  const hasVideo = (item: GalleryItem, index: number) => {
    // Check video availability using camelCase properties only
    const filename = item.videoFilename || item.videoUrlEn || item.videoUrlFr;
    const hasVideoResult = filename && filename.trim() !== '';
    

    
    return hasVideoResult;
  };

  const getVideoUrl = (item: GalleryItem, index: number) => {
    // FIXED: Respect language and use_same_video flag for bilingual videos
    let videoUrl = '';
    
    if (item.useSameVideo) {
      // Use the same video for both languages
      videoUrl = item.videoUrlEn || item.videoFilename || '';
    } else {
      // Use language-specific video
      videoUrl = language === 'fr-FR' ? (item.videoUrlFr || '') : (item.videoUrlEn || '');
      // Fallback to videoFilename if language-specific URL is missing
      if (!videoUrl) {
        videoUrl = item.videoFilename || '';
      }
    }
    
    // Extract just the filename from the URL
    let filename = videoUrl;
    if (filename.includes('/')) {
      filename = filename.split('/').pop() || '';
    }
    
    const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;
    
    return proxyUrl;
  };

  // Get optimal viewing format info for marketing display - now using editable database fields
  const getViewingFormat = (item: GalleryItem) => {
    // Use editable format badge data from database if available, otherwise fall back to auto-detection
    const platformText = language === 'fr-FR' ? item.formatPlatformFr : item.formatPlatformEn;
    const typeText = language === 'fr-FR' ? item.formatTypeFr : item.formatTypeEn;
    
    // If admin has set custom format badge text, use it
    if (platformText && typeText) {
      // Determine icon based on type text content
      let icon = Monitor; // default
      if (typeText.toLowerCase().includes('stories') || typeText.toLowerCase().includes('mobile')) {
        icon = Smartphone;
      } else if (typeText.toLowerCase().includes('instagram') || typeText.toLowerCase().includes('social')) {
        icon = Instagram;
      } else if (typeText.toLowerCase().includes('tv') || typeText.toLowerCase().includes('desktop') || typeText.toLowerCase().includes('bureau')) {
        icon = Monitor;
      }
      
      return {
        platform: platformText,
        type: typeText,
        icon: icon,
        color: "bg-[#2A4759]", // MEMOPYK Dark Blue - Uniform brand color for all badges
        textColor: "text-[#2A4759]",
        formats: [] // Custom format badges don't need format arrays
      };
    }
    
    // Fall back to automatic detection if no custom format badge is set
    const width = item.videoWidth || 16;
    const height = item.videoHeight || 9;
    const aspectRatio = width / height;
    
    if (aspectRatio < 0.6) {
      // Very tall portrait (9:16 like TikTok/Stories)
      return {
        platform: language === 'fr-FR' ? "Réseaux Sociaux" : "Social Media",
        type: language === 'fr-FR' ? "Stories Mobiles" : "Mobile Stories",
        icon: Smartphone,
        color: "bg-[#2A4759]", // MEMOPYK Dark Blue - Uniform brand color for all badges
        textColor: "text-[#2A4759]",
        formats: language === 'fr-FR' ? ["TikTok", "Instagram Stories", "YouTube Shorts"] : ["TikTok", "Instagram Stories", "YouTube Shorts"]
      };
    } else if (aspectRatio < 1) {
      // Portrait but not as tall (4:5 like Instagram feed)
      return {
        platform: language === 'fr-FR' ? "Réseaux Sociaux" : "Social Feed",
        type: language === 'fr-FR' ? "Posts Instagram" : "Instagram Posts",
        icon: Instagram,
        color: "bg-[#2A4759]", // MEMOPYK Dark Blue - Uniform brand color for all badges
        textColor: "text-[#2A4759]",
        formats: language === 'fr-FR' ? ["Instagram Feed", "Facebook Posts", "Pinterest"] : ["Instagram Feed", "Facebook Posts", "Pinterest"]
      };
    } else {
      // Landscape (16:9 TV format)
      return {
        platform: language === 'fr-FR' ? "Professionnel" : "Professional",
        type: language === 'fr-FR' ? "TV & Bureau" : "TV & Desktop",
        icon: Monitor,
        color: "bg-[#2A4759]", // MEMOPYK Dark Blue - Uniform brand color for all badges
        textColor: "text-[#2A4759]", 
        formats: language === 'fr-FR' ? ["YouTube", "Affichage TV", "Présentations"] : ["YouTube", "TV Display", "Presentations"]
      };
    }
  };

  // AUTHENTIC VIDEO DIMENSIONS FROM DATABASE - Admin panel integration fixed
  const getAuthenticVideoDimensions = (item: GalleryItem) => {
    const videoFilename = item.videoFilename || '';
    
    // Extract clean filename for mapping
    const cleanFilename = videoFilename.includes('/') 
      ? videoFilename.split('/').pop() 
      : videoFilename;

    // PRIORITY 1: Use database values if available (from admin panel updates)
    if (item.videoWidth && item.videoHeight) {
      const orientation = item.videoWidth > item.videoHeight ? 'landscape' : 'portrait';
      console.log(`✅ DATABASE VIDEO DIMENSIONS for ${cleanFilename}:`, {
        width: item.videoWidth,
        height: item.videoHeight,
        orientation
      });
      return {
        width: item.videoWidth,
        height: item.videoHeight,
        orientation: orientation as 'portrait' | 'landscape'
      };
    }

    // PRIORITY 2: Fallback to hardcoded mapping for legacy support
    const videoDimensionsMap: Record<string, { width: number; height: number; orientation: 'portrait' | 'landscape' }> = {
      'PomGalleryC.mp4': { width: 1080, height: 1350, orientation: 'portrait' },
      'VitaminSeaC.mp4': { width: 1080, height: 1920, orientation: 'portrait' },
      'safari-1.mp4': { width: 1920, height: 1080, orientation: 'landscape' },
    };

    if (cleanFilename && videoDimensionsMap[cleanFilename]) {
      console.log(`✅ FALLBACK VIDEO DIMENSIONS for ${cleanFilename}:`, videoDimensionsMap[cleanFilename]);
      return videoDimensionsMap[cleanFilename];
    }

    // PRIORITY 3: Final fallback
    console.warn(`⚠️ No dimensions found for ${cleanFilename}, using 16:9 landscape fallback`);
    return { width: 1920, height: 1080, orientation: 'landscape' as const };
  };

  const handlePlayClick = (item: GalleryItem, e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const hasVideoResult = hasVideo(item, index);
    const itemTitle = getItemTitle(item);
    
    if (hasVideoResult) {
      // Close any flipped cards when opening a video
      setFlippedCards(new Set());
      
      // Track gallery video click to GA4
      trackEvent('video_interaction', {
        action: 'lightbox_open',
        video_title: itemTitle,
        video_index: index,
        page_location: 'gallery'
      });
      
      // Analytics tracking moved to VideoOverlay for actual watch time tracking
      const videoFilename = item.videoFilename || '';
      const cleanFilename = videoFilename.includes('/') ? videoFilename.split('/').pop() : videoFilename;
      console.log('🎬 Opening video lightbox:', cleanFilename);
      
      // Get video URL and thumbnail for instant display
      const videoUrl = getVideoUrl(item, index);
      const thumbnailUrl = getImageUrl(item);
      
      // Pre-calculate ALL values to avoid function calls in render
      const dimensions = getAuthenticVideoDimensions(item);
      
      setLightboxVideo({
        ...item, 
        lightboxVideoUrl: videoUrl,
        thumbnailUrl: thumbnailUrl,
        isInstantReady: false,
        // Pre-calculated memoized values to prevent remounting
        memoizedTitle: getItemTitle(item),
        memoizedSource: getItemSource(item),
        memoizedDuration: getItemDuration(item),
        memoizedWidth: dimensions.width,
        memoizedHeight: dimensions.height,
        memoizedOrientation: dimensions.orientation
      });
      
      // Prevent body scrolling when lightbox is open
      document.body.style.overflow = 'hidden';
    } else {
      // Track card flip to GA4
      trackEvent('card_interaction', {
        action: 'card_flip',
        item_title: itemTitle,
        item_index: index,
        page_location: 'gallery'
      });
      
      // Flip card to show sorry message for items without video
      setFlippedCards(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          // Close other flipped cards and open this one
          newSet.clear();
          newSet.add(item.id);
        }
        return newSet;
      });
    }
  };

  const closeLightbox = useCallback(() => {
    setLightboxVideo(null);
    // Restore body scrolling
    document.body.style.overflow = 'unset';
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop (not the video player)
    if (e.target === e.currentTarget) {
      closeLightbox();
    }
  };

  // Close lightbox on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxVideo) {
        closeLightbox();
      }
    };

    if (lightboxVideo) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [lightboxVideo]);

  // 🎯 INSTANT GALLERY VIDEO SYSTEM - Store preloaded video elements for instant reuse
  const [preloadedVideoElements, setPreloadedVideoElements] = useState<Map<string, HTMLVideoElement>>(new Map());

  // 🎯 SMART ON-DEMAND PRELOADING - Fast loading without conflicts
  // 🚨 CRITICAL FIX: Remove galleryItems dependency to prevent VideoOverlay remounting!
  const galleryItemsCount = React.useMemo(() => {
    return Array.isArray(galleryItems) ? galleryItems.length : 0;
  }, [galleryItems]);
  
  useEffect(() => {
    if (!galleryItemsCount) return;

    console.log(`🎯 SMART PRELOADING SYSTEM: On-demand video loading for instant playback without conflicts`);
    console.log(`📊 Gallery items available: ${galleryItemsCount} (videos preload on hover/click)`);
    
    // Cleanup any existing preloaded elements to start fresh
    const cleanupPreloadedElements = () => {
      preloadedVideoElements.forEach((video, filename) => {
        console.log(`🧹 CLEANING UP: ${filename}`);
        video.remove();
      });
      setPreloadedVideoElements(new Map());
      setPreloadedVideos(new Set());
    };
    
    cleanupPreloadedElements();
  }, [galleryItemsCount]); // FIXED: Use stable count instead of galleryItems object

  // Cleanup preloaded video elements on unmount
  useEffect(() => {
    return () => {
      preloadedVideoElements.forEach((video, filename) => {
        try {
          if (document.body.contains(video)) {
            console.log(`🧹 CLEANING UP: ${filename}`);
            document.body.removeChild(video);
          }
        } catch (error) {
          console.warn(`Cleanup warning for ${filename}:`, error);
        }
      });
    };
  }, [preloadedVideoElements]);



  if (galleryItems.length === 0) {
    return null; // Don't show section if no items
  }

  return (
    <section id="gallery" className="py-12 bg-gradient-to-br from-memopyk-cream/30 to-white">
      <div className="container mx-auto px-4" ref={galleryRef}>
        {/* Gallery title removed - using animated text messages instead */}



        {/* Animated First Text - slides from LEFT */}
        <div className="text-center mb-8 sm:mb-12">
          <div ref={firstTextRef}>
            <div className={`transition-all duration-1000 ease-out ${
              animationStates.firstText 
                ? 'opacity-100 transform translate-x-0' 
                : 'opacity-0 transform -translate-x-12'
            }`}>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-memopyk-orange mx-auto leading-relaxed">
                {language === 'fr-FR' 
                  ? "De petits et moyens projets pour des moments spéciaux du quotidien…"
                  : "From small and medium-sized projects for special moments in everyday life..."
                }
              </h2>
            </div>
          </div>
        </div>

        {/* Remove animated text from here - will be placed between video grids */}

        {/* Gallery Grid */}
        {(() => {
          console.log(`📱 MOBILE DETECTION: isMobile=${isMobile}, showing DESKTOP gallery (MobileEnhancedGallery disabled)`);
          return null;
        })()}
        {false ? (
          <MobileEnhancedGallery
            items={galleryItems}
            language={language}
            onVideoClick={(item) => {
              // Analytics tracking moved to VideoOverlay - only track actual watch time, not clicks
              const videoFilename = item.videoFilename || '';
              const cleanFilename = videoFilename.includes('/') ? videoFilename.split('/').pop() : videoFilename;
              console.log('🎬 MOBILE VIDEO LIGHTBOX OPENING:', cleanFilename, '- tracking moved to VideoOverlay for actual watch time');
              
              const videoUrl = getVideoUrl(item, 0);
              setLightboxVideo({...item, lightboxVideoUrl: videoUrl});
              document.body.style.overflow = 'hidden';
            }}
            onFlipCard={(id) => {
              setFlippedCards(prev => {
                const newSet = new Set(prev);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                return newSet;
              });
            }}
            flippedCards={flippedCards}
          />
        ) : (
          <>

          {/* First 3 videos grid */}
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12"
          >
          {/* 🚨 CRITICAL FIX: Ensure galleryItems is always an array before calling .map() */}
          {(Array.isArray(galleryItems) ? galleryItems : []).slice(0, 3).map((item, index) => {
            const imageUrl = getImageUrl(item);
            const thumbnailUrl = imageUrl;

            const itemHasVideo = hasVideo(item, index);
            
            // CRITICAL FIX: Cards with videos should NEVER be flipped by default
            // Only flip if explicitly flipped AND has no video
            const isFlipped = flippedCards.has(item.id) && !itemHasVideo;
            

            
            return (
              <div 
                key={item.id} 
                data-video-id={item.id}
                data-card-id={item.id}
                data-gallery-card
                className={`card-flip-container ${isFlipped ? 'flipped' : ''} rounded-2xl`}
              >
                <div className="card-flip-inner">
                  {/* FRONT SIDE - Normal Gallery Card */}
                  <div className="card-front bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden">
                    {/* Image/Video with Overlays - Always 3:2 aspect ratio */}
                    <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-700 relative overflow-hidden rounded-t-2xl">
                      {thumbnailUrl ? (
                        /* Static Image - Default display */
                        <div className="w-full h-full relative">
                          {/* Main Image */}
                          <img
                            src={thumbnailUrl}
                            alt={getItemTitle(item)}
                            className="w-full h-full object-cover"
                            onLoad={() => console.log(`🖼️ Image loaded: ${thumbnailUrl}`)}
                            onError={() => console.log(`❌ Image failed to load: ${thumbnailUrl}`)}
                            loading="eager"
                          />
                          
                          {/* Top overlays - Mobile Responsive */}
                          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-center gap-2">
                            {/* Source Overlay (1) - Mobile Optimized */}
                            {getItemSource(item) && (
                              <div className="bg-black/70 text-white px-3 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm backdrop-blur-sm max-w-[180px] sm:max-w-none flex flex-col items-center justify-center min-h-[32px] sm:min-h-[36px]">
                                <div className="font-medium leading-tight whitespace-nowrap">{getItemSource(item)}</div>
                                <div className="text-xs text-gray-300 hidden sm:block">
                                  {language === 'fr-FR' ? 'fournies par Client' : 'provided by Client'}
                                </div>
                              </div>
                            )}


                          </div>

                          {/* Price Tag - Bottom Right (3) - Mobile Optimized */}
                          {getItemPrice(item) && (
                            <div className="price-badge-orange absolute bottom-2 sm:bottom-4 right-2 sm:right-4 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                              {getItemPrice(item)}
                            </div>
                          )}
                          
                          {/* Desktop Play Button - Orange for Video, White for No Video */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{zIndex: 999999}}>
                            {/* Dynamic Play Button Based on Video Availability - Reduced diameter by 1/3 */}
                            <div 
                              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer pointer-events-auto ${itemHasVideo && !isMobile ? 'animate-pulse-orange' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayClick(item, e, index);
                              }}
                              style={itemHasVideo ? {
                                // Orange for items WITH video - pulse only on desktop
                                background: 'linear-gradient(135deg, rgba(214, 124, 74, 0.95) 0%, rgba(214, 124, 74, 0.85) 50%, rgba(184, 90, 47, 0.95) 100%)',
                                boxShadow: '0 4px 12px rgba(214, 124, 74, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                backdropFilter: 'blur(2px)'
                              } : {
                                // White for items WITHOUT video
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                backdropFilter: 'blur(2px)'
                              }}
                            >
                              {/* Play Triangle SVG - White for Orange Button, Dark for White Button */}
                              <svg 
                                width="32" 
                                height="32" 
                                viewBox="0 0 24 24" 
                                fill={itemHasVideo ? 'white' : '#2A4759'}
                                className="ml-0.5"
                              >
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image available
                        </div>
                      )}
                    </div>

                    {/* Card Content - Mobile Optimized with balanced spacing */}
                    <div className="pt-1 pb-3 sm:pb-4 lg:pb-6">
                      {/* Title and Social Media Badge Row - Same line with responsive spacing */}
                      <div className="mb-1 sm:mb-1">
                        <div className="px-3 sm:px-4 lg:px-6 flex justify-between items-start gap-2">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white h-6 sm:h-8 overflow-hidden leading-6 sm:leading-8 flex-1">
                            {getItemTitle(item)}
                          </h3>
                        </div>
                        
                        {/* Social Media Badge positioned with overlay spacing */}
                        <div className="absolute right-2 sm:right-4 -mt-6 sm:-mt-8">
                          {/* Social Media Badge - Positioned to match price badge overlay spacing */}
                          {(() => {
                            const format = getViewingFormat(item);
                            const IconComponent = format.icon;
                            // Standardized labels
                            const standardPlatform = language === 'fr-FR' ? 'Format Recommandé' : 'Recommended Format';
                            return (
                              <div className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm flex-shrink-0 h-6 sm:h-8">
                                <IconComponent className="w-2.5 h-2.5 flex-shrink-0" />
                                <div className="min-w-0 flex flex-col justify-center items-center text-center">
                                  <div className="opacity-60 leading-tight truncate" style={{ fontSize: '8px' }}>{standardPlatform}</div>
                                  <div className="font-semibold leading-tight truncate" style={{ fontSize: '10px' }}>{format.type}</div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                          
                      {/* Duration (5) - Mobile Optimized with content padding */}
                      <div className="px-3 sm:px-4 lg:px-6 mb-2 sm:mb-3 h-5 sm:h-6 overflow-hidden flex items-center">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                        <div className="text-xs sm:text-sm leading-4 ml-1 sm:ml-2" style={{ color: '#4B5563' }}>
                          {getItemDuration(item) || <div className="h-4"></div>}
                        </div>
                      </div>
                      
                      {/* Story (6) - Mobile Optimized with content padding - 5 lines for mobile */}
                      <div className="px-3 sm:px-4 lg:px-6 mb-2 sm:mb-3 min-h-20 sm:min-h-20">
                        <div className="flex items-start gap-1 sm:gap-2">
                          <Film className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-xs sm:text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemStory(item) || <div className="h-4"></div>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Situation (7) - Mobile Optimized with content padding - 5 lines for mobile */}
                      <div className="px-3 sm:px-4 lg:px-6 min-h-20 sm:min-h-20">
                        <div className="flex items-start gap-1 sm:gap-2">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-xs sm:text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemSituation(item) || <div className="h-4"></div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BACK SIDE - Sorry Message */}
                  <div className="card-back">
                    <div className="text-center text-white">
                      <div className="text-2xl font-bold mb-4">
                        {language === 'fr-FR' ? 'Vidéo Non Disponible' : 'Video Not Available'}
                      </div>
                      <div className="text-lg">
                        {getItemSorryMessage(item)}
                      </div>
                      <button
                        onClick={(e) => handlePlayClick(item, e, index)}
                        className="mt-6 bg-white text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {language === 'fr-FR' ? 'Retour' : 'Back'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>


            );
          })}
          </div>

          {/* Second Text - Slide from RIGHT - BETWEEN video grids */}
          <div className="text-center mb-8 sm:mb-12" ref={secondTextRef}>
            <div className={`transition-all duration-1000 ease-out ${
              animationStates.secondText 
                ? 'opacity-100 transform translate-x-0' 
                : 'opacity-0 transform translate-x-12'
            }`}>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-memopyk-orange mx-auto leading-relaxed">
                {language === 'fr-FR' 
                  ? "… aux projets les plus ambitieux"
                  : "...to the most ambitious projects"
                }
              </h2>
            </div>
          </div>

          {/* Last 3 videos grid */}
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12"
          >
          {/* Last 3 videos */}
          {(Array.isArray(galleryItems) ? galleryItems : []).slice(3, 6).map((item, index) => {
            const actualIndex = index + 3; // Adjust index for proper video handling
            const imageUrl = getImageUrl(item);
            const thumbnailUrl = imageUrl;

            const itemHasVideo = hasVideo(item, actualIndex);
            
            // CRITICAL FIX: Cards with videos should NEVER be flipped by default
            // Only flip if explicitly flipped AND has no video
            const isFlipped = flippedCards.has(item.id) && !itemHasVideo;
            
            return (
              <div 
                key={item.id} 
                data-video-id={item.id}
                data-card-id={item.id}
                data-gallery-card
                className={`card-flip-container ${isFlipped ? 'flipped' : ''} rounded-2xl`}
              >
                <div className="card-flip-inner">
                  {/* FRONT SIDE - Normal Gallery Card */}
                  <div className="card-front bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-2xl rounded-2xl overflow-hidden">
                    {/* Image/Video with Overlays - Always 3:2 aspect ratio */}
                    <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-700 relative overflow-hidden rounded-t-2xl">
                      {thumbnailUrl ? (
                        /* Static Image - Default display */
                        <div className="w-full h-full relative">
                          {/* Main Image */}
                          <img
                            src={thumbnailUrl}
                            alt={getItemTitle(item)}
                            className="w-full h-full object-cover"
                            onLoad={() => console.log(`🖼️ Image loaded: ${thumbnailUrl}`)}
                            onError={() => console.log(`❌ Image failed to load: ${thumbnailUrl}`)}
                            loading="eager"
                          />
                          
                          {/* Top overlays - Mobile Responsive */}
                          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-center gap-2">
                            {/* Source Overlay (1) - Mobile Optimized */}
                            {getItemSource(item) && (
                              <div className="bg-black/70 text-white px-3 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm backdrop-blur-sm max-w-[180px] sm:max-w-none flex flex-col items-center justify-center min-h-[32px] sm:min-h-[36px]">
                                <div className="font-medium leading-tight whitespace-nowrap">{getItemSource(item)}</div>
                                <div className="text-xs text-gray-300 hidden sm:block">
                                  {language === 'fr-FR' ? 'fournies par Client' : 'provided by Client'}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* Price Tag - Bottom Right (3) - Mobile Optimized */}
                          {getItemPrice(item) && (
                            <div className="price-badge-orange absolute bottom-2 sm:bottom-4 right-2 sm:right-4 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                              {getItemPrice(item)}
                            </div>
                          )}
                          
                          {/* Desktop Play Button - Orange for Video, White for No Video */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{zIndex: 999999}}>
                            {/* Dynamic Play Button Based on Video Availability - Reduced diameter by 1/3 */}
                            <div 
                              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer pointer-events-auto ${itemHasVideo && !isMobile ? 'animate-pulse-orange' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlayClick(item, e, actualIndex);
                              }}
                              style={itemHasVideo ? {
                                // Orange for items WITH video - pulse only on desktop
                                background: 'linear-gradient(135deg, rgba(214, 124, 74, 0.95) 0%, rgba(214, 124, 74, 0.85) 50%, rgba(184, 90, 47, 0.95) 100%)',
                                boxShadow: '0 4px 12px rgba(214, 124, 74, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                backdropFilter: 'blur(2px)'
                              } : {
                                // White for items WITHOUT video
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
                                border: '1px solid rgba(0, 0, 0, 0.1)',
                                backdropFilter: 'blur(2px)'
                              }}
                            >
                              {/* Play Triangle SVG - White for Orange Button, Dark for White Button */}
                              <svg 
                                width="32" 
                                height="32" 
                                viewBox="0 0 24 24" 
                                fill={itemHasVideo ? 'white' : '#2A4759'}
                                className="ml-0.5"
                              >
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image available
                        </div>
                      )}
                    </div>

                    {/* Card Content - Mobile Optimized with balanced spacing */}
                    <div className="pt-1 pb-3 sm:pb-4 lg:pb-6">
                      {/* Title and Social Media Badge Row - Same line with responsive spacing */}
                      <div className="mb-1 sm:mb-1">
                        <div className="px-3 sm:px-4 lg:px-6 flex justify-between items-start gap-2">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white h-6 sm:h-8 overflow-hidden leading-6 sm:leading-8 flex-1">
                            {getItemTitle(item)}
                          </h3>
                        </div>
                        
                        {/* Social Media Badge positioned with overlay spacing */}
                        <div className="absolute right-2 sm:right-4 -mt-6 sm:-mt-8">
                          {/* Social Media Badge - Positioned to match price badge overlay spacing */}
                          {(() => {
                            const format = getViewingFormat(item);
                            const IconComponent = format.icon;
                            // Standardized labels
                            const standardPlatform = language === 'fr-FR' ? 'Format Recommandé' : 'Recommended Format';
                            return (
                              <div className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm flex-shrink-0 h-6 sm:h-8">
                                <IconComponent className="w-2.5 h-2.5 flex-shrink-0" />
                                <div className="min-w-0 flex flex-col justify-center items-center text-center">
                                  <div className="opacity-60 leading-tight truncate" style={{ fontSize: '8px' }}>{standardPlatform}</div>
                                  <div className="font-semibold leading-tight truncate" style={{ fontSize: '10px' }}>{format.type}</div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                          
                      {/* Duration (5) - Mobile Optimized with content padding */}
                      <div className="px-3 sm:px-4 lg:px-6 mb-2 sm:mb-3 h-5 sm:h-6 overflow-hidden flex items-center">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                        <div className="text-xs sm:text-sm leading-4 ml-1 sm:ml-2" style={{ color: '#4B5563' }}>
                          {getItemDuration(item) || <div className="h-4"></div>}
                        </div>
                      </div>
                      
                      {/* Story (6) - Mobile Optimized with content padding - 5 lines for mobile */}
                      <div className="px-3 sm:px-4 lg:px-6 mb-2 sm:mb-3 min-h-20 sm:min-h-20">
                        <div className="flex items-start gap-1 sm:gap-2">
                          <Film className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-xs sm:text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemStory(item) || <div className="h-4"></div>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Situation (7) - Mobile Optimized with content padding - 5 lines for mobile */}
                      <div className="px-3 sm:px-4 lg:px-6 min-h-20 sm:min-h-20">
                        <div className="flex items-start gap-1 sm:gap-2">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: '#D67C4A' }} />
                          <div className="text-xs sm:text-sm leading-4" style={{ color: '#4B5563' }}>
                            {getItemSituation(item) || <div className="h-4"></div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* BACK SIDE - Sorry Message */}
                  <div className="card-back">
                    <div className="text-center text-white">
                      <div className="text-2xl font-bold mb-4">
                        {language === 'fr-FR' ? 'Vidéo Non Disponible' : 'Video Not Available'}
                      </div>
                      <div className="text-lg">
                        {getItemSorryMessage(item)}
                      </div>
                      <button
                        onClick={(e) => handlePlayClick(item, e, actualIndex)}
                        className="mt-6 bg-white text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {language === 'fr-FR' ? 'Retour' : 'Back'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {/* Footnote under last 3 videos */}
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'fr-FR' 
                ? "*Tous les prix indiqués sont donnés à titre indicatif uniquement"
                : "*All prices shown are for reference only"
              }
            </p>
          </div>
          </>
        )}





        {/* View All Button - Mobile Optimized */}
        {galleryItems.length > 6 && (
          <div className="text-center">
            <Button 
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base rounded-full transform hover:scale-105 transition-all duration-300 touch-manipulation min-h-[44px]"
            >
              {t.viewAll}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        )}

        {/* Enhanced Call to Action - After Gallery */}
        <div className="text-center mt-16">
          <div className="relative bg-gradient-to-br from-memopyk-dark-blue via-memopyk-navy to-memopyk-dark-blue p-10 rounded-3xl shadow-2xl border border-memopyk-orange/20 overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-memopyk-orange/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-memopyk-sky-blue/10 rounded-full blur-2xl"></div>
            
            {/* Content */}
            <div className="relative z-10">
              {/* Compelling Subtitle */}
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-memopyk-cream mb-4">
                  {language === 'fr-FR' ? "TARIFS SUR MESURE POUR CHAQUE HISTOIRE" : "PERSONALIZED PRICING FOR EVERY STORY"}
                </h3>
                <p className="text-lg md:text-xl text-memopyk-cream/90 max-w-3xl mx-auto leading-relaxed">
                  {language === 'fr-FR' 
                    ? "Chaque histoire est unique, votre film reçoit donc un devis personnalisé, basé sur vos contenus, la durée souhaitée et vos demandes spéciales."
                    : "Every story is unique, so your film gets a custom quote based on your content, requested film length, and any special requests."
                  }
                </p>
                <p className="text-lg font-semibold text-memopyk-orange mt-4">
                  {language === 'fr-FR' 
                    ? "Contactez-nous pour votre tarif sur mesure !"
                    : "Get in touch for your personalized price!"
                  }
                </p>
              </div>

              {/* Value Proposition */}
              <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm md:text-base">
                <div className="flex items-center text-memopyk-cream/80">
                  <div className="w-2 h-2 bg-memopyk-orange rounded-full mr-2"></div>
                  {language === 'fr-FR' ? "Livraison 1-3 semaines" : "1-3 weeks delivery"}
                </div>
                <div className="flex items-center text-memopyk-cream/80">
                  <div className="w-2 h-2 bg-memopyk-orange rounded-full mr-2"></div>
                  {language === 'fr-FR' ? "2 séries de retours incluses" : "2 revision rounds included"}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {/* Use the same CTA settings as the main CTA section */}
                {/* 🚨 CRITICAL FIX: Ensure ctaSettings is always an array before calling .filter() and .map() */}
                {(Array.isArray(ctaSettings) ? ctaSettings : [])
                  .filter((cta: any) => cta.isActive)
                  .map((cta: any) => {
                    const url = language === 'fr-FR' ? cta.buttonUrlFr : cta.buttonUrlEn;
                    return (
                      <a
                        key={cta.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-3 bg-memopyk-orange hover:bg-memopyk-orange/90 text-white px-6 py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer no-underline w-full sm:w-auto whitespace-nowrap min-w-0"
                        onClick={() => trackCtaClick(cta.id, window.location.pathname, language)}
                      >
                        {cta.id === 'book_call' ? <Phone className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" /> : <Edit className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
                        <span className="block">
                          {language === 'fr-FR' ? cta.buttonTextFr : cta.buttonTextEn}
                        </span>
                      </a>
                    );
                  })
                }
              </div>


            </div>
          </div>
        </div>

      </div>

      {/* Video Lightbox Modal */}
      {lightboxVideo && (
        <VideoOverlay
          key={lightboxVideo.id} // Stable React key to prevent multiple mounts
          videoUrl={lightboxVideo.lightboxVideoUrl || ''}
          title={lightboxVideo.memoizedTitle || ''}
          sourceText={lightboxVideo.memoizedSource || ''}
          durationText={lightboxVideo.memoizedDuration || ''}
          width={lightboxVideo.memoizedWidth || 1920}
          height={lightboxVideo.memoizedHeight || 1080}
          orientation={lightboxVideo.memoizedOrientation || 'landscape'}
          onClose={closeLightbox}
          isInstantReady={lightboxVideo.isInstantReady}
          preloadedElement={lightboxVideo.preloadedElement}
          thumbnailUrl={lightboxVideo.thumbnailUrl}
        />
      )}
    </section>
  );
}