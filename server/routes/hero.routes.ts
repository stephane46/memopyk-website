/**
 * Hero Video Routes
 * 
 * Manages the hero video carousel on the homepage.
 * Supports bilingual content (EN/FR) with shared or separate videos per language.
 * 
 * Routes:
 * - GET    /              - List all hero videos
 * - POST   /upload        - Upload hero video to Supabase storage
 * - POST   /              - Create new hero video
 * - PATCH  /:id           - Update hero video
 * - PATCH  /:id/reorder   - Update video order
 * - PATCH  /:id/toggle    - Toggle active status
 * - DELETE /:id           - Delete hero video
 * 
 * Also includes Hero Text Settings:
 * - GET    /text          - Get hero text settings
 * - POST   /text          - Create hero text
 * - PATCH  /text/:id      - Update hero text
 * - PATCH  /text/:id/apply - Apply hero text (set as active)
 * - DELETE /text/:id      - Delete hero text
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../middleware/auth.middleware';

// Multer memory storage for video uploads (buffer sent directly to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const isVideo = file.mimetype.startsWith('video/');
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const hasExt = videoExts.some(ext => file.originalname.toLowerCase().endsWith(ext));
    if (isVideo || hasExt) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Lazy Supabase client
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

const router = Router();

// =============================================================================
// HERO TEXT ROUTER (for /api/hero-text mount point)
// =============================================================================

/**
 * Separate router for /api/hero-text endpoint
 * Frontend calls /api/hero-text which needs to return hero text settings
 */
const heroTextRouter = Router();

heroTextRouter.get('/', async (req: Request, res: Response) => {
  try {
    const language = req.query.lang as string;
    const { storage } = await import('../services/storage.service');
    const heroText = await storage.getHeroTextSettings(language);
    res.json(heroText);
  } catch (error) {
    console.error('Get hero text error:', error);
    res.status(500).json({ error: 'Failed to get hero text' });
  }
});

// =============================================================================
// HERO VIDEOS
// =============================================================================

/**
 * GET / - List all hero videos
 * Returns camelCase format (native Drizzle output)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { storage } = await import('../services/storage.service');
    const videos = await storage.getHeroVideos();
    res.json(videos);
  } catch (error) {
    console.error('Get hero videos error:', error);
    res.status(500).json({ error: 'Failed to get hero videos' });
  }
});

/**
 * POST /upload - Upload hero video to Supabase storage
 * Accepts multipart form with 'video' field
 * Returns { filename } for the frontend to store
 */
router.post('/upload', requireAdmin, upload.single('video'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const filename = file.originalname;
    const supabase = getSupabase();

    const { error } = await supabase.storage
      .from('memopyk-videos')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (error) {
      console.error('Hero video upload to Supabase failed:', error);
      return res.status(500).json({ error: `Upload failed: ${error.message}` });
    }

    console.log(`Hero video uploaded: ${filename}`);
    res.json({ filename });
  } catch (error) {
    console.error('Hero video upload error:', error);
    res.status(500).json({ error: 'Failed to upload hero video' });
  }
});

/**
 * POST / - Create new hero video entry
 */
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { titleEn, titleFr, urlEn, urlFr, useSameVideo, isActive, orderIndex } = req.body;

    // Validate required fields
    if (!titleEn || !titleFr || !urlEn) {
      return res.status(400).json({
        error: 'Missing required fields: titleEn, titleFr, urlEn'
      });
    }

    const { storage } = await import('../services/storage.service');
    const newVideo = await storage.createHeroVideo({
      titleEn,
      titleFr,
      urlEn,
      urlFr: urlFr || urlEn,
      useSameVideo: useSameVideo ?? true,
      isActive: isActive ?? false,
      orderIndex: orderIndex ?? 1
    });

    res.json(newVideo);
  } catch (error) {
    console.error('Create hero video error:', error);
    res.status(500).json({ error: 'Failed to create hero video' });
  }
});

/**
 * PATCH /:id/reorder - Update hero video order
 */
router.patch('/:id/reorder', requireAdmin, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const { orderIndex } = req.body;

    if (!orderIndex || orderIndex < 1) {
      return res.status(400).json({ error: 'Valid orderIndex is required' });
    }

    const { storage } = await import('../services/storage.service');
    const result = await storage.updateHeroVideoOrder(videoId, orderIndex);
    res.json({ success: true, video: result });
  } catch (error) {
    console.error('Reorder hero video error:', error);
    res.status(500).json({ error: 'Failed to update video order' });
  }
});

/**
 * PATCH /:id/toggle - Toggle active/inactive status
 */
router.patch('/:id/toggle', requireAdmin, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const { isActive } = req.body;

    const { storage } = await import('../services/storage.service');
    const result = await storage.updateHeroVideo(videoId, {
      isActive,
      updatedAt: new Date()
    });

    res.json(result);
  } catch (error) {
    console.error('Hero video toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle hero video status' });
  }
});

/**
 * PATCH /:id - Update hero video metadata
 */
