import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';

interface ImageCropperEasyCropProps {
  imageUrl: string;
  onSave: (blob: Blob, cropSettings: any) => void;
  onCancel: () => void;
}

// Draggable cover component for 300×200 display with pan functionality
interface DraggableCoverProps {
  imageUrl: string;
  onPositionChange?: (pos: { x: number; y: number }) => void;
}

const DraggableCover: React.FC<DraggableCoverProps> = ({
  imageUrl,
  onPositionChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 }); // start centered
  const [dragging, setDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const dragStart = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);

  // Test image loading - handle both proxy URLs and direct Supabase URLs
  useEffect(() => {
    let finalUrl = imageUrl;
    
    // If it's already a full URL, use it directly with cache-busting
    if (imageUrl.startsWith('http')) {
      const timestamp = Date.now();
      const separator = imageUrl.includes('?') ? '&' : '?';
      finalUrl = `${imageUrl}${separator}cacheBust=${timestamp}&nocache=1`;
    } else {
      // Extract filename and use proxy
      const filename = imageUrl.split('/').pop()?.split('?')[0] || '';
      finalUrl = `/api/image-proxy?filename=${filename}`;
    }
    
    const testImg = new Image();
    testImg.crossOrigin = 'anonymous';
    testImg.onload = () => setImageLoaded(true);
    testImg.onerror = (error) => {
      console.error('❌ DraggableCover image failed to load:', error);
    };
    testImg.src = finalUrl;
  }, [imageUrl]);

  // Mouse down: record start positions
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };
    setDragging(true);
  };

  // Mouse move: calculate delta and update pos (clamped 0–100)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    const rect = containerRef.current!.getBoundingClientRect();

    const deltaX = e.clientX - dragStart.current.mouseX;
    const deltaY = e.clientY - dragStart.current.mouseY;
    
    const newX = Math.max(0, Math.min(100, dragStart.current.posX + (deltaX / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, dragStart.current.posY + (deltaY / rect.height) * 100));
    
    setPos({ x: newX, y: newY });
    onPositionChange?.({ x: newX, y: newY });
  }, [dragging, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  // Global mouse events
  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Create final URL for background image
  let finalImageUrl = imageUrl;
  if (imageUrl.startsWith('http')) {
    const timestamp = Date.now();
    const separator = imageUrl.includes('?') ? '&' : '?';
    finalImageUrl = `${imageUrl}${separator}cacheBust=${timestamp}&nocache=1`;
  } else {
    const filename = imageUrl.split('/').pop()?.split('?')[0] || '';
    finalImageUrl = `/api/image-proxy?filename=${filename}`;
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        width: 300,
        height: 200,
        cursor: dragging ? 'grabbing' : 'grab',
        backgroundImage: imageLoaded ? `url(${finalImageUrl})` : 'none',
        backgroundColor: imageLoaded ? 'transparent' : '#f3f4f6',
        backgroundSize: 'cover',
        backgroundPosition: `${pos.x}% ${pos.y}%`,
        borderRadius: 8,
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!imageLoaded && (
        <div className="text-gray-500 text-sm">
          Chargement de l'image...
        </div>
      )}
    </div>
  );
};

