/**
 * Gallery Routes
 * 
 * Handles gallery item CRUD operations with file upload support.
 * Includes video and image uploads with auto-thumbnail generation.
 * 
 * Endpoints:
 * - GET    /                    - List all gallery items (with caching)
 * - POST   /                    - Create new gallery item
 * - GET    /admin               - Admin gallery view (no cache)
 * - PATCH  /:id                 - Update gallery item
 * - DELETE /:id                 - Delete gallery item
 * - PATCH  /:id/reorder         - Reorder single item
 * - PATCH  /:id1/swap/:id2      - Swap two items
 * - POST   /upload-static-image - Upload cropped 300x200 thumbnail
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import { requireAdmin } from '../middleware/auth.middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createClient } from '@supabase/supabase-js';

const router = Router();

import { storage } from '../services/storage.service';

function createCacheHitHeaders(source: string): Record<string, string> {
  return { 'X-Delivery': 'cache-hit', 'X-Upstream': source, 'X-Storage': 'local' };
}
function createCacheMissHeaders(source: string): Record<string, string> {
  return { 'X-Delivery': 'cache-miss', 'X-Upstream': source, 'X-Storage': 'local' };
}

// Lazy Supabase client (created on first use, not at import time)
let _supabase: any = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _supabase;
}
// Keep `supabase` as a const proxy so existing code doesn't need to change call sites
const supabase: any = new Proxy({} as any, {
  get(_t, prop, recv) { return Reflect.get(getSupabase(), prop, recv); },
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Upload directory ready: ${uploadsDir}`);
} catch (error) {
  console.error('Failed to create uploads directory:', error);
}

// Configure disk storage for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    console.log(`📁 GALLERY IMAGE UPLOAD - Using original filename: ${originalName}`);
    cb(null, originalName);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5000 * 1024 * 1024 }, // 5000MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Gallery cache for performance
let galleryCache: { data: any[], timestamp: number } | null = null;
const GALLERY_CACHE_TTL = 30000; // 30 seconds

/**
 * Helper: Clear gallery cache
 */
function clearGalleryCache() {
  galleryCache = null;
  console.log('🗑️ Gallery cache cleared');
}


/**
 * GET / - List all gallery items (with caching)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const bypassCache = req.headers['x-test-bypass-cache'] === '1';
    
    // Check cache validity
    if (!bypassCache && galleryCache && (now - galleryCache.timestamp) < GALLERY_CACHE_TTL) {
      console.log(`📋 Gallery served from cache (${Math.round((now - galleryCache.timestamp) / 1000)}s old)`);
      
      const deliveryHeaders = createCacheHitHeaders('local');
      res.setHeader('X-Delivery', deliveryHeaders['X-Delivery']);
      res.setHeader('X-Upstream', deliveryHeaders['X-Upstream']);
      res.setHeader('X-Storage', deliveryHeaders['X-Storage'] || 'unknown');
      res.setHeader('X-Content-Bytes', String(JSON.stringify(galleryCache.data).length));
      
      return res.json(galleryCache.data);
    }
    
    // Fetch fresh data
    const items = await storage.getGalleryItems();
    galleryCache = { data: items, timestamp: now };
    console.log(`🔄 Gallery fetched from database and cached`);
    
    const deliveryHeaders = createCacheMissHeaders('local');
    res.setHeader('X-Delivery', deliveryHeaders['X-Delivery']);
    res.setHeader('X-Upstream', deliveryHeaders['X-Upstream']);
    res.setHeader('X-Storage', deliveryHeaders['X-Storage'] || 'unknown');
    res.setHeader('X-Content-Bytes', String(JSON.stringify(items).length));
    
    res.json(items);
  } catch (error) {
    console.error('Gallery fetch error:', error);
    res.status(500).json({ error: 'Failed to get gallery items' });
  }
});

/**
 * POST / - Create new gallery item
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const item = await storage.createGalleryItem(req.body);
    clearGalleryCache();
    res.json(item);
  } catch (error) {
    console.error('Gallery create error:', error);
    res.status(500).json({ error: 'Failed to create gallery item' });
  }
});

/**
 * GET /admin - Admin gallery view (bypasses cache)
 */
router.get('/admin', requireAdmin, async (req: Request, res: Response) => {
  try {
    const items = await storage.getGalleryItems();
    console.log(`🔄 Admin gallery fetched (bypassing cache)`);
    res.json(items);
  } catch (error) {
    console.error('Admin gallery fetch error:', error);
    res.status(500).json({ error: 'Failed to get admin gallery items' });
  }
});

/**
 * PATCH /:id - Update gallery item
 */
router.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const itemId = req.params.id;
    const updates = req.body;
    
    console.log('🔄 Gallery update:', {
      itemId,
      video_filename: updates.video_filename,
      video_url_en: updates.video_url_en,
      title_en: updates.title_en
    });
    
    if (!itemId) {
      return res.status(400).json({ error: 'Gallery item ID is required' });
    }
    
    const item = await storage.updateGalleryItem(itemId, updates);
    clearGalleryCache();
    
    res.json(item);
  } catch (error: any) {
    console.error('Gallery update error:', error);
    res.status(500).json({ error: `Failed to update gallery item: ${error.message}` });
  }
});

