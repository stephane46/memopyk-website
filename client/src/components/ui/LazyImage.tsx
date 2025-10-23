import { useState } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  fallbackSrc?: string;
  onLoad?: (e?: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className,
  placeholderClassName,
  fallbackSrc,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { elementRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true
  });

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const currentSrc = hasError && fallbackSrc ? fallbackSrc : src;
  


  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={cn(
        'relative overflow-hidden bg-gray-100',
        className
      )}
    >
      {/* Loading Placeholder */}
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse',
            'bg-[length:200%_100%] animate-[shimmer_2s_infinite]',
            placeholderClassName
          )}
        />
      )}

      {/* Actual Image */}
      {hasIntersected && (
        <img
          src={currentSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          loading="lazy"
        />
      )}
    </div>
  );
}

// Add shimmer animation to global CSS if not already present
export const shimmerStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;