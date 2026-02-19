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
import { blogCacheClear } from './blog-shared';
import {
  translateContent,
  fetchAIContext,
  extractImagesFromContent,
  reinsertImages
} from './translation-service';
import { db } from '../db';
import { blogPosts, blogGalleries, contentTopics, contentDailyAssignments, imageBank } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

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

    // Generate a unique slug
    const timestamp = Date.now();
    const slug = `untitled-post-${timestamp}`;

    // Create minimal post
    const [post] = await db.insert(blogPosts).values({
      title: 'Untitled Post',
      slug,
      description: '',
      contentHtml: '<p>Start writing your post here...</p>',
      language,
      status: 'draft',
      isFeatured: false,
      seo: { title: 'Untitled Post', description: '' }
    }).returning();

    console.log(`Blank blog post created: ${post.id}`);

    res.json({
      success: true,
      data: post
    });
  } catch (error: any) {
    console.error('Error in POST /admin/blog/posts:', error);
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

    const aiContext = await fetchAIContext();
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

    // Validate source_topic_id if provided
    if (source_topic_id) {
      const [topicExists] = await db.select({ id: contentTopics.id })
        .from(contentTopics)
        .where(eq(contentTopics.id, source_topic_id))
        .limit(1);

      if (!topicExists) {
        return res.status(400).json({
          success: false,
          error: 'Invalid source_topic_id: topic does not exist'
        });
      }
    }

    // Create post
    const [post] = await db.insert(blogPosts).values({
      title,
      slug,
      description: description || '',
      contentHtml: content,
      heroUrl: hero_url || null,
      language,
      status: status || 'draft',
      publishedAt: published_at ? new Date(published_at) : null,
      isFeatured: is_featured || false,
      seo,
      sourceTopicId: source_topic_id || null,
      primaryKeyword: primary_keyword || null,
      secondaryKeywords: secondary_keywords || []
    }).returning();

    console.log(`Blog post created: ${post.id} - ${post.title}`);

    // Status Synchronization with content topics and assignments
    if (source_topic_id) {
      const rollbackPost = async () => {
        await db.delete(blogPosts).where(eq(blogPosts.id, post.id));
        console.log(`Rolled back post ${post.id} due to sync failure`);
      };

      try {
        const topicStatus = post.status === 'published' ? 'published' : 'in_progress';

        // Get current topic state for potential rollback
        const [currentTopic] = await db.select({
          status: contentTopics.status,
          timesGenerated: contentTopics.timesGenerated
        })
          .from(contentTopics)
          .where(eq(contentTopics.id, source_topic_id))
          .limit(1);

        if (!currentTopic) {
          console.warn(`Topic ${source_topic_id} not found, skipping sync`);
        } else {
          // Update topic
          const [updatedTopic] = await db.update(contentTopics).set({
            status: topicStatus,
            timesGenerated: (currentTopic.timesGenerated || 0) + 1,
            lastGeneratedAt: new Date()
          })
            .where(eq(contentTopics.id, source_topic_id))
            .returning();

          if (!updatedTopic) {
            console.error('Topic update failed, rolling back post');
            await rollbackPost();
            return res.status(500).json({
              success: false,
              error: 'Failed to sync topic status',
              code: 'TOPIC_SYNC_FAILED',
              rolled_back: true
            });
          }

          console.log(`Topic ${source_topic_id} updated to ${topicStatus}`);

          // Find and update assignment
          const [assignment] = await db.select({
            id: contentDailyAssignments.id,
            status: contentDailyAssignments.status
          })
            .from(contentDailyAssignments)
            .where(eq(contentDailyAssignments.topicId, source_topic_id))
            .limit(1);

          if (assignment) {
            const assignmentStatus = post.status === 'published' ? 'published' : 'in_progress';

            const [updatedAssignment] = await db.update(contentDailyAssignments).set({
              postId: post.id,
              status: assignmentStatus
            })
              .where(eq(contentDailyAssignments.id, assignment.id))
              .returning();

            if (!updatedAssignment) {
              console.error('Assignment update failed, rolling back');
              // Revert topic to original state
              await db.update(contentTopics).set({
                status: currentTopic.status,
                timesGenerated: currentTopic.timesGenerated
              })
                .where(eq(contentTopics.id, source_topic_id));
              await rollbackPost();
              return res.status(500).json({
                success: false,
                error: 'Failed to sync assignment status',
                code: 'ASSIGNMENT_SYNC_FAILED',
                rolled_back: true
              });
            }

            console.log(`Assignment ${assignment.id} linked to post ${post.id}`);
          }
        }
      } catch (syncError) {
        console.error('Status synchronization error:', syncError);
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
    console.error('Error creating blog post from AI:', error);

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

    console.log(`Duplicating post for translation: ${id} (method: ${method})`);

    const [sourcePost] = await db.select().from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!sourcePost) {
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
    const [existingPost] = await db.select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, newSlug))
      .limit(1);

    if (existingPost) {
      newSlug = `${newSlug}-${Date.now()}`;
    }

    // Create the duplicate post (with [TRANSLATE TO...] prefix for now)
    const [duplicatedPost] = await db.insert(blogPosts).values({
      title: `[TRANSLATE TO ${languageLabel.toUpperCase()}] ${sourcePost.title}`,
      slug: newSlug,
      description: sourcePost.description,
      contentHtml: sourcePost.contentHtml,
      heroUrl: sourcePost.heroUrl,
      language: targetLanguage,
      status: 'draft',
      isFeatured: false,
      seo: sourcePost.seo
    }).returning();

    console.log(`Post duplicated for translation: ${sourcePost.language} -> ${targetLanguage} (ID: ${duplicatedPost.id})`);

    // If method is 'manual', return the duplicate as-is
    if (method !== 'ai') {
      return res.json({
        success: true,
        data: duplicatedPost,
        method: 'manual'
      });
    }

    // AI translation: Extract images, translate, and update the post
    console.log(`Starting AI translation for post ${duplicatedPost.id}`);

    try {
      // Extract images from content
      const { textWithPlaceholders, images } = extractImagesFromContent(sourcePost.contentHtml || '');
      console.log(`Extracted ${images.length} image(s) from content`);

      // Fetch AI context
      const aiContext = await fetchAIContext();

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
      const [updatedPost] = await db.update(blogPosts).set({
        title: translationResult.title,
        slug: translationResult.slug,
        description: translationResult.description,
        contentHtml: translatedContentWithImages
      })
        .where(eq(blogPosts.id, duplicatedPost.id))
        .returning();

      console.log(`AI translation applied to post ${updatedPost.id}`);

      return res.json({
        success: true,
        data: updatedPost,
        method: 'ai',
        imagesPreserved: images.length
      });

    } catch (translationError) {
      // AI translation failed - keep the duplicate as manual
      const errorMessage = translationError instanceof Error ? translationError.message : 'Translation failed';
      console.error(`AI translation failed for post ${duplicatedPost.id}:`, errorMessage);

      return res.json({
        success: true,
        data: duplicatedPost,
        method: 'manual',
        translationError: errorMessage
      });
    }

  } catch (error) {
    console.error('Error duplicating post:', error);
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

    const conditions = [];
    if (language) {
      conditions.push(eq(blogPosts.language, language as string));
    }
    if (status) {
      conditions.push(eq(blogPosts.status, status as any));
    }

    const where = conditions.length > 0
      ? conditions.length === 1 ? conditions[0] : and(...conditions)
      : undefined;

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    const [posts, countResult] = await Promise.all([
      db.select().from(blogPosts)
        .where(where)
        .orderBy(desc(blogPosts.createdAt))
        .limit(limitNum)
        .offset(offsetNum),
      db.select({ count: sql<number>`count(*)::int` }).from(blogPosts)
        .where(where)
    ]);

    res.json({
      success: true,
      data: posts,
      total: countResult[0]?.count || 0
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

    const posts = await db.select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      status: blogPosts.status,
      language: blogPosts.language,
      publishedAt: blogPosts.publishedAt,
      sourceTopicId: blogPosts.sourceTopicId,
      createdAt: blogPosts.createdAt
    })
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt));

    // Fetch assignments to map draft posts to their assignment dates
    const assignments = await db.select({
      topicId: contentDailyAssignments.topicId,
      date: contentDailyAssignments.date
    }).from(contentDailyAssignments);

    const topicAssignmentMap = new Map<string, string>();
    assignments.forEach((assignment: any) => {
      const dateStr = assignment.date instanceof Date
        ? assignment.date.toISOString()
        : assignment.date;
      topicAssignmentMap.set(assignment.topicId, dateStr);
    });

    // Group posts by date
    const groupedByDate: Record<string, any[]> = {};
    const unscheduledDrafts: any[] = [];

    posts.forEach((post: any) => {
      let dateStr: string | null = null;

      if (post.publishedAt) {
        const publishedAtStr = post.publishedAt instanceof Date
          ? post.publishedAt.toISOString()
          : post.publishedAt;
        const parisDate = DateTime.fromISO(publishedAtStr, { zone: 'utc' })
          .setZone('Europe/Paris');
        dateStr = parisDate.toFormat('yyyy-MM-dd');
      } else if (post.status !== 'published' && post.sourceTopicId) {
        const assignmentDate = topicAssignmentMap.get(post.sourceTopicId);
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

    const [post] = await db.select().from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

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
    const rawUpdates = req.body;

    // Field allowlist to prevent mass assignment
    const ALLOWED_FIELDS = new Set([
      'title', 'slug', 'description', 'content', 'hero_url', 'heroUrl',
      'language', 'status', 'published_at', 'publishedAt',
      'is_featured', 'isFeatured', 'primary_keyword', 'primaryKeyword',
      'secondary_keywords', 'secondaryKeywords', 'source_topic_id', 'sourceTopicId',
      'category', 'reading_time', 'readingTime',
    ]);
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawUpdates)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = value;
      }
    }

    // Get current post to check if status actually changes
    const [oldPost] = await db.select({
      status: blogPosts.status,
      sourceTopicId: blogPosts.sourceTopicId,
      heroUrl: blogPosts.heroUrl,
    })
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    // If publishing, set published_at
    if (updates.status === 'published' && !updates.published_at && !updates.publishedAt) {
      updates.publishedAt = new Date();
    }

    // Convert snake_case keys from client to camelCase for Drizzle
    const drizzleUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      const camelKey = key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
      drizzleUpdates[camelKey] = value;
    }

    // Ensure publishedAt is a Date object (client may send ISO string)
    if (drizzleUpdates.publishedAt && !(drizzleUpdates.publishedAt instanceof Date)) {
      drizzleUpdates.publishedAt = new Date(drizzleUpdates.publishedAt);
    }

    const [post] = await db.update(blogPosts).set(drizzleUpdates)
      .where(eq(blogPosts.id, id))
      .returning();

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    console.log(`Blog post updated: ${id}`);

    // Track image bank usage when heroUrl changes
    const newHeroUrl = updates.heroUrl || updates.hero_url;
    if (newHeroUrl && oldPost?.heroUrl !== newHeroUrl) {
      try {
        // Decrement old hero image usage
        if (oldPost?.heroUrl) {
          await db.update(imageBank)
            .set({ usageCount: sql`GREATEST(${imageBank.usageCount} - 1, 0)` })
            .where(eq(imageBank.publicUrl, oldPost.heroUrl));
        }
        // Increment new hero image usage
        await db.update(imageBank)
          .set({ usageCount: sql`${imageBank.usageCount} + 1`, lastUsedAt: new Date() })
          .where(eq(imageBank.publicUrl, newHeroUrl));
      } catch (imgError) {
        console.error('Image bank usage tracking error:', imgError);
      }
    }

    // Sync topic and assignment status ONLY when status actually changes
    if (post.sourceTopicId && updates.status && oldPost?.status !== updates.status) {
      try {
        const topicStatus = updates.status === 'published' ? 'published' : 'in_progress';

        await db.update(contentTopics).set({ status: topicStatus })
          .where(eq(contentTopics.id, post.sourceTopicId));

        console.log(`Topic ${post.sourceTopicId} synced to ${topicStatus}`);

        const assignmentStatus = updates.status === 'published' ? 'published' : 'in_progress';

        await db.update(contentDailyAssignments).set({ status: assignmentStatus })
          .where(eq(contentDailyAssignments.topicId, post.sourceTopicId));

        console.log(`Assignment synced to ${assignmentStatus}`);
      } catch (syncError) {
        console.error('Status synchronization error:', syncError);
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
    const rawUpdates = req.body;

    // Field allowlist to prevent mass assignment
    const ALLOWED_FIELDS = new Set([
      'title', 'slug', 'description', 'content', 'hero_url', 'heroUrl',
      'language', 'status', 'published_at', 'publishedAt',
      'is_featured', 'isFeatured', 'primary_keyword', 'primaryKeyword',
      'secondary_keywords', 'secondaryKeywords', 'source_topic_id', 'sourceTopicId',
      'category', 'reading_time', 'readingTime',
    ]);
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawUpdates)) {
      if (ALLOWED_FIELDS.has(key)) {
        updates[key] = value;
      }
    }

    const [oldPost] = await db.select({
      status: blogPosts.status,
      sourceTopicId: blogPosts.sourceTopicId,
      heroUrl: blogPosts.heroUrl,
    })
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (updates.status === 'published' && !updates.published_at && !updates.publishedAt) {
      updates.publishedAt = new Date();
    }

    // Convert snake_case keys from client to camelCase for Drizzle
    const drizzleUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      const camelKey = key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
      drizzleUpdates[camelKey] = value;
    }

    // Ensure publishedAt is a Date object (client may send ISO string)
    if (drizzleUpdates.publishedAt && !(drizzleUpdates.publishedAt instanceof Date)) {
      drizzleUpdates.publishedAt = new Date(drizzleUpdates.publishedAt);
    }

    const [post] = await db.update(blogPosts).set(drizzleUpdates)
      .where(eq(blogPosts.id, id))
      .returning();

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    console.log(`Blog post patched: ${id}`);

    // Track image bank usage when heroUrl changes
    const newHeroUrl = updates.heroUrl || updates.hero_url;
    if (newHeroUrl && oldPost?.heroUrl !== newHeroUrl) {
      try {
        if (oldPost?.heroUrl) {
          await db.update(imageBank)
            .set({ usageCount: sql`GREATEST(${imageBank.usageCount} - 1, 0)` })
            .where(eq(imageBank.publicUrl, oldPost.heroUrl));
        }
        await db.update(imageBank)
          .set({ usageCount: sql`${imageBank.usageCount} + 1`, lastUsedAt: new Date() })
          .where(eq(imageBank.publicUrl, newHeroUrl));
      } catch (imgError) {
        console.error('Image bank usage tracking error:', imgError);
      }
    }

    if (post.sourceTopicId && updates.status && oldPost?.status !== updates.status) {
      try {
        const topicStatus = updates.status === 'published' ? 'published' : 'in_progress';

        await db.update(contentTopics).set({ status: topicStatus })
          .where(eq(contentTopics.id, post.sourceTopicId));

        const assignmentStatus = updates.status === 'published' ? 'published' : 'in_progress';

        await db.update(contentDailyAssignments).set({ status: assignmentStatus })
          .where(eq(contentDailyAssignments.topicId, post.sourceTopicId));
      } catch (syncError) {
        console.error('Status synchronization error:', syncError);
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

    // Get post before deleting
    const [postToDelete] = await db.select({
      sourceTopicId: blogPosts.sourceTopicId,
      heroUrl: blogPosts.heroUrl,
    })
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    await db.delete(blogPosts).where(eq(blogPosts.id, id));

    console.log(`Blog post deleted: ${id}`);

    // Decrement image bank usageCount for hero image
    if (postToDelete?.heroUrl) {
      try {
        await db.update(imageBank)
          .set({ usageCount: sql`GREATEST(${imageBank.usageCount} - 1, 0)` })
          .where(eq(imageBank.publicUrl, postToDelete.heroUrl));
      } catch (imgError) {
        console.error('Image bank cleanup error:', imgError);
      }
    }

    // Revert topic status if no other posts exist
    if (postToDelete?.sourceTopicId) {
      try {
        const otherPosts = await db.select({ id: blogPosts.id })
          .from(blogPosts)
          .where(eq(blogPosts.sourceTopicId, postToDelete.sourceTopicId));

        if (otherPosts.length === 0) {
          await db.update(contentTopics).set({ status: 'planned' })
            .where(eq(contentTopics.id, postToDelete.sourceTopicId));

          console.log(`Topic ${postToDelete.sourceTopicId} reverted to 'planned'`);

          await db.update(contentDailyAssignments).set({
            postId: null,
            status: 'planned'
          })
            .where(eq(contentDailyAssignments.topicId, postToDelete.sourceTopicId));

          console.log(`Assignment cleared for topic ${postToDelete.sourceTopicId}`);
        } else {
          console.log(`Topic ${postToDelete.sourceTopicId} has ${otherPosts.length} other post(s), status unchanged`);
        }
      } catch (syncError) {
        console.error('Status synchronization error:', syncError);
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

    const images = await db.select().from(blogGalleries)
      .where(eq(blogGalleries.postId, id))
      .orderBy(blogGalleries.sort);

    res.json({
      success: true,
      data: images,
      total: images.length
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

    // Get max sort order for this post
    const existing = await db.select({ sort: blogGalleries.sort })
      .from(blogGalleries)
      .where(eq(blogGalleries.postId, id))
      .orderBy(desc(blogGalleries.sort))
      .limit(1);

    const nextSort = sort ?? ((existing[0]?.sort ?? -1) + 1);

    const [image] = await db.insert(blogGalleries).values({
      postId: id,
      url,
      title: title || null,
      alt: alt || null,
      sort: nextSort
    }).returning();

    console.log(`Gallery image added to post ${id}`);

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

    const updates: Record<string, any> = {};
    if (url !== undefined) updates.url = url;
    if (title !== undefined) updates.title = title;
    if (alt !== undefined) updates.alt = alt;
    if (sort !== undefined) updates.sort = sort;

    const [image] = await db.update(blogGalleries).set(updates)
      .where(and(eq(blogGalleries.id, imageId), eq(blogGalleries.postId, id)))
      .returning();

    if (!image) {
      return res.status(404).json({ success: false, error: 'Gallery image not found' });
    }

    console.log(`Gallery image ${imageId} updated`);

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

    await db.delete(blogGalleries)
      .where(and(eq(blogGalleries.id, imageId), eq(blogGalleries.postId, id)));

    console.log(`Gallery image ${imageId} deleted from post ${id}`);

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

    // Update sort order for each image
    for (let i = 0; i < imageIds.length; i++) {
      await db.update(blogGalleries).set({ sort: i })
        .where(and(eq(blogGalleries.id, imageIds[i]), eq(blogGalleries.postId, id)));
    }

    console.log(`Gallery images reordered for post ${id}`);

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
