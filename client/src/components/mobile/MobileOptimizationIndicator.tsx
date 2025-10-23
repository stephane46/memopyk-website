import { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Monitor, Wifi, WifiOff, Zap, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileOptimizationIndicatorProps {
  language: string;
}

export function MobileOptimizationIndicator({ language }: MobileOptimizationIndicatorProps) {
  const networkStatus = useNetworkStatus();
  const { orientation } = useDeviceOrientation();
  const [performanceScore, setPerformanceScore] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);

  // Calculate performance score based on various factors
  useEffect(() => {
    let score = 100;

    // Network performance impact
    if (!networkStatus.isOnline) {
      score -= 30;
    } else if (networkStatus.effectiveType === '2g' || networkStatus.effectiveType === 'slow-2g') {
      score -= 20;
    } else if (networkStatus.effectiveType === '3g') {
      score -= 10;
    }

    // Device orientation optimization
    if (orientation === 'landscape' && window.innerWidth < 768) {
      score += 5; // Landscape mobile gets slight boost for video viewing
    }

    // Browser optimization detection
    const isOptimizedBrowser = 'IntersectionObserver' in window && 'requestIdleCallback' in window;
    if (!isOptimizedBrowser) {
      score -= 15;
    }

    setPerformanceScore(Math.max(0, Math.min(100, score)));
  }, [networkStatus, orientation]);

  // Show indicator on mobile for 3 seconds after page load
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setShowIndicator(true);
      const timer = setTimeout(() => setShowIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showIndicator) return null;

  const getPerformanceColor = () => {
    if (performanceScore >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (performanceScore >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getPerformanceIcon = () => {
    if (performanceScore >= 80) return <Zap className="w-4 h-4" />;
    if (performanceScore >= 60) return <Gauge className="w-4 h-4" />;
    return <Gauge className="w-4 h-4" />;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className={cn(
        "bg-white rounded-lg shadow-lg border p-3 max-w-xs",
        "backdrop-blur-sm bg-white/95"
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            <Smartphone className="w-3 h-3 mr-1" />
            {language === 'fr-FR' ? 'Mobile Optimisé' : 'Mobile Optimized'}
          </Badge>
        </div>

        <div className="space-y-2 text-xs">
          {/* Performance Score */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              {language === 'fr-FR' ? 'Performance:' : 'Performance:'}
            </span>
            <Badge className={getPerformanceColor()}>
              {getPerformanceIcon()}
              {performanceScore}%
            </Badge>
          </div>

          {/* Network Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              {language === 'fr-FR' ? 'Connexion:' : 'Connection:'}
            </span>
            <div className="flex items-center gap-1">
              {networkStatus.isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-green-600" />
                  <span className="text-green-600 capitalize">
                    {networkStatus.effectiveType || 'Online'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-red-600" />
                  <span className="text-red-600">
                    {language === 'fr-FR' ? 'Hors ligne' : 'Offline'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Orientation */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600">
              {language === 'fr-FR' ? 'Orientation:' : 'Orientation:'}
            </span>
            <div className="flex items-center gap-1">
              {orientation === 'landscape' ? (
                <Monitor className="w-3 h-3 text-blue-600" />
              ) : (
                <Smartphone className="w-3 h-3 text-blue-600" />
              )}
              <span className="text-blue-600 capitalize">
                {language === 'fr-FR' 
                  ? (orientation === 'landscape' ? 'Paysage' : 'Portrait')
                  : orientation
                }
              </span>
            </div>
          </div>
        </div>

        {/* Features Badge */}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs">
              {language === 'fr-FR' ? 'Chargement intelligent' : 'Smart loading'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {language === 'fr-FR' ? 'Tactile 44px' : 'Touch 44px'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {language === 'fr-FR' ? 'Adaptatif' : 'Responsive'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}