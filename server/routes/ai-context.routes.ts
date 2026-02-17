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
 * - POST /api/admin/translate - Translate content using Claude API
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import { db } from '../db';
import { aiContext, blogPosts, blogPostTags, blogTags } from '@shared/schema';
import { eq, desc, asc } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

/**
 * GET /api/admin/ai-context
 * List all AI context entries (admin only)
 */
router.get('/admin/ai-context', requireAdmin, async (req: Request, res: Response) => {
  try {
    const data = await db.select().from(aiContext)
      .orderBy(asc(aiContext.category), asc(aiContext.sortOrder));

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

    const [data] = await db.select().from(aiContext)
      .where(eq(aiContext.key, key)).limit(1);

    if (!data) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
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

    const [data] = await db.update(aiContext)
      .set({
        content,
        updatedAt: new Date(),
        updatedBy: 'admin'
      })
      .where(eq(aiContext.key, key))
      .returning();

    if (!data) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    console.log(`AI context updated: ${key}`);
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
  // Only allow internal requests (from localhost / same server)
  const remoteAddr = req.ip || req.socket.remoteAddress || '';
  const isLocalhost = remoteAddr === '127.0.0.1' || remoteAddr === '::1' || remoteAddr === '::ffff:127.0.0.1';
  if (!isLocalhost) {
    return res.status(403).json({ error: 'Internal endpoint - localhost only' });
  }

  try {
    // Fetch all AI context entries
    const contextEntries = await db.select({
      key: aiContext.key,
      content: aiContext.content,
      category: aiContext.category
    })
      .from(aiContext)
      .orderBy(asc(aiContext.category), asc(aiContext.sortOrder));

    // Fetch published posts for content awareness
    const posts = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      language: blogPosts.language,
      contentHtml: blogPosts.contentHtml
    })
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(50);

    // Fetch tags for the posts
    const postIds = posts.map(p => p.id);
    let postTagMap: Record<string, string[]> = {};
    if (postIds.length > 0) {
      const tagRows = await db.select({
        postId: blogPostTags.postId,
        tagName: blogTags.name
      })
        .from(blogPostTags)
        .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id));

      for (const row of tagRows) {
        if (postIds.includes(row.postId)) {
          if (!postTagMap[row.postId]) postTagMap[row.postId] = [];
          postTagMap[row.postId].push(row.tagName);
        }
      }
    }

    // Group context entries by category
    const grouped: Record<string, Record<string, string>> = {};
    for (const entry of contextEntries) {
      if (!grouped[entry.category]) {
        grouped[entry.category] = {};
      }
      grouped[entry.category][entry.key] = entry.content;
    }

    // Format posts with summary (first 200 chars of content, stripped of HTML)
    const publishedPosts = posts.map((post) => {
      // Strip HTML and get first 200 characters
      const plainText = (post.contentHtml || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const summary = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');

      return {
        title: post.title,
        slug: post.slug,
        language: post.language,
        tags: postTagMap[post.id] || [],
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

/**
 * POST /api/admin/translate
 * Translate blog content using Claude API with Brand Brain context
 * Requires admin auth
 *
 * Note: This endpoint returns the raw translated text for the Translation Assistant UI.
 * For one-click translation from the Posts list, use POST /admin/blog/posts/:id/translate with method: 'ai'
 */
router.post('/admin/translate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage, sourceLanguage, title, slug, description } = req.body;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }
    if (!targetLanguage || !['en-US', 'fr-FR'].includes(targetLanguage)) {
      return res.status(400).json({ success: false, error: 'Target language must be en-US or fr-FR' });
    }
    if (!sourceLanguage || !['en-US', 'fr-FR'].includes(sourceLanguage)) {
      return res.status(400).json({ success: false, error: 'Source language must be en-US or fr-FR' });
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Translation service not configured. Please contact administrator.'
      });
    }

    // Import the shared translation service functions
    const { translateContent, fetchAIContext } = await import('./translation-service');

    // Fetch AI context
    const aiCtx = await fetchAIContext();

    // Translate content using shared service
    const result = await translateContent(
      {
        text,
        title: title || 'Untitled',
        slug: slug || '',
        description: description || '',
        sourceLanguage,
        targetLanguage
      },
      aiCtx
    );

    // Return the raw response for the Translation Assistant UI to parse
    res.json({
      success: true,
      translatedText: result.rawResponse,
      model: result.model,
      usage: result.usage
    });

  } catch (error) {
    console.error('Error in POST /api/admin/translate:', error);

    // Handle specific Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      return res.status(error.status || 500).json({
        success: false,
        error: `Translation API error: ${error.message}`
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to translate content'
    });
  }
});

export default router;
