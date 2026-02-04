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
import { getSupabase } from './blog-shared';
import Anthropic from '@anthropic-ai/sdk';

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

/**
 * POST /api/admin/translate
 * Translate blog content using Claude API with Brand Brain context
 * Requires admin auth
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

    // Fetch AI context internally
    const supabase = getSupabase();
    const { data: contextEntries, error: contextError } = await supabase
      .from('ai_context')
      .select('key, content, category')
      .order('category')
      .order('sort_order');

    if (contextError) {
      console.error('Error fetching AI context:', contextError);
      return res.status(500).json({ success: false, error: 'Failed to fetch AI context' });
    }

    // Group context entries by category
    const grouped: Record<string, Record<string, string>> = {};
    for (const entry of contextEntries || []) {
      if (!grouped[entry.category]) {
        grouped[entry.category] = {};
      }
      grouped[entry.category][entry.key] = entry.content;
    }

    // Fetch published posts for reference
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('title, slug, language')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20);

    const publishedPostsList = (posts || [])
      .map((p: any) => `- ${p.title} (/${p.language}/blog/${p.slug})`)
      .join('\n');

    // Build language labels
    const targetLangLabel = targetLanguage === 'en-US' ? 'English' : 'French';
    const sourceLangLabel = sourceLanguage === 'en-US' ? 'English' : 'French';
    const targetLangCode = targetLanguage === 'en-US' ? 'en' : 'fr';

    // Build system prompt with Brand Brain context
    const brandIdentity = grouped.brand?.brand_identity || '';
    const toneVoice = grouped.brand?.tone_voice || '';
    const translationRules = grouped.translation?.translation_rules || '';

    const systemPrompt = `You are a professional translator for MEMOPYK, a premium video digitization service.

${brandIdentity ? `## Brand Identity\n${brandIdentity}\n` : ''}
${toneVoice ? `## Tone of Voice\n${toneVoice}\n` : ''}
${translationRules ? `## Translation Guidelines\n${translationRules}\n` : ''}

You are translating blog content from ${sourceLangLabel} to ${targetLangLabel}.

CRITICAL RULES:
1. Preserve ALL [IMAGE X] placeholders EXACTLY as they are — do not translate, move, or remove them
2. Maintain the same HTML structure and formatting (all tags like <h2>, <p>, <strong>, <ul>, <li>, etc.)
3. Translate ONLY the text content between HTML tags
4. For the slug, create a ${targetLangLabel}-friendly URL (lowercase, hyphens, no special characters or accents)
5. NEVER use em dashes (—) — use regular hyphens (-) instead
6. Keep brand names untranslated: MEMOPYK, VHS, Super 8, etc.
7. Adapt cultural references appropriately for the target audience
8. Match the tone described in the brand guidelines above

${publishedPostsList ? `## Published Posts for Reference\n${publishedPostsList}` : ''}

Return your response in this EXACT format (no markdown formatting like **bold**):

TITLE: [translated title here]
SLUG: [${targetLangCode}-url-slug-here]
DESCRIPTION: [translated description here]
CONTENT:
[translated HTML content here]`;

    // Build user message
    const userMessage = `Translate the following blog post metadata and content from ${sourceLangLabel} to ${targetLangLabel}.

Current Title: ${title || 'Untitled'}
Current Slug: ${slug || ''}
Current Description: ${description || ''}

Content to translate:
${text}`;

    // Call Claude API
    const anthropic = new Anthropic({ apiKey });

    console.log(`🌐 Calling Claude API for translation: ${sourceLangLabel} → ${targetLangLabel}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    // Extract text from response
    const translatedText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    if (!translatedText) {
      console.error('Empty response from Claude API');
      return res.status(500).json({ success: false, error: 'Empty response from translation service' });
    }

    console.log(`✅ Translation complete: ${sourceLangLabel} → ${targetLangLabel}`);

    res.json({
      success: true,
      translatedText,
      model: response.model,
      usage: response.usage
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
