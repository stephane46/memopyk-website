/**
 * Shared Blog Post Types
 * Used by: BlogManagePosts, BlogEditor, BlogAICreator
 *
 * Note: BlogTag type is defined in schema.ts (Drizzle ORM inferred type)
 */

export type BlogPostStatus = 'draft' | 'in_review' | 'published' | 'archived';

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: BlogPostStatus;
  description: string;
  isFeatured: boolean;
  createdAt: string;
  publishedAt: string | null;
  heroUrl: string | null;
  // Optional fields - present depending on context
  contentHtml?: string;           // Full content (BlogEditor)
  seo?: any;                       // SEO metadata (BlogEditor)
  sourceTopicId?: string | null; // Content hub reference (BlogManagePosts)
  sourceTopicTitle?: string | null; // Content hub topic title
  primaryKeyword?: string | null; // SEO keyword (BlogManagePosts)
  secondaryKeywords?: string[] | null; // SEO keywords (BlogManagePosts)
  featuredOrder?: number;
  includeInSitemap?: boolean;
  enableFaqSchema?: boolean;
};

/**
 * Shared volume range breakpoints for keyword analytics.
 * Used by: ContentProductionKeywords (frontend labels), content.routes (backend filtering & stats)
 */
export const VOLUME_RANGES: Record<string, { min: number; max: number; label: string }> = {
  mega:    { min: 50000, max: 999999999, label: '50,000+' },
  high:    { min: 5000,  max: 49999,     label: '5,000 - 49,999' },
  medium:  { min: 500,   max: 4999,      label: '500 - 4,999' },
  low:     { min: 50,    max: 499,       label: '50 - 499' },
  minimal: { min: 0,     max: 49,        label: '0 - 49' },
};
