import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Diagnostic helper: compares the previewed element vs the exported blob
async function logDisplayDiagnostics(previewEl: HTMLElement | null, imageUrl: string) {
  if (!previewEl) {
    console.warn('[Diag] preview element is null');
    return;
  }

  const cs = getComputedStyle(previewEl);
  console.group('[Diag] Image Display Diagnostics');

  // Basic computed style checks
  console.log('mix-blend-mode:', cs.mixBlendMode);
  console.log('opacity:', cs.opacity);
  console.log('filter:', cs.filter);
  console.log('background:', cs.background);
  console.log('has ::before content:', getComputedStyle(previewEl, '::before').content);
  console.log('has ::after content:', getComputedStyle(previewEl, '::after').content);

  // Determine what image the preview is actually showing
  let displayedUrl: string | null = null;
  if (previewEl.tagName === 'IMG') {
    displayedUrl = (previewEl as HTMLImageElement).src;
  } else {
    const bg = cs.backgroundImage;
    if (bg && bg.startsWith('url(')) {
      displayedUrl = bg.slice(4, -1).replace(/["']/g, '');
    }
  }
  console.log('Displayed image URL:', displayedUrl);
  console.log('Expected image URL:', imageUrl);
  if (displayedUrl === imageUrl) {
    console.log('✅ Preview is using the expected image URL.');
  } else {
    console.warn('⚠️ Preview is NOT using the expected image URL (might be showing different source).');
  }

  // Optional: compare average color of displayed vs expected image to detect visual alteration
  const loadImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = document.createElement('img') as HTMLImageElement;
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(`Failed to load image: ${url}`);
      img.src = url;
    });

  try {
    if (displayedUrl) {
      const [displayedImg, expectedImg] = await Promise.all([loadImage(displayedUrl), loadImage(imageUrl)]);
      const avgColor = (img: HTMLImageElement) => {
        const c = document.createElement('canvas');
        c.width = Math.min(50, img.naturalWidth);
        c.height = Math.min(50, img.naturalHeight);
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const data = ctx.getImageData(0, 0, c.width, c.height).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        return { r: r / count, g: g / count, b: b / count };
      };
      const avgDisplayed = avgColor(displayedImg);
      const avgExpected = avgColor(expectedImg);
      console.log('Average RGB of displayed image:', avgDisplayed);
      console.log('Average RGB of expected image:', avgExpected);
      const diff = {
        dr: Math.abs(avgDisplayed.r - avgExpected.r),
        dg: Math.abs(avgDisplayed.g - avgExpected.g),
        db: Math.abs(avgDisplayed.b - avgExpected.b),
      };
      console.log('Average color difference:', diff);
      if (diff.dr > 5 || diff.dg > 5 || diff.db > 5) {
        console.warn('[Diag] Significant average color difference; display may be altered or a different image is shown.');
      } else {
        console.log('[Diag] Displayed image and expected image are similar in average color.');
      }
    }
  } catch (e) {
    console.warn('[Diag] Image comparison failed:', e);
  }

  console.groupEnd();
}

  // Calculate actual displayed image dimensions within object-contain
  const calculateImageDimensions = (imgElement: HTMLImageElement): {width: number, height: number} => {
    const containerWidth = imgElement.offsetWidth;
    const containerHeight = imgElement.offsetHeight;
    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    
    if (!naturalWidth || !naturalHeight) return {width: containerWidth, height: containerHeight};
    
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = naturalWidth / naturalHeight;
    
    let displayedWidth: number;
    let displayedHeight: number;
    
    if (imageRatio > containerRatio) {
      // Image is wider than container - width constrained
      displayedWidth = containerWidth;
      displayedHeight = containerWidth / imageRatio;
    } else {
      // Image is taller than container - height constrained  
      displayedHeight = containerHeight;
      displayedWidth = containerHeight * imageRatio;
    }
    
    console.log(`📊 Calculated dimensions: ${displayedWidth} x ${displayedHeight} (from ${naturalWidth} x ${naturalHeight} in ${containerWidth} x ${containerHeight})`);
    return {width: displayedWidth, height: displayedHeight};
  };




import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
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
  PlayCircle,
  Save,
  Crop,
  Download,
  Upload,
  CheckCircle,
  Monitor,
  Smartphone,
  Power,
  Palette,
  Globe,
  Info,
  RotateCcw
} from "lucide-react";
import SimpleImageCropper from './SimpleImageCropper';
// Force cache bust v1.0.99 - ensure optimized component loads
import DirectUpload from './DirectUpload';
import FormatBadgeManager from './FormatBadgeManager';

// Helper function to convert filename to full URL if needed
const getFullUrl = (value: string): string => {
  if (!value) return '';
  if (value.includes('supabase.memopyk.org')) return value; // Already a full URL
  if (value.includes('http')) return value; // Already some kind of URL
  // Convert filename to full URL
  return `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${value}`;
};

// Module-level persistent state that survives component re-creations
const persistentUploadState = {
  videoUrlEn: '',
  imageUrlEn: '',
  videoUrlFr: '',
  imageUrlFr: '',
  videoFilename: '',
  videoFilename_en: '', // Added separate EN video filename
  videoFilename_fr: '', // Added separate FR video filename
  staticImageUrl: '',
  static_imageUrlEn: null as string | null,
  static_imageUrlFr: null as string | null,
  reset: () => {
    persistentUploadState.videoUrlEn = '';
    persistentUploadState.imageUrlEn = '';
    persistentUploadState.videoUrlFr = '';
    persistentUploadState.imageUrlFr = '';
    persistentUploadState.videoFilename = '';
    persistentUploadState.videoFilename_en = '';
    persistentUploadState.videoFilename_fr = '';
    persistentUploadState.staticImageUrl = '';
    persistentUploadState.static_imageUrlEn = null;
    persistentUploadState.static_imageUrlFr = null;
  }
};

interface GalleryItem {
  id: string | number;
  titleEn: string;
  titleFr: string;
  priceEn: string;
  priceFr: string;
  sourceEn: string;
  sourceFr: string;
  durationEn: string;
  durationFr: string;
  situationEn: string;
  situationFr: string;
  storyEn: string;
  storyFr: string;
  sorryMessageEn: string;
  sorryMessageFr: string;
  formatPlatformEn: string;
  formatPlatformFr: string;
  formatTypeEn: string;
  formatTypeFr: string;
  videoUrlEn: string;
  videoUrlFr: string;
  videoFilename: string;
  useSameVideo: boolean; // RESTORED: Bilingual video selection toggle
  videoWidth: number;
  videoHeight: number;
  videoOrientation: string;
  imageUrlEn: string;
  imageUrlFr: string;
  staticImageUrl: string | null; // Legacy field
  static_imageUrlEn?: string | null; // English static image
  static_imageUrlFr?: string | null; // French static image
  cropSettings?: any; // Auto-crop settings for badge detection
  orderIndex: number;
  isActive: boolean;
}

