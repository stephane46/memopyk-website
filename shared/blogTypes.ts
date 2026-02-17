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
