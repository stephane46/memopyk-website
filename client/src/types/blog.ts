export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  post_count?: number;
}

export interface GalleryImage {
  id: string;
  caption?: string;
  alt_text?: string;
  image: { id: string; url: string };
  display_order: number;
}

export interface Gallery {
  id: string;
  title: string;
  description?: string;
  layout_type: 'single' | 'side-by-side' | 'grid-2' | 'grid-3' | 'carousel';
  display_order: number;
  gallery_images: GalleryImage[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  language: string;
  content: string;
  description: string;
  image?: { id: string; url: string } | null;
  author?: string;
  is_featured: boolean;
  featured_order?: number;
  hero_caption?: string;
  read_time_minutes?: number;
  comments_enabled?: boolean;
  disqus_thread_id?: string;
  published_at: string;
  status: string;
  tags?: Tag[];
  galleries?: Gallery[];
  relevance_score?: number;
  matching_tags?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  limit?: number;
  offset?: number;
}