export default function ImageCropperEasyCrop({ imageUrl, onSave, onCancel }: ImageCropperEasyCropProps) {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const generateStaticImage = async () => {
    setLoading(true);
    
    try {
      console.log('🚀 PROOF: ImageCropperEasyCrop.tsx generateStaticImage() called - THIS IS THE CORRECT COMPONENT!');
      console.log('🎨 TRIPLE-LAYER WHITE BACKGROUND v1.0.99 - Starting image generation');
      console.log('🔍 DEBUG: Starting transparency investigation...');
      
      // Create canvas with high-DPI support
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = 300 * dpr;
      canvas.height = 200 * dpr;
      ctx.scale(dpr, dpr);

      // LAYER 1: Nuclear white background - pixel-level control
      console.log('🎨 LAYER 1: Nuclear white background - pixel-level control');
      const whiteData = ctx.createImageData(300, 200);
      const pixelArray = whiteData.data;
      
      for (let i = 0; i < pixelArray.length; i += 4) {
        pixelArray[i] = 255;     // Red
        pixelArray[i + 1] = 255; // Green  
        pixelArray[i + 2] = 255; // Blue
        pixelArray[i + 3] = 255; // Alpha (fully opaque)
      }
      
      ctx.putImageData(whiteData, 0, 0);
      console.log('✅ LAYER 1: All 60,000 pixels set to pure white');

      // Load and draw image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      let finalUrl = imageUrl;
      if (imageUrl.startsWith('http')) {
        const timestamp = Date.now();
        const separator = imageUrl.includes('?') ? '&' : '?';
        finalUrl = `${imageUrl}${separator}cacheBust=${timestamp}&nocache=1`;
      } else {
        const filename = imageUrl.split('/').pop()?.split('?')[0] || '';
        finalUrl = `/api/image-proxy?filename=${filename}`;
      }
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
        img.src = finalUrl;
      });

      // Calculate cover dimensions
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = 300 / 200;

      let scaledWidth, scaledHeight;
      if (imgAspect > canvasAspect) {
        scaledHeight = 200;
        scaledWidth = scaledHeight * imgAspect;
      } else {
        scaledWidth = 300;
        scaledHeight = scaledWidth / imgAspect;
      }

      // Calculate position offset
      const offsetX = (position.x / 100) * (300 - scaledWidth);
      const offsetY = (position.y / 100) * (200 - scaledHeight);

      // LAYER 2: Draw image
      console.log('🎨 LAYER 2: Drawing image on white background');
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      
      // LAYER 3: Final safety white background behind any transparent areas
      console.log('🎨 LAYER 3: Final safety white background');
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 300, 200);
      
      // LAYER 4: FINAL WHITE BACKGROUND ENFORCEMENT
      console.log('🎨 LAYER 4: Final white background enforcement with source-over');
      ctx.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';  // Pure white with full alpha
      ctx.fillRect(0, 0, 300, 200);
      ctx.restore();
      
      console.log('✅ FINAL WHITE BACKGROUND: Complete 4-layer protection applied');

      // DEBUG: Check canvas final state before conversion
      console.log('🔍 FINAL CANVAS DEBUG:');
      console.log('- Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('- Device pixel ratio:', dpr);
      console.log('- Composite operation:', ctx.globalCompositeOperation);
      
      // Test: Create a data URL to check transparency
      const testDataUrl = canvas.toDataURL('image/png');
      console.log('🔍 TEST PNG DataURL length:', testDataUrl.length);
      
      // NUCLEAR APPROACH: Pixel-level manipulation to force white background
      console.log('🎨 NUCLEAR APPROACH: Pixel-level white background enforcement');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let transparentPixelsFound = 0;
      
      // Force any transparent pixels to white
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] < 255) { // If alpha < 255 (transparent)
          pixels[i] = 255;     // Red = 255
          pixels[i + 1] = 255; // Green = 255
          pixels[i + 2] = 255; // Blue = 255
          pixels[i + 3] = 255; // Alpha = 255
          transparentPixelsFound++;
        }
      }
      
      console.log(`🔍 Transparent pixels found and fixed: ${transparentPixelsFound}`);
      
      // Put corrected pixels back
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to JPEG (no transparency support) with maximum quality
      console.log('🎨 Converting to JPEG with quality 1.0 (maximum)...');
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('✅ JPEG blob created successfully, size:', blob.size, 'bytes');
            console.log('✅ JPEG blob type:', blob.type);
          } else {
            console.error('❌ Failed to create JPEG blob');
          }
          resolve(blob!);
        }, 'image/jpeg', 1.0);
      });

      const cropSettings = {
        method: 'triple-layer-white-bg',
        position: position,
        devicePixelRatio: dpr,
        originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
        outputDimensions: { width: 300, height: 200 },
        format: 'JPEG'
      };
      
      onSave(blob, cropSettings);
      
    } catch (error) {
      console.error('Error generating static image:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mb-2 p-2 bg-green-100 border border-green-300 rounded">
          <span className="text-green-800 font-bold">✅ OPTIMIZED v1.0.99 - Clean Component Loaded (281 lines)</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Glissez pour repositionner l'image dans le cadre 300×200
        </p>
        
        <div className="mx-auto">
          <DraggableCover 
            imageUrl={imageUrl} 
            onPositionChange={setPosition}
          />
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Position: {position.x.toFixed(0)}% x {position.y.toFixed(0)}%
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <Button 
          onClick={onCancel}
          variant="outline"
          className="px-6"
        >
          Annuler
        </Button>
        <Button 
          onClick={generateStaticImage}
          disabled={loading}
          className="bg-[#2A4759] hover:bg-[#1e3340] text-white px-8"
        >
          {loading ? 'Génération...' : 'Générer Image Statique (300×200)'}
        </Button>
      </div>
    </div>
  );
}