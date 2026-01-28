import { useState, useEffect } from 'react';
import { LazyImage } from '@/components/ui/LazyImage';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Wifi, WifiOff, Smartphone, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileEnhancedGalleryProps {
  items: any[];
  language: string;
  onVideoClick: (item: any) => void;
  onFlipCard: (id: string | number) => void;
  flippedCards: Set<string | number>;
}

export function MobileEnhancedGallery({
  items,
  language,
  onVideoClick,
  onFlipCard,
  flippedCards
}: MobileEnhancedGalleryProps) {
  const networkStatus = useNetworkStatus();
  const { orientation } = useDeviceOrientation();
  const [showNetworkBanner, setShowNetworkBanner] = useState(false);

  // Show network status banner on mobile when offline or slow connection
  useEffect(() => {
    const isSlowConnection = networkStatus.effectiveType === '2g' || networkStatus.effectiveType === 'slow-2g';
    const shouldShow = !networkStatus.isOnline || isSlowConnection;
    setShowNetworkBanner(shouldShow);

    if (shouldShow) {
      const timer = setTimeout(() => setShowNetworkBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [networkStatus]);

  return (
    <div className="relative">
      {/* Network Status Banner */}
      {showNetworkBanner && (
        <div className={cn(
          "fixed top-16 left-0 right-0 z-40 p-3 text-center text-sm font-medium transition-all duration-300",
          !networkStatus.isOnline
            ? "bg-red-100 text-red-800 border-b border-red-200"
            : "bg-yellow-100 text-yellow-800 border-b border-yellow-200"
        )}>
          <div className="flex items-center justify-center gap-2">
            {!networkStatus.isOnline ? (
              <WifiOff className="w-4 h-4" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
            {!networkStatus.isOnline
              ? (language === 'fr-FR' ? 'Mode hors ligne - Contenu limité' : 'Offline mode - Limited content')
              : (language === 'fr-FR' ? 'Connexion lente détectée' : 'Slow connection detected')
            }
          </div>
        </div>
      )}

      {/* Orientation-Aware Grid */}
      <div className={cn(
        "grid gap-4 sm:gap-6 lg:gap-8",
        orientation === 'landscape' && window.innerWidth < 768
          ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" // More columns in mobile landscape
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" // Standard responsive grid
      )}>
        {items.map((item, index) => {
          const isFlipped = flippedCards.has(item.id);
          const title = language === 'fr-FR' ? item.titleFr : item.titleEn;
          const hasVideo = Boolean(item.videoUrlEn && item.videoUrlFr);

          // Dynamic image URL selection with shared mode logic AND cache-busting (matches desktop)
          const getImageUrl = () => {
            // FIXED: Use same shared mode logic as admin
            let staticImageUrl = '';
            if (item.useSameVideo) {
              // Shared mode: Use EN static crop for both languages (same as admin)
              staticImageUrl = item.staticImageUrlEn || '';
              console.log(`🔗 PUBLIC SHARED MODE: Using EN static crop for ${language}: ${staticImageUrl} for ${item.titleEn}`);
            } else {
              // Separate mode: Use language-specific static crop
              staticImageUrl = language === 'fr-FR' 
                ? (item.staticImageUrlFr || item.staticImageUrlEn || '')
                : (item.staticImageUrlEn || item.staticImageUrlFr || '');
              console.log(`🌍 PUBLIC SEPARATE MODE: Using ${language}-specific static crop: ${staticImageUrl} for ${item.titleEn}`);
            }
            
            // If no static crop, fallback to original images
            let baseUrl = staticImageUrl || (language === 'fr-FR' 
              ? (item.imageUrlFr || item.imageUrlEn)
              : (item.imageUrlEn || item.imageUrlFr));
            
            console.log(`🔍 MOBILE IMAGE DEBUG (SHARED MODE ALIGNED) for ${item.titleEn}:`, {
              language,
              useSameVideo: item.useSameVideo,
              staticImageUrlFr: item.staticImageUrlFr,
              staticImageUrlEn: item.staticImageUrlEn,
              imageUrlFr: item.imageUrlFr,
              imageUrlEn: item.imageUrlEn,
              finalUrl: baseUrl,
              usingStaticCrop: baseUrl && baseUrl.includes('static_'),
              respectsCropping: baseUrl && baseUrl.includes('static_'),
              sharedModeActive: item.useSameVideo
            });
            
            // SIMPLIFIED APPROACH: Use clean URLs to ensure loading works
            if (baseUrl && baseUrl.trim() !== '') {
              // If it's already a full URL, use it directly
              if (baseUrl.startsWith('http')) {
                console.log(`🔄 MOBILE CLEAN URL: ${baseUrl}`);
                return baseUrl;
              }
              
              // If it's a filename, build the full URL without cache-busting
              let filename = baseUrl;
              if (baseUrl.includes('/')) {
                filename = baseUrl.split('/').pop() || '';
                if (filename.includes('?')) {
                  filename = filename.split('?')[0];
                }
              }
              
              const fullUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodeURIComponent(filename)}`;
              console.log(`🔄 MOBILE DIRECT CDN URL: ${fullUrl}`);
              return fullUrl;
            }
            
            return baseUrl || '';
          };

          return (
            <div
              key={item.id}
              className={cn(
                "card-flip-container group",
                isFlipped && "flipped"
              )}
            >
              <div className="card-flip-inner">
                {/* Front Card */}
                <div className="card-front absolute inset-0">
                  <div className="relative h-full bg-white rounded-xl shadow-lg overflow-hidden border hover:shadow-xl transition-all duration-300">
                    {/* Lazy-loaded Image */}
                    <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden">
                      <LazyImage
                        key={`${item.id}-${getImageUrl()}`} // Force remount when URL changes
                        src={getImageUrl()}
                        alt={title}
                        className="w-full h-full object-cover"
                        placeholderClassName="bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
                        fallbackSrc="/placeholder-gallery.jpg"
                        onError={() => console.warn(`Failed to load image for ${title}`)}
                        onLoad={(e?: React.SyntheticEvent<HTMLImageElement>) => {
                          const img = e?.currentTarget;
                          if (img) {
                            console.log(`🔍 PUBLIC IMAGE LOADED for ${title}:`, {
                              src: img.src,
                              naturalWidth: img.naturalWidth,
                              naturalHeight: img.naturalHeight,
                              displayWidth: img.width,
                              displayHeight: img.height,
                              isStaticThumbnail: img.src.includes('static_'),
                              isCroppedVersion: img.src.includes('-C.'),
                              originalImageUrl: language === 'fr-FR' ? item.imageUrlFr : item.imageUrlEn,
                              staticImageUrlEn: item.staticImageUrlEn,
                              staticImageUrlFr: item.staticImageUrlFr,
                              expectedCroppedUrl: 'AAA_002_0000014-C.jpg',
                              actuallyDisplaying: img.src.includes('AAA_002_0000014-C.jpg') ? 'CROPPED' : 'ORIGINAL'
                            });
                            
                            // Additional dimension analysis
                            if (img.naturalWidth && img.naturalHeight) {
                              const aspectRatio = img.naturalWidth / img.naturalHeight;
                              console.log(`📊 IMAGE ANALYSIS for ${title}:`, {
                                resolution: `${img.naturalWidth}x${img.naturalHeight}`,
                                aspectRatio: aspectRatio.toFixed(2),
                                isHighRes: img.naturalWidth > 1000,
                                isThumbnail: img.naturalWidth <= 300
                              });
                            }
                          }
                        }}
                      />
                      
                      {/* Mobile-Optimized Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      
                      {/* Video Play Button - Professional style with proper background */}
                      {hasVideo && (
                        <div
                          onClick={() => onVideoClick(item)}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 hover:scale-110"
                          aria-label={`Play video: ${title}`}
                        >
                          <div 
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 animate-pulse-slow"
                            style={{
                              background: 'linear-gradient(135deg, rgba(214, 124, 74, 0.95) 0%, rgba(214, 124, 74, 0.85) 50%, rgba(184, 90, 47, 0.95) 100%)',
                              boxShadow: '0 4px 12px rgba(214, 124, 74, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              backdropFilter: 'blur(2px)'
                            }}
                          >
                            <svg 
                              width="16" 
                              height="16" 
                              viewBox="0 0 24 24" 
                              fill="white"
                              className="ml-0.5"
                            >
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      )}

                      {/* Device Type Indicator */}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-black/20 text-white border-white/20 text-xs">
                          {orientation === 'landscape' ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                        </Badge>
                      </div>

                      {/* Priority Badge */}
                      {index < 2 && (
                        <Badge className="absolute top-2 left-2 bg-memopyk-orange text-white text-xs">
                          {language === 'fr-FR' ? 'Populaire' : 'Popular'}
                        </Badge>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-4">
                      <h3 className="font-semibold text-memopyk-navy mb-2 text-sm sm:text-base line-clamp-2">
                        {title}
                      </h3>
                      
                      {/* Mobile-Optimized Action Button */}
                      <Button
                        onClick={() => onFlipCard(item.id)}
                        variant="outline"
                        size="sm"
                        className="w-full min-h-[44px] text-xs sm:text-sm"
                      >
                        {language === 'fr-FR' ? 'Voir détails' : 'View details'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Back Card - Same as existing but optimized */}
                <div className="card-back absolute inset-0 transform rotateY-180">
                  <div className="h-full bg-gradient-to-br from-memopyk-navy to-memopyk-blue-gray text-white rounded-xl p-4 sm:p-6 flex flex-col justify-between shadow-lg">
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <h3 className="font-bold text-lg sm:text-xl mb-2 text-memopyk-cream">
                          {title}
                        </h3>
                        <p className="text-memopyk-orange font-semibold text-base sm:text-lg">
                          {language === 'fr-FR' ? item.priceFr : item.priceEn}
                        </p>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm">
                        <p><strong>{language === 'fr-FR' ? 'Source:' : 'Source:'}</strong> {language === 'fr-FR' ? item.sourceFr : item.sourceEn}</p>
                        <p><strong>{language === 'fr-FR' ? 'Durée:' : 'Duration:'}</strong> {language === 'fr-FR' ? item.durationFr : item.durationEn}</p>
                        <p><strong>{language === 'fr-FR' ? 'Format:' : 'Format:'}</strong> {language === 'fr-FR' ? item.formatPlatformFr : item.formatPlatformEn}</p>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm opacity-90">
                        <p>{language === 'fr-FR' ? item.situationFr : item.situationEn}</p>
                        <p>{language === 'fr-FR' ? item.storyFr : item.storyEn}</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => onFlipCard(item.id)}
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full min-h-[44px] mt-4"
                    >
                      {language === 'fr-FR' ? 'Retourner' : 'Flip back'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}