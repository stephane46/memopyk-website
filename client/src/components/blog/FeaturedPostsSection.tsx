import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { BlogPost, ApiResponse } from '@/types/blog';

interface FeaturedPostsSectionProps {
  limit?: number;
  language?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

export default function FeaturedPostsSection({
  limit = 3,
  language = 'en-US',
  autoPlay = false,
  autoPlayInterval = 5000,
  className = ''
}: FeaturedPostsSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data, isLoading, error } = useQuery<ApiResponse<BlogPost>>({
    queryKey: ['/api/blog/featured', language, limit],
    queryFn: async () => {
      const response = await fetch(`/api/blog/featured?language=${language}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch featured posts');
      return response.json();
    }
  });

  const posts = data?.data || [];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? posts.length - 1 : prev - 1));
  }, [posts.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === posts.length - 1 ? 0 : prev + 1));
  }, [posts.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || posts.length <= 1) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, goToNext, posts.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`} data-testid="featured-posts-error">
        <p className="text-red-600">
          {language === 'fr-FR' 
            ? 'Erreur lors du chargement des articles en vedette' 
            : 'Failed to load featured posts'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className}`} data-testid="featured-posts-loading">
        <Skeleton className="w-full h-96 rounded-xl" />
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-2 w-2 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`} data-testid="featured-posts-empty">
        <p className="text-gray-500">
          {language === 'fr-FR' 
            ? 'Aucun article en vedette disponible' 
            : 'No featured posts available'}
        </p>
      </div>
    );
  }

  const currentPost = posts[currentIndex];

  return (
    <div className={`relative ${className}`} data-testid="featured-posts-section">
      {/* Main Carousel */}
      <div className="relative overflow-hidden rounded-xl shadow-2xl">
        <Link href={`/${language}/blog/${currentPost.slug}`}>
          <div className="relative h-96 md:h-[500px] lg:h-[600px] cursor-pointer group">
            {/* Background Image */}
            {currentPost.image?.url && (
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url(${currentPost.image.url})` }}
              />
            )}
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
              {/* Featured Badge */}
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-[#D67C4A] hover:bg-[#D67C4A]/90 border-0">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  {language === 'fr-FR' ? 'En vedette' : 'Featured'}
                </Badge>
                {currentPost.featured_order !== undefined && (
                  <Badge variant="outline" className="border-white/30 text-white">
                    #{currentPost.featured_order}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-['Playfair_Display'] font-bold mb-4 line-clamp-2 group-hover:text-[#D67C4A] transition-colors">
                {currentPost.title}
              </h2>

              {/* Hero Caption or Description */}
              {(currentPost.hero_caption || currentPost.description) && (
                <p className="text-lg md:text-xl text-gray-200 mb-4 line-clamp-2 max-w-3xl">
                  {currentPost.hero_caption || currentPost.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {currentPost.read_time_minutes && (
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Clock className="h-4 w-4" />
                    {currentPost.read_time_minutes} {language === 'fr-FR' ? 'min' : 'min'}
                  </span>
                )}
                {currentPost.tags && currentPost.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentPost.tags.slice(0, 3).map((tag: any) => (
                      <Badge 
                        key={tag.id}
                        variant="outline" 
                        className="border-white/30 text-white hover:bg-white/10"
                        style={{ borderColor: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Navigation Arrows */}
        {posts.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12"
              onClick={goToPrevious}
              data-testid="button-carousel-previous"
              aria-label={language === 'fr-FR' ? 'Précédent' : 'Previous'}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12"
              onClick={goToNext}
              data-testid="button-carousel-next"
              aria-label={language === 'fr-FR' ? 'Suivant' : 'Next'}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Dot Indicators */}
      {posts.length > 1 && (
        <div className="flex justify-center gap-2 mt-6" data-testid="carousel-indicators">
          {posts.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'w-8 bg-[#D67C4A]' 
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              data-testid={`carousel-indicator-${index}`}
              aria-label={`${language === 'fr-FR' ? 'Aller au slide' : 'Go to slide'} ${index + 1}`}
              aria-current={index === currentIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
}
