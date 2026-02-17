/**
 * Blog Public Routes
 *
 * Public blog posts, featured posts, search, and tags.
 *
 * Routes:
 * - GET /blog/posts - List published posts with pagination
 * - GET /blog/featured - Get featured posts
 * - GET /blog/posts/search - Full-text search
 * - GET /blog/posts/:slug/related - Get related posts
 * - GET /blog/posts/:slug/gallery - Get post galleries (stub)
 * - GET /blog/tags - Get all tags with post counts
 * - GET /blog/posts/:slug - Get single post by slug
 */

import { Router, Request, Response } from 'express';
import { blogCacheGet, blogCacheSet } from './blog-shared';
import { db } from '../db';
import { blogPosts, blogTags, blogPostTags, blogGalleries } from '@shared/schema';
import { eq, and, or, desc, asc, ne, lte, ilike, inArray, notInArray, sql } from 'drizzle-orm';

const router = Router();

// ============================================================================
// PUBLIC BLOG ROUTES
// ============================================================================

/**
 * GET /blog/posts
 * List published blog posts with pagination
 */
router.get('/blog/posts', async (req: Request, res: Response) => {
  try {
    const { language, limit = 24, offset = 0 } = req.query;

    // Validate language parameter
    if (!language || (language !== 'en-US' && language !== 'fr-FR')) {
      return res.status(400).json({ error: 'Invalid or missing language parameter. Must be en-US or fr-FR' });
    }

    const cacheKey = `posts:${language}:${limit}:${offset}`;
    const cached = blogCacheGet(cacheKey);
    if (cached) return res.json(cached);

    const parsedLimit = parseInt(limit as string);
    const parsedOffset = parseInt(offset as string);

    // Query published posts only
    const posts = await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.language, language as 'en-US' | 'fr-FR'),
        eq(blogPosts.status, 'published'),
        lte(blogPosts.publishedAt, new Date())
      ))
      .orderBy(desc(blogPosts.isFeatured), asc(blogPosts.featuredOrder), desc(blogPosts.publishedAt))
      .limit(parsedLimit)
      .offset(parsedOffset);

    // Get total count
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(blogPosts)
      .where(and(
        eq(blogPosts.language, language as 'en-US' | 'fr-FR'),
        eq(blogPosts.status, 'published'),
        lte(blogPosts.publishedAt, new Date())
      ));

    // Transform database fields to match frontend expectations
    const transformedPosts = posts.map((post) => ({
      ...post,
      publishDate: post.publishedAt || post.createdAt,
      featuredImageUrl: post.heroUrl,
      excerpt: post.description
    }));

    const result = {
      success: true,
      data: transformedPosts,
      total: total || 0,
      limit: parsedLimit,
      offset: parsedOffset
    };

    blogCacheSet(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch blog posts' });
  }
});

/**
 * GET /blog/featured
 * Get featured blog posts only
 */