/**
 * DELETE /:id - Delete gallery item
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const itemId = req.params.id;
    console.log(`🗑️ Deleting gallery item: ${itemId}`);
    
    if (!itemId || itemId.trim() === '') {
      return res.status(400).json({ error: 'Invalid gallery item ID' });
    }
    
    const deleted = await storage.deleteGalleryItem(itemId);
    if (!deleted) {
      return res.json({ success: true, message: 'Item was already deleted or does not exist', alreadyDeleted: true });
    }
    console.log(`✅ Deleted gallery item: ${itemId}`);
    clearGalleryCache();

    res.json({ success: true, deletedId: itemId });
  } catch (error: any) {
    console.error('Gallery deletion error:', error);
    
    // Item not found is success for deletion
    if (error.message === 'Gallery item not found') {
      return res.json({ 
        success: true, 
        message: 'Item was already deleted or does not exist',
        alreadyDeleted: true 
      });
    }
    
    res.status(500).json({ error: `Failed to delete gallery item: ${error.message}` });
  }
});

/**
 * PATCH /:id/reorder - Reorder single item
 */
router.patch('/:id/reorder', requireAdmin, async (req: Request, res: Response) => {
  try {
    const itemId = req.params.id;
    const { order_index } = req.body;
    
    console.log(`🔄 Reordering gallery item ${itemId} to position ${order_index}`);
    
    if (!itemId || itemId.trim() === '') {
      return res.status(400).json({ error: 'Invalid gallery item ID' });
    }
    
    const item = await storage.updateGalleryItemOrder(itemId, order_index);
    clearGalleryCache();
    
    res.json(item);
  } catch (error: any) {
    console.error('Gallery reorder error:', error);
    res.status(500).json({ error: `Failed to reorder gallery item: ${error.message}` });
  }
});

/**
 * PATCH /:id1/swap/:id2 - Swap two items
 */
router.patch('/:id1/swap/:id2', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id1, id2 } = req.params;
    
    console.log(`🔄 Swapping gallery items ${id1} ↔ ${id2}`);
    
    if (!id1 || !id2 || id1.trim() === '' || id2.trim() === '') {
      return res.status(400).json({ error: 'Invalid gallery item IDs' });
    }
    
    const result = await storage.swapGalleryItemOrder(id1, id2);
    clearGalleryCache();
    
    res.json(result);
  } catch (error: any) {
    console.error('Gallery swap error:', error);
    res.status(500).json({ error: `Failed to swap gallery items: ${error.message}` });
  }
});

/**
 * POST /upload-static-image - Upload cropped 300x200 thumbnail
 */
router.post('/upload-static-image', requireAdmin, uploadImage.single('image'), async (req: Request, res: Response) => {
  console.log(`🚀 STATIC IMAGE UPLOAD - File: ${req.file ? 'YES' : 'NO'}`);
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No static image file provided' });
    }

    const itemId = req.body.item_id;
    const cropSettings = req.body.crop_settings ? JSON.parse(req.body.crop_settings) : null;
    const language = req.body.language || 'en';
    const originalFilename = req.body.original_filename || 'image';
    
    if (!itemId) {
      return res.status(400).json({ error: 'Gallery item ID required' });
    }

    // Extract base filename and add -C suffix
    let baseFilename = originalFilename;
    if (originalFilename.includes('/')) {
      baseFilename = originalFilename.split('/').pop() || 'image';
    }
    const nameWithoutExt = baseFilename.replace(/\.[^/.]+$/, '');
    const filename = `${nameWithoutExt}-C.jpg`;
    
    console.log(`🔄 CROPPED IMAGE: ${baseFilename} → ${filename}`);

    // Delete old version for cache refresh
    await supabase.storage.from('memopyk-videos').remove([filename]);

    // Upload new cropped image
    const fileBuffer = fs.readFileSync(req.file.path);
    const { error: uploadError } = await supabase.storage
      .from('memopyk-videos')
      .upload(filename, fileBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '300',
        upsert: true
      });

    if (uploadError) {
      console.error('Static image upload error:', uploadError);
      return res.status(500).json({ error: `Static image upload failed: ${uploadError.message}` });
    }

    const staticImageUrl = `https://supabase.memopyk.org/storage/v1/object/public/memopyk-videos/${filename}`;
    console.log(`✅ Static image uploaded: ${staticImageUrl}`);
    
    // Update database with new static image URL
    try {
      const updateData = language === 'fr' 
        ? { static_image_url_fr: staticImageUrl, cropSettings }
        : { static_image_url_en: staticImageUrl, cropSettings };
      
      await storage.updateGalleryItem(itemId, updateData);
      clearGalleryCache();
      console.log(`✅ Database updated for item ${itemId}`);
    } catch (dbError) {
      console.error('Database update failed:', dbError);
    }
    
    // Cleanup temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn('Failed to cleanup temp file');
    }

    res.json({ 
      success: true, 
      url: staticImageUrl,
      filename,
      crop_settings: cropSettings,
      width: 300,
      height: 200
    });
  } catch (error) {
    console.error('Static image upload error:', error);
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: 'Failed to upload static image' });
  }
});

export default router;
