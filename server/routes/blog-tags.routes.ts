/**
 * Blog Tags Routes
 *
 * Public read + admin CRUD for blog tags.
 *
 * Public Routes:
 * - GET /blog-tags - Fetch all tags with usage counts (public read)
 *
 * Admin Routes:
 * - GET /admin/blog/tags - Get all tags (with autocomplete)
 * - POST /admin/blog/tags - Create new tag
 * - PUT /admin/blog/tags/:id - Update tag
 * - DELETE /admin/blog/tags/:id - Delete tag
 * - POST /admin/blog/posts/:id/tags - Assign tags to post
 * - GET /admin/blog/posts/:id/tags - Get tags for post
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import { getSupabase } from './blog-shared';

const router = Router();

// ============================================================================
// PUBLIC TAG ROUTES (with cascading)
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
 * Assign tags to a post (junction table) - with rollback safety
 */
router.post('/admin/blog/posts/:id/tags', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tagIds } = req.body;

    const supabase = getSupabase();

    // Get existing tags for potential rollback
    const { data: existingTags } = await supabase
      .from('blog_post_tags')
      .select('tag_id')
      .eq('post_id', id);

    const originalTagIds = existingTags?.map((t: any) => t.tag_id) || [];

    // Delete existing tag associations
    const { error: deleteError } = await supabase
      .from('blog_post_tags')
      .delete()
      .eq('post_id', id);

    if (deleteError) throw deleteError;

    // Insert new associations
    if (tagIds && tagIds.length > 0) {
      const associations = tagIds.map((tagId: string) => ({
        post_id: id,
        tag_id: tagId
      }));

      const { error: insertError } = await supabase
        .from('blog_post_tags')
        .insert(associations);

      if (insertError) {
        // Rollback: restore original tags
        console.error('❌ Tag insert failed, rolling back:', insertError);
        if (originalTagIds.length > 0) {
          const rollbackAssociations = originalTagIds.map((tagId: string) => ({
            post_id: id,
            tag_id: tagId
          }));
          await supabase.from('blog_post_tags').insert(rollbackAssociations);
          console.log(`🔄 Rolled back to original ${originalTagIds.length} tags`);
        }
        return res.status(500).json({
          success: false,
          error: 'Failed to assign tags',
          code: 'TAG_INSERT_FAILED',
          rolled_back: true
        });
      }
    }

    console.log(`✅ Post ${id} tags updated: ${tagIds?.length || 0} tags`);

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

export default router;
