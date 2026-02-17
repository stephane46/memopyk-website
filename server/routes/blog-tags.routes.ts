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
import { blogCacheGet, blogCacheSet, blogCacheClear } from './blog-shared';
import { db } from '../db';
import { blogTags, blogPostTags } from '@shared/schema';
import { eq, or, asc, desc, ilike, sql } from 'drizzle-orm';

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
    const cacheKey = 'blog-tags';
    const cached = blogCacheGet(cacheKey);
    if (cached) return res.json(cached);

    const tags = await db.select().from(blogTags);

    // Get usage counts via aggregation
    const usageCounts = await db
      .select({
        tagId: blogPostTags.tagId,
        count: sql<number>`count(*)::int`
      })
      .from(blogPostTags)
      .groupBy(blogPostTags.tagId);

    const tagUsageMap = new Map<string, number>();
    usageCounts.forEach(row => {
      tagUsageMap.set(row.tagId, row.count);
    });

    // Drizzle already returns camelCase; add computed usageCount
    const transformedData = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      usageCount: tagUsageMap.get(tag.id) || 0,
    }))
    .sort((a, b) => b.usageCount - a.usageCount);

    const result = { data: transformedData };
    blogCacheSet(cacheKey, result);
    res.json(result);
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

    let tags;
    if (suggest) {
      const pattern = `%${suggest}%`;
      tags = await db
        .select()
        .from(blogTags)
        .where(or(
          ilike(blogTags.name, pattern),
          ilike(blogTags.slug, pattern)
        ))
        .orderBy(desc(blogTags.usageCount))
        .limit(20);
    } else {
      tags = await db
        .select()
        .from(blogTags)
        .orderBy(asc(blogTags.name));
    }

    res.json({
      success: true,
      data: tags,
      total: tags.length
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

    const [tag] = await db
      .insert(blogTags)
      .values({ name, slug, color, icon })
      .returning();

    blogCacheClear();
    console.log(`Tag created: ${name}`);

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

    const updates: Record<string, any> = {};
    if (name !== undefined) {
      updates.name = name;
      updates.slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;

    const [tag] = await db
      .update(blogTags)
      .set(updates)
      .where(eq(blogTags.id, id))
      .returning();

    blogCacheClear();

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

    await db
      .delete(blogTags)
      .where(eq(blogTags.id, id));

    blogCacheClear();
    console.log(`Tag deleted: ${id}`);

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

    // Get existing tags for potential rollback
    const existingTags = await db
      .select({ tagId: blogPostTags.tagId })
      .from(blogPostTags)
      .where(eq(blogPostTags.postId, id));

    const originalTagIds = existingTags.map(t => t.tagId);

    // Delete existing tag associations
    await db
      .delete(blogPostTags)
      .where(eq(blogPostTags.postId, id));

    // Insert new associations
    if (tagIds && tagIds.length > 0) {
      try {
        const associations = tagIds.map((tagId: string) => ({
          postId: id,
          tagId
        }));

        await db.insert(blogPostTags).values(associations);
      } catch (insertError) {
        // Rollback: restore original tags
        console.error('Tag insert failed, rolling back:', insertError);
        if (originalTagIds.length > 0) {
          const rollbackAssociations = originalTagIds.map(tagId => ({
            postId: id,
            tagId
          }));
          await db.insert(blogPostTags).values(rollbackAssociations);
          console.log(`Rolled back to original ${originalTagIds.length} tags`);
        }
        return res.status(500).json({
          success: false,
          error: 'Failed to assign tags',
          code: 'TAG_INSERT_FAILED',
          rolledBack: true
        });
      }
    }

    blogCacheClear();
    console.log(`Post ${id} tags updated: ${tagIds?.length || 0} tags`);

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

    const postTagRows = await db
      .select({ tag: blogTags })
      .from(blogPostTags)
      .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
      .where(eq(blogPostTags.postId, id));

    const tags = postTagRows.map(row => row.tag);

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
