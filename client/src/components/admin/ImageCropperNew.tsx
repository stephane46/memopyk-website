import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Crop, ZoomIn, Move, Save } from 'lucide-react';

interface CropSettings {
  x: number;        // Image offset in preview container
  y: number;        // Image offset in preview container  
  zoom: number;     // Zoom level (100% = fit to container)
}

interface ImageCropperNewProps {
  imageUrl: string;
  onSave: (blob: Blob, cropSettings: CropSettings) => void;
  targetWidth?: number;
  targetHeight?: number;
}

export default function ImageCropperNew({ 
  imageUrl, 
  onSave, 
  targetWidth = 300, 
  targetHeight = 200 
}: ImageCropperNewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    x: 0,
    y: 0,
    zoom: 100
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Fixed preview dimensions (3:2 ratio)
  const previewWidth = 600;
  const previewHeight = 400;
  
  // Fixed crop frame (centered, maintains 3:2 ratio)
  const cropFrameWidth = targetWidth;
  const cropFrameHeight = targetHeight;
  const cropFrameX = (previewWidth - cropFrameWidth) / 2;
  const cropFrameY = (previewHeight - cropFrameHeight) / 2;

  useEffect(() => {
    // Load image via proxy to avoid CORS issues completely
    const filename = imageUrl.split('/').pop() || 'image.jpg';
    const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;
    
    const img = new Image();
    img.onload = () => {
      // Center the image initially
      const imageAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = previewWidth / previewHeight;
      
      let initialWidth, initialHeight;
      if (imageAspect > containerAspect) {
        // Image is wider - fit by height
        initialHeight = previewHeight;
        initialWidth = initialHeight * imageAspect;
      } else {
        // Image is taller - fit by width
        initialWidth = previewWidth;
        initialHeight = initialWidth / imageAspect;
      }
      
      // Center the image
      setCropSettings({
        x: (previewWidth - initialWidth) / 2,
        y: (previewHeight - initialHeight) / 2,
        zoom: 100
      });
      
      setIsLoading(false);
    };
    img.onerror = () => {
      console.error('Failed to load image via proxy. URL:', proxyUrl);
      setIsLoading(false);
    };
    img.src = proxyUrl;
  }, [imageUrl, previewWidth, previewHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    setCropSettings(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (value: number[]) => {
    const newZoom = value[0];
    
    // Simple approach: keep the image centered during zoom
    const currentImageW = imageRef.current?.naturalWidth || 0;
    const currentImageH = imageRef.current?.naturalHeight || 0;
    
    const imageAspect = currentImageW / currentImageH;
    const containerAspect = previewWidth / previewHeight;
    
    let baseWidth, baseHeight;
    if (imageAspect > containerAspect) {
      baseHeight = previewHeight;
      baseWidth = baseHeight * imageAspect;
    } else {
      baseWidth = previewWidth;
      baseHeight = baseWidth / imageAspect;
    }
    
    // Calculate new dimensions
    const newWidth = (baseWidth * newZoom) / 100;
    const newHeight = (baseHeight * newZoom) / 100;
    
    // Center the image in the container (simple and predictable)
    setCropSettings({
      x: (previewWidth - newWidth) / 2,
      y: (previewHeight - newHeight) / 2,
      zoom: newZoom
    });
  };

  const handleSave = async () => {
    if (!imageRef.current || isSaving) return;
    
    setIsSaving(true);
    
    try {
      const img = imageRef.current;
      
      // Calculate actual image dimensions at current zoom
      const imageAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = previewWidth / previewHeight;
      
      let baseWidth, baseHeight;
      if (imageAspect > containerAspect) {
        baseHeight = previewHeight;
        baseWidth = baseHeight * imageAspect;
      } else {
        baseWidth = previewWidth;
        baseHeight = baseWidth / imageAspect;
      }
      
      const currentImageWidth = (baseWidth * cropSettings.zoom) / 100;
      const currentImageHeight = (baseHeight * cropSettings.zoom) / 100;
      
      // Calculate what part of the original image is visible in the crop frame
      const cropRelativeX = (cropFrameX - cropSettings.x) / currentImageWidth;
      const cropRelativeY = (cropFrameY - cropSettings.y) / currentImageHeight;
      const cropRelativeW = cropFrameWidth / currentImageWidth;
      const cropRelativeH = cropFrameHeight / currentImageHeight;
      
      // Map to original image coordinates
      const sourceX = cropRelativeX * img.naturalWidth;
      const sourceY = cropRelativeY * img.naturalHeight;
      const sourceW = cropRelativeW * img.naturalWidth;
      const sourceH = cropRelativeH * img.naturalHeight;
      
      // Clamp to image bounds
      const finalSourceX = Math.max(0, Math.min(sourceX, img.naturalWidth - sourceW));
      const finalSourceY = Math.max(0, Math.min(sourceY, img.naturalHeight - sourceH));
      const finalSourceW = Math.min(sourceW, img.naturalWidth - finalSourceX);
      const finalSourceH = Math.min(sourceH, img.naturalHeight - finalSourceY);
      
      console.log('SIMPLE CROP - Source coordinates:', {
        x: finalSourceX, y: finalSourceY, w: finalSourceW, h: finalSourceH,
        original: { w: img.naturalWidth, h: img.naturalHeight }
      });
      
      // Create high-resolution output canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Cannot get canvas context');
      
      // Fixed output size - exactly 300x200
      canvas.width = targetWidth;  // 300
      canvas.height = targetHeight; // 200
      
      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Draw the cropped area scaled to exact target size
      ctx.drawImage(
        img,
        finalSourceX, finalSourceY, finalSourceW, finalSourceH,
        0, 0, targetWidth, targetHeight
      );
      
      // Convert to blob (image loaded via proxy so no CORS issues)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('FIXED-SIZE blob created, size:', blob.size, 'dimensions:', targetWidth, 'x', targetHeight);
            onSave(blob, cropSettings);
          } else {
            throw new Error('Failed to create blob from canvas');
          }
          setIsSaving(false);
        },
        'image/jpeg',
        1.0
      );
      
    } catch (error) {
      console.error('Cropping failed:', error);
      alert('Error: ' + (error instanceof Error ? error.message : String(error)));
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-memopyk-orange mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement de l'image...</p>
        </div>
      </div>
    );
  }

  // Calculate current image display dimensions
  const imageAspect = imageRef.current?.naturalWidth || 1 / (imageRef.current?.naturalHeight || 1);
  const containerAspect = previewWidth / previewHeight;
  
  let baseWidth, baseHeight;
  if (imageAspect > containerAspect) {
    baseHeight = previewHeight;
    baseWidth = baseHeight * imageAspect;
  } else {
    baseWidth = previewWidth;
    baseHeight = baseWidth / imageAspect;
  }
  
  const currentImageWidth = (baseWidth * cropSettings.zoom) / 100;
  const currentImageHeight = (baseHeight * cropSettings.zoom) / 100;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-memopyk-orange/10 to-memopyk-orange/5 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Crop className="h-6 w-6 text-memopyk-orange" />
            Créer Image Statique - NOUVELLE VERSION
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full">
            Résolution Complète: {Math.round(currentImageWidth)} × {Math.round(currentImageHeight)} px
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Move className="h-4 w-4" />
              Glissez l'image pour repositionner
            </span>
            <span className="flex items-center gap-1">
              <ZoomIn className="h-4 w-4" />
              Utilisez le zoom pour ajuster la taille
            </span>
          </div>
        </div>
      </div>

      {/* Crop Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div 
          ref={containerRef}
          className="relative mx-auto bg-gray-100 dark:bg-gray-700 overflow-hidden cursor-move"
          style={{ width: previewWidth, height: previewHeight }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Image */}
          <img
            ref={imageRef}
            src={`/api/video-proxy?filename=${encodeURIComponent(imageUrl.split('/').pop() || 'image.jpg')}`}
            alt="Source"
            className="absolute select-none"
            style={{
              left: cropSettings.x,
              top: cropSettings.y,
              width: currentImageWidth,
              height: currentImageHeight,
              transform: 'translate3d(0,0,0)'
            }}
            draggable={false}
          />
          
          {/* Crop Frame Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top overlay */}
            <div 
              className="absolute top-0 left-0 right-0 bg-black/30"
              style={{ height: cropFrameY }}
            />
            {/* Bottom overlay */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-black/30"
              style={{ height: previewHeight - cropFrameY - cropFrameHeight }}
            />
            {/* Left overlay */}
            <div 
              className="absolute left-0 bg-black/30"
              style={{ 
                top: cropFrameY,
                width: cropFrameX,
                height: cropFrameHeight
              }}
            />
            {/* Right overlay */}
            <div 
              className="absolute right-0 bg-black/30"
              style={{ 
                top: cropFrameY,
                width: previewWidth - cropFrameX - cropFrameWidth,
                height: cropFrameHeight
              }}
            />
            
            {/* Crop frame border */}
            <div 
              className="absolute border-2 border-memopyk-orange"
              style={{ 
                left: cropFrameX,
                top: cropFrameY,
                width: cropFrameWidth,
                height: cropFrameHeight
              }}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="space-y-4">
          {/* Zoom Control */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zoom: {cropSettings.zoom}%
            </label>
            <Slider
              value={[cropSettings.zoom]}
              onValueChange={handleZoomChange}
              min={50}
              max={300}
              step={5}
              className="w-full"
            />
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-memopyk-orange hover:bg-memopyk-orange/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Génération en cours...' : 'Générer Image Statique'}
          </Button>
        </div>
      </div>
    </div>
  );
}