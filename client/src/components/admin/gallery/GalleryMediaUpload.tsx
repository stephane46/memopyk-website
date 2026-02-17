import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Image, Upload, Eye, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DirectUpload from '../DirectUpload';
import type { GalleryFormData, PendingPreviews } from './types';
import { getFullUrl, persistentUploadState } from './types';

interface GalleryMediaUploadProps {
  formData: GalleryFormData;
  setFormData: React.Dispatch<React.SetStateAction<GalleryFormData>>;
  pendingPreviews: PendingPreviews;
  setPendingPreviews: React.Dispatch<React.SetStateAction<PendingPreviews>>;
  setForceRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  onSameVideoToggle: (checked: boolean) => void;
}

export default function GalleryMediaUpload({
  formData, setFormData, pendingPreviews, setPendingPreviews,
  setForceRefreshKey, onSameVideoToggle
}: GalleryMediaUploadProps) {
  const { toast } = useToast();

  return (
    <Card className="border-[#89BAD9] dark:border-[#2A4759]">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
          <Video className="w-5 h-5" />
          Gestion des médias
        </h3>

        <div className="space-y-6">
          {/* Bilingual Media Selection Switch */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-3">
              <Switch
                checked={formData.useSameVideo}
                onCheckedChange={onSameVideoToggle}
              />
              <Label className="text-blue-900 dark:text-blue-100 font-medium cursor-pointer">
                Utiliser la même vidéo et la même photo pour FR et EN
              </Label>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              {formData.useSameVideo
                ? "✅ La même vidéo et la même photo sera utilisée pour les deux langues"
                : "⚠️ Vous pouvez maintenant spécifier des vidéos et photos différentes pour FR et EN"}
            </p>
          </div>

          {formData.useSameVideo ? (
            /* Shared Upload Section (Purple) */
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-purple-600 rounded-full p-1">
                  <Upload className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                  🌐 Fichiers Partagés (FR + EN)
                </h4>
              </div>
              <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
                Téléchargez les fichiers qui seront utilisés pour les deux langues.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-purple-900 dark:text-purple-100 mb-2 block">
                    <Video className="h-4 w-4 inline mr-1" />
                    Vidéo Partagée
                  </Label>
                  <DirectUpload
                    type="video"
                    acceptedTypes="video/*"
                    uploadId="shared-video-upload-v87"
                    onUploadComplete={(result) => {
                      setPendingPreviews(prev => ({
                        ...prev,
                        videoUrlEn: result.url,
                        videoUrlFr: result.url,
                        videoFilename: result.url
                      }));
                      setFormData({
                        ...formData,
                        videoFilename: result.url,
                        videoUrlEn: result.url,
                        videoUrlFr: result.url
                      });
                      persistentUploadState.videoFilename = result.url;
                      persistentUploadState.videoUrlEn = result.url;
                      persistentUploadState.videoUrlFr = result.url;
                      toast({
                        title: "✅ Preview mise à jour",
                        description: `Vidéo visible immédiatement: ${result.filename}`,
                        className: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                      });
                    }}
                    currentFilename={formData.videoFilename || formData.videoUrlEn}
                  />
                </div>
                <div>
                  <Label className="text-purple-900 dark:text-purple-100 mb-2 block">
                    <Image className="h-4 w-4 inline mr-1" />
                    Image Partagée
                  </Label>
                  <DirectUpload
                    type="image"
                    acceptedTypes="image/*"
                    uploadId="shared-image-upload-v87"
                    onUploadComplete={(result) => {
                      const updatedFormData = {
                        ...formData,
                        imageUrlEn: result.url,
                        imageUrlFr: result.url
                      } as GalleryFormData;

                      if (result.staticImageUrl) {
                        updatedFormData.staticImageUrl = result.staticImageUrl;
                        updatedFormData.static_imageUrlEn = result.staticImageUrl;
                        updatedFormData.static_imageUrlFr = result.staticImageUrl;
                        if (result.autoCropSettings) {
                          updatedFormData.cropSettings = result.autoCropSettings;
                        }
                      }

                      setPendingPreviews(prev => ({
                        ...prev,
                        imageUrlEn: result.url,
                        imageUrlFr: result.url,
                        staticImageUrl: result.staticImageUrl || prev.staticImageUrl,
                        static_imageUrlEn: result.staticImageUrl || prev.static_imageUrlEn,
                        static_imageUrlFr: result.staticImageUrl || prev.static_imageUrlFr
                      }));

                      setFormData(updatedFormData);
                      persistentUploadState.imageUrlEn = result.url;
                      persistentUploadState.imageUrlFr = result.url;
                      if (result.staticImageUrl) {
                        persistentUploadState.staticImageUrl = result.staticImageUrl;
                      }

                      setForceRefreshKey(prev => prev + 1);

                      const badgeInfo = result.autoCropSettings ?
                        (result.autoCropSettings.cropped ? " (Auto-crop applied)" : " (No crop needed)") : "";

                      toast({
                        title: "📸 Aperçu instantané",
                        description: `Image visible immédiatement: ${result.filename}${badgeInfo}`,
                        className: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                      });
                    }}
                    currentFilename={formData.imageUrlEn}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Language-Specific Upload Sections - French (Blue) and English (Green) */
            <div className="space-y-4">
              <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC] mb-3">
                Vidéos séparées par langue
              </h4>

              {/* French Upload Section (Blue) */}
              {!formData.useSameVideo && (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-blue-600 rounded-full p-1">
                    <Upload className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    🇫🇷 Fichiers Français
                  </h4>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                  Téléchargez les fichiers spécifiques à la version française.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-blue-900 dark:text-blue-100 mb-2 block">
                      <Video className="h-4 w-4 inline mr-1" />
                      Vidéo Française
                    </Label>
                    <DirectUpload
                      type="video"
                      onUploadComplete={(result) => {
                        setPendingPreviews(prev => ({
                          ...prev,
                          videoUrlFr: result.url
                        }));
                        setFormData(prev => ({
                          ...prev,
                          videoUrlFr: result.url,
                          videoFilename: result.url
                        }));
                        persistentUploadState.videoUrlFr = result.url;
                        persistentUploadState.videoFilename_fr = result.url;
                        toast({
                          title: "📹 Aperçu instantané",
                          description: `Vidéo française visible immédiatement: ${result.filename}`,
                          className: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                        });
                      }}
                      currentFilename={formData.videoUrlFr}
                    />
                  </div>
                  <div>
                    <Label className="text-blue-900 dark:text-blue-100 mb-2 block">
                      <Image className="h-4 w-4 inline mr-1" />
                      Image Française
                    </Label>
                    <DirectUpload
                      type="image"
                      acceptedTypes="image/*"
                      uploadId="french-image-upload-v87"
                      onUploadComplete={(result) => {
                        setPendingPreviews(prev => ({
                          ...prev,
                          imageUrlFr: result.url
                        }));
                        setFormData(prev => ({
                          ...prev,
                          imageUrlFr: result.url
                        }));
                        persistentUploadState.imageUrlFr = result.url;
                        setForceRefreshKey(prev => prev + 1);
                        toast({
                          title: "📸 Aperçu instantané FR",
                          description: `Image française visible immédiatement: ${result.filename}`,
                          className: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                        });
                      }}
                      currentFilename={formData.imageUrlFr}
                    />
                  </div>
                </div>
              </div>
              )}

              {/* English Upload Section (Green) */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-green-600 rounded-full p-1">
                    <Upload className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    {formData.useSameVideo ? (
                      <>
                        🌐 Fichiers Partagés <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">FR + EN</Badge>
                      </>
                    ) : (
                      "🇺🇸 English Files"
                    )}
                  </h4>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                  {formData.useSameVideo ? (
                    "Téléchargez les fichiers qui seront utilisés pour les deux langues (Français et English)."
                  ) : (
                    "Upload files specific to the English version."
                  )}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-900 dark:text-green-100 mb-2 block">
                      <Video className="h-4 w-4 inline mr-1" />
                      {formData.useSameVideo ? "Vidéo (Partagée FR+EN)" : "English Video"}
                    </Label>
                    <DirectUpload
                      type="video"
                      onUploadComplete={(result) => {
                        setPendingPreviews(prev => ({
                          ...prev,
                          videoUrlEn: result.url
                        }));
                        setFormData(prev => ({
                          ...prev,
                          videoUrlEn: result.url,
                          videoFilename: result.url
                        }));
                        persistentUploadState.videoUrlEn = result.url;
                        persistentUploadState.videoFilename_en = result.url;
                        toast({
                          title: "📹 Instant Preview",
                          description: `English video visible immediately: ${result.filename}`,
                          className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        });
                      }}
                      currentFilename={formData.videoUrlEn}
                    />
                  </div>
                  <div>
                    <Label className="text-green-900 dark:text-green-100 mb-2 block">
                      <Image className="h-4 w-4 inline mr-1" />
                      {formData.useSameVideo ? "Image (Partagée FR+EN)" : "English Image"}
                    </Label>
                    <DirectUpload
                      type="image"
                      acceptedTypes="image/*"
                      uploadId="english-image-upload-v87"
                      onUploadComplete={(result) => {
                        setPendingPreviews(prev => ({
                          ...prev,
                          imageUrlEn: result.url
                        }));

                        if (result.autoCropSettings && result.staticImageUrl) {
                          setFormData(prev => ({
                            ...prev,
                            imageUrlEn: result.url,
                            static_imageUrlEn: result.staticImageUrl || null,
                            static_imageUrlFr: formData.useSameVideo ? result.staticImageUrl || null : prev.static_imageUrlFr,
                            cropSettings: result.autoCropSettings
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            imageUrlEn: result.url,
                            static_imageUrlEn: null,
                            static_imageUrlFr: formData.useSameVideo ? null : prev.static_imageUrlFr,
                            cropSettings: null
                          }));
                        }

                        persistentUploadState.imageUrlEn = result.url;
                        setForceRefreshKey(prev => prev + 1);
                        toast({
                          title: "📸 Instant Preview EN",
                          description: `English image visible immediately: ${result.filename}`,
                          className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        });
                      }}
                      currentFilename={formData.imageUrlEn}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Content Display */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
            <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC] mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Contenu Actuel {formData.useSameVideo ? "(Partagé FR/EN)" : "(Séparé par langue)"}
            </h4>

            {formData.useSameVideo ? (
              <div className="space-y-3">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      🌐 Contenu Partagé (Français + English)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <Label className="text-purple-800 dark:text-purple-200">URL Vidéo Complète:</Label>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded border text-purple-900 dark:text-purple-100 font-mono break-all">
                        {getFullUrl(formData.videoFilename || formData.videoUrlEn) || "Aucune vidéo"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-purple-800 dark:text-purple-200">URL Image Complète:</Label>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded border text-purple-900 dark:text-purple-100 font-mono break-all">
                        {getFullUrl(formData.imageUrlEn) || "Aucune image"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      🇫🇷 Version Française
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <Label className="text-blue-800 dark:text-blue-200">URL Vidéo Complète FR:</Label>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded border text-blue-900 dark:text-blue-100 font-mono break-all">
                        {getFullUrl(formData.videoUrlFr) || "Aucune vidéo FR"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-blue-800 dark:text-blue-200">URL Image Complète FR:</Label>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded border text-blue-900 dark:text-blue-100 font-mono break-all">
                        {getFullUrl(formData.imageUrlFr) || "Aucune image FR"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">
                      🇺🇸 English Version
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <Label className="text-green-800 dark:text-green-200">Complete URL Video EN:</Label>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded border text-green-900 dark:text-green-100 font-mono break-all">
                        {getFullUrl(formData.videoUrlEn) || "No English video"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-green-800 dark:text-green-200">Complete URL Image EN:</Label>
                      <div className="bg-white dark:bg-gray-800 p-2 rounded border text-green-900 dark:text-green-100 font-mono break-all">
                        {getFullUrl(formData.imageUrlEn) || "No English image"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual URL Override */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="mb-4">
              <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC] mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Modification Manuelle des URLs
                <Badge variant="secondary" className="text-xs">Manuel</Badge>
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {formData.useSameVideo
                  ? "Section avancée pour modifier directement les URLs Supabase partagées entre FR et EN."
                  : "Section avancée pour modifier directement les URLs Supabase spécifiques à chaque langue."
                }
              </p>
            </div>

            {formData.useSameVideo ? (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="video_url_override" className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    URL Vidéo Complète
                    <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">FR + EN</Badge>
                  </Label>
                  <Input
                    id="video_url_override"
                    value={getFullUrl(formData.videoUrlEn || formData.videoFilename)}
                    onChange={(e) => setFormData({
                      ...formData,
                      videoFilename: e.target.value,
                      videoUrlEn: e.target.value,
                      videoUrlFr: e.target.value
                    })}
                    placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                    className="bg-white dark:bg-gray-800 text-sm font-mono"
                  />
                  <p className="text-xs text-gray-500">URL partagée pour les deux langues</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url_override" className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    URL Image Complète
                    <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">FR + EN</Badge>
                  </Label>
                  <Input
                    id="image_url_override"
                    value={getFullUrl(formData.imageUrlEn)}
                    onChange={(e) => setFormData({
                      ...formData,
                      imageUrlEn: e.target.value,
                      imageUrlFr: e.target.value
                    })}
                    placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                    className="bg-white dark:bg-gray-800 text-sm font-mono"
                  />
                  <p className="text-xs text-gray-500">URL partagée pour les deux langues</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* French URLs */}
                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🇫🇷</span>
                    <h5 className="font-medium text-blue-800 dark:text-blue-200">URLs Français</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                        <Video className="w-4 h-4" />
                        URL Vidéo FR
                      </Label>
                      <Input
                        value={getFullUrl(formData.videoUrlFr)}
                        onChange={(e) => setFormData({ ...formData, videoUrlFr: e.target.value })}
                        placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                        className="bg-white dark:bg-gray-800 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                        <Image className="w-4 h-4" />
                        URL Image FR
                      </Label>
                      <Input
                        value={getFullUrl(formData.imageUrlFr)}
                        onChange={(e) => setFormData({ ...formData, imageUrlFr: e.target.value })}
                        placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                        className="bg-white dark:bg-gray-800 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* English URLs */}
                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🇺🇸</span>
                    <h5 className="font-medium text-green-800 dark:text-green-200">URLs English</h5>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <Video className="w-4 h-4" />
                        URL Vidéo EN
                      </Label>
                      <Input
                        value={getFullUrl(formData.videoUrlEn)}
                        onChange={(e) => setFormData({ ...formData, videoUrlEn: e.target.value })}
                        placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                        className="bg-white dark:bg-gray-800 text-sm font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <Image className="w-4 h-4" />
                        URL Image EN
                      </Label>
                      <Input
                        value={getFullUrl(formData.imageUrlEn)}
                        onChange={(e) => setFormData({ ...formData, imageUrlEn: e.target.value })}
                        placeholder="https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/..."
                        className="bg-white dark:bg-gray-800 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Video Dimensions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="videoWidth">Largeur vidéo</Label>
              <Input
                id="videoWidth"
                type="number"
                value={formData.videoWidth}
                onChange={(e) => setFormData({ ...formData, videoWidth: parseInt(e.target.value) || 16 })}
                className="bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <Label htmlFor="videoHeight">Hauteur vidéo</Label>
              <Input
                id="videoHeight"
                type="number"
                value={formData.videoHeight}
                onChange={(e) => setFormData({ ...formData, videoHeight: parseInt(e.target.value) || 9 })}
                className="bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <Label htmlFor="videoOrientation">Orientation</Label>
              <Select value={formData.videoOrientation} onValueChange={(value) => setFormData({ ...formData, videoOrientation: value })}>
                <SelectTrigger className="bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Paysage</SelectItem>
                  <SelectItem value="portrait">Portrait</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Élément actif</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
