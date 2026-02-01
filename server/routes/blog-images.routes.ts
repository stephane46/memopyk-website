/**
 * Blog Images Routes
 *
 * Admin image management for blog posts.
 *
 * Routes:
 * - GET /admin/blog/images - List all images
 * - POST /admin/blog/images - Upload image
 * - GET /admin/blog/images/:name/usage - Check image usage
 * - DELETE /admin/blog/images/:name - Delete image
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { requireAdmin } from '../middleware/auth.middleware';
import { getSupabase } from './blog-shared';

const router = Router();

// Multer config for blog image uploads
const uploadImage = multer({ dest: 'uploads/' });

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