export default function GalleryManagementNew() {
  const { toast } = useToast();
  const frImageRef = useRef<HTMLImageElement>(null);
  const enImageRef = useRef<HTMLImageElement>(null);

  // Helper function to convert filename to full URL when displaying with cache-busting
  const getFullUrl = (value: string) => {
    if (!value) return '';
    // If it's already a full URL, return as-is
    if (value.startsWith('http')) return value;
    // If it's just a filename, convert to full Supabase URL
    return `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${value}`;
  };

  // Helper function to get thumbnail URL - SIMPLIFIED TO FORCE -C VERSION
  const getThumbnailUrl = (item: GalleryItem | null | undefined, language: 'en' | 'fr' = 'en') => {
    // Priority 0: Real-time pending upload preview (admin only)
    const pendingImageUrl = language === 'fr' ? pendingPreviews.imageUrlFr : pendingPreviews.imageUrlEn;
    if (pendingImageUrl) {
      console.log(`🔍 ADMIN: Using pending preview for ${language}:`, pendingImageUrl);
      return pendingImageUrl;
    }
    
    // Priority 1: Form data (admin only - for newly uploaded images before save)
    const formImageUrl = language === 'fr' ? formData.imageUrlFr : formData.imageUrlEn;
    if (formImageUrl && !item) { // Only use formData if no existing item (create mode)
      console.log(`🔍 ADMIN: Using form data for ${language}:`, formImageUrl);
      return formImageUrl;
    }
    
    if (!item) {
      console.log(`🔍 ADMIN: No item provided for ${language} - returning empty`);
      return '';
    }
    
    // 🚨 FORCE ADMIN TO ALWAYS USE -C VERSION (CROPPED)
    console.log(`🔍 ADMIN FORCE -C DEBUG:`, {
      useSameVideo: item.useSameVideo,
      static_imageUrlEn: item.static_imageUrlEn,
      static_imageUrlFr: item.static_imageUrlFr,
      imageUrlEn: item.imageUrlEn,
      imageUrlFr: item.imageUrlFr
    });
    
    // FORCE: Always use static cropped version (-C) if available
    let croppedUrl = '';
    if (item.useSameVideo) {
      // Shared mode: Both languages use EN cropped version  
      croppedUrl = item.static_imageUrlEn || '';
      console.log(`🚨 ADMIN FORCE SHARED: Using EN cropped (-C): ${croppedUrl}`);
    } else {
      // Separate mode: Use language-specific cropped version
      croppedUrl = (language === 'fr' ? item.static_imageUrlFr : item.static_imageUrlEn) || '';
      console.log(`🚨 ADMIN FORCE SEPARATE: Using ${language} cropped (-C): ${croppedUrl}`);
    }
    
    if (croppedUrl && croppedUrl.trim() !== '') {
      const finalUrl = croppedUrl + (forceRefreshKey > 0 ? `?v=${forceRefreshKey}` : '');
      console.log(`✅ ADMIN RETURNING CROPPED (-C): ${finalUrl}`);
      return finalUrl;
    }
    
    // If no cropped version exists, fallback to original (shouldn't happen for existing items)
    const originalUrl = item.useSameVideo 
      ? item.imageUrlEn 
      : (language === 'fr' ? item.imageUrlFr : item.imageUrlEn);
    
    if (originalUrl) {
      console.log(`⚠️ ADMIN FALLBACK TO ORIGINAL: ${originalUrl}`);
      return originalUrl;
    }
    
    // Legacy fallback
    if (item.staticImageUrl) {
      console.log(`⚠️ ADMIN LEGACY: ${item.staticImageUrl}`);
      return item.staticImageUrl;
    }
    
    console.log(`❌ ADMIN: No image found for ${language}`);
    return '';
  };

  // Helper function to get image with cache-busting - SUPER AGGRESSIVE METHOD
  const [forceRefreshKey, setForceRefreshKey] = useState(0);
  const [formRefreshKey, setFormRefreshKey] = useState(0); // Force form field refresh
  
  const getImageUrlWithCacheBust = (filename: string) => {
    if (!filename) return '';
    // Use cache-busting with multiple parameters + component refresh key
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const componentKey = forceRefreshKey;
    
    // FIX: Properly handle URLs that already have query parameters
    if (filename.includes('http')) {
      const separator = filename.includes('?') ? '&' : '?';
      return `${filename}${separator}bustCache=${timestamp}&version=${random}&refresh=${componentKey}&nocache=1&_=${Date.now()}`;
    }
    return `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${encodeURIComponent(filename)}?bustCache=${timestamp}&version=${random}&refresh=${componentKey}&nocache=1&_=${Date.now()}`;
  };
  const queryClient = useQueryClient();
  const [selectedVideoId, setSelectedVideoId] = useState<string | number | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperLanguage, setCropperLanguage] = useState<'en' | 'fr'>('en');
  const [cropSaving, setCropSaving] = useState(false);
  const [showFormatBadgeManager, setShowFormatBadgeManager] = useState(false);
  
  // Real-time cropping state tracking
  const [activeCroppingState, setActiveCroppingState] = useState<{
    isActive: boolean;
    language: 'en' | 'fr';
    hasChanges: boolean;
  }>({ isActive: false, language: 'en', hasChanges: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  
  // Real-time preview state for pending uploads
  const [pendingPreviews, setPendingPreviews] = useState<{
    videoUrlEn?: string;
    videoUrlFr?: string;
    imageUrlEn?: string;
    imageUrlFr?: string;
    videoFilename?: string;
    staticImageUrl?: string;
    static_imageUrlEn?: string;
    static_imageUrlFr?: string;
    cropSettings?: any;
  }>({});




  


  // 🚨 ADMIN CACHE BYPASS v1.0.111 - Force fresh data for admin
  // 🚨 ADMIN CACHE SYNCHRONIZATION FIX v1.0.113 - Fixed admin cache key

  const { data: galleryItems = [], isLoading } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery'], // Use same key as public site for cache consistency
    staleTime: 0, // Admin always gets fresh data
    gcTime: 0, // Immediate garbage collection
    refetchOnMount: 'always', // Always refetch on mount
    refetchOnWindowFocus: false,
    select: (data) => data.sort((a, b) => a.orderIndex - b.orderIndex)
  });

  // Get selected item
  const selectedItem = galleryItems.find(item => item.id === selectedVideoId);

  // Initialize form data

  
  const [formData, setFormData] = useState({
    titleEn: '',
    titleFr: '',
    priceEn: '',
    priceFr: '',
    sourceEn: '',
    sourceFr: '',
    durationEn: '',
    durationFr: '',
    situationEn: '',
    situationFr: '',
    storyEn: '',
    storyFr: '',
    sorryMessageEn: 'Sorry, we cannot show you the video at this stage',
    sorryMessageFr: 'Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade',
    formatPlatformEn: '',
    formatPlatformFr: '',
    formatTypeEn: '',
    formatTypeFr: '',
    videoUrlEn: '',
    videoUrlFr: '',
    videoFilename: '', // Legacy field for backward compatibility
    useSameVideo: true, // RESTORED: Bilingual video selection - default to same video
    videoWidth: 16,
    videoHeight: 9,
    videoOrientation: 'landscape',
    imageUrlEn: '',
    imageUrlFr: '',
    staticImageUrl: '',
    static_imageUrlEn: null as string | null,
    static_imageUrlFr: null as string | null,
    cropSettings: null as any,
    isActive: true
  });

  // Update form data when selected item changes - SAFE: Check selectedItem exists first  
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
        useSameVideo: selectedItem.useSameVideo !== undefined ? selectedItem.useSameVideo : true, // RESTORED: Load bilingual setting
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
      // Reset form for create mode
      setFormData({
        titleEn: '',
        titleFr: '',
        priceEn: '',
        priceFr: '',
        sourceEn: '',
        sourceFr: '',
        durationEn: '',
        durationFr: '',
        situationEn: '',
        situationFr: '',
        storyEn: '',
        storyFr: '',
        sorryMessageEn: 'Sorry, we cannot show you the video at this stage',
        sorryMessageFr: 'Désolé, nous ne pouvons pas vous montrer la vidéo à ce stade',
        formatPlatformEn: '',
        formatPlatformFr: '',
        formatTypeEn: '',
        formatTypeFr: '',
        videoUrlEn: persistentUploadState.videoUrlEn || '',
        videoUrlFr: persistentUploadState.videoUrlFr || '',
        videoFilename: persistentUploadState.videoFilename || '',
        useSameVideo: true, // RESTORED: Default to same video for new items
        videoWidth: 16,
        videoHeight: 9,
        videoOrientation: 'landscape',
        imageUrlEn: persistentUploadState.imageUrlEn || '',
        imageUrlFr: persistentUploadState.imageUrlFr || '',
        staticImageUrl: '',
        static_imageUrlEn: null as string | null,
        static_imageUrlFr: null as string | null,
        cropSettings: null as any,
        isActive: true
      });
    }
  }, [selectedItem?.id, isCreateMode]); // Simplified dependencies to avoid undefined access

  // Auto-select first item when data loads OR when selected item no longer exists
  useEffect(() => {
    if (galleryItems.length > 0 && !isCreateMode) {
      // If no item is selected OR the selected item doesn't exist anymore
      if (!selectedVideoId || !galleryItems.find(item => item.id === selectedVideoId)) {
        setSelectedVideoId(galleryItems[0].id);
      }
    } else if (galleryItems.length === 0 && !isCreateMode) {
      // No items available, clear selection
      setSelectedVideoId(null);
    }
  }, [galleryItems.length, selectedVideoId, isCreateMode]); // Removed galleryItems direct dependency



  // Create/Update mutations
  const createItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/gallery', 'POST', data),
    onSuccess: () => {
      toast({ title: "✅ Succès", description: "Élément de galerie créé avec succès" });
      // Invalidate gallery cache
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      persistentUploadState.reset();
      setIsCreateMode(false);
      setPendingPreviews({}); // Clear pending previews after successful save
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
      
      // 🚨 SMART CACHE REFRESH v1.0.114 - Proper cache invalidation
      console.log("🔄 SMART CACHE REFRESH - Invalidating gallery cache only");
      
      // Invalidate ALL gallery-related queries for immediate refresh across admin and public
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'public'] });
      queryClient.refetchQueries({ queryKey: ['/api/gallery'] });
      
      // Force public gallery to refresh by triggering storage event
      console.log("🔄 FORCING PUBLIC GALLERY REFRESH - Triggering storage event");
      localStorage.setItem('gallery-updated', Date.now().toString());
      
      // Dispatch custom event for immediate refresh
      window.dispatchEvent(new CustomEvent('gallery-updated', { 
        detail: { timestamp: Date.now() } 
      }));
      
      // Force complete form refresh by refetching and resetting state
      console.log("🔄 FORCING COMPLETE FORM REFRESH");
      const currentSelectedId = selectedVideoId;
      
      // Simple approach: Just refetch the data and let React handle the updates
      console.log("💰 SIMPLE REFRESH - Just refetching data");
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/gallery'] });
      }, 100);
      
      setPendingPreviews({}); // Clear pending previews after successful save
      setForceRefreshKey(prev => prev + 1); // Force image refresh
      
      console.log("✅ SMART CACHE REFRESH COMPLETE - Gallery data will be fresh fetched");
      persistentUploadState.reset();
    },
    onError: (error: any) => {
      toast({ title: "❌ Erreur", description: "Erreur lors de la mise à jour de l'élément", variant: "destructive" });
      console.error('Update error:', error);
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
      // Force immediate cache invalidation and refetch
      queryClient.removeQueries({ queryKey: ['/api/gallery'] });
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

  const handleReorder = (item: GalleryItem, direction: 'up' | 'down') => {
    console.log('🔄 REORDER CLICKED:', { itemId: item.id, itemTitle: item.titleEn, direction });
    
    const sortedItems = [...galleryItems].sort((a, b) => a.orderIndex - b.orderIndex);
    console.log('🔄 Current sorted items:', sortedItems.map(i => ({ id: i.id, title: i.titleEn, order: i.orderIndex })));
    
    const currentIndex = sortedItems.findIndex(i => i.id === item.id);
    console.log('🔄 Current index:', currentIndex);
    
    if (direction === 'up' && currentIndex > 0) {
      const targetItem = sortedItems[currentIndex - 1];
      console.log(`🔄 Moving item ${item.titleEn} UP - swapping with ${targetItem.titleEn}`);
      console.log(`🔄 IDs: ${item.id} ↔ ${targetItem.id}`);
      
      // Prevent multiple rapid clicks
      if (swapItemsMutation.isPending) {
        console.log('🔄 Swap already in progress, ignoring click');
        return;
      }
      
      swapItemsMutation.mutate({ id1: String(item.id), id2: String(targetItem.id) });
    } else if (direction === 'down' && currentIndex < sortedItems.length - 1) {
      const targetItem = sortedItems[currentIndex + 1];
      console.log(`🔄 Moving item ${item.titleEn} DOWN - swapping with ${targetItem.titleEn}`);
      console.log(`🔄 IDs: ${item.id} ↔ ${targetItem.id}`);
      
      // Prevent multiple rapid clicks
      if (swapItemsMutation.isPending) {
        console.log('🔄 Swap already in progress, ignoring click');
        return;
      }
      
      swapItemsMutation.mutate({ id1: String(item.id), id2: String(targetItem.id) });
    } else {
      console.log('🔄 Cannot move:', direction === 'up' ? 'Already at top' : 'Already at bottom');
    }
  };

  const deleteItemMutation = useMutation({
    mutationFn: (id: string | number) => {
      console.log(`🗑️ FRONTEND: Attempting to delete gallery item with ID: ${id}`);
      console.log(`🗑️ FRONTEND: ID type: ${typeof id}`);
      return apiRequest(`/api/gallery/${id}`, 'DELETE');
    },
    onSuccess: (response: any) => {
      console.log(`✅ FRONTEND: Delete successful - Response:`, response);
      
      // Clear all related caches aggressively
      queryClient.removeQueries({ queryKey: ['/api/gallery'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
      
      // Reset selected item to first available item
      setSelectedVideoId(null);
      setIsCreateMode(false);
      
      // Show success message based on response
      const message = response?.alreadyDeleted 
        ? "L'élément était déjà supprimé ou n'existait pas"
        : "Élément de galerie supprimé avec succès";
      
      toast({ 
        title: "✅ Succès", 
        description: message,
        className: "bg-emerald-50 border-emerald-200 text-emerald-900"
      });
      
      // Force refetch after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });
      }, 100);
    },
    onError: (error: any) => {
      console.error('❌ FRONTEND: Delete error details:', error);
      console.error('❌ FRONTEND: Error message:', error?.message);
      console.error('❌ FRONTEND: Error response:', error?.response);
      
      const errorMessage = error?.message || error?.response?.data?.error || "Erreur inconnue lors de la suppression";
      
      toast({ 
        title: "❌ ERREUR DE SUPPRESSION", 
        description: `Détails: ${errorMessage}`,
        variant: "destructive",
        className: "bg-red-50 border-red-200 text-red-900 font-medium"
      });
    }
  });

  const handleSave = () => {
    if (isCreateMode) {
      createItemMutation.mutate(formData);
    } else if (selectedVideoId) {
      updateItemMutation.mutate({ id: selectedVideoId, data: formData });
    }
  };

  const handleDelete = () => {
    if (selectedVideoId && !isCreateMode) {
      console.log(`🗑️ FRONTEND: handleDelete called with selectedVideoId: ${selectedVideoId}`);
      console.log(`🗑️ FRONTEND: selectedVideoId type: ${typeof selectedVideoId}`);
      
      if (confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
        console.log(`🗑️ FRONTEND: User confirmed deletion, calling mutation...`);
        deleteItemMutation.mutate(selectedVideoId);
      } else {
        console.log(`🗑️ FRONTEND: User cancelled deletion`);
      }
    } else {
      console.log(`🗑️ FRONTEND: Cannot delete - selectedVideoId: ${selectedVideoId}, isCreateMode: ${isCreateMode}`);
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

  // RESTORED: Bilingual video selection toggle handler
  const handleSameVideoToggle = (checked: boolean) => {
    setFormData({ 
      ...formData, 
      useSameVideo: checked,
      // When switching to same video, copy EN video to FR
      videoUrlFr: checked ? formData.videoUrlEn : formData.videoUrlFr
    });
  };



  if (isLoading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div 
      className="p-6 max-w-7xl mx-auto admin-container"
      style={{ 
        scrollBehavior: 'auto', // 🔄 ALT+TAB FIX v1.0.115 - Force instant scroll instead of smooth
        overflowAnchor: 'none'   // 🔄 ALT+TAB FIX v1.0.115 - Prevent anchor scrolling corrections
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
              onValueChange={(value) => {
                setSelectedVideoId(value);
                
                // Find the selected item to debug its properties
                const item = galleryItems?.find(item => item.id?.toString() === value);
                console.log('🔍 FULL SELECTED ITEM:', item);
              }}
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
                console.log('🔍 POSITION CALCULATION:', {
                  selectedItemId: selectedItem.id,
                  selectedItemTitle: selectedItem.titleEn,
                  selectedItemOrder: selectedItem.orderIndex,
                  sortedItems: sortedItems.map(item => ({ id: item.id, title: item.titleEn, order: item.orderIndex })),
                  currentIndex,
                  displayPosition: currentIndex + 1
                });
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
          {/* Status Section with Video & Image Previews */}
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
                    onCheckedChange={(checked) => {
                      // Update form data immediately
                      setFormData({...formData, isActive: checked});
                      
                      // Auto-save the isActive change immediately
                      if (selectedVideoId && !isCreateMode) {
                        console.log('🔄 Auto-saving isActive change:', checked);
                        updateItemMutation.mutate({ 
                          id: selectedVideoId, 
                          data: { isActive: checked } 
                        });
                      }
                    }}
                    className="data-[state=checked]:bg-[#2A4759]"
                  />
                  <Label className="text-base font-medium text-[#011526] dark:text-[#F2EBDC] text-center">
                    {formData.isActive ? 'Actif' : 'Inactif'}
                    {updateItemMutation.isPending && (
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
                              onClick={() => {
                                console.log('🔥 FR CROP BUTTON CLICKED!');
                                setCropperLanguage('fr');
                                setCropperOpen(true);
                                console.log('✅ FR Crop modal should now be open');
                              }}
                              variant="outline"
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 px-2 py-1 text-xs"
                            >
                              <Crop className="w-3 h-3 mr-1" />
                              Recadrer FR
                            </Button>
                            {selectedItem.static_imageUrlFr && (
                              <Button
                                onClick={async () => {
                                  try {
                                    const updateData = {
                                      static_imageUrlFr: null,
                                      cropSettings: null,
                                      language: 'fr'
                                    };
                                    
                                    await apiRequest(`/api/gallery/${selectedItem.id}`, 'PATCH', updateData);
                                    
                                    // Refresh both admin and public gallery data
                                    queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] }); // Admin cache
                                    queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });  // Public cache
                                    
                                    toast({ 
                                      title: "✅ Succès", 
                                      description: "Image française restaurée à l'original" 
                                    });
                                  } catch (error) {
                                    console.error('Error unframing French image:', error);
                                    toast({ 
                                      title: "❌ Erreur", 
                                      description: "Impossible de restaurer l'image française",
                                      variant: "destructive"
                                    });
                                  }
                                }}
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
                                // SIMPLIFIED LOGIC: Single cache-busting method
                                if (pendingPreviews.imageUrlFr) {
                                  return pendingPreviews.imageUrlFr; // Priority 1: Fresh uploads
                                }
                                if (selectedItem) {
                                  const baseUrl = getThumbnailUrl(selectedItem, 'fr');
                                  return baseUrl; // Single cache-busting only
                                }
                                return formData.imageUrlFr; // Priority 3: New items only
                              })()}
                              onLoadStart={() => {
                                const imageUrl = pendingPreviews.imageUrlFr || formData.imageUrlFr || 
                                  (selectedItem ? getThumbnailUrl(selectedItem, 'fr') : '');
                                console.log('🔍 ADMIN FR IMAGE START LOADING:', imageUrl);
                              }} 
                              alt="Aperçu Français"
                              className="w-full h-full object-contain"
                              onLoad={(e) => {
                                const img = e.target as HTMLImageElement;
                                console.warn(`🔍 ADMIN FR IMAGE LOADED:`, {
                                  src: img.src,
                                  naturalWidth: img.naturalWidth,
                                  naturalHeight: img.naturalHeight,
                                  displayWidth: img.width,
                                  displayHeight: img.height,
                                  isHighRes: img.naturalWidth > 1000,
                                  isThumbnail: img.naturalWidth <= 300
                                });
                                

                              }}
                              onError={(e) => {
                                console.error('🚨 ADMIN FR IMAGE ERROR:', e);
                              }}
                            />
                            {/* Show different badges for manual vs automatic cropping */}
                            {selectedItem?.static_imageUrlFr && 
                             selectedItem.static_imageUrlFr !== selectedItem.imageUrlFr && 
                             selectedItem.static_imageUrlFr !== formData.imageUrlFr && (
                              <div className={`absolute top-2 right-2 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                                (selectedItem as any).cropSettings?.method === 'triple-layer-white-bg' 
                                  ? 'bg-emerald-500' 
                                  : 'bg-blue-500'
                              }`}>
                                {(() => {
                                  // Real-time badge: Show current cropping state or saved state
                                  if (activeCroppingState.isActive && activeCroppingState.language === 'fr') {
                                    return activeCroppingState.hasChanges ? '✂️ Recadré FR*' : '✂️ Auto FR';
                                  }
                                  
                                  // CRITICAL FIX: For fresh uploads, ignore existing cropSettings and only use formData
                                  // This ensures new uploads start with "Auto" badge, not inherited "Recadré" badge
                                  const isUploadingNewImage = pendingPreviews.imageUrlFr || 
                                    (formData.imageUrlFr && formData.imageUrlFr !== selectedItem?.imageUrlFr);
                                  
                                  const cropSettings = isUploadingNewImage 
                                    ? formData.cropSettings  // For new uploads, only use formData cropSettings
                                    : (formData.cropSettings || (selectedItem as any).cropSettings); // For existing items, use either
                                  

                                  
                                  // Check if we have a static image (indicates any cropping was performed)
                                  const hasStaticImage = selectedItem?.static_imageUrlFr;
                                  const hasOriginalImage = selectedItem?.imageUrlFr;
                                  
                                  if (hasStaticImage && hasOriginalImage) {

                                    
                                    // MANUAL CROPPING: Check if the cropSettings indicate manual cropping
                                    if (cropSettings?.method === 'triple-layer-white-bg') {

                                      // Manual cropping was performed via the image cropper interface
                                      return formData.useSameVideo ? '✂️ Recadré EN/FR' : '✂️ Recadré FR';
                                    }
                                    
                                    // AUTO CROPPING: Sharp auto-cropping (only shows badge if cropping actually occurred)
                                    else if (cropSettings?.method === 'sharp-auto-thumbnail' && cropSettings?.cropped === true) {

                                      return formData.useSameVideo ? '✂️ Auto EN/FR' : '✂️ Auto FR';
                                    }
                                    
                                    // FALLBACK: If static image exists but no clear method, assume manual cropping
                                    else if (selectedItem.imageUrlFr !== selectedItem.static_imageUrlFr) {

                                      return formData.useSameVideo ? '✂️ Recadré EN/FR' : '✂️ Recadré FR';
                                    } else {

                                    }
                                  } else {

                                  }
                                  
                                  // No badge for: no cropSettings, no actual cropping, or same image URLs
                                  return '';
                                })()}
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
                            onLoadStart={() => console.log('🎬 FR VIDEO: Loading started for', selectedItem?.titleEn)}
                          >
                            <source 
                              src={
                                // FIXED: Match public site logic - use same priority as getVideoUrl()
                                (() => {
                                  const videoUrl = formData.videoFilename || formData.videoUrlEn || formData.videoUrlFr;
                                  console.log('🎬 FR VIDEO DEBUG (FIXED):', {
                                    videoFilename: formData.videoFilename,
                                    videoUrlEn: formData.videoUrlEn,
                                    videoUrlFr: formData.videoUrlFr,
                                    selectedVideoUrl: videoUrl,
                                    selectedItem: selectedItem?.titleEn
                                  });
                                  if (!videoUrl) return '';
                                  const baseUrl = videoUrl.startsWith('http') 
                                    ? `${videoUrl}?t=${Date.now()}&item=${selectedItem?.id}`
                                    : `/api/video-proxy?filename=${videoUrl}&t=${Date.now()}&item=${selectedItem?.id}`;
                                  return baseUrl;
                                })()
                              }
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
                              onClick={() => {
                                console.log('🔥 EN CROP BUTTON CLICKED!');
                                setCropperLanguage('en');
                                setCropperOpen(true);
                                console.log('✅ EN Crop modal should now be open');
                              }}
                              variant="outline"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white border-green-600 px-2 py-1 text-xs"
                            >
                              <Crop className="w-3 h-3 mr-1" />
                              Recadrer EN
                            </Button>
                            {selectedItem.static_imageUrlEn && (
                              <Button
                                onClick={async () => {
                                  try {
                                    const updateData = {
                                      static_imageUrlEn: null,
                                      cropSettings: null,
                                      language: 'en'
                                    };
                                    
                                    await apiRequest(`/api/gallery/${selectedItem.id}`, 'PATCH', updateData);
                                    
                                    // Refresh both admin and public gallery data
                                    queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] }); // Admin cache
                                    queryClient.invalidateQueries({ queryKey: ['/api/gallery', 'v1.0.110'] });  // Public cache
                                    
                                    toast({ 
                                      title: "✅ Success", 
                                      description: "English image restored to original" 
                                    });
                                  } catch (error) {
                                    console.error('Error unframing English image:', error);
                                    toast({ 
                                      title: "❌ Error", 
                                      description: "Unable to restore English image",
                                      variant: "destructive"
                                    });
                                  }
                                }}
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
                                // SIMPLIFIED LOGIC: Single cache-busting method
                                if (pendingPreviews.imageUrlEn) {
                                  return pendingPreviews.imageUrlEn; // Priority 1: Fresh uploads
                                }
                                if (selectedItem) {
                                  const baseUrl = getThumbnailUrl(selectedItem, 'en');
                                  return baseUrl; // Single cache-busting only
                                }
                                return formData.imageUrlEn; // Priority 3: New items only
                              })()} 
                              alt="Aperçu English"
                              className="w-full h-full object-contain"
                              onLoadStart={() => {
                                const imageUrl = pendingPreviews.imageUrlEn || formData.imageUrlEn || 
                                  (selectedItem ? getThumbnailUrl(selectedItem, 'en') : '');
                                console.log('🔍 ADMIN EN IMAGE START LOADING:', imageUrl);
                              }}
                              onLoad={(e) => {
                                const img = e.target as HTMLImageElement;
                                console.log(`🔍 Admin EN image loaded: ${img.naturalWidth}x${img.naturalHeight}`);
                              }}
                              onError={(e) => {
                                console.error('🚨 ADMIN EN IMAGE ERROR:', e);
                              }}
                            />
                            {/* Show different badges for manual vs automatic cropping */}
                            {(selectedItem?.static_imageUrlEn || selectedItem?.staticImageUrl) && (
                             (selectedItem?.static_imageUrlEn && selectedItem.static_imageUrlEn !== selectedItem.imageUrlEn) ||
                             (selectedItem?.staticImageUrl && selectedItem.staticImageUrl !== selectedItem.imageUrlEn)
                            ) && (
                              <div className={`absolute top-2 right-2 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg ${
                                (selectedItem as any).cropSettings?.method === 'triple-layer-white-bg' 
                                  ? 'bg-emerald-500' 
                                  : 'bg-blue-500'
                              }`}>
                                {(() => {
                                  console.log('🔍 BADGE DEBUG EN - cropSettings:', (selectedItem as any).cropSettings, 'method:', (selectedItem as any).cropSettings?.method);
                                  console.log('🔍 BADGE DEBUG EN - static_imageUrlEn:', selectedItem?.static_imageUrlEn);
                                  console.log('🔍 BADGE DEBUG EN - imageUrlEn:', selectedItem?.imageUrlEn);
                                  console.log('🔍 BADGE DEBUG EN - formData.useSameVideo:', formData.useSameVideo);
                                  
                                  // Real-time badge: Show current cropping state or saved state
                                  if (activeCroppingState.isActive && activeCroppingState.language === 'en') {
                                    return activeCroppingState.hasChanges ? '✂️ Recadré EN*' : '✂️ Auto EN';
                                  }
                                  
                                  // CRITICAL FIX: For fresh uploads, ignore existing cropSettings and only use formData
                                  // This ensures new uploads start with "Auto" badge, not inherited "Recadré" badge
                                  const isUploadingNewImage = pendingPreviews.imageUrlEn || 
                                    (formData.imageUrlEn && formData.imageUrlEn !== selectedItem?.imageUrlEn);
                                  
                                  const cropSettings = isUploadingNewImage 
                                    ? formData.cropSettings  // For new uploads, only use formData cropSettings
                                    : (formData.cropSettings || (selectedItem as any).cropSettings); // For existing items, use either
                                    
                                  console.log('🎯 BADGE DEBUG EN - isUploadingNewImage:', isUploadingNewImage);
                                  console.log('🎯 BADGE CROP SETTINGS - formData.cropSettings:', formData.cropSettings);
                                  console.log('🎯 BADGE CROP SETTINGS - selectedItem.cropSettings:', (selectedItem as any).cropSettings);
                                  console.log('🎯 BADGE CROP SETTINGS - final cropSettings:', cropSettings);
                                  
                                  console.log('🎯 BADGE DEBUG EN - cropSettings:', cropSettings);
                                  console.log('🎯 BADGE DEBUG EN - selectedItem.static_imageUrlEn:', selectedItem?.static_imageUrlEn);
                                  console.log('🎯 BADGE DEBUG EN - selectedItem.imageUrlEn:', selectedItem?.imageUrlEn);
                                  
                                  // Check if we have a static image (indicates any cropping was performed)
                                  const hasStaticImage = selectedItem?.static_imageUrlEn;
                                  const hasOriginalImage = selectedItem?.imageUrlEn;
                                  
                                  if (hasStaticImage && hasOriginalImage) {
                                    console.log('🎯 BADGE DEBUG EN - Has both images, checking crop method...');
                                    
                                    // MANUAL CROPPING: Check if the cropSettings indicate manual cropping
                                    if (cropSettings?.method === 'triple-layer-white-bg') {
                                      console.log('🎯 BADGE DEBUG EN - MANUAL CROPPING DETECTED');
                                      // Manual cropping was performed via the image cropper interface
                                      return formData.useSameVideo ? '✂️ Recadré EN/FR' : '✂️ Recadré EN';
                                    }
                                    
                                    // AUTO CROPPING: Sharp auto-cropping (only shows badge if cropping actually occurred)
                                    else if (cropSettings?.method === 'sharp-auto-thumbnail' && cropSettings?.cropped === true) {
                                      console.log('🎯 BADGE DEBUG EN - AUTO CROPPING DETECTED');
                                      return formData.useSameVideo ? '✂️ Auto EN/FR' : '✂️ Auto EN';
                                    }
                                    
                                    // FALLBACK: If static image exists but no clear method, assume manual cropping
                                    else if (selectedItem.imageUrlEn !== selectedItem.static_imageUrlEn) {
                                      console.log('🎯 BADGE DEBUG EN - FALLBACK MANUAL CROPPING (different URLs)');
                                      return formData.useSameVideo ? '✂️ Recadré EN/FR' : '✂️ Recadré EN';
                                    } else {
                                      console.log('🎯 BADGE DEBUG EN - No badge conditions met');
                                    }
                                  } else {
                                    console.log('🎯 BADGE DEBUG EN - Missing static or original image');
                                  }
                                  
                                  // No badge for: no cropSettings, no actual cropping, or same image URLs
                                  return '';
                                })()}
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
                            onLoadStart={() => console.log('🎬 EN VIDEO: Loading started for', selectedItem?.titleEn)}
                          >
                            <source 
                              src={
                                // FIXED: Match public site logic - use same priority as getVideoUrl()
                                (() => {
                                  const videoUrl = formData.videoFilename || formData.videoUrlEn || formData.videoUrlFr;
                                  console.log('🎬 EN VIDEO DEBUG (FIXED):', {
                                    videoFilename: formData.videoFilename,
                                    videoUrlEn: formData.videoUrlEn,
                                    videoUrlFr: formData.videoUrlFr,
                                    selectedVideoUrl: videoUrl,
                                    selectedItem: selectedItem?.titleEn
                                  });
                                  if (!videoUrl) return '';
                                  const baseUrl = videoUrl.startsWith('http') 
                                    ? `${videoUrl}?t=${Date.now()}&item=${selectedItem?.id}`
                                    : `/api/video-proxy?filename=${videoUrl}&t=${Date.now()}&item=${selectedItem?.id}`;
                                  return baseUrl;
                                })()
                              }
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

          {/* Basic Information */}
          <Card className="border-[#89BAD9] dark:border-[#2A4759]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Informations de base
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    {formData.useSameVideo ? (
                      <>
                        English <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">Source pour FR + EN</Badge>
                      </>
                    ) : (
                      "English"
                    )}
                  </h4>
                  <div>
                    <Label htmlFor="titleEn">Titre</Label>
                    <Input
                      id="titleEn"
                      value={formData.titleEn}
                      onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceEn">Prix</Label>
                    <Input
                      id="priceEn"
                      value={formData.priceEn || ''}
                      onChange={(e) => setFormData({ ...formData, priceEn: e.target.value })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sourceEn">Source</Label>
                    <Input
                      id="sourceEn"
                      value={formData.sourceEn}
                      onChange={(e) => setFormData({ ...formData, sourceEn: e.target.value })}
                      placeholder="80 photos & 10 videos"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="durationEn">Durée</Label>
                    <Input
                      id="durationEn"
                      value={formData.durationEn}
                      onChange={(e) => setFormData({ ...formData, durationEn: e.target.value })}
                      placeholder="2 minutes"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
                
                {/* French Basic Information - Always visible for independent text management */}
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    Français
                    {formData.useSameVideo && (
                      <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">
                        Texte indépendant
                      </Badge>
                    )}
                  </h4>
                  <div>
                    <Label htmlFor="titleFr">Titre</Label>
                    <Input
                      id="titleFr"
                      value={formData.titleFr}
                      onChange={(e) => setFormData({ ...formData, titleFr: e.target.value })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceFr">Prix</Label>
                    <Input
                      id="priceFr"
                      value={formData.priceFr || ''}
                      onChange={(e) => setFormData({ ...formData, priceFr: e.target.value })}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sourceFr">Source</Label>
                    <Input
                      id="sourceFr"
                      value={formData.sourceFr}
                      onChange={(e) => setFormData({ ...formData, sourceFr: e.target.value })}
                      placeholder="80 photos et 10 vidéos"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="durationFr">Durée</Label>
                    <Input
                      id="durationFr"
                      value={formData.durationFr}
                      onChange={(e) => setFormData({ ...formData, durationFr: e.target.value })}
                      placeholder="2 minutes"
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Content Descriptions */}
          <Card className="border-[#89BAD9] dark:border-[#2A4759]">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[#011526] dark:text-[#F2EBDC] mb-6 flex items-center gap-2">
                <Edit className="w-5 h-5" />
                Descriptions du contenu
              </h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    {formData.useSameVideo ? (
                      <>
                        English <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">Source pour FR + EN</Badge>
                      </>
                    ) : (
                      "English"
                    )}
                  </h4>
                  <div>
                    <Label htmlFor="storyEn">Histoire du film</Label>
                    <Textarea
                      id="storyEn"
                      value={formData.storyEn}
                      onChange={(e) => setFormData({ ...formData, storyEn: e.target.value })}
                      placeholder="This film shows..."
                      className="bg-white dark:bg-gray-800 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="situationEn">Situation du client</Label>
                    <Textarea
                      id="situationEn"
                      value={formData.situationEn}
                      onChange={(e) => setFormData({ ...formData, situationEn: e.target.value })}
                      placeholder="The Client is a wife..."
                      className="bg-white dark:bg-gray-800 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sorryMessageEn">Message d'excuses</Label>
                    <Textarea
                      id="sorryMessageEn"
                      value={formData.sorryMessageEn}
                      onChange={(e) => setFormData({ ...formData, sorryMessageEn: e.target.value })}
                      className="bg-white dark:bg-gray-800 min-h-[60px]"
                    />
                  </div>
                </div>
                
                {/* French Content Descriptions - Always visible for independent text management */}
                <div className="space-y-4">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC]">
                    Français
                    {formData.useSameVideo && (
                      <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ml-2">
                        Texte indépendant
                      </Badge>
                    )}
                  </h4>
                  <div>
                    <Label htmlFor="storyFr">Histoire du film</Label>
                    <Textarea
                      id="storyFr"
                      value={formData.storyFr}
                      onChange={(e) => setFormData({ ...formData, storyFr: e.target.value })}
                      placeholder="Ce film montre..."
                      className="bg-white dark:bg-gray-800 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="situationFr">Situation du client</Label>
                    <Textarea
                      id="situationFr"
                      value={formData.situationFr}
                      onChange={(e) => setFormData({ ...formData, situationFr: e.target.value })}
                      placeholder="Le client est une épouse..."
                      className="bg-white dark:bg-gray-800 min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sorryMessageFr">Message d'excuses</Label>
                    <Textarea
                      id="sorryMessageFr"
                      value={formData.sorryMessageFr}
                      onChange={(e) => setFormData({ ...formData, sorryMessageFr: e.target.value })}
                      className="bg-white dark:bg-gray-800 min-h-[60px]"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Media Management */}
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
                      onCheckedChange={handleSameVideoToggle}
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
                            console.log('✅ Shared video upload completed:', result);
                            // Real-time preview: Update pending state immediately
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
                            console.log('✅ Shared image upload completed:', result);
                            console.log('📸 Setting pending preview for SHARED:', result.url);
                            
                            // Handle auto-generated thumbnail data
                            const updatedFormData = {
                              ...formData,
                              imageUrlEn: result.url,
                              imageUrlFr: result.url
                            };

                            // If auto-thumbnail was generated, store it
                            if (result.staticImageUrl) {
                              console.log('🎯 Auto-thumbnail detected, updating static URLs');
                              updatedFormData.staticImageUrl = result.staticImageUrl;
                              // In shared mode, both EN and FR get the same static image
                              updatedFormData.static_imageUrlEn = result.staticImageUrl;
                              updatedFormData.static_imageUrlFr = result.staticImageUrl;
                              
                              // Store auto-crop settings if available (for badge logic)
                              if (result.auto_crop_settings) {
                                updatedFormData.cropSettings = result.auto_crop_settings;
                                console.log('🎯 Auto-crop settings applied:', result.auto_crop_settings);
                              }
                            }

                            // Real-time preview: Update pending state immediately for instant preview
                            setPendingPreviews(prev => {
                              const newPreviews = {
                                ...prev,
                                imageUrlEn: result.url,
                                imageUrlFr: result.url,
                                staticImageUrl: result.staticImageUrl || prev.staticImageUrl,
                                static_imageUrlEn: result.staticImageUrl || prev.static_imageUrlEn,
                                static_imageUrlFr: result.staticImageUrl || prev.static_imageUrlFr
                              };
                              console.log('📸 Updated pending previews (SHARED):', newPreviews);
                              return newPreviews;
                            });
                            
                            setFormData(updatedFormData);
                            persistentUploadState.imageUrlEn = result.url;
                            persistentUploadState.imageUrlFr = result.url;
                            if (result.staticImageUrl) {
                              persistentUploadState.staticImageUrl = result.staticImageUrl;
                            }
                            
                            // Force a component refresh to ensure image displays
                            setForceRefreshKey(prev => prev + 1);
                            
                            const badgeInfo = result.auto_crop_settings ? 
                              (result.auto_crop_settings.cropped ? " (Auto-crop applied)" : " (No crop needed)") : "";
                            
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
                    
                    {/* French Upload Section (Blue) - Hidden when shared mode is enabled */}
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
                              console.log('✅ French video upload completed:', result);
                              // Real-time preview: Update pending state immediately
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
                              console.log('✅ French image upload completed:', result);
                              console.log('📸 Setting pending preview for FR:', result.url);
                              
                              // Real-time preview: Update pending state immediately
                              setPendingPreviews(prev => {
                                const newPreviews = {
                                  ...prev,
                                  imageUrlFr: result.url
                                };
                                console.log('📸 Updated pending previews:', newPreviews);
                                return newPreviews;
                              });
                              
                              setFormData(prev => {
                                const newFormData = {
                                  ...prev,
                                  imageUrlFr: result.url
                                };
                                console.log('📸 Updated form data:', newFormData);
                                return newFormData;
                              });
                              
                              persistentUploadState.imageUrlFr = result.url;
                              
                              // Force a component refresh to ensure image displays
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

                    {/* English Upload Section (Green) - Modified header when shared mode is enabled */}
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
                              console.log('✅ English video upload completed:', result);
                              // Real-time preview: Update pending state immediately
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
                              console.log('✅ English image upload completed:', result);
                              console.log('🎯 Auto-crop settings received:', result.auto_crop_settings);
                              console.log('🎯 Static image URL received:', result.staticImageUrl);
                              console.log('📸 Setting pending preview for EN:', result.url);
                              
                              setPendingPreviews(prev => {
                                const newPreviews = {
                                  ...prev,
                                  imageUrlEn: result.url
                                };
                                console.log('📸 Updated pending previews:', newPreviews);
                                return newPreviews;
                              });
                              
                              // Handle auto-crop settings for new uploads
                              if (result.auto_crop_settings && result.staticImageUrl) {
                                console.log('🎯 Processing auto-crop settings for new upload');
                                setFormData(prev => ({
                                  ...prev,
                                  imageUrlEn: result.url,
                                  // Set static image URLs based on shared mode
                                  static_imageUrlEn: formData.useSameVideo ? result.staticImageUrl || null : result.staticImageUrl || null,
                                  static_imageUrlFr: formData.useSameVideo ? result.staticImageUrl || null : prev.static_imageUrlFr,
                                  // Store auto-crop settings for badge detection
                                  cropSettings: result.auto_crop_settings
                                }));
                              } else {
                                // No auto-cropping needed (image was already 3:2 ratio)
                                setFormData(prev => ({
                                  ...prev,
                                  imageUrlEn: result.url,
                                  // Clear static URLs since no cropping was needed
                                  static_imageUrlEn: null,
                                  static_imageUrlFr: formData.useSameVideo ? null : prev.static_imageUrlFr,
                                  // Clear cropSettings since no cropping occurred
                                  cropSettings: null
                                }));
                              }
                              
                              persistentUploadState.imageUrlEn = result.url;
                              
                              // Force a component refresh to ensure image displays
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

                {/* Current Content Display with Clear Language Indicators */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="font-medium text-[#011526] dark:text-[#F2EBDC] mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Contenu Actuel {formData.useSameVideo ? "(Partagé FR/EN)" : "(Séparé par langue)"}
                  </h4>
                  
                  {formData.useSameVideo ? (
                    // Shared content display
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
                    // Separate language content display
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

                {/* Manual URL Override (for advanced users) */}
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
                    // Shared URLs when using same video for both languages
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
                    // Separate URLs for French and English
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


          {/* Format Badge Section - Moved to Bottom */}
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
                
                {/* French Format and Specifications - Always visible */}
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

      {/* Image Cropper - SimpleImageCropper handles its own modal */}
      {selectedItem && cropperOpen && (() => {
        const imageUrl = getFullUrl(
          // Priority 1: Latest uploaded image from formData (fresh uploads)
          selectedItem.useSameVideo 
            ? (formData.imageUrlEn || selectedItem.imageUrlEn)
            : (cropperLanguage === 'fr' 
              ? (formData.imageUrlFr || selectedItem.imageUrlFr)
              : (formData.imageUrlEn || selectedItem.imageUrlEn))
        );
        
        console.log("🚨 CROP BUTTON DEBUG - Opening cropper for:", {
          cropperLanguage,
          imageUrl,
          selectedItemId: selectedItem.id,
          selectedItemCropSettings: selectedItem.cropSettings,
          formDataCropSettings: formData.cropSettings,
          passedInitialCropSettings: selectedItem.cropSettings
        });
        
        return (
          <SimpleImageCropper
            imageUrl={imageUrl}
            initialCropSettings={selectedItem.cropSettings}
            isParentSaving={cropSaving}
            onSave={async (blob: Blob, cropSettings: any) => {
                setCropSaving(true);
                console.log('🚀 STEP 1: CROP SAVE STARTED');
                console.log('🚀 STEP 1a: Blob size:', blob.size, 'bytes');
                console.log('🚀 STEP 1b: Crop settings:', cropSettings);
                
                try {
                  console.log('🚀 STEP 2: Starting FormData creation...');
                  await new Promise(resolve => setTimeout(resolve, 0));
                  console.log('🚀 STEP 2a: First yield complete');
                  
                  const uploadFormData = new FormData();
                  console.log('🚀 STEP 2b: FormData created');
                  
                  // CACHE-BUSTING: Extract original filename and use -C suffix approach
                  const originalImageUrl = selectedItem.useSameVideo 
                    ? (formData.imageUrlEn || selectedItem.imageUrlEn)
                    : (cropperLanguage === 'fr' 
                      ? (formData.imageUrlFr || selectedItem.imageUrlFr)
                      : (formData.imageUrlEn || selectedItem.imageUrlEn));
                  
                  const originalFilename = originalImageUrl.split('/').pop() || `item_${selectedItem.id}`;
                  console.log('🔄 CACHE-BUSTING APPROACH: Original filename:', originalFilename);
                  
                  // Use original base name with -C suffix (server will handle the exact naming)
                  const baseFilename = originalFilename.replace(/\.[^/.]+$/, ''); // Remove extension
                  const filename = `${baseFilename}-C.jpg`;
                  console.log('🚀 STEP 2c: Cropped filename generated:', filename);
                  
                  await new Promise(resolve => setTimeout(resolve, 0));
                  console.log('🚀 STEP 2d: Second yield complete');
                  
                  console.log('🚀 STEP 3: Appending image to FormData...');
                  uploadFormData.append('image', blob, filename);
                  console.log('🚀 STEP 3a: File appended successfully');
                  
                  await new Promise(resolve => setTimeout(resolve, 0));
                  console.log('🚀 STEP 3b: Third yield complete');
                  
                  uploadFormData.append('language', cropperLanguage);
                  uploadFormData.append('original_filename', originalFilename);
                  uploadFormData.append('item_id', selectedItem.id.toString());
                  uploadFormData.append('crop_settings', JSON.stringify(cropSettings));
                  console.log('🚀 STEP 3c: Language, original filename, item_id, and crop settings appended successfully');
                  
                  console.log('🚀 STEP 4: Starting static image upload request...');
                  const uploadResponse = await fetch('/api/gallery/upload-static-image', {
                    method: 'POST',
                    body: uploadFormData
                  });
                  console.log('🚀 STEP 4a: Fetch completed, status:', uploadResponse.status);
                  
                  if (!uploadResponse.ok) {
                    throw new Error(`Upload failed: ${uploadResponse.status}`);
                  }
                  
                  const uploadResult = await uploadResponse.json();
                  console.log('✅ Upload success:', uploadResult.url);
                  
                  // CRITICAL FIX: Update crop settings in database
                  console.log('🚀 STEP 5: Updating crop settings in database...');
                  const updateResponse = await fetch(`/api/gallery/${selectedItem.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      cropSettings: cropSettings
                    })
                  });
                  
                  if (!updateResponse.ok) {
                    throw new Error(`Database update failed: ${updateResponse.status}`);
                  }
                  
                  const updateResult = await updateResponse.json();
                  console.log('✅ Crop settings saved to database:', updateResult.cropSettings);
                  
                  // AGGRESSIVE CACHE REFRESH - Force admin preview to show cropped image
                  console.log('🔄 STARTING AGGRESSIVE CACHE REFRESH...');
                  
                  // SEQUENTIAL: First invalidate cache, then update refresh key
                  console.log('🔄 STEP 1: Invalidating gallery cache...');
                  await queryClient.invalidateQueries({ queryKey: ['/api/gallery'] });
                  
                  // STEP 2: Wait for refetch to complete, then update refresh key
                  console.log('🔄 STEP 2: Waiting for refetch to complete...');
                  await queryClient.refetchQueries({ queryKey: ['/api/gallery'] });
                  
                  // STEP 3: Now update refresh key with fresh data
                  const newRefreshKey = Date.now();
                  setForceRefreshKey(newRefreshKey);
                  console.log('🔄 STEP 3: Updated forceRefreshKey to:', newRefreshKey);
                  
                  // Dispatch global gallery update event
                  window.dispatchEvent(new CustomEvent('gallery-updated'));
                  
                  // SIMPLIFIED: Let React handle re-rendering with updated forceRefreshKey
                  console.log('✅ CACHE REFRESH COMPLETE - Images will update automatically');
                  
                  // Close modal immediately
                  setCropperOpen(false);
                  setCropSaving(false);
                  toast({ 
                    title: "✅ Succès", 
                    description: "Image recadrée sauvegardée" 
                  });
                  
                  console.log('✅ CROP SAVE COMPLETE - returning successfully');
                  return; // Explicitly return to resolve the Promise
                  
                } catch (error) {
                  console.error('❌ CROP ERROR - DETAILED:', error);
                  console.error('❌ ERROR TYPE:', typeof error);
                  console.error('❌ ERROR MESSAGE:', error instanceof Error ? error.message : String(error));
                  console.error('❌ ERROR STACK:', error instanceof Error ? error.stack : 'No stack');
                  
                  setCropperOpen(false);
                  setCropSaving(false);
                  
                  // Show detailed error message
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  toast({ 
                    title: "❌ Erreur de Recadrage", 
                    description: `Détails: ${errorMessage}`,
                    variant: "destructive"
                  });
                  
                  console.log('❌ CROP SAVE FAILED - throwing error to resolve Promise with rejection');
                  throw error; // Re-throw to properly reject the Promise
                }
              }}
              onCancel={() => {
                setCropperOpen(false);
                // Reset cropping state when closing
                setActiveCroppingState({
                  isActive: false,
                  language: 'en',
                  hasChanges: false
                });
              }}
            />
        );
      })()}

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