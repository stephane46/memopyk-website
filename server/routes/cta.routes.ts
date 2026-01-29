/**
 * CTA Routes - Call-to-action settings and Why MEMOPYK cards
 * 
 * Endpoints:
 * CTA Settings:
 * - GET /api/cta - Get all CTA settings
 * - POST /api/cta - Create CTA setting
 * - PATCH /api/cta/:id - Update CTA setting
 * - DELETE /api/cta/:id - Delete CTA setting
 * 
 * Why MEMOPYK Cards:
 * - GET /api/why-memopyk-cards - Get all cards
 * - POST /api/why-memopyk-cards - Create card
 * - PATCH /api/why-memopyk-cards/:id - Update card
 * - DELETE /api/why-memopyk-cards/:id - Delete card
 */

import { Router, Request, Response } from 'express';
import { storage } from '../services/storage.service';

const router = Router();

// =============================================================================
// CTA Settings Endpoints
// =============================================================================

/**
 * GET /api/cta
 * Get all CTA settings
 */
router.get('/cta', async (req: Request, res: Response) => {
  try {
    const cta = await storage.getCtaSettings();
    res.json(cta);
  } catch (error) {
    console.error('Get CTA error:', error);
    res.status(500).json({ error: "Failed to get CTA content" });
  }
});

/**
 * POST /api/cta
 * Create new CTA setting
 */
router.post('/cta', async (req: Request, res: Response) => {
  try {
    const { id, buttonTextFr, buttonTextEn, buttonUrlEn, buttonUrlFr, isActive } = req.body;
    
    if (!id || !buttonTextFr || !buttonTextEn || !buttonUrlEn || !buttonUrlFr) {
      return res.status(400).json({ error: "All fields required" });
    }

    const newCta = await storage.createCtaSettings({
      id,
      buttonTextFr,
      buttonTextEn,
      buttonUrlEn,
      buttonUrlFr,
      isActive: isActive || false
    });
    
    res.json(newCta);
  } catch (error) {
    console.error('Create CTA error:', error);
    res.status(500).json({ error: "Failed to create CTA setting" });
  }
});

/**
 * PATCH /api/cta/:id
 * Update CTA setting
 */
router.patch('/cta/:id', async (req: Request, res: Response) => {
  try {
    const ctaId = req.params.id;
    const updates = req.body;
    
    const updatedCta = await storage.updateCtaSettings(ctaId, updates);
    
    if (!updatedCta) {
      return res.status(404).json({ error: "CTA setting not found" });
    }
    
    res.json(updatedCta);
  } catch (error) {
    console.error('Update CTA error:', error);
    res.status(500).json({ error: "Failed to update CTA setting" });
  }
});

/**
 * DELETE /api/cta/:id
 * Delete CTA setting
 */
router.delete('/cta/:id', async (req: Request, res: Response) => {
  try {
    const ctaId = req.params.id;
    
    const deleted = await storage.deleteCtaSettings(ctaId);
    
    if (!deleted) {
      return res.status(404).json({ error: "CTA setting not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete CTA error:', error);
    res.status(500).json({ error: "Failed to delete CTA setting" });
  }
});

// =============================================================================
// Why MEMOPYK Cards Endpoints
// =============================================================================

/**
 * GET /api/why-memopyk-cards
 * Get all Why MEMOPYK cards
 */
router.get('/why-memopyk-cards', async (req: Request, res: Response) => {
  try {
    const cards = await storage.getWhyMemopykCards();
    res.json(cards);
  } catch (error) {
    console.error('Get Why MEMOPYK cards error:', error);
    res.status(500).json({ error: "Failed to get Why MEMOPYK cards" });
  }
});

/**
 * POST /api/why-memopyk-cards
 * Create new Why MEMOPYK card
 */
router.post('/why-memopyk-cards', async (req: Request, res: Response) => {
  try {
    const { 
      id, 
      titleEn, 
      titleFr, 
      descriptionEn, 
      descriptionFr, 
      iconName, 
      gradient, 
      orderIndex, 
      isActive 
    } = req.body;
    
    if (!id || !titleEn || !titleFr || !descriptionEn || !descriptionFr || !iconName || !gradient) {
      return res.status(400).json({ error: "All fields required" });
    }

    const newCard = await storage.createWhyMemopykCard({
      id,
      titleEn,
      titleFr,
      descriptionEn,
      descriptionFr,
      iconName,
      gradient,
      orderIndex: orderIndex || 0,
      isActive: isActive !== false
    });
    
    res.json(newCard);
  } catch (error) {
    console.error('Create Why MEMOPYK card error:', error);
    res.status(500).json({ error: "Failed to create Why MEMOPYK card" });
  }
});

/**
 * PATCH /api/why-memopyk-cards/:id
 * Update Why MEMOPYK card
 */
router.patch('/why-memopyk-cards/:id', async (req: Request, res: Response) => {
  try {
    const cardId = req.params.id;
    const updates = req.body;
    
    const updatedCard = await storage.updateWhyMemopykCard(cardId, updates);
    
    if (!updatedCard) {
      return res.status(404).json({ error: "Why MEMOPYK card not found" });
    }
    
    res.json(updatedCard);
  } catch (error) {
    console.error('Update Why MEMOPYK card error:', error);
    res.status(500).json({ error: "Failed to update Why MEMOPYK card" });
  }
});

/**
 * DELETE /api/why-memopyk-cards/:id
 * Delete Why MEMOPYK card
 */
router.delete('/why-memopyk-cards/:id', async (req: Request, res: Response) => {
  try {
    const cardId = req.params.id;
    
    const deleted = await storage.deleteWhyMemopykCard(cardId);
    
    if (!deleted) {
      return res.status(404).json({ error: "Why MEMOPYK card not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete Why MEMOPYK card error:', error);
    res.status(500).json({ error: "Failed to delete Why MEMOPYK card" });
  }
});

export default router;
