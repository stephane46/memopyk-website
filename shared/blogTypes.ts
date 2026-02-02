/**
 * Shared Blog Post Types
 * Used by: BlogManagePosts, BlogEditor, BlogAICreator
 *
 * Note: BlogTag type is defined in schema.ts (Drizzle ORM inferred type)
 */

export type BlogPostStatus = 'draft' | 'in_review' | 'published';

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  language: string;
  status: BlogPostStatus;
  description: string;
  is_featured: boolean;
  created_at: string;
  published_at: string | null;
  hero_url: string | null;
  // Optional fields - present depending on context
  content_html?: string;           // Full content (BlogEditor)
  seo?: any;                       // SEO metadata (BlogEditor)
  source_topic_id?: string | null; // Content hub reference (BlogManagePosts)
  primary_keyword?: string | null; // SEO keyword (BlogManagePosts)
  secondary_keywords?: string[] | null; // SEO keywords (BlogManagePosts)
};
