import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Gallery, GalleryImage, ApiResponse } from '@/types/blog';

interface GalleryComponentProps {
  slug: string;
  language?: string;
  className?: string;
  onImageClick?: (image: GalleryImage) => void;
}

export default function GalleryComponent({
  slug,
  language = 'en-US',
  className = '',
  onImageClick
}: GalleryComponentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxGallery, setLightboxGallery] = useState<Gallery | null>(null);

  const { data, isLoading, error } = useQuery<ApiResponse<Gallery>>({
    queryKey: ['/api/blog/posts', slug, 'gallery', language],
    queryFn: async () => {
      const response = await fetch(`/api/blog/posts/${slug}/gallery?language=${language}`);
      if (!response.ok) throw new Error('Failed to fetch gallery');
      return response.json();
    }
  });

  const galleries = data?.data || [];

  const openLightbox = (gallery: Gallery, index: number) => {
    setLightboxGallery(gallery);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const nextImage = () => {
    if (!lightboxGallery) return;
    setLightboxIndex((prev) => 
      prev === lightboxGallery.gallery_images.length - 1 ? 0 : prev + 1
    );
  };

  const previousImage = () => {
    if (!lightboxGallery) return;
    setLightboxIndex((prev) => 
      prev === 0 ? lightboxGallery.gallery_images.length - 1 : prev - 1
    );
  };

  if (error) {
    return null; // Silently fail for galleries
  }

  if (isLoading) {
    return (
      <div className={`space-y-8 ${className}`} data-testid="gallery-loading">
        <Skeleton className="w-full h-64 rounded-xl" />
      </div>
    );
  }

  if (galleries.length === 0) {
    return null; // No galleries, no render
  }

  return (
    <>
      <div className={`space-y-12 ${className}`} data-testid="gallery-component">
        {galleries.map((gallery) => (
          <div key={gallery.id} className="space-y-4" data-testid={`gallery-${gallery.id}`}>
            {/* Gallery Header */}
            {(gallery.title || gallery.description) && (
              <div className="space-y-2">
                {gallery.title && (
                  <h3 className="text-2xl font-['Playfair_Display'] font-bold text-[#2A4759]">
                    {gallery.title}
                  </h3>
                )}
                {gallery.description && (
                  <p className="text-gray-600">{gallery.description}</p>
                )}
              </div>
            )}

            {/* Gallery Content */}
            <GalleryLayout
              gallery={gallery}
              onImageClick={(image, index) => {
                onImageClick?.(image);
                openLightbox(gallery, index);
              }}
            />
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {lightboxGallery && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-7xl w-full p-0 bg-black/95">
            <div className="relative h-[90vh]">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
                onClick={() => setLightboxOpen(false)}
                data-testid="button-close-lightbox"
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Navigation */}
              {lightboxGallery.gallery_images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
                    onClick={previousImage}
                    data-testid="button-lightbox-previous"
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
                    onClick={nextImage}
                    data-testid="button-lightbox-next"
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* Image */}
              <div className="flex items-center justify-center h-full p-12">
                <img
                  src={lightboxGallery.gallery_images[lightboxIndex].image.url}
                  alt={lightboxGallery.gallery_images[lightboxIndex].alt_text || `Image ${lightboxIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Caption */}
              {lightboxGallery.gallery_images[lightboxIndex].caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-6 text-center">
                  <p className="text-lg">{lightboxGallery.gallery_images[lightboxIndex].caption}</p>
                  <p className="text-sm text-gray-300 mt-1">
                    {lightboxIndex + 1} / {lightboxGallery.gallery_images.length}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Individual gallery layout renderer
function GalleryLayout({ 
  gallery, 
  onImageClick 
}: { 
  gallery: Gallery; 
  onImageClick: (image: GalleryImage, index: number) => void;
}) {
  const images = gallery.gallery_images || [];
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Single Image Layout
  if (gallery.layout_type === 'single') {
    return (
      <div className="space-y-4" data-testid="gallery-layout-single">
        {images.map((image, idx) => (
          <div key={image.id} className="group relative cursor-pointer" onClick={() => onImageClick(image, idx)}>
            <div className="relative overflow-hidden rounded-xl shadow-lg">
              <img
                src={image.image.url}
                alt={image.alt_text || gallery.title || 'Gallery image'}
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {image.caption && (
              <p className="mt-2 text-sm text-gray-600 italic text-center">{image.caption}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Side-by-Side Layout
  if (gallery.layout_type === 'side-by-side') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="gallery-layout-side-by-side">
        {images.map((image, idx) => (
          <div key={image.id} className="group relative cursor-pointer" onClick={() => onImageClick(image, idx)}>
            <div className="relative overflow-hidden rounded-xl shadow-lg aspect-[4/3]">
              <img
                src={image.image.url}
                alt={image.alt_text || gallery.title || 'Gallery image'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            {image.caption && (
              <p className="mt-2 text-sm text-gray-600 italic">{image.caption}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Grid 2x2 Layout
  if (gallery.layout_type === 'grid-2') {
    return (
      <div className="grid grid-cols-2 gap-3" data-testid="gallery-layout-grid-2">
        {images.map((image, idx) => (
          <div key={image.id} className="group relative cursor-pointer" onClick={() => onImageClick(image, idx)}>
            <div className="relative overflow-hidden rounded-lg shadow-md aspect-square">
              <img
                src={image.image.url}
                alt={image.alt_text || gallery.title || 'Gallery image'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid 3x3 Layout
  if (gallery.layout_type === 'grid-3') {
    return (
      <div className="grid grid-cols-3 gap-2" data-testid="gallery-layout-grid-3">
        {images.map((image, idx) => (
          <div key={image.id} className="group relative cursor-pointer" onClick={() => onImageClick(image, idx)}>
            <div className="relative overflow-hidden rounded-lg shadow-md aspect-square">
              <img
                src={image.image.url}
                alt={image.alt_text || gallery.title || 'Gallery image'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Carousel Layout
  if (gallery.layout_type === 'carousel') {
    const currentImage = images[carouselIndex];
    
    return (
      <div className="relative" data-testid="gallery-layout-carousel">
        <div className="relative overflow-hidden rounded-xl shadow-xl group cursor-pointer" onClick={() => onImageClick(currentImage, carouselIndex)}>
          <img
            src={currentImage.image.url}
            alt={currentImage.alt_text || gallery.title || 'Gallery image'}
            className="w-full h-auto max-h-96 object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
            <ZoomIn className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {currentImage.caption && (
          <p className="mt-2 text-sm text-gray-600 italic text-center">{currentImage.caption}</p>
        )}

        {/* Carousel Navigation */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                setCarouselIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
              }}
              data-testid="button-carousel-gallery-previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                setCarouselIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
              }}
              data-testid="button-carousel-gallery-next"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {images.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setCarouselIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === carouselIndex ? 'w-8 bg-[#D67C4A]' : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                  data-testid={`carousel-gallery-indicator-${idx}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
