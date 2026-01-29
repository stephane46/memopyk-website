/**
 * Hero Video Routes
 * 
 * Manages the hero video carousel on the homepage.
 * Supports bilingual content (EN/FR) with shared or separate videos per language.
 * 
 * Routes:
 * - GET    /              - List all hero videos
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
 * POST / - Create new hero video entry
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title_en, title_fr, url_en, url_fr, use_same_video, is_active, order_index } = req.body;

    // Validate required fields
    if (!title_en || !title_fr || !url_en) {
      return res.status(400).json({ 
        error: 'Missing required fields: title_en, title_fr, url_en' 
      });
    }

    // TODO: Replace with storage.createHeroVideo()
    const { storage } = await import('../services/storage.service');
    const newVideo = await storage.createHeroVideo({
      title_en,
      title_fr,
      url_en,
      url_fr: url_fr || url_en,
      use_same_video: use_same_video ?? true,
      is_active: is_active ?? false,
      order_index: order_index ?? 1
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
router.patch('/:id/reorder', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const { order_index } = req.body;

    if (!order_index || order_index < 1) {
      return res.status(400).json({ error: 'Valid order_index is required' });
    }

    // TODO: Replace with storage.updateHeroVideoOrder()
    const { storage } = await import('../services/storage.service');
    const result = await storage.updateHeroVideoOrder(videoId, order_index);
    res.json({ success: true, video: result });
  } catch (error) {
    console.error('Reorder hero video error:', error);
    res.status(500).json({ error: 'Failed to update video order' });
  }
});

/**
 * PATCH /:id/toggle - Toggle active/inactive status
 */
router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const { is_active } = req.body;

    // TODO: Replace with storage.updateHeroVideo()
    const { storage } = await import('../services/storage.service');
    const result = await storage.updateHeroVideo(videoId, {
      is_active,
      updated_at: new Date().toISOString()
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
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.id;
    const { title_en, title_fr, is_active, order_index, url_en, url_fr, use_same_video } = req.body;

    // TODO: Replace with storage.updateHeroVideo()
    const { storage } = await import('../services/storage.service');
    const result = await storage.updateHeroVideo(videoId, {
      title_en,
      title_fr,
      is_active,
      order_index,
      url_en,
      url_fr,
      use_same_video,
      updated_at: new Date().toISOString()
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
router.delete('/:id', async (req: Request, res: Response) => {
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
router.post('/text', async (req: Request, res: Response) => {
  try {
    const {
      title_mobile_fr,
      title_mobile_en,
      title_desktop_fr,
      title_desktop_en,
      font_size_desktop,
      font_size_tablet,
      font_size_mobile
    } = req.body;

    if (!title_desktop_fr || !title_desktop_en || !title_mobile_fr || !title_mobile_en) {
      return res.status(400).json({ 
        error: 'Desktop and mobile titles are required in both languages' 
      });
    }

    // TODO: Replace with storage.createHeroText()
    const { storage } = await import('../services/storage.service');
    const newText = await storage.createHeroText({
      title_fr: title_desktop_fr,
      title_en: title_desktop_en,
      subtitle_fr: '',
      subtitle_en: '',
      title_mobile_fr,
      title_mobile_en,
      title_desktop_fr,
      title_desktop_en,
      font_size: font_size_desktop || 48,
      font_size_desktop: font_size_desktop || 60,
      font_size_tablet: font_size_tablet || 45,
      font_size_mobile: font_size_mobile || 32,
      is_active: false
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
router.patch('/text/:id', async (req: Request, res: Response) => {
  try {
    const textId = parseInt(req.params.id);
    const updateData = req.body;

    // TODO: Replace with storage.updateHeroText()
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
router.patch('/text/:id/apply', async (req: Request, res: Response) => {
  try {
    const textId = req.params.id;
    const { font_size, font_size_desktop, font_size_tablet, font_size_mobile } = req.body;

    // TODO: Replace with storage methods
    const { storage } = await import('../services/storage.service');
    
    // Deactivate all other hero texts first
    await storage.deactivateAllHeroTexts();

    const updateData: Record<string, any> = {
      is_active: true,
      font_size: font_size || font_size_desktop || 48
    };

    // Add responsive font sizes if provided
    if (font_size_desktop) updateData.font_size_desktop = Number(font_size_desktop);
    if (font_size_tablet) updateData.font_size_tablet = Number(font_size_tablet);
    if (font_size_mobile) updateData.font_size_mobile = Number(font_size_mobile);

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
router.delete('/text/:id', async (req: Request, res: Response) => {
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
