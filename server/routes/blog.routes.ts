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
import { getSupabase, setNoCacheHeaders } from './blog-shared';

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

    console.log(`🔍 Fetching blog posts for ${language}`);

    const supabase = getSupabase();

    // Query published posts only
    const { data: posts, error, count } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .eq('language', language)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('is_featured', { ascending: false })
      .order('featured_order', { ascending: true, nullsFirst: false })
      .order('published_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      console.error('❌ Error fetching posts:', error);
      throw error;
    }

    // Transform database fields to match frontend expectations
    const transformedPosts = (posts || []).map((post: any) => ({
      ...post,
      publish_date: post.published_at || post.created_at,
      featured_image_url: post.hero_url,
      excerpt: post.description
    }));

    console.log(`✅ Blog posts fetched: ${transformedPosts.length} posts`);

    setNoCacheHeaders(res);

    res.json({
      success: true,
      data: transformedPosts,
      total: count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('❌ Error fetching blog posts:', error);
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

    console.log(`🔍 Fetching featured blog posts for ${language}`);

    const supabase = getSupabase();

    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('language', language)
      .eq('status', 'published')
      .eq('is_featured', true)
      .lte('published_at', new Date().toISOString())
      .order('featured_order', { ascending: true, nullsFirst: false })
      .order('published_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      console.error('❌ Error fetching featured posts:', error);
      throw error;
    }

    const transformedPosts = (posts || []).map((post: any) => ({
      ...post,
      publish_date: post.published_at || post.created_at,
      featured_image_url: post.hero_url,
      excerpt: post.description,
      image: post.hero_url ? { url: post.hero_url } : null
    }));

    console.log(`✅ Featured blog posts fetched: ${transformedPosts.length} posts`);

    setNoCacheHeaders(res);

    res.json({
      success: true,
      data: transformedPosts
    });
  } catch (error) {
    console.error('❌ Error fetching featured blog posts:', error);
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
    const supabase = getSupabase();

    const { data: posts, error, count } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .eq('language', language)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},content_html.ilike.${searchTerm}`)
      .order('published_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: posts,
      total: count || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
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

    const supabase = getSupabase();

    // Get the current post
    const { data: currentPost, error: postError } = await supabase
      .from('blog_posts')
      .select('id, language')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (postError || !currentPost) {
      return res.json({ success: true, data: [], total: 0 });
    }

    // Get tags for this post
    const { data: currentTags, error: tagsError } = await supabase
      .from('blog_post_tags')
      .select('tag_id')
      .eq('post_id', currentPost.id);

    if (tagsError || !currentTags || currentTags.length === 0) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const tagIds = currentTags.map((t: any) => t.tag_id);

    // Find other posts with same tags
    const { data: relatedPostTags, error: relatedError } = await supabase
      .from('blog_post_tags')
      .select('post_id, blog_posts(*)')
      .in('tag_id', tagIds)
      .neq('post_id', currentPost.id);

    if (relatedError) throw relatedError;

    // Group by post and count shared tags
    const postScores: { [key: string]: { post: any; score: number } } = {};

    relatedPostTags?.forEach((item: any) => {
      const post = item.blog_posts;
      if (post && post.status === 'published' && post.language === currentPost.language) {
        if (!postScores[post.id]) {
          postScores[post.id] = { post, score: 0 };
        }
        postScores[post.id].score++;
      }
    });

    // Sort by score and take top N
    const relatedPosts = Object.values(postScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({
        ...item.post,
        featured_image_url: item.post.hero_url,
        publish_date: item.post.published_at
      }));

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

    const supabase = getSupabase();

    // Get post by slug to get the post_id
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('id, title')
      .eq('slug', slug)
      .single();

    if (postError || !post) {
      return res.json({ success: true, data: [], total: 0 });
    }

    // Get all gallery images for this post
    const { data: images, error: imagesError } = await supabase
      .from('blog_galleries')
      .select('*')
      .eq('post_id', post.id)
      .order('sort', { ascending: true, nullsFirst: false });

    if (imagesError) {
      console.error('Error fetching gallery images:', imagesError);
      throw imagesError;
    }

    // If no images, return empty
    if (!images || images.length === 0) {
      return res.json({ success: true, data: [], total: 0 });
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
      layout_type: layoutType,
      display_order: 0,
      gallery_images: images.map((img: any, idx: number) => ({
        id: img.id,
        caption: img.title || '',
        alt_text: img.alt || '',
        image: { id: img.id, url: img.url },
        display_order: img.sort ?? idx
      }))
    };

    res.json({
      success: true,
      data: [gallery],
      total: 1
    });
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
    const supabase = getSupabase();

    // Get all tags
    const { data: tags, error: tagsError } = await supabase
      .from('blog_tags')
      .select('*')
      .order('name', { ascending: true });

    if (tagsError) throw tagsError;

    // Get post counts for each tag
    const { data: tagCounts, error: countsError } = await supabase
      .from('blog_post_tags')
      .select('tag_id, blog_posts!inner(status)');

    if (countsError) throw countsError;

    // Calculate published post count per tag
    const counts: { [key: string]: number } = {};
    tagCounts?.forEach((item: any) => {
      if ((item.blog_posts as any).status === 'published') {
        counts[item.tag_id] = (counts[item.tag_id] || 0) + 1;
      }
    });

    // Add counts to tags
    const tagsWithCounts = tags?.map((tag: any) => ({
      ...tag,
      post_count: counts[tag.id] || 0
    })) || [];

    res.json({
      success: true,
      data: tagsWithCounts,
      total: tagsWithCounts.length
    });
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

    console.log(`🔍 Fetching blog post: ${slug} (language: ${language})`);

    const supabase = getSupabase();

    // Query for published post
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .single();

    if (language) {
      query = query.eq('language', language);
    }

    const { data: post, error } = await query;

    if (error || !post) {
      console.log(`❌ Blog post not found: ${slug}`);
      return res.status(404).json({
        success: false,
        error: 'Post not found or not published'
      });
    }

    // Fetch tags for this post
    const { data: postTags, error: tagsError } = await supabase
      .from('blog_post_tags')
      .select('blog_tags(*)')
      .eq('post_id', post.id);

    const tags = postTags?.map((pt: any) => pt.blog_tags).filter(Boolean) || [];

    // Transform database fields to match frontend expectations
    const transformedPost = {
      ...post,
      publish_date: post.published_at || post.created_at,
      featured_image_url: post.hero_url,
      content: post.content_html,
      tags: tags
    };

    console.log(`✅ Blog post found: ${post.title} (${tags.length} tags)`);
    res.json(transformedPost);
  } catch (error) {
    console.error('❌ Error fetching blog post:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch blog post' });
  }
});

export default router;