router.get('/blog/featured', async (req: Request, res: Response) => {
  try {
    const { language, limit = 3 } = req.query;

    if (!language || (language !== 'en-US' && language !== 'fr-FR')) {
      return res.status(400).json({ error: 'Invalid or missing language parameter. Must be en-US or fr-FR' });
    }

    const cacheKey = `featured:${language}:${limit}`;
    const cached = blogCacheGet(cacheKey);
    if (cached) return res.json(cached);

    const posts = await db
      .select()
      .from(blogPosts)
      .where(and(
        eq(blogPosts.language, language as 'en-US' | 'fr-FR'),
        eq(blogPosts.status, 'published'),
        eq(blogPosts.isFeatured, true),
        lte(blogPosts.publishedAt, new Date())
      ))
      .orderBy(asc(blogPosts.featuredOrder), desc(blogPosts.publishedAt))
      .limit(parseInt(limit as string));

    const transformedPosts = posts.map((post) => ({
      ...post,
      publishDate: post.publishedAt || post.createdAt,
      featuredImageUrl: post.heroUrl,
      excerpt: post.description,
      image: post.heroUrl ? { url: post.heroUrl } : null
    }));

    const result = {
      success: true,
      data: transformedPosts
    };

    blogCacheSet(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching featured blog posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch featured posts' });
  }
});

/**
 * GET /blog/posts/search
 * Full-text search for blog posts
 */
router.get('/blog/posts/search', async (req: Request, res: Response) => {
  try {
    const { q, language = 'en-US', limit = 10, offset = 0 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query (q) is required' });
    }

    const searchTerm = `%${q}%`;
    const parsedLimit = parseInt(limit as string);
    const parsedOffset = parseInt(offset as string);

    const whereCondition = and(
      eq(blogPosts.language, language as string),
      eq(blogPosts.status, 'published'),
      lte(blogPosts.publishedAt, new Date()),
      or(
        ilike(blogPosts.title, searchTerm),
        ilike(blogPosts.description, searchTerm),
        ilike(blogPosts.contentHtml, searchTerm)
      )
    );

    const posts = await db
      .select()
      .from(blogPosts)
      .where(whereCondition)
      .orderBy(desc(blogPosts.publishedAt))
      .limit(parsedLimit)
      .offset(parsedOffset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(blogPosts)
      .where(whereCondition);

    res.json({
      success: true,
      data: posts,
      total: total || 0,
      limit: parsedLimit,
      offset: parsedOffset
    });
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /blog/posts/:slug/related
 * Get related posts based on shared tags
 */
router.get('/blog/posts/:slug/related', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit as string) || 3;

    // Get the current post
    const [currentPost] = await db
      .select({
        id: blogPosts.id,
        language: blogPosts.language,
        primaryKeyword: blogPosts.primaryKeyword,
        secondaryKeywords: blogPosts.secondaryKeywords
      })
      .from(blogPosts)
      .where(and(
        eq(blogPosts.slug, slug),
        eq(blogPosts.status, 'published')
      ))
      .limit(1);

    if (!currentPost) {
      return res.json({ success: true, data: [], total: 0 });
    }

    // Strategy 1: Match by shared tags
    let relatedPosts: any[] = [];

    const currentTags = await db
      .select({ tagId: blogPostTags.tagId })
      .from(blogPostTags)
      .where(eq(blogPostTags.postId, currentPost.id));

    if (currentTags.length > 0) {
      const tagIds = currentTags.map(t => t.tagId);

      // Get all post-tag associations for those tags, excluding the current post
      const relatedPostTagRows = await db
        .select({
          postId: blogPostTags.postId,
          tagId: blogPostTags.tagId
        })
        .from(blogPostTags)
        .where(and(
          inArray(blogPostTags.tagId, tagIds),
          ne(blogPostTags.postId, currentPost.id)
        ));

      // Get unique post IDs that share tags
      const relatedPostIds = [...new Set(relatedPostTagRows.map(r => r.postId))];

      if (relatedPostIds.length > 0) {
        // Fetch those posts
        const candidatePosts = await db
          .select()
          .from(blogPosts)
          .where(and(
            inArray(blogPosts.id, relatedPostIds),
            eq(blogPosts.status, 'published'),
            eq(blogPosts.language, currentPost.language)
          ));

        // Score by number of shared tags
        const postScores: { [key: string]: { post: any; score: number } } = {};
        relatedPostTagRows.forEach(row => {
          const post = candidatePosts.find(p => p.id === row.postId);
          if (post) {
            if (!postScores[post.id]) {
              postScores[post.id] = { post, score: 0 };
            }
            postScores[post.id].score++;
          }
        });

        relatedPosts = Object.values(postScores)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(item => ({
            ...item.post,
            featuredImageUrl: item.post.heroUrl,
            publishDate: item.post.publishedAt
          }));
      }
    }

    // Strategy 2: Fallback to same-language posts when tags return insufficient results
    if (relatedPosts.length < limit) {
      const excludeIds = [currentPost.id, ...relatedPosts.map((p: any) => p.id)];

      const fallbackPosts = await db
        .select()
        .from(blogPosts)
        .where(and(
          eq(blogPosts.language, currentPost.language),
          eq(blogPosts.status, 'published'),
          notInArray(blogPosts.id, excludeIds),
          lte(blogPosts.publishedAt, new Date())
        ))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(limit - relatedPosts.length);

      if (fallbackPosts.length > 0) {
        const transformed = fallbackPosts.map((post) => ({
          ...post,
          featuredImageUrl: post.heroUrl,
          publishDate: post.publishedAt
        }));
        relatedPosts = [...relatedPosts, ...transformed];
      }
    }

    res.json({
      success: true,
      data: relatedPosts,
      total: relatedPosts.length
    });
  } catch (error) {
    console.error('Error fetching related posts:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /blog/posts/:slug/gallery
 * Get post gallery images, transformed to match frontend Gallery interface
 */
router.get('/blog/posts/:slug/gallery', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const cacheKey = `gallery:${slug}`;
    const cached = blogCacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Get post by slug to get the post_id
    const [post] = await db
      .select({ id: blogPosts.id, title: blogPosts.title })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);

    if (!post) {
      return res.json({ success: true, data: [], total: 0 });
    }

    // Get all gallery images for this post
    const images = await db
      .select()
      .from(blogGalleries)
      .where(eq(blogGalleries.postId, post.id))
      .orderBy(asc(blogGalleries.sort));

    // If no images, return empty
    if (images.length === 0) {
      const empty = { success: true, data: [], total: 0 };
      blogCacheSet(cacheKey, empty);
      return res.json(empty);
    }

    // Transform flat images to Gallery format expected by frontend
    // All images for a post become one gallery with layout based on count
    const layoutType = images.length === 1 ? 'single'
      : images.length === 2 ? 'side-by-side'
      : images.length <= 4 ? 'grid-2'
      : 'carousel';

    const gallery = {
      id: `gallery-${post.id}`,
      title: '',
      description: '',
      layoutType,
      displayOrder: 0,
      galleryImages: images.map((img, idx) => ({
        id: img.id,
        caption: img.title || '',
        altText: img.alt || '',
        image: { id: img.id, url: img.url },
        displayOrder: img.sort ?? idx
      }))
    };

    const result = {
      success: true,
      data: [gallery],
      total: 1
    };

    blogCacheSet(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching galleries:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /blog/tags
 * Get all public blog tags with post counts
 */
router.get('/blog/tags', async (req: Request, res: Response) => {
  try {
    const cacheKey = 'tags';
    const cached = blogCacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Get all tags
    const tags = await db
      .select()
      .from(blogTags)
      .orderBy(asc(blogTags.name));

    // Get post counts: join post_tags with posts, filter published
    const tagCounts = await db
      .select({
        tagId: blogPostTags.tagId,
        count: sql<number>`count(*)::int`
      })
      .from(blogPostTags)
      .innerJoin(blogPosts, eq(blogPostTags.postId, blogPosts.id))
      .where(eq(blogPosts.status, 'published'))
      .groupBy(blogPostTags.tagId);

    // Build count map
    const counts: { [key: string]: number } = {};
    tagCounts.forEach(row => {
      counts[row.tagId] = row.count;
    });

    // Add counts to tags
    const tagsWithCounts = tags.map(tag => ({
      ...tag,
      postCount: counts[tag.id] || 0
    }));

    const result = {
      success: true,
      data: tagsWithCounts,
      total: tagsWithCounts.length
    };

    blogCacheSet(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /blog/posts/:slug
 * Get single published blog post by slug (public detail page)
 * NOTE: This MUST be after all other /blog/posts/* routes
 */
router.get('/blog/posts/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { language } = req.query;

    const cacheKey = `post:${slug}:${language || 'any'}`;
    const cached = blogCacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Build where conditions
    const conditions = [
      eq(blogPosts.slug, slug),
      eq(blogPosts.status, 'published'),
      lte(blogPosts.publishedAt, new Date())
    ];
    if (language) {
      conditions.push(eq(blogPosts.language, language as string));
    }

    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(...conditions))
      .limit(1);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found or not published'
      });
    }

    // Fetch tags for this post via join
    const postTagRows = await db
      .select({
        tag: blogTags
      })
      .from(blogPostTags)
      .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
      .where(eq(blogPostTags.postId, post.id));

    const tags = postTagRows.map(row => row.tag);

    // Transform database fields to match frontend expectations
    const transformedPost = {
      ...post,
      publishDate: post.publishedAt || post.createdAt,
      featuredImageUrl: post.heroUrl,
      content: post.contentHtml,
      tags
    };

    blogCacheSet(cacheKey, transformedPost);
    res.json(transformedPost);
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch blog post' });
  }
});

export default router;
