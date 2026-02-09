import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import SimpleImageCropper from '../SimpleImageCropper';
import type { GalleryItem, GalleryFormData } from './types';
import { getFullUrl } from './types';

interface GalleryImageCropperProps {
  selectedItem: GalleryItem;
  formData: GalleryFormData;
  cropperLanguage: 'en' | 'fr';
  cropSaving: boolean;
  setCropSaving: (saving: boolean) => void;
  setForceRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
}

export default function GalleryImageCropper({
  selectedItem, formData, cropperLanguage, cropSaving,
  setCropSaving, setForceRefreshKey, onClose
}: GalleryImageCropperProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const imageUrl = getFullUrl(
    selectedItem.useSameVideo
      ? (formData.imageUrlEn || selectedItem.imageUrlEn)
      : (cropperLanguage === 'fr'
        ? (formData.imageUrlFr || selectedItem.imageUrlFr)
        : (formData.imageUrlEn || selectedItem.imageUrlEn))
  );

  return (
    <SimpleImageCropper
      imageUrl={imageUrl}
      initialCropSettings={selectedItem.cropSettings}
      isParentSaving={cropSaving}
      onSave={async (blob: Blob, cropSettings: any) => {
        setCropSaving(true);

        try {
          const uploadFormData = new FormData();

          const originalImageUrl = selectedItem.useSameVideo
            ? (formData.imageUrlEn || selectedItem.imageUrlEn)
            : (cropperLanguage === 'fr'
              ? (formData.imageUrlFr || selectedItem.imageUrlFr)
              : (formData.imageUrlEn || selectedItem.imageUrlEn));

          const originalFilename = originalImageUrl.split('/').pop() || `item_${selectedItem.id}`;
          const baseFilename = originalFilename.replace(/\.[^/.]+$/, '');
          const filename = `${baseFilename}-C.jpg`;

          uploadFormData.append('image', blob, filename);
          uploadFormData.append('language', cropperLanguage);
          uploadFormData.append('original_filename', originalFilename);
          uploadFormData.append('item_id', selectedItem.id.toString());
          uploadFormData.append('crop_settings', JSON.stringify(cropSettings));

          const uploadResponse = await fetch('/api/gallery/upload-static-image', {
            method: 'POST',
            body: uploadFormData
          });

          if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${uploadResponse.status}`);
          }

          await uploadResponse.json();

          // Update crop settings in database
          const updateResponse = await fetch(`/api/gallery/${selectedItem.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cropSettings: cropSettings })
          });

          if (!updateResponse.ok) {
            throw new Error(`Database update failed: ${updateResponse.status}`);
          }

          // Cache refresh
          await queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
          await queryClient.refetchQueries({ queryKey: ['/api/gallery'] });

          setForceRefreshKey(Date.now());
          window.dispatchEvent(new CustomEvent('gallery-updated'));

          onClose();
          setCropSaving(false);
          toast({ title: "✅ Succès", description: "Image recadrée sauvegardée" });

        } catch (error) {
          console.error('Crop error:', error);
          onClose();
          setCropSaving(false);
          const errorMessage = error instanceof Error ? error.message : String(error);
          toast({
            title: "❌ Erreur de Recadrage",
            description: `Détails: ${errorMessage}`,
            variant: "destructive"
          });
          throw error;
        }
      }}
      onCancel={onClose}
    />
  );
}
