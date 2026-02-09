// Shared types and utilities for Gallery Management

export interface GalleryItem {
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
  useSameVideo: boolean;
  videoWidth: number;
  videoHeight: number;
  videoOrientation: string;
  imageUrlEn: string;
  imageUrlFr: string;
  staticImageUrl: string | null;
  static_imageUrlEn?: string | null;
  static_imageUrlFr?: string | null;
  cropSettings?: any;
  orderIndex: number;
  isActive: boolean;
}

export interface GalleryFormData {
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
  useSameVideo: boolean;
  videoWidth: number;
  videoHeight: number;
  videoOrientation: string;
  imageUrlEn: string;
  imageUrlFr: string;
  staticImageUrl: string;
  static_imageUrlEn: string | null;
  static_imageUrlFr: string | null;
  cropSettings: any;
  isActive: boolean;
}

export interface PendingPreviews {
  videoUrlEn?: string;
  videoUrlFr?: string;
  imageUrlEn?: string;
  imageUrlFr?: string;
  videoFilename?: string;
  staticImageUrl?: string;
  static_imageUrlEn?: string;
  static_imageUrlFr?: string;
  cropSettings?: any;
}

export interface ActiveCroppingState {
  isActive: boolean;
  language: 'en' | 'fr';
  hasChanges: boolean;
}

// Helper function to convert filename to full URL if needed
export const getFullUrl = (value: string): string => {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${value}`;
};

// Module-level persistent state that survives component re-creations
export const persistentUploadState = {
  videoUrlEn: '',
  imageUrlEn: '',
  videoUrlFr: '',
  imageUrlFr: '',
  videoFilename: '',
  videoFilename_en: '',
  videoFilename_fr: '',
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

export const DEFAULT_FORM_DATA: GalleryFormData = {
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
  videoFilename: '',
  useSameVideo: true,
  videoWidth: 16,
  videoHeight: 9,
  videoOrientation: 'landscape',
  imageUrlEn: '',
  imageUrlFr: '',
  staticImageUrl: '',
  static_imageUrlEn: null,
  static_imageUrlFr: null,
  cropSettings: null,
  isActive: true
};
