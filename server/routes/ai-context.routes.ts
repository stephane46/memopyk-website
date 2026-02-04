/**
 * AI Context Routes
 *
 * Brand Brain system - central context for Claude API calls
 *
 * Routes:
 * - GET /api/admin/ai-context - List all entries (admin)
 * - GET /api/admin/ai-context/:key - Get single entry by key
 * - PUT /api/admin/ai-context/:key - Update content for a key (admin)
 * - GET /api/internal/ai-context/full - Full context for Claude API calls
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import { getSupabase } from './blog-shared';

const router = Router();

/**
 * GET /api/admin/ai-context
 * List all AI context entries (admin only)
 */
router.get('/admin/ai-context', requireAdmin, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('ai_context')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching AI context:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/admin/ai-context:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch AI context'
    });
  }
});

/**
 * GET /api/admin/ai-context/:key
 * Get single AI context entry by key
 */
router.get('/admin/ai-context/:key', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('ai_context')
      .select('*')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Entry not found' });
      }
      console.error('Error fetching AI context entry:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in GET /api/admin/ai-context/:key:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch AI context entry'
    });
  }
});

/**
 * PUT /api/admin/ai-context/:key
 * Update AI context entry content
 */
router.put('/admin/ai-context/:key', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ success: false, error: 'Content must be a string' });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('ai_context')
      .update({
        content,
        updated_at: new Date().toISOString(),
        updated_by: 'admin' // Could be enhanced to track actual user
      })
      .eq('key', key)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Entry not found' });
      }
      console.error('Error updating AI context entry:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`✅ AI context updated: ${key}`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in PUT /api/admin/ai-context/:key:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update AI context entry'
    });
  }
});

/**
 * GET /api/internal/ai-context/full
 * Returns full context for Claude API calls
 * No auth required - internal server-to-server endpoint
 */
router.get('/internal/ai-context/full', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    // Fetch all AI context entries
    const { data: contextEntries, error: contextError } = await supabase
      .from('ai_context')
      .select('key, content, category')
      .order('category')
      .order('sort_order');

    if (contextError) {
      console.error('Error fetching AI context:', contextError);
      return res.status(500).json({ success: false, error: contextError.message });
    }

    // Fetch published posts for content awareness
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select(`
        title,
        slug,
        language,
        content_html,
        blog_post_tags (
          blog_tags (
            name
          )
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50); // Limit to recent 50 posts for context size

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return res.status(500).json({ success: false, error: postsError.message });
    }

    // Group context entries by category
    const grouped: Record<string, Record<string, string>> = {};
    for (const entry of contextEntries || []) {
      if (!grouped[entry.category]) {
        grouped[entry.category] = {};
      }
      grouped[entry.category][entry.key] = entry.content;
    }

    // Format posts with summary (first 200 chars of content, stripped of HTML)
    const publishedPosts = (posts || []).map((post: any) => {
      // Strip HTML and get first 200 characters
      const plainText = (post.content_html || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const summary = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');

      // Extract tag names
      const tags = (post.blog_post_tags || [])
        .map((pt: any) => pt.blog_tags?.name)
        .filter(Boolean);

      return {
        title: post.title,
        slug: post.slug,
        language: post.language,
        tags,
        summary
      };
    });

    res.json({
      brand: grouped.brand || {},
      translation: grouped.translation || {},
      published_posts: publishedPosts
    });
  } catch (error) {
    console.error('Error in GET /api/internal/ai-context/full:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch full AI context'
    });
  }
});

export default router;
