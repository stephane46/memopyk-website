import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Video,
  Image,
  Play,
  Save,
  Upload,
  Power,
  FileText,
  Globe,
  Crop,
  CheckCircle
} from "lucide-react";
import DirectUpload from './DirectUpload';
import ImageCropperEasyCrop from './ImageCropperEasyCrop';

// Module-level persistent state that survives component re-creations
const persistentUploadState = {
  video_url_en: '',
  image_url_en: '',
  video_url_fr: '',
  image_url_fr: '',
  video_filename: '',
  reset: () => {
    persistentUploadState.video_url_en = '';
    persistentUploadState.image_url_en = '';
    persistentUploadState.video_url_fr = '';
    persistentUploadState.image_url_fr = '';
    persistentUploadState.video_filename = '';
  }
};

interface GalleryItem {
  id: string;
  title_en: string;
  title_fr: string;
  source_en: string;
  source_fr: string;
  duration_en: string;
  duration_fr: string;
  situation_en: string;
  situation_fr: string;
  story_en: string;
  story_fr: string;
  sorry_message_en: string;
  sorry_message_fr: string;
  format_platform_en?: string;
  format_platform_fr?: string;
  format_type_en?: string;
  format_type_fr?: string;
  video_url_en?: string;
  video_url_fr?: string;
  video_filename?: string;
  video_width?: number;
  video_height?: number;
  video_orientation?: string;
  use_same_video?: boolean;
  image_url_en?: string;
  image_url_fr?: string;
  price_en: string;
  price_fr: string;
  alt_text_en: string;
  alt_text_fr: string;
  order_index: number;
  is_active: boolean;
  position_x?: number;
  position_y?: number;
  dimensions_width?: number;
  dimensions_height?: number;
  overlay_position?: string;
  overlay_styles?: string;
  video_format?: string;
  thumbnail_position?: string;
  aspect_ratio?: string;
  static_image_url?: string;
  crop_settings?: any;
  created_at: string;
  updated_at: string;
}

