import { createDirectus, rest, authentication } from '@directus/sdk';

interface Author {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  content_text?: string;
  language: string;
  author_id?: string;
  author?: Author;
  category_id?: string;
  category?: Category;
  status: 'draft' | 'published' | 'archived';
  publish_date: string;
  scheduled_date?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  canonical_url?: string;
  og_image_url?: string;
  og_description?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  reading_time_minutes?: number;
  word_count?: number;
  is_featured?: boolean;
  is_pinned?: boolean;
  allow_comments?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

interface DirectusSchema {
  posts: Post[];
  authors: Author[];
  categories: Category[];
}

const directusUrl = import.meta.env.VITE_DIRECTUS_URL || 'https://cms.memopyk.com';

const directus = createDirectus<DirectusSchema>(directusUrl)
  .with(rest())
  .with(authentication('json'));

export default directus;

export type { Post, Author, Category, DirectusSchema };

// Asset URL helpers for Directus CDN
const CDN = 'https://cms.memopyk.com/assets';

export function assetUrl(id: string, opts?: { width?: number }) {
  const p = new URL(`${CDN}/${id}`);
  if (opts?.width) p.searchParams.set('width', String(opts.width));
  p.searchParams.set('fit', 'inside');
  p.searchParams.set('quality', '82');
  p.searchParams.set('format', 'webp');
  return p.toString();
}

export function assetSrcSet(id: string) {
  const widths = [640, 828, 1200];
  return widths.map(w => `${assetUrl(id, { width: w })} ${w}w`).join(', ');
}
