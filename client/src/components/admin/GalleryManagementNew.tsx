import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Save,
  Trash2,
  Monitor,
  Palette
} from "lucide-react";
import FormatBadgeManager from './FormatBadgeManager';

// Gallery sub-components
import {
  GalleryItem,
  GalleryFormData,
  PendingPreviews,
  ActiveCroppingState,
  persistentUploadState,
  DEFAULT_FORM_DATA
} from './gallery/types';
import GalleryPreviewCard from './gallery/GalleryPreviewCard';
import GalleryItemForm from './gallery/GalleryItemForm';
import GalleryMediaUpload from './gallery/GalleryMediaUpload';
import GalleryImageCropper from './gallery/GalleryImageCropper';

export default function GalleryManagementNew() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [selectedVideoId, setSelectedVideoId] = useState<string | number | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperLanguage, setCropperLanguage] = useState<'en' | 'fr'>('en');
  const [cropSaving, setCropSaving] = useState(false);
  const [showFormatBadgeManager, setShowFormatBadgeManager] = useState(false);
  const [activeCroppingState, setActiveCroppingState] = useState<ActiveCroppingState>(
    { isActive: false, language: 'en', hasChanges: false }
  );
  const [pendingPreviews, setPendingPreviews] = useState<PendingPreviews>({});
  const [formData, setFormData] = useState<GalleryFormData>(DEFAULT_FORM_DATA);

  // Gallery query
  const { data: galleryItems = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery'],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    select: (data) => data.sort((a, b) => a.orderIndex - b.orderIndex)
  });

  const selectedItem = galleryItems.find(item => item.id === selectedVideoId);

  // Update form data when selected item changes
  useEffect(() => {
    if (selectedItem && !isCreateMode) {
      setFormData({
        titleEn: selectedItem.titleEn || '',
        titleFr: selectedItem.titleFr || '',
        priceEn: selectedItem.priceEn || '',
        priceFr: selectedItem.priceFr || '',
        sourceEn: selectedItem.sourceEn || '',
        sourceFr: selectedItem.sourceFr || '',
        durationEn: selectedItem.durationEn || '',
        durationFr: selectedItem.durationFr || '',
        situationEn: selectedItem.situationEn || '',
        situationFr: selectedItem.situationFr || '',
        storyEn: selectedItem.storyEn || '',
        storyFr: selectedItem.storyFr || '',
        sorryMessageEn: selectedItem.sorryMessageEn || 'Sorry, we cannot show you the video at this stage',
        sorryMessageFr: selectedItem.sorryMessageFr || 'Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade',
        formatPlatformEn: selectedItem.formatPlatformEn || '',
        formatPlatformFr: selectedItem.formatPlatformFr || '',
        formatTypeEn: selectedItem.formatTypeEn || '',
        formatTypeFr: selectedItem.formatTypeFr || '',
        videoUrlEn: pendingPreviews.videoUrlEn || persistentUploadState.videoUrlEn || selectedItem.videoUrlEn || '',
        videoUrlFr: pendingPreviews.videoUrlFr || persistentUploadState.videoUrlFr || selectedItem.videoUrlFr || '',
        videoFilename: pendingPreviews.videoFilename || persistentUploadState.videoFilename || selectedItem.videoFilename || '',
        useSameVideo: selectedItem.useSameVideo !== undefined ? selectedItem.useSameVideo : true,
        videoWidth: selectedItem.videoWidth || 16,
        videoHeight: selectedItem.videoHeight || 9,
        videoOrientation: selectedItem.videoOrientation || 'landscape',
        imageUrlEn: pendingPreviews.imageUrlEn || persistentUploadState.imageUrlEn || selectedItem.imageUrlEn || '',
        imageUrlFr: pendingPreviews.imageUrlFr || persistentUploadState.imageUrlFr || selectedItem.imageUrlFr || '',
        staticImageUrl: selectedItem.staticImageUrl || '',
        static_imageUrlEn: selectedItem.static_imageUrlEn || null,
        static_imageUrlFr: selectedItem.static_imageUrlFr || null,
        cropSettings: selectedItem.cropSettings || null,
        isActive: selectedItem.isActive
      });
    } else if (isCreateMode) {
      setFormData({
        ...DEFAULT_FORM_DATA,
        videoUrlEn: persistentUploadState.videoUrlEn || '',
        videoUrlFr: persistentUploadState.videoUrlFr || '',
        videoFilename: persistentUploadState.videoFilename || '',
        imageUrlEn: persistentUploadState.imageUrlEn || '',
        imageUrlFr: persistentUploadState.imageUrlFr || '',
      });
    }
  }, [selectedItem?.id, isCreateMode]);

  // Auto-select first item when data loads
  useEffect(() => {
    if (galleryItems.length > 0 && !isCreateMode) {
      if (!selectedVideoId || !galleryItems.find(item => item.id === selectedVideoId)) {
        setSelectedVideoId(galleryItems[0].id);
      }
    } else if (galleryItems.length === 0 && !isCreateMode) {
      setSelectedVideoId(null);
    }
  }, [galleryItems.length, selectedVideoId, isCreateMode]);

  // Mutations
  const createItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gallery', 'POST', data),
    onSuccess: () => {
      toast({ title: "✅ Succès", description: "Élément de galerie créé avec succès" });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      persistentUploadState.reset();
      setIsCreateMode(false);
      setPendingPreviews({});
    },
    onError: (error: any) => {
      toast({ title: "❌ Erreur", description: "Erreur lors de la création de l'élément", variant: "destructive" });
      console.error('Create error:', error);
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: any }) =>
      apiRequest(`/api/gallery/${id}`, 'PATCH', data),
    onSuccess: () => {
      toast({ title: "✅ Succès", description: "Élément de galerie mis à jour avec succès" });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      queryClient.refetchQueries({ queryKey: ['/api/gallery'] });
      localStorage.setItem('gallery-updated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { timestamp: Date.now() } }));
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/gallery'] });
      }, 100);
      setPendingPreviews({});
      setForceRefreshKey(prev => prev + 1);
      persistentUploadState.reset();
    },
    onError: (error: any) => {
      toast({ title: "❌ Erreur", description: "Erreur lors de la mise à jour de l'élément", variant: "destructive" });
      console.error('Update error:', error);
    }
  });

  const swapItemsMutation = useMutation({
    mutationFn: async ({ id1, id2 }: { id1: string; id2: string }) => {
      return await apiRequest(`/api/gallery/${id1}/swap/${id2}`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['/api/gallery'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      toast({
        title: "✅ Succès",
        description: "Ordre mis à jour!",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec du réordonnancement", variant: "destructive" });
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string | number) => apiRequest(`/api/gallery/${id}`, 'DELETE'),
    onSuccess: (response: any) => {
      queryClient.removeQueries({ queryKey: ['/api/gallery'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setSelectedVideoId(null);
      setIsCreateMode(false);
      const message = response?.alreadyDeleted
        ? "L'élément était déjà supprimé ou n'existait pas"
        : "Élément de galerie supprimé avec succès";
      toast({
        title: "✅ Succès",
        description: message,
        className: "bg-emerald-50 border-emerald-200 text-emerald-900"
      });
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });
      }, 100);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data?.error || "Erreur inconnue lors de la suppression";
      toast({
        title: "❌ ERREUR DE SUPPRESSION",
        description: `Détails: ${errorMessage}`,
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-900 font-medium"
      });
    }
  });

  // Handlers
  const handleReorder = (item: GalleryItem, direction: 'up' | 'down') => {
    const sortedItems = [...galleryItems].sort((a, b) => a.orderIndex - b.orderIndex);
    const currentIndex = sortedItems.findIndex(i => i.id === item.id);

    if (direction === 'up' && currentIndex > 0) {
      const targetItem = sortedItems[currentIndex - 1];
      if (swapItemsMutation.isPending) return;
      swapItemsMutation.mutate({ id1: String(item.id), id2: String(targetItem.id) });
    } else if (direction === 'down' && currentIndex < sortedItems.length - 1) {
      const targetItem = sortedItems[currentIndex + 1];
      if (swapItemsMutation.isPending) return;
      swapItemsMutation.mutate({ id1: String(item.id), id2: String(targetItem.id) });
    }
  };

  const handleSave = () => {
    if (isCreateMode) {
      createItemMutation.mutate(formData);
    } else if (selectedVideoId) {
      updateItemMutation.mutate({ id: selectedVideoId, data: formData });
    }
  };

  const handleDelete = () => {
    if (selectedVideoId && !isCreateMode) {
      if (confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
        deleteItemMutation.mutate(selectedVideoId);
      }
    }
  };

  const handleCreateNew = () => {
    setIsCreateMode(true);
    setSelectedVideoId(null);
    persistentUploadState.reset();
  };

  const handleCancelCreate = () => {
    setIsCreateMode(false);
    if (galleryItems.length > 0) {
      setSelectedVideoId(galleryItems[0].id);
    }
    persistentUploadState.reset();
  };

  const handleSameVideoToggle = (checked: boolean) => {
    setFormData({
      ...formData,
      useSameVideo: checked,
      videoUrlFr: checked ? formData.videoUrlEn : formData.videoUrlFr
    });
  };

  // Callbacks for sub-components
  const handleActiveToggle = (checked: boolean) => {
    setFormData({ ...formData, isActive: checked });
    if (selectedVideoId && !isCreateMode) {
      updateItemMutation.mutate({ id: selectedVideoId, data: { isActive: checked } });
    }
  };

  const handleCropClick = (language: 'en' | 'fr') => {
    setCropperLanguage(language);
    setCropperOpen(true);
  };

  const handleRestoreOriginal = async (language: 'en' | 'fr') => {
    if (!selectedItem) return;
    try {
      const updateData = language === 'fr'
        ? { static_imageUrlFr: null, cropSettings: null, language: 'fr' }
        : { static_imageUrlEn: null, cropSettings: null, language: 'en' };
      await apiRequest(`/api/gallery/${selectedItem.id}`, 'PATCH', updateData);
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      toast({
        title: "✅ Succès",
        description: language === 'fr' ? "Image française restaurée à l'original" : "English image restored to original"
      });
    } catch (error) {
      console.error(`Error restoring ${language} image:`, error);
      toast({
        title: "❌ Erreur",
        description: language === 'fr' ? "Impossible de restaurer l'image française" : "Unable to restore English image",
        variant: "destructive"
      });
    }
  };

  const handleCropperClose = () => {
    setCropperOpen(false);
    setActiveCroppingState({ isActive: false, language: 'en', hasChanges: false });
  };

  if (isLoading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div
      className="p-6 max-w-7xl mx-auto admin-container"
      style={{
        scrollBehavior: 'auto',
        overflowAnchor: 'none'
      }}
    >
      {/* Top Left: NEW Button */}
      <div className="mb-6">
        {!isCreateMode ? (
          <Button
            onClick={handleCreateNew}
            size="lg"
            className="bg-gradient-to-r from-[#89BAD9] to-[#2A4759] hover:from-[#7AA8CC] hover:to-[#1e3340] text-white border-none shadow-lg font-bold text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-3 sm:py-4"
          >
            <Plus className="w-6 h-6 mr-2" />
            NOUVELLE VIDEO
          </Button>
        ) : (
          <Button
            onClick={handleCancelCreate}
            variant="outline"
            size="lg"
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-4"
          >
            Annuler
          </Button>
        )}
      </div>

      {/* Video Selector Section */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="w-full">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Sélectionner une vidéo de galerie
          </Label>
          {!isCreateMode ? (
            <Select
              value={selectedVideoId?.toString() || ''}
              onValueChange={(value) => setSelectedVideoId(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir une vidéo..." />
              </SelectTrigger>
              <SelectContent>
                {galleryItems.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    <span>{item.titleEn} - {item.titleFr}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="p-3 bg-[#F2EBDC] dark:bg-[#011526]/20 rounded border-2 border-dashed border-[#89BAD9]">
              <span className="text-[#2A4759] font-medium">Mode création - Nouvelle vidéo</span>
            </div>
          )}

          {/* Change Display Order Section */}
          {!isCreateMode && selectedItem && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-3 flex items-center gap-2">
                <div className="w-5 h-5 flex items-center justify-center">↕️</div>
                Change Display Order
              </h3>
              <div className="flex gap-2">
                {(() => {
                  const sortedItems = [...galleryItems].sort((a, b) => a.orderIndex - b.orderIndex);
                  const currentIndex = sortedItems.findIndex(item => item.id === selectedItem.id);
                  const isFirst = currentIndex === 0;
                  const isLast = currentIndex === sortedItems.length - 1;
                  return (
                    <>
                      <button
                        onClick={() => handleReorder(selectedItem, 'up')}
                        disabled={swapItemsMutation.isPending || isFirst}
                        className="flex items-center gap-2 px-2 sm:px-3 lg:px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
                      >
                        <div className="w-4 h-4 flex items-center justify-center">↑</div>
                        <span className="whitespace-nowrap">Move Earlier</span>
                      </button>
                      <button
                        onClick={() => handleReorder(selectedItem, 'down')}
                        disabled={swapItemsMutation.isPending || isLast}
                        className="flex items-center gap-2 px-2 sm:px-3 lg:px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
                      >
                        <div className="w-4 h-4 flex items-center justify-center">↓</div>
                        <span className="whitespace-nowrap">Move Later</span>
                      </button>
                    </>
                  );
                })()}
              </div>
              {(() => {
                const sortedItems = [...galleryItems].sort((a, b) => a.orderIndex - b.orderIndex);
                const currentIndex = sortedItems.findIndex(item => item.id === selectedItem.id);
                return (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Current position: {currentIndex + 1} of {galleryItems.length}
                  </p>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Main Form */}
      {(selectedItem || isCreateMode) && (
        <div className="space-y-8">
          <GalleryPreviewCard
            formData={formData}
            selectedItem={selectedItem}
            isCreateMode={isCreateMode}
            pendingPreviews={pendingPreviews}
            forceRefreshKey={forceRefreshKey}
            activeCroppingState={activeCroppingState}
            onActiveToggle={handleActiveToggle}
            onCropClick={handleCropClick}
            onRestoreOriginal={handleRestoreOriginal}
            updateIsPending={updateItemMutation.isPending}
          />

          <GalleryItemForm
            formData={formData}
            setFormData={setFormData}
          />

          <GalleryMediaUpload
            formData={formData}
            setFormData={setFormData}
            pendingPreviews={pendingPreviews}
            setPendingPreviews={setPendingPreviews}
            setForceRefreshKey={setForceRefreshKey}
            onSameVideoToggle={handleSameVideoToggle}
          />

          {/* Format Badge Section */}
          <Card className="border-[#89BAD9] dark:border-[#2A4759]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Badge Format (marketing visuel)
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    English <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ml-2">Toujours séparé</Badge>
                  </h4>
                  <div>
                    <Label htmlFor="formatPlatformEn">Line 1</Label>
                    <Select value={formData.formatPlatformEn} onValueChange={(value) => setFormData({ ...formData, formatPlatformEn: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select platform category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Recommended Format">Recommended Format</SelectItem>
                        <SelectItem value="Custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="formatTypeEn">Format Line 2</Label>
                    <Select value={formData.formatTypeEn} onValueChange={(value) => setFormData({ ...formData, formatTypeEn: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Select format type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mobile Stories">Mobile Stories</SelectItem>
                        <SelectItem value="Instagram Posts">Instagram Posts</SelectItem>
                        <SelectItem value="TV & Desktop">TV & Desktop</SelectItem>
                        <SelectItem value="Short Videos">Short Videos</SelectItem>
                        <SelectItem value="Custom">Custom...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    Français <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ml-2">Toujours séparé</Badge>
                  </h4>
                  <div>
                    <Label htmlFor="formatPlatformFr">Line 1</Label>
                    <Select value={formData.formatPlatformFr} onValueChange={(value) => setFormData({ ...formData, formatPlatformFr: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Sélectionner catégorie plateforme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Format Recommandé">Format Recommandé</SelectItem>
                        <SelectItem value="Personnalisé">Personnalisé...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="formatTypeFr">Format Line 2</Label>
                    <Select value={formData.formatTypeFr} onValueChange={(value) => setFormData({ ...formData, formatTypeFr: value })}>
                      <SelectTrigger className="bg-white dark:bg-gray-800">
                        <SelectValue placeholder="Sélectionner type de format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stories Mobiles">Stories Mobiles</SelectItem>
                        <SelectItem value="Posts Instagram">Posts Instagram</SelectItem>
                        <SelectItem value="TV & Bureau">TV & Bureau</SelectItem>
                        <SelectItem value="Vidéos Courtes">Vidéos Courtes</SelectItem>
                        <SelectItem value="Personnalisé">Personnalisé...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save/Delete/Cancel Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
                className="bg-[#2A4759] hover:bg-[#2A4759]/90 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isCreateMode ? 'Créer' : 'Sauvegarder'}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  persistentUploadState.reset();
                  setSelectedVideoId(null);
                  setIsCreateMode(false);
                }}
                className="border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Annuler
              </Button>

              {!isCreateMode && selectedVideoId && (
                <Button
                  onClick={handleDelete}
                  disabled={deleteItemMutation.isPending}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
              )}
            </div>

            <Badge variant={formData.isActive ? "default" : "secondary"}>
              {formData.isActive ? "✅ Actif" : "⚠️ Inactif"}
            </Badge>
          </div>
        </div>
      )}

      {/* Image Cropper */}
      {selectedItem && cropperOpen && (
        <GalleryImageCropper
          selectedItem={selectedItem}
          formData={formData}
          cropperLanguage={cropperLanguage}
          cropSaving={cropSaving}
          setCropSaving={setCropSaving}
          setForceRefreshKey={setForceRefreshKey}
          onClose={handleCropperClose}
        />
      )}

      {/* Format Badge Manager Section */}
      <Card className="mt-6 border-[#89BAD9] dark:border-[#2A4759]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#D67C4A]" />
              <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC]">
                Format Badge Templates
              </h3>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFormatBadgeManager(!showFormatBadgeManager)}
              className="border-[#89BAD9] hover:bg-[#F2EBDC] dark:hover:bg-[#011526]/20"
            >
              {showFormatBadgeManager ? 'Masquer' : 'Gérer Templates'}
            </Button>
          </div>

          {showFormatBadgeManager && (
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <FormatBadgeManager />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
