/**
 * Blog Routes
 * 
 * Public blog posts, featured posts, search, tags
 * Admin CRUD for posts and tags
 * Content topic/assignment synchronization
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';
import multer from 'multer';
import fs from 'fs';
import { requireAdmin } from '../middleware/auth.middleware';

// Multer config for blog image uploads
const uploadImage = multer({ dest: 'uploads/' });

const router = Router();

// Supabase client (lazy loaded)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return supabase;
}

// Color palette for auto-assigning tag colors
const TAG_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#a855f7', // violet
  '#f97316', // orange
  '#84cc16', // lime
];

// Hash function to deterministically assign colors
function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// Set no-cache headers helper
function setNoCacheHeaders(res: Response) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

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
 * Get post galleries (STUB - requires galleries junction table)
 */
router.get('/blog/posts/:slug/gallery', async (req: Request, res: Response) => {
  try {
    // TODO: Implement after creating blog_galleries and blog_gallery_images tables
    res.json({
      success: true,
      data: [],
      total: 0
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

// ============================================================================
// SIMPLIFIED TAG ROUTES (with cascading)
// ============================================================================

/**
 * GET /blog-tags
 * Fetch all tags with real usage counts from junction table
 */
router.get('/blog-tags', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();
    
    const { data: tags, error } = await supabase
      .from('blog_tags')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching tags:', error);
      throw error;
    }

    // Fetch all post-tag relationships from junction table
    const { data: postTags, error: postTagsError } = await supabase
      .from('blog_post_tags')
      .select('tag_id');
    
    if (postTagsError) {
      console.error('❌ Error fetching post tags for counts:', postTagsError);
      throw postTagsError;
    }

    // Calculate actual usage count for each tag
    const tagUsageMap = new Map<string, number>();
    (postTags || []).forEach((pt: any) => {
      tagUsageMap.set(pt.tag_id, (tagUsageMap.get(pt.tag_id) || 0) + 1);
    });

    // Transform to camelCase with real usage counts
    const transformedData = (tags || []).map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      usageCount: tagUsageMap.get(tag.id) || 0,
      createdAt: tag.created_at,
      updatedAt: tag.updated_at,
    }))
    .sort((a: any, b: any) => b.usageCount - a.usageCount);

    console.log(`✅ Fetched ${transformedData.length} tags with real usage counts`);
    res.json({ data: transformedData });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /blog-tags
 * Create new tag with auto-color assignment
 */
router.post('/blog-tags', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const tagColor = color || hashStringToColor(name);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('blog_tags')
      .insert({
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        color: tagColor,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Tag already exists' });
      }
      console.error('❌ Error creating tag:', error);
      throw error;
    }

    const transformedData = {
      id: data.id,
      name: data.name,
      color: data.color,
      usageCount: data.usage_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    console.log(`✅ Tag created: ${name} (${tagColor})`);
    res.json(transformedData);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PATCH /blog-tags/:id
 * Update tag with cascading rename in posts
 */
router.patch('/blog-tags/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const supabase = getSupabase();

    // Get the old tag name before updating
    const { data: oldTag, error: fetchError } = await supabase
      .from('blog_tags')
      .select('name')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching tag:', fetchError);
      throw fetchError;
    }

    const oldName = oldTag.name;
    const updates: any = {};
    if (name !== undefined) {
      updates.name = name.trim();
      updates.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    if (color !== undefined) updates.color = color;

    const { data, error } = await supabase
      .from('blog_tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Tag name already exists' });
      }
      console.error('❌ Error updating tag:', error);
      throw error;
    }

    // If name was changed, update all blog posts using this tag
    if (name !== undefined && oldName !== name.trim()) {
      const newName = name.trim();
      
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('id, tags')
        .contains('tags', [oldName]);

      if (!postsError && posts) {
        for (const post of posts) {
          const updatedTags = (post.tags || []).map((tag: string) => 
            tag === oldName ? newName : tag
          );
          
          await supabase
            .from('blog_posts')
            .update({ tags: updatedTags })
            .eq('id', post.id);
        }
        console.log(`✅ Updated ${posts.length} post(s) with renamed tag`);
        
        await supabase
          .from('blog_tags')
          .update({ usage_count: posts.length })
          .eq('id', id);
      }
    }

    const transformedData = {
      id: data.id,
      name: data.name,
      color: data.color,
      usageCount: data.usage_count || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    console.log(`✅ Tag updated: ${id}`);
    res.json(transformedData);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * DELETE /blog-tags/:id
 * Delete tag with cascading removal from posts
 */
router.delete('/blog-tags/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supabase = getSupabase();

    // Get tag name before deleting
    const { data: tag, error: fetchError } = await supabase
      .from('blog_tags')
      .select('name, usage_count')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching tag:', fetchError);
      throw fetchError;
    }

    const tagName = tag.name;

    // Remove this tag from all posts that use it
    const { data: posts, error: postsError } = await supabase
      .from('blog_posts')
      .select('id, tags')
      .contains('tags', [tagName]);

    if (!postsError && posts && posts.length > 0) {
      for (const post of posts) {
        const updatedTags = (post.tags || []).filter((t: string) => t !== tagName);
        
        await supabase
          .from('blog_posts')
          .update({ tags: updatedTags })
          .eq('id', post.id);
      }
      console.log(`✅ Removed tag from ${posts.length} post(s)`);
    }

    // Delete the tag
    const { error: deleteError } = await supabase
      .from('blog_tags')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Error deleting tag:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Tag deleted: ${id} (${tag.name})`);
    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// ============================================================================
// ADMIN BLOG ROUTES
// ============================================================================

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
    if (source_topic_id) {
      try {
        const topicStatus = post.status === 'published' ? 'published' : 'in_progress';
        
        // Get current topic to increment times_generated
        const { data: currentTopic } = await supabase
          .from('content_topics')
          .select('times_generated')
          .eq('id', source_topic_id)
          .single();
        
        // Update topic
        const { error: topicError } = await supabase
          .from('content_topics')
          .update({
            status: topicStatus,
            times_generated: (currentTopic?.times_generated || 0) + 1,
            last_generated_at: new Date().toISOString()
          })
          .eq('id', source_topic_id);
        
        if (topicError) {
          console.error('⚠️ Failed to update topic status:', topicError);
        } else {
          console.log(`✅ Topic ${source_topic_id} updated to ${topicStatus}`);
        }
        
        // Find and update assignment
        const { data: assignment } = await supabase
          .from('content_daily_assignments')
          .select('id')
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
            console.error('⚠️ Failed to update assignment:', assignmentError);
          } else {
            console.log(`✅ Assignment ${assignment.id} updated with post_id ${post.id}`);
          }
        }
      } catch (syncError) {
        console.error('⚠️ Status synchronization error:', syncError);
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
 */
router.post('/admin/blog/posts/:id/translate', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Duplicating post for translation: ${id}`);
    
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
    
    res.json({
      success: true,
      data: duplicatedPost
    });
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
// ADMIN TAG MANAGEMENT
// ============================================================================

/**
 * GET /admin/blog/tags
 * Get all tags with autocomplete support
 */
router.get('/admin/blog/tags', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { suggest } = req.query;
    
    const supabase = getSupabase();
    
    let query = supabase
      .from('blog_tags')
      .select('*');

    if (suggest) {
      query = query.or(`name.ilike.%${suggest}%,slug.ilike.%${suggest}%`);
      query = query.order('usage_count', { ascending: false }).limit(20);
    } else {
      query = query.order('name', { ascending: true });
    }
    
    const { data: tags, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: tags || [],
      total: tags?.length || 0
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /admin/blog/tags
 * Create new tag (admin)
 */
router.post('/admin/blog/tags', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, color, icon } = req.body;
    
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    const supabase = getSupabase();
    
    const { data: tag, error } = await supabase
      .from('blog_tags')
      .insert({ name, slug, color, icon })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Tag created: ${name}`);
    
    res.json({
      success: true,
      data: tag
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * PUT /admin/blog/tags/:id
 * Update tag (admin)
 */
router.put('/admin/blog/tags/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;
    
    const updates: any = {};
    if (name !== undefined) {
      updates.name = name;
      updates.slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    
    const supabase = getSupabase();
    
    const { data: tag, error } = await supabase
      .from('blog_tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: tag
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /admin/blog/tags/:id
 * Delete tag (admin)
 */
router.delete('/admin/blog/tags/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const supabase = getSupabase();
    
    const { error } = await supabase
      .from('blog_tags')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    console.log(`✅ Tag deleted: ${id}`);
    
    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /admin/blog/posts/:id/tags
 * Assign tags to a post (junction table)
 */
router.post('/admin/blog/posts/:id/tags', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body;
    
    const supabase = getSupabase();
    
    // Delete existing tag associations
    await supabase
      .from('blog_post_tags')
      .delete()
      .eq('post_id', id);
    
    // Insert new associations
    if (tagIds && tagIds.length > 0) {
      const associations = tagIds.map((tagId: string) => ({
        post_id: id,
        tag_id: tagId
      }));
      
      const { error } = await supabase
        .from('blog_post_tags')
        .insert(associations);
      
      if (error) throw error;
    }
    
    res.json({
      success: true,
      message: 'Tags updated successfully'
    });
  } catch (error) {
    console.error('Error updating post tags:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /admin/blog/posts/:id/tags
 * Get tags for a post
 */
router.get('/admin/blog/posts/:id/tags', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const supabase = getSupabase();
    
    const { data: postTags, error } = await supabase
      .from('blog_post_tags')
      .select('tag_id, blog_tags(*)')
      .eq('post_id', id);
    
    if (error) throw error;
    
    const tags = postTags?.map((pt: any) => pt.blog_tags).filter(Boolean) || [];

    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    console.error('Error fetching post tags:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// =============================================================================
// BLOG IMAGE MANAGEMENT
// =============================================================================

/**
 * GET /admin/blog/images
 * List all images in the blog storage bucket
 */
router.get('/admin/blog/images', requireAdmin, async (req: Request, res: Response) => {
  try {
    const supabase = getSupabase();

    const { data: files, error } = await supabase.storage
      .from('memopyk-blog')
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) throw error;

    const imageFiles = (files || [])
      .filter((file: any) => {
        const ext = file.name.toLowerCase().split('.').pop();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
      })
      .map((file: any) => ({
        name: file.name,
        url: `${process.env.SUPABASE_URL}/storage/v1/object/public/memopyk-blog/${file.name}`,
        size: file.metadata?.size || 0,
        created_at: file.created_at
      }));

    res.json({ success: true, data: imageFiles, total: imageFiles.length });
  } catch (error) {
    console.error('Error fetching blog images:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * POST /admin/blog/images
 * Upload image to blog storage bucket
 */
router.post('/admin/blog/images', requireAdmin, uploadImage.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const filename = req.file.originalname;
    const supabase = getSupabase();

    const fileBuffer = fs.readFileSync(req.file.path);

    const { error: uploadError } = await supabase.storage
      .from('memopyk-blog')
      .upload(filename, fileBuffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/memopyk-blog/${filename}`;

    // Clean up temp file
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    res.json({ success: true, data: { name: filename, url: publicUrl, size: req.file.size } });
  } catch (error) {
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
    console.error('Blog image upload error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * GET /admin/blog/images/:name/usage
 * Check if image is used in any blog post
 */
router.get('/admin/blog/images/:name/usage', requireAdmin, async (req: Request, res: Response) => {
  try {
    const imageName = decodeURIComponent(req.params.name);
    const supabase = getSupabase();

    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, title, content_html, hero_url');

    if (error) throw error;

    const usedInPosts = (posts || []).filter((post: any) => {
      if (post.hero_url && post.hero_url.includes(imageName)) return true;
      if (post.content_html && post.content_html.includes(imageName)) return true;
      return false;
    });

    res.json({
      success: true,
      data: {
        isUsed: usedInPosts.length > 0,
        count: usedInPosts.length,
        posts: usedInPosts.map((p: any) => ({ id: p.id, title: p.title }))
      }
    });
  } catch (error) {
    console.error('Error checking image usage:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/**
 * DELETE /admin/blog/images/:name
 * Delete image from blog storage
 */
router.delete('/admin/blog/images/:name', requireAdmin, async (req: Request, res: Response) => {
  try {
    const imageName = decodeURIComponent(req.params.name);
    const supabase = getSupabase();

    const { error } = await supabase.storage
      .from('memopyk-blog')
      .remove([imageName]);

    if (error) throw error;

    res.json({ success: true, message: 'Image deleted successfully', data: { name: imageName } });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
