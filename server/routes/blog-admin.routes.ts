/**
 * Blog Admin Routes
 *
 * Admin CRUD operations for blog posts and galleries.
 *
 * Post Routes:
 * - POST /admin/blog/create-from-ai - Create post from AI-generated JSON
 * - POST /admin/blog/posts/:id/translate - Duplicate post for translation
 * - GET /admin/blog/posts - Get all posts (admin view)
 * - GET /admin/blog/posts-by-date - Get posts grouped by date
 * - GET /admin/blog/posts/:id - Get single post by ID
 * - PUT /admin/blog/posts/:id - Update post
 * - PATCH /admin/blog/posts/:id - Partial update post
 * - DELETE /admin/blog/posts/:id - Delete post
 *
 * Gallery Routes:
 * - GET /admin/blog/posts/:id/gallery - Get gallery images for post
 * - POST /admin/blog/posts/:id/gallery - Add image to gallery
 * - PUT /admin/blog/posts/:id/gallery/:imageId - Update image
 * - DELETE /admin/blog/posts/:id/gallery/:imageId - Delete image
 * - PUT /admin/blog/posts/:id/gallery/reorder - Reorder images
 */

import { Router, Request, Response } from 'express';
import { DateTime } from 'luxon';
import Anthropic from '@anthropic-ai/sdk';
import { requireAdmin } from '../middleware/auth.middleware';
import { getSupabase, blogCacheClear } from './blog-shared';
import {
  translateContent,
  fetchAIContext,
  extractImagesFromContent,
  reinsertImages
} from './translation-service';

const router = Router();

// Clear public blog cache on any admin mutation
router.use((req, _res, next) => {
  if (req.method !== 'GET') {
    blogCacheClear();
  }
  next();
});

// ============================================================================
// ADMIN BLOG ROUTES
// ============================================================================

/**
 * POST /admin/blog/posts
 * Create a new blank blog post (for manual editing)
 */
router.post('/admin/blog/posts', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { language = 'en-US' } = req.body;
    const supabase = getSupabase();

    // Generate a unique slug
    const timestamp = Date.now();
    const slug = `untitled-post-${timestamp}`;

    // Create minimal post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        title: 'Untitled Post',
        slug,
        description: '',
        content_html: '<p>Start writing your post here...</p>',
        language,
        status: 'draft',
        is_featured: false,
        seo: { title: 'Untitled Post', description: '' }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating blank blog post:', error);
      throw error;
    }

    console.log(`✅ Blank blog post created: ${post.id}`);

    res.json({
      success: true,
      data: post
    });
  } catch (error: any) {
    console.error('❌ Error in POST /admin/blog/posts:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create blog post'
    });
  }
});

/**
 * POST /admin/blog/generate-content
 * Generate blog post content using Claude AI with Brand Brain context
 */
router.post('/admin/blog/generate-content', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { topic, language, primaryKeyword, secondaryKeywords, notes, targetWordCount } = req.body;

    if (!topic || !language) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: topic, language'
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'AI content generation not configured. ANTHROPIC_API_KEY is missing.'
      });
    }

    const supabase = getSupabase();

    // Fetch Brand Brain context
    const aiContext = await fetchAIContext(supabase);
    const brandIdentity = aiContext.brand?.brand_identity || '';
    const toneVoice = aiContext.brand?.tone_voice || '';
    const writingRules = aiContext.brand?.writing_rules || '';
    const targetAudience = aiContext.brand?.target_audience || '';
    const seoGuidelines = aiContext.brand?.seo_guidelines || '';

    // Build system prompt from Brand Brain
    const systemPrompt = `You are a professional blog content writer for MEMOPYK.

## Brand Identity
${brandIdentity}

## Tone of Voice
${toneVoice}

## Writing Rules
${writingRules}

## Target Audience
${targetAudience}

## SEO Guidelines
${seoGuidelines}

${aiContext.publishedPostsList ? `## Published Posts for Internal Linking\n${aiContext.publishedPostsList}` : ''}

## Output Format
Return a JSON object with this exact structure (no markdown wrapping, just raw JSON):
{
  "title": "The blog post title",
  "slug": "url-friendly-slug",
  "description": "Meta description under 155 characters",
  "content": "<h2>...</h2><p>...</p>...",
  "seo": {
    "title": "SEO title under 60 chars",
    "description": "Meta description under 155 chars",
    "keywords": ["keyword1", "keyword2"]
  },
  "tags": ["tag1", "tag2"],
  "readTimeMinutes": 5
}

