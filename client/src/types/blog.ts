export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  postCount?: number;
}

export interface GalleryImage {
  id: string;
  caption?: string;
  altText?: string;
  image: { id: string; url: string };
  displayOrder: number;
}

export interface Gallery {
  id: string;
  title: string;
  description?: string;
  layoutType: 'single' | 'side-by-side' | 'grid-2' | 'grid-3' | 'carousel';
  displayOrder: number;
  galleryImages: GalleryImage[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  language: string;
  content: string;
  contentHtml?: string;
  description: string;
  image?: { id: string; url: string } | null;
  author?: string;
  isFeatured: boolean;
  featuredOrder?: number;
  heroUrl?: string;
  heroCaption?: string;
  readTimeMinutes?: number;
  commentsEnabled?: boolean;
  disqusThreadId?: string;
  publishedAt: string;
  status: string;
  tags?: Tag[];
  galleries?: Gallery[];
  relevanceScore?: number;
  matchingTags?: number;
  primaryKeyword?: string;
  secondaryKeywords?: string;
  includeInSitemap?: boolean;
  enableFaqSchema?: boolean;
  sourceTopicTitle?: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  ogImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  ogDescription?: string;
  readingTimeMinutes?: number;
  publishDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  limit?: number;
  offset?: number;
}