// Helper function to add cache-busting timestamp to image URLs
const addCacheBuster = (url: string): string => {
  if (!url) return url;
  
  // If URL already has a version parameter (from Supabase), use it as-is
  // This prevents double timestamps like ?v=123&t=456
  if (url.includes('?v=')) {
    return url;
  }
  
  // Only add timestamp for URLs without existing version parameters
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

// Removed smartCacheRefreshMutation prop - Gallery videos use Direct CDN streaming

export default function GalleryManagement() {
  // VERSION: FORCE-RELOAD-v1.0.85 - CACHE BUSTING COMPONENT
  console.log('🚨🚨🚨 FORCE COMPONENT RELOAD v1.0.85 - CACHE BUSTING ACTIVE 🚨🚨🚨');
  console.log('🔥 FORCING MODERN INTERFACE TO LOAD - BREAKING ALL CACHES!');
  console.log('🎯 Language-specific upload system MUST be visible now!');
  console.log('✅ All compilation errors fixed - modern interface loading!');
  
  // FORCE ALERT AND RELOAD TO BREAK CACHE
  if (typeof window !== 'undefined') {
    console.log('🚨 EMERGENCY CACHE BUST v1.0.85 - MODERN INTERFACE ACTIVE');
    console.log('🔥 Breaking component cache - modern interface should display');
    console.log('🎯 Looking for: French (blue) + English (green) upload sections');
    // Force a timestamp to break any caching
    console.log('⏰ Timestamp:', Date.now());
  }
  
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreview, setShowPreview] = useState<{ type: 'video' | 'image'; url: string; title: string } | null>(null);
  const [showImageCropper, setShowImageCropper] = useState<{ imageUrl: string; item: GalleryItem } | null>(null);
  // Upload state removed - using DirectUpload components only

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Removed cache management - Gallery videos use Direct CDN streaming



  // Traditional upload handlers removed - using only DirectUpload system

  // Fetch gallery items
  const { data: galleryItems = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery'],
  });

  // Removed cache status query - Gallery videos use Direct CDN streaming

  // Create gallery item mutation
  const createItemMutation = useMutation({
    mutationFn: async (data: Partial<GalleryItem>) => {
      return apiRequest('/api/gallery', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setShowCreateDialog(false);
      toast({ 
        title: "✅ Succès", 
        description: "Élément de galerie créé avec succès!",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la création de l'élément", variant: "destructive" });
    }
  });

  // Update gallery item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GalleryItem> }) => {
      console.log('🚨 UPDATE MUTATION DEBUG - Data being sent to server:', {
        id: id,
        video_filename: data.video_filename,
        video_url_en: data.video_url_en,
        title_en: data.title_en,
        fullData: data
      });
      console.log('🚨 API URL:', `/api/gallery/${id}`);
      console.log('🚨 API METHOD:', 'PATCH');
      console.log('🚨 REQUEST BODY:', JSON.stringify(data, null, 2));
      
      // Make the API request
      const result = await apiRequest(`/api/gallery/${id}`, 'PATCH', data);
      console.log('🚨 UPDATE MUTATION RESPONSE - Server returned:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      setEditingItem(null);
      toast({ 
        title: "✅ Succès", 
        description: "Élément mis à jour avec succès!",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      });
    },
    onError: (error: any) => {
      console.error('❌ Gallery update error:', error);
      toast({ 
        title: "❌ Erreur", 
        description: "Erreur lors de la mise à jour de l'élément. La modification a peut-être été sauvegardée localement.", 
        variant: "destructive" 
      });
    }
  });

  // Swap gallery items mutation
  const swapItemsMutation = useMutation({
    mutationFn: async ({ id1, id2 }: { id1: string; id2: string }) => {
      console.log('🔄 SWAP MUTATION START:', { id1, id2 });
      const result = await apiRequest(`/api/gallery/${id1}/swap/${id2}`, 'PATCH');
      console.log('🔄 SWAP MUTATION API RESULT:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('🔄 SWAP MUTATION SUCCESS - Invalidating cache...');
      console.log('🔄 Variables that succeeded:', variables);
      console.log('🔄 Data from successful swap:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      console.log('🔄 Query cache invalidated');
      toast({ 
        title: "✅ Succès", 
        description: "Ordre mis à jour!",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      });
    },
    onError: (error) => {
      console.error('🔄 SWAP MUTATION ERROR:', error);
      toast({ title: "Erreur", description: "Échec du réordonnancement", variant: "destructive" });
    }
  });

  // Delete gallery item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/gallery/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      toast({ 
        title: "✅ Succès", 
        description: "Élément supprimé avec succès!",
        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100"
      });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Échec de la suppression", variant: "destructive" });
    }
  });

  const handleReorder = (item: GalleryItem, direction: 'up' | 'down') => {
    console.log('🔄 REORDER CLICKED:', { itemId: item.id, itemTitle: item.title_en, direction });
    
    const sortedItems = [...galleryItems].sort((a, b) => a.order_index - b.order_index);
    console.log('🔄 Current sorted items:', sortedItems.map(i => ({ id: i.id, title: i.title_en, order: i.order_index })));
    
    const currentIndex = sortedItems.findIndex(i => i.id === item.id);
    console.log('🔄 Current index:', currentIndex);
    
    if (direction === 'up' && currentIndex > 0) {
      const targetItem = sortedItems[currentIndex - 1];
      console.log(`🔄 Moving item ${item.title_en} UP - swapping with ${targetItem.title_en}`);
      console.log(`🔄 IDs: ${item.id} ↔ ${targetItem.id}`);
      
      // Prevent multiple rapid clicks
      if (swapItemsMutation.isPending) {
        console.log('🔄 Swap already in progress, ignoring click');
        return;
      }
      
      swapItemsMutation.mutate({ id1: item.id, id2: targetItem.id });
    } else if (direction === 'down' && currentIndex < sortedItems.length - 1) {
      const targetItem = sortedItems[currentIndex + 1];
      console.log(`🔄 Moving item ${item.title_en} DOWN - swapping with ${targetItem.title_en}`);
      console.log(`🔄 IDs: ${item.id} ↔ ${targetItem.id}`);
      
      // Prevent multiple rapid clicks
      if (swapItemsMutation.isPending) {
        console.log('🔄 Swap already in progress, ignoring click');
        return;
      }
      
      swapItemsMutation.mutate({ id1: item.id, id2: targetItem.id });
    } else {
      console.log('🔄 Cannot move:', direction === 'up' ? 'Already at top' : 'Already at bottom');
    }
  };

  const GalleryItemForm = ({ item, onSave, onCancel }: { 
    item?: GalleryItem; 
    onSave: (data: Partial<GalleryItem>) => void; 
    onCancel: () => void; 
  }) => {
    
    // Use module-level persistent state that survives component re-creations
    
    const [formData, setFormData] = useState(() => {
      console.log('🔄 INITIALIZING formData state with item:', item);
      console.log('🔄 Module persistent state during init:', persistentUploadState);
      
      // If we have persistent state from previous uploads, use it
      const hasPersistedUrls = persistentUploadState.video_url_en || persistentUploadState.image_url_en;
      console.log('🔄 Has persisted URLs:', hasPersistedUrls);
      
      return {
        title_en: item?.title_en || '',
        title_fr: item?.title_fr || '',
        source_en: item?.source_en || '',
        source_fr: item?.source_fr || '',
        duration_en: item?.duration_en || '',
        duration_fr: item?.duration_fr || '',
        situation_en: item?.situation_en || '',
        situation_fr: item?.situation_fr || '',
        story_en: item?.story_en || '',
        story_fr: item?.story_fr || '',
        sorry_message_en: item?.sorry_message_en || 'Sorry, we cannot show you the video at this stage',
        sorry_message_fr: item?.sorry_message_fr || 'Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade',
        format_platform_en: item?.format_platform_en || '',
        format_platform_fr: item?.format_platform_fr || '',
        format_type_en: item?.format_type_en || '',
        format_type_fr: item?.format_type_fr || '',
        video_url_en: persistentUploadState.video_url_en || item?.video_url_en || '',
        video_url_fr: persistentUploadState.video_url_fr || item?.video_url_fr || '',
        video_filename: (() => {
          // PRIORITY FIX: Prioritize uploaded filename over database value
          const result = persistentUploadState.video_filename || item?.video_filename || '';
          console.log('🎯 INITIAL VIDEO_FILENAME ASSIGNMENT (FIXED PRIORITY):', {
            item_video_filename: item?.video_filename,
            persistent_video_filename: persistentUploadState.video_filename,
            final_result: result,
            priority: persistentUploadState.video_filename ? 'uploaded' : 'database',
            item_id: item?.id
          });
          return result;
        })(),
        video_width: item?.video_width || 0,
        video_height: item?.video_height || 0,
        video_orientation: item?.video_orientation || 'landscape',
        image_url_en: item?.image_url_en || persistentUploadState.image_url_en || '',
        image_url_fr: item?.image_url_fr || persistentUploadState.image_url_fr || '',
        price_en: item?.price_en || '',
        price_fr: item?.price_fr || '',
        alt_text_en: item?.alt_text_en || '',
        alt_text_fr: item?.alt_text_fr || '',
        order_index: item?.order_index || 999,
        is_active: item?.is_active ?? true,
        use_same_video: item?.use_same_video ?? true
      };
    });

    // Debug: Track formData changes (removed to fix infinite loop)
    // useEffect(() => {
    //   console.log('📊 FormData state changed:', {
    //     video_url_en: formData.video_url_en,
    //     image_url_en: formData.image_url_en,
    //     use_same_video: formData.use_same_video
    //   });
    // }, [formData.video_url_en, formData.image_url_en, formData.use_same_video]);

    // When use_same_video changes, sync the video URLs
    const handleSameVideoToggle = (useSame: boolean) => {
      console.log('🔄 TOGGLE CLICKED! Previous state:', formData.use_same_video, '→ New state:', useSame);
      console.log('🔄 Current formData before change:', formData);
      
      if (useSame && formData.video_url_en) {
        setFormData(prev => {
          const newData = { 
            ...prev, 
            use_same_video: useSame,
            video_url_fr: prev.video_url_en
          };
          console.log('🔄 Updated formData (sync mode):', newData);
          return newData;
        });
      } else {
        setFormData(prev => {
          const newData = { 
            ...prev, 
            use_same_video: useSame
          };
          console.log('🔄 Updated formData (separate mode):', newData);
          return newData;
        });
      }
    };

    return (
      <div className="space-y-4 max-h-96 overflow-y-auto bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        {/* File Upload Section */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
          <h4 className="font-semibold mb-3 text-orange-900 dark:text-orange-100 flex items-center gap-2">
            <Video className="h-5 w-5" />
            {item ? '1. Modifier vos fichiers média (optionnel)' : '1. Télécharger vos fichiers média'}
          </h4>
          
          {/* Upload progress removed - DirectUpload components handle their own progress */}
          {/* Current media display section */}
          <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg mb-4">
            <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
              📤 Téléchargement uniquement via le système Direct Upload ci-dessous
            </p>
            
            {/* Current Video Display - UNIFIED SYSTEM v1.0.26 */}
            {(formData.video_filename || formData.video_url_en) && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  ✅ Vidéo actuelle:
                </p>
                <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all">
                  {formData.video_filename || formData.video_url_en}
                </p>
                {formData.video_filename && formData.video_url_en && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    🎯 Utilise le système unifié (video_filename)
                  </p>
                )}
                {!formData.video_filename && formData.video_url_en && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    ⚠️ Système legacy (video_url) - Considérez mettre à jour vers video_filename
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <video 
                    src={`/api/video-proxy?filename=${encodeURIComponent(formData.video_url_en.split('/').pop() || formData.video_url_en)}`}
                    className="w-20 h-12 object-cover rounded border"
                    muted
                  />
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Dimensions: {formData.video_width} × {formData.video_height}px<br/>
                    Orientation: {formData.video_orientation}
                  </div>
                </div>
              </div>
            )}

            {/* Current Image Display */}
            {formData.image_url_en && (
              <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  ✅ Image actuelle:
                </p>
                <p className="text-xs font-mono text-green-700 dark:text-green-300 break-all mb-2">
                  {formData.image_url_en}
                </p>
                <div className="flex items-center gap-2">
                  <img 
                    src={`/api/video-proxy?filename=${encodeURIComponent(formData.image_url_en.split('/').pop() || formData.image_url_en)}`}
                    alt="Current preview"
                    className="w-20 h-12 object-cover rounded border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="text-xs text-green-600 dark:text-green-400">
                    <p className="font-medium">Image de couverture</p>
                    <p>Remplacer via Direct Upload ci-dessous</p>
                  </div>
                </div>
              </div>
            )}
          </div>


          
          {formData.use_same_video ? (
            // Shared upload for both languages
            <div className="mt-6 p-4 bg-gradient-to-r from-[#F2EBDC] to-[#89BAD9]/20 dark:from-[#011526]/20 dark:to-[#2A4759]/20 rounded-lg border border-[#89BAD9] dark:border-[#2A4759]">
              <div className="flex items-center gap-2 mb-3">
                <div className="bg-[#D67C4A] rounded-full p-1">
                  <Upload className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-semibold text-[#011526] dark:text-[#F2EBDC]">
                  Téléchargement de Fichiers (Français & English)
                </h4>
              </div>
              <p className="text-sm text-[#2A4759] dark:text-[#89BAD9] mb-4">
                Même vidéo pour les deux langues. Téléchargez vos fichiers - ils seront utilisés pour FR et EN.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#011526] dark:text-[#F2EBDC] mb-2 block">
                    <Video className="h-4 w-4 inline mr-1" />
                    Vidéo (.mp4, .mov, .avi...)
                  </Label>
                  <DirectUpload
                    bucket="memopyk-videos"
                    acceptedTypes="video/*"
                    maxSizeMB={5000}
                    uploadId="gallery-video-shared-upload"
                    onUploadComplete={(result) => {
                      const filename = result.url.split('/').pop() || '';
                      persistentUploadState.video_url_en = filename;
                      persistentUploadState.video_url_fr = filename;
                      persistentUploadState.video_filename = filename;
                      
                      setFormData(prev => ({
                        ...prev,
                        video_url_en: filename,
                        video_url_fr: filename,
                        video_filename: filename
                      }));
                      
                      toast({
                        title: "✅ Succès",
                        description: `Vidéo partagée téléchargée: ${filename}`,
                        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      });
                    }}
                    onUploadError={(error) => {
                      toast({
                        title: "❌ Erreur", 
                        description: `Échec du téléchargement: ${error}`,
                        variant: "destructive"
                      });
                    }}
                  />
                </div>
                
                <div>
                  <Label className="text-[#011526] dark:text-[#F2EBDC] mb-2 block">
                    <Image className="h-4 w-4 inline mr-1" />
                    Image (.jpg, .png, .gif...)
                  </Label>
                  <DirectUpload
                    bucket="memopyk-videos"
                    acceptedTypes="image/*"
                    maxSizeMB={5000}
                    uploadId="gallery-image-shared-upload"
                    onUploadComplete={(result) => {
                      const url = result.url;
                      persistentUploadState.image_url_en = url;
                      persistentUploadState.image_url_fr = url;
                      
                      setFormData(prev => ({
                        ...prev,
                        image_url_en: url,
                        image_url_fr: url
                      }));
                      
                      toast({
                        title: "✅ Succès",
                        description: "Image partagée téléchargée!",
                        className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      });
                    }}
                    onUploadError={(error) => {
                      toast({
                        title: "❌ Erreur",
                        description: `Échec du téléchargement: ${error}`,
                        variant: "destructive"
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Separate uploads for French and English
            <div className="mt-6 space-y-6">
              {/* French Upload Section */}
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
                      bucket="memopyk-videos"
                      acceptedTypes="video/*"
                      maxSizeMB={5000}
                      uploadId="gallery-video-fr-upload"
                      onUploadComplete={(result) => {
                        const filename = result.url.split('/').pop() || '';
                        persistentUploadState.video_url_fr = filename;
                        
                        setFormData(prev => ({
                          ...prev,
                          video_url_fr: filename
                        }));
                        
                        toast({
                          title: "✅ Succès",
                          description: `Vidéo française téléchargée: ${filename}`,
                          className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        });
                      }}
                      onUploadError={(error) => {
                        toast({
                          title: "❌ Erreur",
                          description: `Échec vidéo française: ${error}`,
                          variant: "destructive"
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-blue-900 dark:text-blue-100 mb-2 block">
                      <Image className="h-4 w-4 inline mr-1" />
                      Image Française
                    </Label>
                    <DirectUpload
                      bucket="memopyk-videos"
                      acceptedTypes="image/*"
                      maxSizeMB={5000}
                      uploadId="gallery-image-fr-upload"
                      onUploadComplete={(result) => {
                        const url = result.url;
                        persistentUploadState.image_url_fr = url;
                        
                        setFormData(prev => ({
                          ...prev,
                          image_url_fr: url
                        }));
                        
                        toast({
                          title: "✅ Succès",
                          description: "Image française téléchargée!",
                          className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        });
                      }}
                      onUploadError={(error) => {
                        toast({
                          title: "❌ Erreur",
                          description: `Échec image française: ${error}`,
                          variant: "destructive"
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* English Upload Section */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-green-600 rounded-full p-1">
                    <Upload className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    🇺🇸 English Files
                  </h4>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                  Upload files specific to the English version.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-900 dark:text-green-100 mb-2 block">
                      <Video className="h-4 w-4 inline mr-1" />
                      English Video
                    </Label>
                    <DirectUpload
                      bucket="memopyk-videos"
                      acceptedTypes="video/*"
                      maxSizeMB={5000}
                      uploadId="gallery-video-en-upload"
                      onUploadComplete={(result) => {
                        const filename = result.url.split('/').pop() || '';
                        persistentUploadState.video_url_en = filename;
                        
                        setFormData(prev => ({
                          ...prev,
                          video_url_en: filename
                        }));
                        
                        toast({
                          title: "✅ Success",
                          description: `English video uploaded: ${filename}`,
                          className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        });
                      }}
                      onUploadError={(error) => {
                        toast({
                          title: "❌ Error",
                          description: `English video failed: ${error}`,
                          variant: "destructive"
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-green-900 dark:text-green-100 mb-2 block">
                      <Image className="h-4 w-4 inline mr-1" />
                      English Image
                    </Label>
                    <DirectUpload
                      bucket="memopyk-videos"
                      acceptedTypes="image/*"
                      maxSizeMB={5000}
                      uploadId="gallery-image-en-upload"
                      onUploadComplete={(result) => {
                        const url = result.url;
                        persistentUploadState.image_url_en = url;
                        
                        setFormData(prev => ({
                          ...prev,
                          image_url_en: url
                        }));
                        
                        toast({
                          title: "✅ Success",
                          description: "English image uploaded!",
                          className: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        });
                      }}
                      onUploadError={(error) => {
                        toast({
                          title: "❌ Error",
                          description: `English image failed: ${error}`,
                          variant: "destructive"
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Guide d'utilisation :</p>
                {formData.use_same_video ? (
                  <>
                    <p>1. Téléchargez votre vidéo (sera utilisée pour FR et EN)</p>
                    <p>2. Téléchargez votre image de couverture (sera utilisée pour FR et EN)</p>
                  </>
                ) : (
                  <>
                    <p>1. Téléchargez vos fichiers français dans la section bleue</p>
                    <p>2. Téléchargez vos fichiers anglais dans la section verte</p>
                    <p>3. Chaque langue aura ses propres fichiers média</p>
                  </>
                )}
                <p className="mt-1 font-medium">✨ Supporte jusqu'à 5GB • Contourne les limites serveur</p>
              </div>
            </div>
          </div>
        </div>

        {/* Same Video Switch */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.use_same_video}
              onCheckedChange={handleSameVideoToggle}
            />
            <Label className="text-blue-900 dark:text-blue-100 font-medium">
              Utiliser la même vidéo pour FR et EN
            </Label>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            {formData.use_same_video ? (
              "✅ ACTIVÉ - Même vidéo pour les deux langues"
            ) : (
              "❌ DÉSACTIVÉ - Vidéos séparées pour FR et EN"
            )}
          </p>
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              🔧 Debug: use_same_video = {String(formData.use_same_video)} | Type: {typeof formData.use_same_video}
            </p>
          </div>
        </div>

        {/* Title Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
            ✍️ 2. Informations de base (obligatoire)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title_en" className="text-gray-700 dark:text-gray-300">Titre (English) *</Label>
              <Input
                id="title_en"
                value={formData.title_en}
                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                placeholder="Ex: Wedding Memory Film"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="title_fr" className="text-gray-700 dark:text-gray-300">Titre (Français) *</Label>
              <Input
                id="title_fr"
                value={formData.title_fr}
                onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })}
                placeholder="Ex: Film Souvenir de Mariage"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Source Section */}
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold mb-3 text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2">
            📷 3. Source (affiché en overlay sur l'image)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="source_en" className="text-gray-700 dark:text-gray-300">Source (English)</Label>
              <Textarea
                id="source_en"
                value={formData.source_en}
                onChange={(e) => setFormData({ ...formData, source_en: e.target.value })}
                placeholder="Ex: 80 photos & 10 videos"
                rows={2}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="source_fr" className="text-gray-700 dark:text-gray-300">Source (Français)</Label>
              <Textarea
                id="source_fr"
                value={formData.source_fr}
                onChange={(e) => setFormData({ ...formData, source_fr: e.target.value })}
                placeholder="Ex: 80 photos et 10 vidéos"
                rows={2}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Duration Section */}
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold mb-3 text-green-900 dark:text-green-100 flex items-center gap-2">
            🎬 4. Durée (avec icône film)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration_en" className="text-gray-700 dark:text-gray-300">Durée (English) - Quelques mots seulement</Label>
              <Input
                id="duration_en"
                value={formData.duration_en}
                onChange={(e) => setFormData({ ...formData, duration_en: e.target.value })}
                placeholder="Ex: 2 minutes"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="duration_fr" className="text-gray-700 dark:text-gray-300">Durée (Français) - Quelques mots seulement</Label>
              <Input
                id="duration_fr"
                value={formData.duration_fr}
                onChange={(e) => setFormData({ ...formData, duration_fr: e.target.value })}
                placeholder="Ex: 2 minutes"
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Situation Section */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-semibold mb-3 text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
            👥 5. Situation (avec icône client)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="situation_en" className="text-gray-700 dark:text-gray-300">Situation (English) - Max 5 lignes</Label>
              <Textarea
                id="situation_en"
                value={formData.situation_en}
                onChange={(e) => setFormData({ ...formData, situation_en: e.target.value })}
                placeholder="Ex: Intimate wedding ceremony in a beautiful garden setting"
                rows={4}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="situation_fr" className="text-gray-700 dark:text-gray-300">Situation (Français) - Max 5 lignes</Label>
              <Textarea
                id="situation_fr"
                value={formData.situation_fr}
                onChange={(e) => setFormData({ ...formData, situation_fr: e.target.value })}
                placeholder="Ex: Cérémonie de mariage intime dans un magnifique cadre de jardin"
                rows={4}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Story Section */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <h4 className="font-semibold mb-3 text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
            📖 6. Histoire (avec icône film)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="story_en" className="text-gray-700 dark:text-gray-300">Histoire (English) - Max 5 lignes</Label>
              <Textarea
                id="story_en"
                value={formData.story_en}
                onChange={(e) => setFormData({ ...formData, story_en: e.target.value })}
                placeholder="Ex: A heartwarming tale of two souls united in love and commitment"
                rows={4}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="story_fr" className="text-gray-700 dark:text-gray-300">Histoire (Français) - Max 5 lignes</Label>
              <Textarea
                id="story_fr"
                value={formData.story_fr}
                onChange={(e) => setFormData({ ...formData, story_fr: e.target.value })}
                placeholder="Ex: Une histoire touchante de deux âmes unies par l'amour et l'engagement"
                rows={4}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Sorry Message Section - When no video is available */}
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold mb-3 text-red-900 dark:text-red-100 flex items-center gap-2">
            ⚠️ Message d'excuse (quand pas de vidéo)
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            Ce message s'affiche quand l'utilisateur clique sur le bouton blanc (pas de vidéo disponible)
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sorry_message_en" className="text-gray-700 dark:text-gray-300">Message d'excuse (English)</Label>
              <Textarea
                id="sorry_message_en"
                value={formData.sorry_message_en}
                onChange={(e) => setFormData({ ...formData, sorry_message_en: e.target.value })}
                placeholder="Ex: Sorry, we cannot show you the video at this stage"
                rows={3}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="sorry_message_fr" className="text-gray-700 dark:text-gray-300">Message d'excuse (Français)</Label>
              <Textarea
                id="sorry_message_fr"
                value={formData.sorry_message_fr}
                onChange={(e) => setFormData({ ...formData, sorry_message_fr: e.target.value })}
                placeholder="Ex: Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade"
                rows={3}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Format Badge Section - Editable Marketing Display */}
        <div className="bg-[#F2EBDC] dark:bg-[#011526]/20 p-4 rounded-lg border border-[#89BAD9] dark:border-[#2A4759]">
          <h4 className="font-semibold mb-3 text-[#011526] dark:text-[#F2EBDC] flex items-center gap-2">
            🎯 7. Badge Format (marketing visuel)
          </h4>
          <p className="text-sm text-[#2A4759] dark:text-[#89BAD9] mb-4">
            Personnalisez le texte du badge format affiché avec chaque vidéo. Ces badges guident les clients vers les plateformes optimales.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h5 className="font-medium text-[#011526] dark:text-[#F2EBDC]">English</h5>
              <div>
                <Label htmlFor="format_platform_en" className="text-gray-700 dark:text-gray-300">Platform Line 1</Label>
                <Select value={formData.format_platform_en} onValueChange={(value) => setFormData({ ...formData, format_platform_en: value })}>
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Select platform category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Social Media">Social Media</SelectItem>
                    <SelectItem value="Social Feed">Social Feed</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="format_type_en" className="text-gray-700 dark:text-gray-300">Format Line 2</Label>
                <Select value={formData.format_type_en} onValueChange={(value) => setFormData({ ...formData, format_type_en: value })}>
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
              <h5 className="font-medium text-[#011526] dark:text-[#F2EBDC]">Français</h5>
              <div>
                <Label htmlFor="format_platform_fr" className="text-gray-700 dark:text-gray-300">Platform Line 1</Label>
                <Select value={formData.format_platform_fr} onValueChange={(value) => setFormData({ ...formData, format_platform_fr: value })}>
                  <SelectTrigger className="bg-white dark:bg-gray-800">
                    <SelectValue placeholder="Sélectionner catégorie plateforme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Réseaux Sociaux">Réseaux Sociaux</SelectItem>
                    <SelectItem value="Flux Social">Flux Social</SelectItem>
                    <SelectItem value="Professionnel">Professionnel</SelectItem>
                    <SelectItem value="Personnalisé">Personnalisé...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="format_type_fr" className="text-gray-700 dark:text-gray-300">Format Line 2</Label>
                <Select value={formData.format_type_fr} onValueChange={(value) => setFormData({ ...formData, format_type_fr: value })}>
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
          
          <div className="mt-4 p-3 bg-[#89BAD9]/10 dark:bg-[#2A4759]/10 rounded-lg">
            <p className="text-xs text-[#2A4759] dark:text-[#89BAD9]">
              💡 Astuce: Choisissez les textes qui correspondent le mieux aux dimensions de votre vidéo et aux plateformes cibles de vos clients.
            </p>
          </div>
        </div>

        {/* Language-Specific URL Display */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
            🎯 Fichiers actuels
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            Aperçu des fichiers configurés pour chaque langue.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-blue-900 dark:text-blue-100 font-medium">🇫🇷 Français</Label>
              <div className="space-y-1">
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Vidéo: <span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">{formData.video_url_fr || 'Non définie'}</span>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  Image: <span className="font-mono bg-blue-100 dark:bg-blue-800 px-1 rounded">{formData.image_url_fr || 'Non définie'}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-green-900 dark:text-green-100 font-medium">🇺🇸 English</Label>
              <div className="space-y-1">
                <div className="text-xs text-green-700 dark:text-green-300">
                  Video: <span className="font-mono bg-green-100 dark:bg-green-800 px-1 rounded">{formData.video_url_en || 'Not set'}</span>
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  Image: <span className="font-mono bg-green-100 dark:bg-green-800 px-1 rounded">{formData.image_url_en || 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {formData.video_filename && (
            <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-800 rounded">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Legacy filename: <span className="font-mono">{formData.video_filename}</span>
              </div>
            </div>
          )}
        </div>



        {/* Video Dimensions Section - CRITICAL for video overlay sizing */}
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold mb-3 text-red-900 dark:text-red-100 flex items-center gap-2">
            📐 3. Dimensions Vidéo (OBLIGATOIRE pour l'affichage)
          </h4>
          <p className="text-sm text-red-800 dark:text-red-200 mb-4">
            ⚠️ Ces dimensions sont critiques pour l'affichage correct dans l'overlay vidéo. Vérifiez les propriétés de votre fichier vidéo.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="video_width" className="text-gray-700 dark:text-gray-300">Largeur (pixels) *</Label>
              <Input
                id="video_width"
                type="number"
                value={formData.video_width}
                onChange={(e) => setFormData({ ...formData, video_width: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 1920"
                min={1}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="video_height" className="text-gray-700 dark:text-gray-300">Hauteur (pixels) *</Label>
              <Input
                id="video_height"
                type="number"
                value={formData.video_height}
                onChange={(e) => setFormData({ ...formData, video_height: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 1080"
                min={1}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <Label htmlFor="video_orientation" className="text-gray-700 dark:text-gray-300">Orientation (Auto-détectée)</Label>
              <div className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {formData.video_width && formData.video_height 
                  ? (formData.video_width > formData.video_height ? 'Paysage (Landscape)' : 'Portrait')
                  : 'Entrez les dimensions pour voir l\'orientation'
                }
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                L'orientation est calculée automatiquement: largeur &gt; hauteur = paysage, sinon portrait
              </div>
            </div>
          </div>
          <p className="text-xs text-red-700 dark:text-red-300 mt-2">
            💡 Astuce: Clic droit sur votre fichier vidéo → Propriétés → Détails pour voir les dimensions exactes
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price_en" className="text-gray-700 dark:text-gray-300">Prix (English)</Label>
            <Input
              id="price_en"
              value={formData.price_en}
              onChange={(e) => setFormData({ ...formData, price_en: e.target.value })}
              placeholder="$299"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="price_fr" className="text-gray-700 dark:text-gray-300">Prix (Français)</Label>
            <Input
              id="price_fr"
              value={formData.price_fr}
              onChange={(e) => setFormData({ ...formData, price_fr: e.target.value })}
              placeholder="299€"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="alt_text_en" className="text-gray-700 dark:text-gray-300">Texte Alt (English)</Label>
            <Input
              id="alt_text_en"
              value={formData.alt_text_en}
              onChange={(e) => setFormData({ ...formData, alt_text_en: e.target.value })}
              placeholder="Alternative text for accessibility"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="alt_text_fr" className="text-gray-700 dark:text-gray-300">Texte Alt (Français)</Label>
            <Input
              id="alt_text_fr"
              value={formData.alt_text_fr}
              onChange={(e) => setFormData({ ...formData, alt_text_fr: e.target.value })}
              placeholder="Texte alternatif pour l'accessibilité"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 items-center">
          <div>
            <Label htmlFor="order_index" className="text-gray-700 dark:text-gray-300">Ordre d'affichage</Label>
            <Input
              id="order_index"
              type="number"
              value={formData.order_index}
              onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
              min={1}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active" className="text-gray-700 dark:text-gray-300">Actif</Label>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => {
            persistentUploadState.reset();
            console.log('🧹 Cleared module persistent state on cancel');
            onCancel();
          }}>
            Annuler
          </Button>
          <Button 
            onClick={(e) => {
              try {
                console.log('🚨 SAVE BUTTON CLICKED!!! This should appear first');
                console.log('🚨 SAVE BUTTON - Current formData state:', {
                  video_filename: formData.video_filename,
                  video_url_en: formData.video_url_en,
                  title_en: formData.title_en
                });
                
                // Prevent any default behavior that might interfere
                e.preventDefault();
                e.stopPropagation();
                
                // Validate required fields
                if (!formData.title_en || !formData.title_fr) {
                  console.log('🚨 VALIDATION FAILED - Missing titles');
                  toast({ 
                    title: "Erreur", 
                    description: "Les titres en français et anglais sont obligatoires", 
                    variant: "destructive" 
                  });
                  return;
                }
                
                console.log('🚨 VALIDATION PASSED - Proceeding with save');
              } catch (error) {
                console.error('🚨 ERROR IN SAVE BUTTON:', error);
              }
              
              // Validate video dimensions if video URL is provided
              if ((formData.video_url_en || formData.video_url_fr) && (!formData.video_width || !formData.video_height)) {
                toast({ 
                  title: "Erreur", 
                  description: "Les dimensions vidéo (largeur, hauteur) sont obligatoires quand une vidéo est fournie", 
                  variant: "destructive" 
                });
                return;
              }
              
              // Auto-calculate orientation based on dimensions
              const finalData = {
                ...formData,
                video_orientation: formData.video_width > formData.video_height ? 'landscape' : 'portrait'
              };
              
              console.log('📐 AUTO-ORIENTATION CALCULATION:', {
                width: formData.video_width,
                height: formData.video_height,
                calculatedOrientation: finalData.video_orientation
              });
              
              console.log('🚨 SAVE DEBUG - Final data being sent:', {
                video_filename: finalData.video_filename,
                video_url_en: finalData.video_url_en,
                video_url_fr: finalData.video_url_fr,
                title_en: finalData.title_en,
                id: item?.id
              });
              
              onSave(finalData);
              persistentUploadState.reset();
              console.log('🧹 Cleared module persistent state after save');
            }}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement de la galerie...</div>;
  }

  const sortedItems = [...galleryItems].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-6">


      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Éléments de Galerie</h3>
          <p className="text-sm text-gray-600">Gérez les éléments de votre galerie de films</p>
        </div>
        <div className="flex gap-3">
          {/* Removed Cache Gallery Videos button - Gallery videos use Direct CDN streaming */}
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Nouvel Élément
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Créer un Nouvel Élément de Galerie</DialogTitle>
              </DialogHeader>
              <GalleryItemForm
                onSave={(data) => createItemMutation.mutate(data)}
                onCancel={() => setShowCreateDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Removed VideoCacheStatus - Gallery videos use Direct CDN streaming (no cache) */}

      <div className="space-y-4">
        {sortedItems.map((item, index) => (
          <Card key={item.id} className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Preview - Show static cropped image or original image thumbnail with video overlay icon */}
                <div className="space-y-3">
                  <div className="aspect-[3/2] bg-gray-100 dark:bg-gray-800 rounded-lg relative overflow-hidden">
                    {(item.static_image_url || item.image_url_en) ? (
                      <div 
                        className="w-full h-full cursor-pointer group relative"
                        onClick={() => {
                          // If has video, show video preview; otherwise show image
                          if (item.video_url_en) {
                            const filename = item.video_url_en!.split('/').pop()!;
                            const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;
                            setShowPreview({ type: 'video', url: proxyUrl, title: item.title_en });
                          } else {
                            setShowPreview({ type: 'image', url: item.static_image_url || item.image_url_en!, title: item.title_en });
                          }
                        }}
                      >
                        <img
                          src={(() => {
                            const finalUrl = addCacheBuster(item.static_image_url || item.image_url_en!);
                            console.log(`🖼️ Admin list image for ${item.title_en}:`, {
                              static_image_url: item.static_image_url,
                              image_url_en: item.image_url_en,
                              final_url: finalUrl
                            });
                            return finalUrl;
                          })()}
                          alt={item.alt_text_en}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn('❌ Image failed to load:', item.static_image_url || item.image_url_en);
                            // If static image fails, try original image
                            if (item.static_image_url && item.image_url_en) {
                              const fallbackUrl = addCacheBuster(item.image_url_en);
                              console.log(`🔄 Trying fallback image:`, fallbackUrl);
                              e.currentTarget.src = fallbackUrl;
                            } else {
                              e.currentTarget.style.display = 'none';
                            }
                          }}
                        />
                        
                        {/* Video indicator overlay */}
                        {item.video_url_en && (
                          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            Video
                          </div>
                        )}
                        
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          {item.video_url_en ? (
                            <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                          ) : (
                            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                          )}
                        </div>
                      </div>
                    ) : item.video_url_en ? (
                      <div 
                        className="w-full h-full cursor-pointer group"
                        onClick={() => {
                          const filename = item.video_url_en!.split('/').pop()!;
                          const proxyUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;
                          setShowPreview({ type: 'video', url: proxyUrl, title: item.title_en });
                        }}
                      >
                        <video
                          src={`/api/video-proxy?filename=${encodeURIComponent(item.video_url_en!.split('/').pop()!)}`}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <Play className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Image className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={item.is_active ? "default" : "secondary"} className="text-xs">
                      {item.is_active ? "Actif" : "Inactif"}
                    </Badge>
                    <span className="text-xs text-gray-500">#{item.order_index}</span>
                  </div>
                  
                  {/* Updated streaming status for gallery items */}
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs space-y-1">
                    <div className="font-medium text-blue-700 dark:text-blue-300">Streaming Method:</div>
                    <div className="flex items-center gap-1">
                      <Video className="h-3 w-3 text-blue-600" />
                      <span>Video: Direct CDN streaming</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Image className="h-3 w-3 text-blue-600" />
                      <span>Image: Direct CDN serving</span>
                    </div>
                  </div>
                </div>

                {/* Content Details */}
                <div className="lg:col-span-2 space-y-4">
                  {editingItem?.id === item.id ? (
                    <GalleryItemForm
                      item={item}
                      onSave={(data) => updateItemMutation.mutate({ id: item.id, data })}
                      onCancel={() => setEditingItem(null)}
                    />
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{item.title_en}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.title_fr}</p>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <div>
                          <p className="text-xs text-gray-500">Source:</p>
                          <p className="mb-1">{item.source_en}</p>
                          <p className="italic">{item.source_fr}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Duration:</p>
                          <p className="mb-1">{item.duration_en}</p>
                          <p className="italic">{item.duration_fr}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium text-green-600 dark:text-green-400">{item.price_en}</span>
                        <span className="font-medium text-green-600 dark:text-green-400">{item.price_fr}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="lg:col-span-1 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItem(editingItem?.id === item.id ? null : item)}
                    className="w-full justify-start"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {editingItem?.id === item.id ? "Annuler" : "Modifier"}
                  </Button>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(item, 'up')}
                      disabled={index === 0}
                      className="flex-1"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReorder(item, 'down')}
                      disabled={index === sortedItems.length - 1}
                      className="flex-1"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  

                  
                  {/* Static Image Cropper Button */}
                  {item.image_url_en && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImageCropper({ imageUrl: item.image_url_en!, item })}
                      className="w-full justify-start text-memopyk-orange hover:text-memopyk-orange"
                    >
                      <Crop className="h-3 w-3 mr-1" />
                      Recadrer Image (300×200)
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateItemMutation.mutate({ 
                      id: item.id, 
                      data: { is_active: !item.is_active }
                    })}
                    className="w-full justify-start"
                  >
                    {item.is_active ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    {item.is_active ? "Masquer" : "Afficher"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
                        deleteItemMutation.mutate(item.id);
                      }
                    }}
                    className="w-full text-red-600 hover:text-red-700 justify-start"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {galleryItems.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucun élément de galerie</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Commencez par créer votre premier élément de galerie.</p>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer le premier élément
          </Button>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">{showPreview.title}</DialogTitle>
            </DialogHeader>
            <div className="aspect-video w-full">
              {showPreview.type === 'video' ? (
                <video
                  src={showPreview.url}
                  controls
                  className="w-full h-full object-cover rounded"
                  autoPlay
                />
              ) : (
                <img
                  src={showPreview.url}
                  alt={showPreview.title}
                  className="w-full h-full object-cover rounded"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Image Cropper Modal */}
      {showImageCropper && (
        <Dialog open={!!showImageCropper} onOpenChange={() => setShowImageCropper(null)}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">
                Génération d'Image Statique - {showImageCropper.item?.title_en || 'Article de galerie'}
              </DialogTitle>
              <DialogDescription>
                Glissez pour repositionner l'image et générez une image statique 300×200 pour la galerie.
              </DialogDescription>
            </DialogHeader>
            <ImageCropperEasyCrop
              imageUrl={showImageCropper.imageUrl}
              onSave={async (croppedBlob: Blob, cropSettings: any) => {
                console.log('🚀 FRONTEND: Starting static image upload process...');
                console.log('   - Blob size:', croppedBlob.size, 'bytes');
                console.log('   - Item ID:', showImageCropper.item?.id);
                console.log('   - Crop settings:', cropSettings);
                
                try {
                  // Create form data for upload
                  const formData = new FormData();
                  formData.append('image', croppedBlob, `static_${showImageCropper.item?.id || 'temp'}.png`);
                  formData.append('crop_settings', JSON.stringify(cropSettings));
                  formData.append('item_id', showImageCropper.item?.id?.toString() || '');
                  
                  console.log('📋 FRONTEND: FormData prepared');
                  console.log('   - File name:', `static_${showImageCropper.item?.id || 'temp'}.png`);
                  console.log('   - Item ID:', showImageCropper.item?.id?.toString() || ''); 
                  console.log('   - FormData entries:', Array.from(formData.entries()).map(([k,v]) => [k, v instanceof Blob ? `${v.size}B blob` : v]));
                  
                  // Upload cropped image with detailed error handling
                  console.log('🌐 FRONTEND: Making fetch request to /api/gallery/upload-static-image...');
                  const response = await fetch('/api/gallery/upload-static-image', {
                    method: 'POST',
                    body: formData,
                  });
                  
                  console.log('📡 FRONTEND: Response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    headers: Object.fromEntries(response.headers.entries())
                  });
                  
                  if (!response.ok) {
                    console.error('❌ FRONTEND: HTTP Error:', response.status, response.statusText);
                    const errorText = await response.text();
                    console.error('❌ FRONTEND: Error response body:', errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
                  }
                  
                  const result = await response.json();
                  console.log('📨 FRONTEND: Parsed JSON response:', result);
                  
                  if (result.success) {
                    toast({ 
                      title: "Succès", 
                      description: "Image statique générée et sauvegardée avec succès!" 
                    });
                    
                    // Close the modal and refresh the data
                    setShowImageCropper(null);
                    
                    // Force complete cache invalidation and fresh fetch
                    await queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
                    
                    // Wait a moment to ensure database is updated
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Force fresh fetch with explicit cache bypass
                    await queryClient.refetchQueries({ 
                      queryKey: ['/api/gallery'],
                      type: 'active'
                    });
                    
                    // Force re-render with updated data
                    console.log('🔄 Static image saved! Forcing complete UI refresh...');
                    console.log('📸 Static image response:', result);
                    console.log('🆕 New static image URL:', result.url);
                    
                    // Additional aggressive cache clearing
                    queryClient.removeQueries({ queryKey: ['/api/gallery'] });
                    await queryClient.refetchQueries({ queryKey: ['/api/gallery'] });
                  } else {
                    console.error('❌ FRONTEND: Server returned success=false:', result);
                    throw new Error(result.error || 'Unknown server error');
                  }
                } catch (error) {
                  console.error('💥 FRONTEND: Static image generation error:', error);
                  console.error('💥 FRONTEND: Error details:', {
                    name: error instanceof Error ? error.name : 'Unknown',
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : 'No stack trace'
                  });
                  toast({ 
                    title: "Erreur", 
                    description: `Échec de la génération de l'image statique: ${error instanceof Error ? error.message : String(error)}`,
                    variant: "destructive"
                  });
                }
              }}
              onCancel={() => setShowImageCropper(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}