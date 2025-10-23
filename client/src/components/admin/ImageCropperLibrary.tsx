import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

interface ImageCropperLibraryProps {
  imageUrl: string;
  onSave: (blob: Blob, cropSettings: any) => void;
  onCancel: () => void;
}

export default function ImageCropperLibrary({ imageUrl, onSave, onCancel }: ImageCropperLibraryProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 25,
    y: 25,
    width: 50,
    height: 33.33, // 3:2 aspect ratio (300:200)
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isSaving, setIsSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    // Set initial crop to center with 3:2 aspect ratio
    const aspectRatio = 3 / 2; // 300:200
    let cropWidth = Math.min(width * 0.5, height * aspectRatio * 0.5);
    let cropHeight = cropWidth / aspectRatio;
    
    if (cropHeight > height * 0.5) {
      cropHeight = height * 0.5;
      cropWidth = cropHeight * aspectRatio;
    }
    
    const x = (width - cropWidth) / 2;
    const y = (height - cropHeight) / 2;
    
    setCrop({
      unit: 'px',
      x,
      y,
      width: cropWidth,
      height: cropHeight,
    });
  };

  const getCroppedImg = (
    image: HTMLImageElement,
    crop: PixelCrop,
    fileName: string = 'cropped-image.jpg'
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Set canvas size to exactly 300x200
    canvas.width = 300;
    canvas.height = 200;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 300, 200);

    // Draw the cropped image scaled to fit exactly
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      300,
      200
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        1.0
      );
    });
  };

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) {
      return;
    }

    setIsSaving(true);
    try {
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      console.log('Library crop - blob created, size:', croppedImageBlob.size, 'dimensions: 300x200');
      onSave(croppedImageBlob, completedCrop);
    } catch (error) {
      console.error('Error cropping image:', error);
      alert('Error cropping image: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSaving(false);
    }
  };

  // Extract filename from URL for proxy
  const filename = imageUrl.split('/').pop() || 'image.jpg';
  const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recadrer l'image (300×200)
          </h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Utilisez la zone de sélection pour choisir la partie de l'image à recadrer. 
            Le résultat final sera une image de 300×200 pixels.
          </p>
        </div>

        {/* Crop Area */}
        <div className="p-4">
          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={3 / 2} // Lock to 3:2 aspect ratio
              style={{ maxWidth: '100%', maxHeight: '60vh' }}
            >
              <img
                ref={imgRef}
                alt="Source"
                src={proxyUrl}
                onLoad={onImageLoad}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </ReactCrop>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!completedCrop || isSaving}
            className="bg-memopyk-orange hover:bg-memopyk-orange/90"
          >
            <Download className="h-4 w-4 mr-2" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder (300×200)'}
          </Button>
        </div>
      </div>
    </div>
  );
}