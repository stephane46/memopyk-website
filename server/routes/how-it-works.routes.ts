/**
 * How It Works Routes - Step cards for the "Comment ça marche" section
 *
 * Endpoints:
 * - GET /api/how-it-works-steps - Get all steps (public, ordered by order_index)
 * - POST /api/how-it-works-steps - Create step (admin)
 * - PATCH /api/how-it-works-steps/:id - Update step (admin)
 * - DELETE /api/how-it-works-steps/:id - Delete step (admin)
 */

import { Router, Request, Response } from 'express';
import { storage } from '../services/storage.service';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// =============================================================================
// How It Works Steps Endpoints
// =============================================================================

/**
 * GET /api/how-it-works-steps
 * Get all How It Works steps
 */
router.get('/how-it-works-steps', async (req: Request, res: Response) => {
  try {
    const steps = await storage.getHowItWorksSteps();
    res.json(steps);
  } catch (error) {
    console.error('Get How It Works steps error:', error);
    res.status(500).json({ error: "Failed to get How It Works steps" });
  }
});

/**
 * POST /api/how-it-works-steps
 * Create new How It Works step
 */
router.post('/how-it-works-steps', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      id,
      titleEn,
      titleFr,
      descriptionEn,
      descriptionFr,
      backTitleEn,
      backTitleFr,
      backDescriptionEn,
      backDescriptionFr,
      imagePath,
      orderIndex,
      isActive
    } = req.body;

    if (!id || !titleEn || !titleFr || !descriptionEn || !descriptionFr) {
      return res.status(400).json({ error: "Required fields: id, titleEn, titleFr, descriptionEn, descriptionFr" });
    }

    const newStep = await storage.createHowItWorksStep({
      id,
      titleEn,
      titleFr,
      descriptionEn,
      descriptionFr,
      backTitleEn: backTitleEn || null,
      backTitleFr: backTitleFr || null,
      backDescriptionEn: backDescriptionEn || null,
      backDescriptionFr: backDescriptionFr || null,
      imagePath: imagePath || null,
      orderIndex: orderIndex || 0,
      isActive: isActive !== false
    });

    res.json(newStep);
  } catch (error) {
    console.error('Create How It Works step error:', error);
    res.status(500).json({ error: "Failed to create How It Works step" });
  }
});

/**
 * PATCH /api/how-it-works-steps/:id
 * Update How It Works step
 */
router.patch('/how-it-works-steps/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stepId = req.params.id;
    const updates = req.body;

    const updatedStep = await storage.updateHowItWorksStep(stepId, updates);

    if (!updatedStep) {
      return res.status(404).json({ error: "How It Works step not found" });
    }

    res.json(updatedStep);
  } catch (error) {
    console.error('Update How It Works step error:', error);
    res.status(500).json({ error: "Failed to update How It Works step" });
  }
});

/**
 * DELETE /api/how-it-works-steps/:id
 * Delete How It Works step
 */
router.delete('/how-it-works-steps/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const stepId = req.params.id;

    const deleted = await storage.deleteHowItWorksStep(stepId);

    if (!deleted) {
      return res.status(404).json({ error: "How It Works step not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete How It Works step error:', error);
    res.status(500).json({ error: "Failed to delete How It Works step" });
  }
});

export default router;
