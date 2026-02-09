import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Image, PlayCircle, Power, Crop, RotateCcw } from 'lucide-react';
import type { GalleryItem, GalleryFormData, PendingPreviews, ActiveCroppingState } from './types';

interface GalleryPreviewCardProps {
  formData: GalleryFormData;
  selectedItem: GalleryItem | undefined;
  isCreateMode: boolean;
  pendingPreviews: PendingPreviews;
  forceRefreshKey: number;
  activeCroppingState: ActiveCroppingState;
  onActiveToggle: (checked: boolean) => void;
  onCropClick: (language: 'en' | 'fr') => void;
  onRestoreOriginal: (language: 'en' | 'fr') => void;
  updateIsPending: boolean;
}

export default function GalleryPreviewCard({
  formData, selectedItem, isCreateMode, pendingPreviews, forceRefreshKey,
  activeCroppingState, onActiveToggle, onCropClick, onRestoreOriginal, updateIsPending
}: GalleryPreviewCardProps) {

  // Helper function to get thumbnail URL - SIMPLIFIED TO FORCE -C VERSION
  const getThumbnailUrl = (item: GalleryItem | null | undefined, language: 'en' | 'fr' = 'en') => {
    const pendingImageUrl = language === 'fr' ? pendingPreviews.imageUrlFr : pendingPreviews.imageUrlEn;
    if (pendingImageUrl) return pendingImageUrl;

    const formImageUrl = language === 'fr' ? formData.imageUrlFr : formData.imageUrlEn;
    if (formImageUrl && !item) return formImageUrl;

    if (!item) return '';

    // FORCE: Always use static cropped version (-C) if available
    let croppedUrl = '';
    if (item.useSameVideo) {
      croppedUrl = item.static_imageUrlEn || '';
    } else {
      croppedUrl = (language === 'fr' ? item.static_imageUrlFr : item.static_imageUrlEn) || '';
    }

    if (croppedUrl && croppedUrl.trim() !== '') {
      return croppedUrl + (forceRefreshKey > 0 ? `?v=${forceRefreshKey}` : '');
    }

    const originalUrl = item.useSameVideo
      ? item.imageUrlEn
      : (language === 'fr' ? item.imageUrlFr : item.imageUrlEn);

    if (originalUrl) return originalUrl;
    if (item.staticImageUrl) return item.staticImageUrl;
    return '';
  };

  // Badge logic helper
  const renderCropBadge = (item: GalleryItem, language: 'en' | 'fr') => {
    if (activeCroppingState.isActive && activeCroppingState.language === language) {
      return activeCroppingState.hasChanges ? `✂️ Recadré ${language.toUpperCase()}*` : `✂️ Auto ${language.toUpperCase()}`;
    }

    const isUploadingNewImage = language === 'fr'
      ? (pendingPreviews.imageUrlFr || (formData.imageUrlFr && formData.imageUrlFr !== item.imageUrlFr))
      : (pendingPreviews.imageUrlEn || (formData.imageUrlEn && formData.imageUrlEn !== item.imageUrlEn));

    const cropSettings = isUploadingNewImage
      ? formData.cropSettings
      : (formData.cropSettings || (item as any).cropSettings);

    const hasStaticImage = language === 'fr' ? item.static_imageUrlFr : item.static_imageUrlEn;
    const hasOriginalImage = language === 'fr' ? item.imageUrlFr : item.imageUrlEn;

    if (hasStaticImage && hasOriginalImage) {
      if (cropSettings?.method === 'triple-layer-white-bg') {
        return formData.useSameVideo ? '✂️ Recadré EN/FR' : `✂️ Recadré ${language.toUpperCase()}`;
      } else if (cropSettings?.method === 'sharp-auto-thumbnail' && cropSettings?.cropped === true) {
        return formData.useSameVideo ? '✂️ Auto EN/FR' : `✂️ Auto ${language.toUpperCase()}`;
      } else if (hasOriginalImage !== hasStaticImage) {
        return formData.useSameVideo ? '✂️ Recadré EN/FR' : `✂️ Recadré ${language.toUpperCase()}`;
      }
    }
    return '';
  };

  return (
    <Card className="border-[#89BAD9] dark:border-[#2A4759]">
      <CardContent className="p-8">
        {/* Status Controls - At Top */}
        <div className="pb-6 border-b border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center justify-center gap-2 mb-4">
            <Power className="w-5 h-5" />
            Statut & Activation
          </h3>
          <div className="flex flex-col items-center space-y-3">
            <Switch
              checked={formData.isActive}
              onCheckedChange={onActiveToggle}
              className="data-[state=checked]:bg-[#2A4759]"
            />
            <Label className="text-base font-medium text-[#011526] dark:text-[#F2EBDC] text-center">
              {formData.isActive ? 'Actif' : 'Inactif'}
              {updateIsPending && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Sauvegarde...)</span>
              )}
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* French Row - Hidden when shared mode is enabled */}
          {!formData.useSameVideo && (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2 mb-4">
                <Image className="w-5 h-5" />
                Image Français
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between min-h-[2.5rem]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">🇫🇷 Français</span>
                  </div>
                  {!isCreateMode && selectedItem?.imageUrlFr && (
                    <div className="flex gap-1">
                      <Button
                        onClick={() => onCropClick('fr')}
                        variant="outline"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 px-2 py-1 text-xs"
                      >
                        <Crop className="w-3 h-3 mr-1" />
                        Recadrer FR
                      </Button>
                      {selectedItem.static_imageUrlFr && (
                        <Button
                          onClick={() => onRestoreOriginal('fr')}
                          variant="outline"
                          size="sm"
                          className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 px-2 py-1 text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Original
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border border-blue-200 dark:border-blue-600 relative">
                  {(selectedItem || isCreateMode) && (pendingPreviews.imageUrlFr || selectedItem || formData.imageUrlFr) ? (
                    <>
                      <img
                        src={(() => {
                          if (pendingPreviews.imageUrlFr) return pendingPreviews.imageUrlFr;
                          if (selectedItem) return getThumbnailUrl(selectedItem, 'fr');
                          return formData.imageUrlFr;
                        })()}
                        alt="Aperçu Français"
                        className="w-full h-full object-contain"
                      />
                      {selectedItem?.static_imageUrlFr &&
                       selectedItem.static_imageUrlFr !== selectedItem.imageUrlFr &&
                       selectedItem.static_imageUrlFr !== formData.imageUrlFr && (
                        <div className={`absolute top-2 right-2 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                          (selectedItem as any).cropSettings?.method === 'triple-layer-white-bg'
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                        }`}>
                          {renderCropBadge(selectedItem, 'fr')}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <Image className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <p className="text-xs">Pas d'image FR</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2 mb-4">
                <PlayCircle className="w-5 h-5" />
                Vidéo Français
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between min-h-[2.5rem]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">🇫🇷 Français</span>
                  </div>
                </div>
                {formData.videoUrlFr || (formData.useSameVideo && formData.videoFilename) ? (
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full border border-blue-200 dark:border-blue-600">
                    <video
                      key={`fr-video-${selectedItem?.id}-${Date.now()}`}
                      controls
                      className="w-full h-full object-contain"
                      style={{ backgroundColor: 'black' }}
                    >
                      <source
                        src={(() => {
                          const videoUrl = formData.videoFilename || formData.videoUrlEn || formData.videoUrlFr;
                          if (!videoUrl) return '';
                          return videoUrl.startsWith('http')
                            ? `${videoUrl}?t=${Date.now()}&item=${selectedItem?.id}`
                            : `/api/video-proxy?filename=${videoUrl}&t=${Date.now()}&item=${selectedItem?.id}`;
                        })()}
                        type="video/mp4"
                      />
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-blue-200 dark:border-blue-600">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <PlayCircle className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">Pas de vidéo FR</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* English Row - Modified header when shared mode is enabled */}
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2 mb-4">
                <Image className="w-5 h-5" />
                {formData.useSameVideo ? (
                  <>
                    <span>Image Partagée</span>
                    <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">FR + EN</Badge>
                  </>
                ) : (
                  "English Image"
                )}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between min-h-[2.5rem]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">🇺🇸 English</span>
                  </div>
                  {!isCreateMode && selectedItem?.imageUrlEn && (
                    <div className="flex gap-1">
                      <Button
                        onClick={() => onCropClick('en')}
                        variant="outline"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white border-green-600 px-2 py-1 text-xs"
                      >
                        <Crop className="w-3 h-3 mr-1" />
                        Recadrer EN
                      </Button>
                      {selectedItem.static_imageUrlEn && (
                        <Button
                          onClick={() => onRestoreOriginal('en')}
                          variant="outline"
                          size="sm"
                          className="bg-gray-500 hover:bg-gray-600 text-white border-gray-500 px-2 py-1 text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Original
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden border border-green-200 dark:border-green-600 relative">
                  {(selectedItem || isCreateMode) && (pendingPreviews.imageUrlEn || selectedItem || formData.imageUrlEn) ? (
                    <>
                      <img
                        key={`en-${selectedItem?.id || 'new'}`}
                        src={(() => {
                          if (pendingPreviews.imageUrlEn) return pendingPreviews.imageUrlEn;
                          if (selectedItem) return getThumbnailUrl(selectedItem, 'en');
                          return formData.imageUrlEn;
                        })()}
                        alt="Aperçu English"
                        className="w-full h-full object-contain"
                      />
                      {(selectedItem?.static_imageUrlEn || selectedItem?.staticImageUrl) &&
                       ((selectedItem?.static_imageUrlEn && selectedItem.static_imageUrlEn !== selectedItem.imageUrlEn) ||
                        (selectedItem?.staticImageUrl && selectedItem.staticImageUrl !== selectedItem.imageUrlEn)) && (
                        <div className={`absolute top-2 right-2 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                          (selectedItem as any).cropSettings?.method === 'triple-layer-white-bg'
                            ? 'bg-emerald-500'
                            : 'bg-blue-500'
                        }`}>
                          {renderCropBadge(selectedItem!, 'en')}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <Image className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <p className="text-xs">No EN image</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <h4 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2 mb-4">
                <PlayCircle className="w-5 h-5" />
                {formData.useSameVideo ? (
                  <>
                    <span>Vidéo Partagée</span>
                    <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">FR + EN</Badge>
                  </>
                ) : (
                  "English Video"
                )}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between min-h-[2.5rem]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">🇺🇸 English</span>
                  </div>
                </div>
                {formData.videoUrlEn || (formData.useSameVideo && formData.videoFilename) ? (
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video w-full border border-green-200 dark:border-green-600">
                    <video
                      key={`en-video-${selectedItem?.id}-${Date.now()}`}
                      controls
                      className="w-full h-full object-contain"
                      style={{ backgroundColor: 'black' }}
                    >
                      <source
                        src={(() => {
                          const videoUrl = formData.videoFilename || formData.videoUrlEn || formData.videoUrlFr;
                          if (!videoUrl) return '';
                          return videoUrl.startsWith('http')
                            ? `${videoUrl}?t=${Date.now()}&item=${selectedItem?.id}`
                            : `/api/video-proxy?filename=${videoUrl}&t=${Date.now()}&item=${selectedItem?.id}`;
                        })()}
                        type="video/mp4"
                      />
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-green-200 dark:border-green-600">
                    <div className="text-center text-gray-500 dark:text-gray-400">
                      <PlayCircle className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">No EN video</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