router.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const { titleEn, titleFr, isActive, orderIndex, urlEn, urlFr, useSameVideo } = req.body;

    const { storage } = await import('../services/storage.service');
    const result = await storage.updateHeroVideo(videoId, {
      titleEn,
      titleFr,
      isActive,
      orderIndex,
      urlEn,
      urlFr,
      useSameVideo,
      updatedAt: new Date()
    });

    res.json(result);
  } catch (error) {
    console.error('Hero video update error:', error);
    res.status(500).json({ error: 'Failed to update hero video' });
  }
});

/**
 * DELETE /:id - Delete hero video
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    console.log(`🗑️ Deleting hero video with ID: ${videoId}`);

    // TODO: Replace with storage.deleteHeroVideo()
    const { storage } = await import('../services/storage.service');
    const result = await storage.deleteHeroVideo(videoId);
    res.json({ success: true, deletedVideo: result });
  } catch (error: any) {
    console.error('Hero video delete error:', error);
    if (error.message === 'Video not found') {
      res.status(404).json({ error: 'Video not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete hero video' });
    }
  }
});

// =============================================================================
// HERO TEXT SETTINGS
// =============================================================================

/**
 * GET /text - Get hero text settings
 */
router.get('/text', async (req: Request, res: Response) => {
  try {
    const language = req.query.lang as string;
    
    // TODO: Replace with storage.getHeroTextSettings()
    const { storage } = await import('../services/storage.service');
    const heroText = await storage.getHeroTextSettings(language);
    res.json(heroText);
  } catch (error) {
    console.error('Get hero text error:', error);
    res.status(500).json({ error: 'Failed to get hero text' });
  }
});

/**
 * POST /text - Create new hero text
 */
router.post('/text', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      titleMobileFr,
      titleMobileEn,
      titleDesktopFr,
      titleDesktopEn,
      fontSizeDesktop,
      fontSizeTablet,
      fontSizeMobile
    } = req.body;

    if (!titleDesktopFr || !titleDesktopEn || !titleMobileFr || !titleMobileEn) {
      return res.status(400).json({
        error: 'Desktop and mobile titles are required in both languages'
      });
    }

    const { storage } = await import('../services/storage.service');
    const newText = await storage.createHeroText({
      titleFr: titleDesktopFr,
      titleEn: titleDesktopEn,
      subtitleFr: '',
      subtitleEn: '',
      titleMobileFr,
      titleMobileEn,
      titleDesktopFr,
      titleDesktopEn,
      fontSize: fontSizeDesktop || 48,
      fontSizeDesktop: fontSizeDesktop || 60,
      fontSizeTablet: fontSizeTablet || 45,
      fontSizeMobile: fontSizeMobile || 32,
      isActive: false
    });

    res.status(201).json({ success: true, text: newText });
  } catch (error) {
    console.error('Create hero text error:', error);
    res.status(500).json({ error: 'Failed to create hero text' });
  }
});

/**
 * PATCH /text/:id - Update hero text
 */
router.patch('/text/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const textId = parseInt(req.params.id);
    // Frontend sends camelCase keys matching Drizzle schema
    const updateData = req.body;

    const { storage } = await import('../services/storage.service');
    const updatedText = await storage.updateHeroText(String(textId), updateData);
    res.json({ success: true, text: updatedText });
  } catch (error) {
    console.error('Update hero text error:', error);
    res.status(500).json({ error: 'Failed to update hero text' });
  }
});

/**
 * PATCH /text/:id/apply - Apply hero text to site (set as active)
 */
router.patch('/text/:id/apply', requireAdmin, async (req: Request, res: Response) => {
  try {
    const textId = req.params.id;
    const { fontSize, fontSizeDesktop, fontSizeTablet, fontSizeMobile } = req.body;

    const { storage } = await import('../services/storage.service');

    // Deactivate all other hero texts first
    await storage.deactivateAllHeroTexts();

    const updateData: Record<string, any> = {
      isActive: true,
      fontSize: fontSize || fontSizeDesktop || 48
    };

    // Add responsive font sizes if provided
    if (fontSizeDesktop) updateData.fontSizeDesktop = Number(fontSizeDesktop);
    if (fontSizeTablet) updateData.fontSizeTablet = Number(fontSizeTablet);
    if (fontSizeMobile) updateData.fontSizeMobile = Number(fontSizeMobile);

    const appliedText = await storage.updateHeroText(textId, updateData);
    res.json({ success: true, text: appliedText });
  } catch (error) {
    console.error('Apply hero text error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to apply hero text', details: message });
  }
});

/**
 * DELETE /text/:id - Delete hero text
 */
router.delete('/text/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const textId = parseInt(req.params.id);

    // TODO: Replace with storage.deleteHeroText()
    const { storage } = await import('../services/storage.service');
    await storage.deleteHeroText(String(textId));
    res.json({ success: true, message: 'Hero text deleted successfully' });
  } catch (error) {
    console.error('Delete hero text error:', error);
    res.status(500).json({ error: 'Failed to delete hero text' });
  }
});

export { heroTextRouter };
export default router;