## HTML Rules for content field
- Use only these HTML tags: h2, h3, p, strong, em, ul, ol, li, a, blockquote
- Use single quotes for all HTML attributes (e.g., <a href='...'> not <a href="...">)
- Never use em dashes. Use regular hyphens instead.
- Do NOT use markdown formatting inside the HTML
- For image suggestions, use this exact format: <p style='color: #cc0000; font-weight: bold;'>IMAGE SUGGESTION: [description] | [orientation] [dims] | [purpose]</p>
- Include 2-3 image suggestions placed naturally within the content`;

    // Build user prompt
    const langLabel = language === 'fr-FR' ? 'French' : 'English';
    const wordCount = targetWordCount || 1000;

    let userPrompt = `Write a blog post in ${langLabel} about: ${topic}

Target word count: ${wordCount} words`;

    if (primaryKeyword) {
      userPrompt += `\nPrimary keyword: ${primaryKeyword}`;
    }
    if (secondaryKeywords?.length) {
      userPrompt += `\nSecondary keywords: ${secondaryKeywords.join(', ')}`;
    }
    if (notes) {
      userPrompt += `\nAdditional notes: ${notes}`;
    }

    userPrompt += `\n\nReturn ONLY the JSON object, no markdown code fences or other text.`;

    // Call Anthropic API
    const anthropic = new Anthropic({ apiKey });

    console.log(`Generating blog content: "${topic}" (${langLabel}, ~${wordCount} words)`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    // Extract text from response
    const rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    if (!rawText) {
      throw new Error('Empty response from AI service');
    }

    // Parse JSON response (strip markdown fences if present)
    const jsonStr = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonStr);

    console.log(`Blog content generated: "${parsed.title}" (${response.usage.output_tokens} tokens)`);

    res.json({
      success: true,
      data: {
        title: parsed.title,
        slug: parsed.slug,
        description: parsed.description,
        content: parsed.content,
        seo: parsed.seo,
        tags: parsed.tags,
        readTimeMinutes: parsed.readTimeMinutes
      }
    });
  } catch (error: any) {
    console.error('Error in POST /admin/blog/generate-content:', error);

    if (error instanceof SyntaxError) {
      return res.status(500).json({
        success: false,
        error: 'AI response was not valid JSON. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate blog content'
    });
  }
});

/**
 * POST /admin/blog/create-from-ai
 * Create blog post from AI-generated JSON
 */
router.post('/admin/blog/create-from-ai', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      title, slug, description, content, hero_url, language,
      is_featured, meta_title, meta_description, status,
      published_at, source_topic_id, primary_keyword, secondary_keywords
    } = req.body;

    if (!title || !slug || !content || !language) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, slug, content, language'
      });
    }

    const seo = {
      title: meta_title || title,
      description: meta_description || description || ''
    };

    const supabase = getSupabase();

    // Validate source_topic_id if provided
    if (source_topic_id) {
      const { data: topicExists } = await supabase
        .from('content_topics')
        .select('id')
        .eq('id', source_topic_id)
        .single();

      if (!topicExists) {
        return res.status(400).json({
          success: false,
          error: 'Invalid source_topic_id: topic does not exist'
        });
      }
    }

    // Create post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        title,
        slug,
        description: description || '',
        content_html: content,
        hero_url: hero_url || null,
        language,
        status: status || 'draft',
        published_at: published_at || null,
        is_featured: is_featured || false,
        seo,
        source_topic_id: source_topic_id || null,
        primary_keyword: primary_keyword || null,
        secondary_keywords: secondary_keywords || []
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating blog post:', error);
      throw error;
    }

    console.log(`✅ Blog post created: ${post.id} - ${post.title}`);

    // Status Synchronization with content topics and assignments
    // Uses manual rollback since Supabase JS doesn't support transactions
    if (source_topic_id) {
      const rollbackPost = async () => {
        await supabase.from('blog_posts').delete().eq('id', post.id);
        console.log(`🔄 Rolled back post ${post.id} due to sync failure`);
      };

      try {
        const topicStatus = post.status === 'published' ? 'published' : 'in_progress';

        // Get current topic state for potential rollback
        const { data: currentTopic } = await supabase
          .from('content_topics')
          .select('status, times_generated')
          .eq('id', source_topic_id)
          .single();

        if (!currentTopic) {
          console.warn(`⚠️ Topic ${source_topic_id} not found, skipping sync`);
        } else {
          // Update topic
          const { error: topicError } = await supabase
            .from('content_topics')
            .update({
              status: topicStatus,
              times_generated: (currentTopic.times_generated || 0) + 1,
              last_generated_at: new Date().toISOString()
            })
            .eq('id', source_topic_id);

          if (topicError) {
            console.error('❌ Topic update failed, rolling back post:', topicError);
            await rollbackPost();
            return res.status(500).json({
              success: false,
              error: 'Failed to sync topic status',
              code: 'TOPIC_SYNC_FAILED',
              rolled_back: true
            });
          }

          console.log(`✅ Topic ${source_topic_id} updated to ${topicStatus}`);

          // Find and update assignment
          const { data: assignment } = await supabase
            .from('content_daily_assignments')
            .select('id, status')
            .eq('topic_id', source_topic_id)
            .single();

          if (assignment) {
            const assignmentStatus = post.status === 'published' ? 'published' : 'in_progress';

            const { error: assignmentError } = await supabase
              .from('content_daily_assignments')
              .update({
                post_id: post.id,
                status: assignmentStatus
              })
              .eq('id', assignment.id);

            if (assignmentError) {
              console.error('❌ Assignment update failed, rolling back:', assignmentError);
              // Revert topic to original state
              await supabase
                .from('content_topics')
                .update({
                  status: currentTopic.status,
                  times_generated: currentTopic.times_generated
                })
                .eq('id', source_topic_id);
              await rollbackPost();
              return res.status(500).json({
                success: false,
                error: 'Failed to sync assignment status',
                code: 'ASSIGNMENT_SYNC_FAILED',
                rolled_back: true
              });
            }

            console.log(`✅ Assignment ${assignment.id} linked to post ${post.id}`);
          }
        }
      } catch (syncError) {
        console.error('❌ Status synchronization error:', syncError);
        await rollbackPost();
        return res.status(500).json({
          success: false,
          error: 'Status synchronization failed',
          code: 'SYNC_ERROR',
          rolled_back: true
        });
      }
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error: any) {
    console.error('❌ Error creating blog post from AI:', error);

    if (error?.code === '23505') {
      if (error.details?.includes('slug')) {
        return res.status(400).json({
          success: false,
          error: `Slug "${req.body.slug}" already exists. Please use a different slug.`
        });
      }
    }

    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create blog post'
    });
  }
});

/**
 * POST /admin/blog/posts/:id/translate
 * Duplicate blog post to other language
 *
 * Request body:
 * - method: 'manual' | 'ai' (default: 'manual')
 *   - 'manual': Creates duplicate with [TRANSLATE TO...] prefix for manual translation
 *   - 'ai': Creates duplicate + automatically translates using Claude API
 */
router.post('/admin/blog/posts/:id/translate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { method = 'manual' } = req.body;

    console.log(`📋 Duplicating post for translation: ${id} (method: ${method})`);

    const supabase = getSupabase();

    const { data: sourcePost, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !sourcePost) {
      return res.status(404).json({
        success: false,
        error: 'Source post not found'
      });
    }

    const targetLanguage = sourcePost.language === 'en-US' ? 'fr-FR' : 'en-US';
    const sourceLanguage = sourcePost.language as 'en-US' | 'fr-FR';
    const languageSuffix = targetLanguage === 'en-US' ? '-en' : '-fr';
    const languageLabel = targetLanguage === 'en-US' ? 'English' : 'French';

    let newSlug = sourcePost.slug.replace(/-(en|fr)$/, '') + languageSuffix;

    // Check if slug already exists
    const { data: existingPost } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', newSlug)
      .single();

    if (existingPost) {
      newSlug = `${newSlug}-${Date.now()}`;
    }

    // Create the duplicate post (with [TRANSLATE TO...] prefix for now)
    const { data: duplicatedPost, error: createError } = await supabase
      .from('blog_posts')
      .insert({
        title: `[TRANSLATE TO ${languageLabel.toUpperCase()}] ${sourcePost.title}`,
        slug: newSlug,
        description: sourcePost.description,
        content_html: sourcePost.content_html,
        hero_url: sourcePost.hero_url,
        language: targetLanguage,
        status: 'draft',
        is_featured: false,
        seo: sourcePost.seo
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error duplicating post:', createError);
      throw createError;
    }

    console.log(`✅ Post duplicated for translation: ${sourcePost.language} → ${targetLanguage} (ID: ${duplicatedPost.id})`);

    // If method is 'manual', return the duplicate as-is
    if (method !== 'ai') {
      return res.json({
        success: true,
        data: duplicatedPost,
        method: 'manual'
      });
    }

    // AI translation: Extract images, translate, and update the post
    console.log(`🤖 Starting AI translation for post ${duplicatedPost.id}`);

    try {
      // Extract images from content
      const { textWithPlaceholders, images } = extractImagesFromContent(sourcePost.content_html || '');
      console.log(`📷 Extracted ${images.length} image(s) from content`);

      // Fetch AI context
      const aiContext = await fetchAIContext(supabase);

      // Translate content
      const translationResult = await translateContent(
        {
          text: textWithPlaceholders,
          title: sourcePost.title,
          slug: sourcePost.slug,
          description: sourcePost.description || '',
          sourceLanguage,
          targetLanguage
        },
        aiContext
      );

      // Re-insert images into translated content
      const translatedContentWithImages = reinsertImages(translationResult.content, images);

      // Update the duplicate post with translated content (remove [TRANSLATE TO...] prefix)
      const { data: updatedPost, error: updateError } = await supabase
        .from('blog_posts')
        .update({
          title: translationResult.title,
          slug: translationResult.slug,
          description: translationResult.description,
          content_html: translatedContentWithImages
        })
        .eq('id', duplicatedPost.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating post with translation:', updateError);
        throw updateError;
      }

      console.log(`✅ AI translation applied to post ${updatedPost.id}`);

      return res.json({
        success: true,
        data: updatedPost,
        method: 'ai',
        imagesPreserved: images.length
      });

    } catch (translationError) {
      // AI translation failed - keep the duplicate as manual
      const errorMessage = translationError instanceof Error ? translationError.message : 'Translation failed';
      console.error(`⚠️ AI translation failed for post ${duplicatedPost.id}:`, errorMessage);

      return res.json({
        success: true,
        data: duplicatedPost,
        method: 'manual',
        translationError: errorMessage
      });
    }

  } catch (error) {
    console.error('❌ Error duplicating post:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to duplicate post'
    });
  }
});

/**
 * GET /admin/blog/posts
 * Get all blog posts (admin view - includes drafts)
 */
router.get('/admin/blog/posts', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { language, status, limit = 50, offset = 0 } = req.query;

    const supabase = getSupabase();

    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (language) {
      query = query.eq('language', language);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: posts, error, count } = await query
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) throw error;

    res.json({
      success: true,
      data: posts,
      total: count || 0
    });
  } catch (error) {
    console.error('Error fetching admin posts:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /admin/blog/posts-by-date
 * Get blog posts grouped by publish date for calendar view
 */
router.get('/admin/blog/posts-by-date', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const supabase = getSupabase();

    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, status, language, published_at, source_topic_id, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch assignments to map draft posts to their assignment dates
    const { data: assignments, error: assignmentsError } = await supabase
      .from('content_daily_assignments')
      .select('topic_id, date');

    if (assignmentsError) throw assignmentsError;

    const topicAssignmentMap = new Map<string, string>();
    assignments?.forEach((assignment: any) => {
      topicAssignmentMap.set(assignment.topic_id, assignment.date);
    });

    // Group posts by date
    const groupedByDate: Record<string, any[]> = {};
    const unscheduledDrafts: any[] = [];

    posts?.forEach((post: any) => {
      let dateStr: string | null = null;

      if (post.published_at) {
        const parisDate = DateTime.fromISO(post.published_at, { zone: 'utc' })
          .setZone('Europe/Paris');
        dateStr = parisDate.toFormat('yyyy-MM-dd');
      } else if (post.status !== 'published' && post.source_topic_id) {
        const assignmentDate = topicAssignmentMap.get(post.source_topic_id);
        if (assignmentDate) {
          dateStr = assignmentDate.split('T')[0];
        }
      }

      if (dateStr) {
        if (startDate && dateStr < (startDate as string)) return;
        if (endDate && dateStr > (endDate as string)) return;

        if (!groupedByDate[dateStr]) {
          groupedByDate[dateStr] = [];
        }
        groupedByDate[dateStr].push(post);
      } else if (post.status !== 'published') {
        unscheduledDrafts.push(post);
      }
    });

    res.json({
      success: true,
      data: {
        byDate: groupedByDate,
        unscheduled: unscheduledDrafts
      }
    });
  } catch (error) {
    console.error('Error fetching posts by date:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /admin/blog/posts/:id
 * Get single blog post by ID (admin)
 */
router.get('/admin/blog/posts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supabase = getSupabase();

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /admin/blog/posts/:id
 * Update blog post with status synchronization
 */
router.put('/admin/blog/posts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const supabase = getSupabase();

    // Get current post to check if status actually changes
    const { data: oldPost } = await supabase
      .from('blog_posts')
      .select('status, source_topic_id')
      .eq('id', id)
      .single();

    // If publishing, set published_at
    if (updates.status === 'published' && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Blog post updated: ${id}`);

    // Sync topic and assignment status ONLY when status actually changes
    if (post.source_topic_id && updates.status && oldPost?.status !== updates.status) {
      try {
        const topicStatus = updates.status === 'published' ? 'published' : 'in_progress';

        const { error: topicError } = await supabase
          .from('content_topics')
          .update({ status: topicStatus })
          .eq('id', post.source_topic_id);

        if (topicError) {
          console.error('⚠️ Failed to sync topic status:', topicError);
        } else {
          console.log(`✅ Topic ${post.source_topic_id} synced to ${topicStatus}`);
        }

        const assignmentStatus = updates.status === 'published' ? 'published' : 'in_progress';

        const { error: assignmentError } = await supabase
          .from('content_daily_assignments')
          .update({ status: assignmentStatus })
          .eq('topic_id', post.source_topic_id);

        if (assignmentError) {
          console.error('⚠️ Failed to sync assignment status:', assignmentError);
        } else {
          console.log(`✅ Assignment synced to ${assignmentStatus}`);
        }
      } catch (syncError) {
        console.error('⚠️ Status synchronization error:', syncError);
      }
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PATCH /admin/blog/posts/:id
 * Alias for PUT - frontend uses PATCH for partial updates
 */
router.patch('/admin/blog/posts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const supabase = getSupabase();

    const { data: oldPost } = await supabase
      .from('blog_posts')
      .select('status, source_topic_id')
      .eq('id', id)
      .single();

    if (updates.status === 'published' && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Blog post patched: ${id}`);

    if (post.source_topic_id && updates.status && oldPost?.status !== updates.status) {
      try {
        const topicStatus = updates.status === 'published' ? 'published' : 'in_progress';

        const { error: topicError } = await supabase
          .from('content_topics')
          .update({ status: topicStatus })
          .eq('id', post.source_topic_id);

        if (topicError) console.error('⚠️ Failed to sync topic status:', topicError);

        const { error: assignmentError } = await supabase
          .from('content_daily_assignments')
          .update({ status: updates.status === 'published' ? 'published' : 'in_progress' })
          .eq('topic_id', post.source_topic_id);

        if (assignmentError) console.error('⚠️ Failed to sync assignment status:', assignmentError);
      } catch (syncError) {
        console.error('⚠️ Status synchronization error:', syncError);
      }
    }

    res.json({ success: true, data: post });
  } catch (error) {
    console.error('Error patching post:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /admin/blog/posts/:id
 * Delete blog post with status reversion
 */
router.delete('/admin/blog/posts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supabase = getSupabase();

    // Get post before deleting
    const { data: postToDelete } = await supabase
      .from('blog_posts')
      .select('source_topic_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log(`✅ Blog post deleted: ${id}`);

    // Revert topic status if no other posts exist
    if (postToDelete?.source_topic_id) {
      try {
        const { data: otherPosts } = await supabase
          .from('blog_posts')
          .select('id')
          .eq('source_topic_id', postToDelete.source_topic_id);

        if (!otherPosts || otherPosts.length === 0) {
          const { error: topicError } = await supabase
            .from('content_topics')
            .update({ status: 'planned' })
            .eq('id', postToDelete.source_topic_id);

          if (topicError) {
            console.error('⚠️ Failed to revert topic status:', topicError);
          } else {
            console.log(`✅ Topic ${postToDelete.source_topic_id} reverted to 'planned'`);
          }

          const { error: assignmentError } = await supabase
            .from('content_daily_assignments')
            .update({
              post_id: null,
              status: 'planned'
            })
            .eq('topic_id', postToDelete.source_topic_id);

          if (assignmentError) {
            console.error('⚠️ Failed to clear assignment post_id:', assignmentError);
          } else {
            console.log(`✅ Assignment cleared for topic ${postToDelete.source_topic_id}`);
          }
        } else {
          console.log(`ℹ️ Topic ${postToDelete.source_topic_id} has ${otherPosts.length} other post(s), status unchanged`);
        }
      } catch (syncError) {
        console.error('⚠️ Status synchronization error:', syncError);
      }
    }

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================================
// BLOG GALLERY MANAGEMENT
// ============================================================================

/**
 * GET /admin/blog/posts/:id/gallery
 * Get all gallery images for a post (admin view)
 */
router.get('/admin/blog/posts/:id/gallery', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supabase = getSupabase();

    const { data: images, error } = await supabase
      .from('blog_galleries')
      .select('*')
      .eq('post_id', id)
      .order('sort', { ascending: true, nullsFirst: false });

    if (error) throw error;

    res.json({
      success: true,
      data: images || [],
      total: images?.length || 0
    });
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /admin/blog/posts/:id/gallery
 * Add image to post gallery
 */
router.post('/admin/blog/posts/:id/gallery', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { url, title, alt, sort } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: 'Image URL is required' });
    }

    const supabase = getSupabase();

    // Get max sort order for this post
    const { data: existing } = await supabase
      .from('blog_galleries')
      .select('sort')
      .eq('post_id', id)
      .order('sort', { ascending: false })
      .limit(1);

    const nextSort = sort ?? ((existing?.[0]?.sort ?? -1) + 1);

    const { data: image, error } = await supabase
      .from('blog_galleries')
      .insert({
        post_id: id,
        url,
        title: title || null,
        alt: alt || null,
        sort: nextSort
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Gallery image added to post ${id}`);

    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    console.error('Error adding gallery image:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /admin/blog/posts/:id/gallery/:imageId
 * Update gallery image (title, alt, sort)
 */
router.put('/admin/blog/posts/:id/gallery/:imageId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, imageId } = req.params;
    const { url, title, alt, sort } = req.body;

    const updates: any = {};
    if (url !== undefined) updates.url = url;
    if (title !== undefined) updates.title = title;
    if (alt !== undefined) updates.alt = alt;
    if (sort !== undefined) updates.sort = sort;

    const supabase = getSupabase();

    const { data: image, error } = await supabase
      .from('blog_galleries')
      .update(updates)
      .eq('id', imageId)
      .eq('post_id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Gallery image ${imageId} updated`);

    res.json({
      success: true,
      data: image
    });
  } catch (error) {
    console.error('Error updating gallery image:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /admin/blog/posts/:id/gallery/:imageId
 * Remove image from gallery
 */
router.delete('/admin/blog/posts/:id/gallery/:imageId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id, imageId } = req.params;

    const supabase = getSupabase();

    const { error } = await supabase
      .from('blog_galleries')
      .delete()
      .eq('id', imageId)
      .eq('post_id', id);

    if (error) throw error;

    console.log(`✅ Gallery image ${imageId} deleted from post ${id}`);

    res.json({
      success: true,
      message: 'Gallery image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /admin/blog/posts/:id/gallery/reorder
 * Reorder gallery images
 */
router.put('/admin/blog/posts/:id/gallery/reorder', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { imageIds } = req.body;

    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ success: false, error: 'imageIds must be an array' });
    }

    const supabase = getSupabase();

    // Update sort order for each image
    for (let i = 0; i < imageIds.length; i++) {
      const { error } = await supabase
        .from('blog_galleries')
        .update({ sort: i })
        .eq('id', imageIds[i])
        .eq('post_id', id);

      if (error) {
        console.error(`Error updating sort for image ${imageIds[i]}:`, error);
      }
    }

    console.log(`✅ Gallery images reordered for post ${id}`);

    res.json({
      success: true,
      message: 'Gallery images reordered successfully'
    });
  } catch (error) {
    console.error('Error reordering gallery images:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
