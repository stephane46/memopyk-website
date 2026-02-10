/**
 * Help System Routes
 *
 * Provides contextual help for admin screens and step-by-step flow guides.
 * Content is database-driven so Claude can update via Supabase without code deployments.
 *
 * Routes:
 * - GET    /help/screens/:route    - Get help content for a specific screen
 * - GET    /help/screens           - List all help screens (admin)
 * - POST   /help/screens           - Create help screen (admin)
 * - PATCH  /help/screens/:id       - Update help screen (admin)
 * - DELETE /help/screens/:id       - Delete help screen (admin)
 *
 * - GET    /help/flows             - List all help flows
 * - GET    /help/flows/:id         - Get specific flow with steps
 * - POST   /help/flows             - Create help flow (admin)
 * - PATCH  /help/flows/:id         - Update help flow (admin)
 * - DELETE /help/flows/:id         - Delete help flow (admin)
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { helpScreens, helpFlows } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// =============================================================================
// HELP SCREENS ROUTES
// =============================================================================

/**
 * GET /help/screens/:route
 * Get help content for a specific screen by route
 * Route param is URL-encoded (e.g., /admin?tab=posts becomes /admin%3Ftab%3Dposts)
 */
router.get('/help/screens/:route', async (req: Request, res: Response) => {
  try {
    const route = decodeURIComponent(req.params.route);

    const [screen] = await db
      .select()
      .from(helpScreens)
      .where(eq(helpScreens.route, route))
      .limit(1);

    if (screen) {
      return res.json(screen);
    }

    // Fallback: if route has an_tab param, try without it (e.g., analytics subtab → generic analytics)
    if (route.includes('&an_tab=')) {
      const baseRoute = route.replace(/&an_tab=[^&]*/, '');
      const [fallback] = await db
        .select()
        .from(helpScreens)
        .where(eq(helpScreens.route, baseRoute))
        .limit(1);
      if (fallback) {
        return res.json(fallback);
      }
    }

    return res.status(404).json({ error: 'Help content not found for this screen' });
  } catch (error) {
    console.error('Get help screen error:', error);
    res.status(500).json({ error: 'Failed to get help content' });
  }
});

/**
 * GET /help/screens
 * List all help screens (for admin management)
 */
router.get('/help/screens', requireAdmin, async (req: Request, res: Response) => {
  try {
    const screens = await db.select().from(helpScreens);
    res.json(screens);
  } catch (error) {
    console.error('List help screens error:', error);
    res.status(500).json({ error: 'Failed to list help screens' });
  }
});

/**
 * POST /help/screens
 * Create new help screen
 */
router.post('/help/screens', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { route, title, htmlContent, tags, relatedFlowIds } = req.body;

    if (!route || !title || !htmlContent) {
      return res.status(400).json({ error: 'route, title, and htmlContent are required' });
    }

    const [newScreen] = await db
      .insert(helpScreens)
      .values({
        route,
        title,
        htmlContent,
        tags: tags || [],
        relatedFlowIds: relatedFlowIds || [],
        updatedBy: 'admin'
      })
      .returning();

    res.status(201).json(newScreen);
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Help screen for this route already exists' });
    }
    console.error('Create help screen error:', error);
    res.status(500).json({ error: 'Failed to create help screen' });
  }
});

/**
 * PATCH /help/screens/:id
 * Update help screen
 */
router.patch('/help/screens/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { route, title, htmlContent, tags, relatedFlowIds } = req.body;

    const [updated] = await db
      .update(helpScreens)
      .set({
        ...(route && { route }),
        ...(title && { title }),
        ...(htmlContent && { htmlContent }),
        ...(tags && { tags }),
        ...(relatedFlowIds && { relatedFlowIds }),
        updatedAt: new Date(),
        updatedBy: 'admin'
      })
      .where(eq(helpScreens.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Help screen not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update help screen error:', error);
    res.status(500).json({ error: 'Failed to update help screen' });
  }
});

/**
 * DELETE /help/screens/:id
 * Delete help screen
 */
router.delete('/help/screens/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(helpScreens)
      .where(eq(helpScreens.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Help screen not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete help screen error:', error);
    res.status(500).json({ error: 'Failed to delete help screen' });
  }
});

// =============================================================================
// HELP FLOWS ROUTES
// =============================================================================

/**
 * GET /help/flows
 * List all help flows (public - for "How do I..." menu)
 */
router.get('/help/flows', async (req: Request, res: Response) => {
  try {
    const flows = await db.select({
      id: helpFlows.id,
      title: helpFlows.title,
      description: helpFlows.description,
      updatedAt: helpFlows.updatedAt
    }).from(helpFlows);

    res.json(flows);
  } catch (error) {
    console.error('List help flows error:', error);
    res.status(500).json({ error: 'Failed to list help flows' });
  }
});

/**
 * GET /help/flows/:id
 * Get specific flow with all steps
 */
router.get('/help/flows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [flow] = await db
      .select()
      .from(helpFlows)
      .where(eq(helpFlows.id, id))
      .limit(1);

    if (!flow) {
      return res.status(404).json({ error: 'Help flow not found' });
    }

    res.json(flow);
  } catch (error) {
    console.error('Get help flow error:', error);
    res.status(500).json({ error: 'Failed to get help flow' });
  }
});

/**
 * POST /help/flows
 * Create new help flow
 */
router.post('/help/flows', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, description, stepsJson } = req.body;

    if (!title || !stepsJson || !Array.isArray(stepsJson)) {
      return res.status(400).json({ error: 'title and stepsJson array are required' });
    }

    const [newFlow] = await db
      .insert(helpFlows)
      .values({
        title,
        description,
        stepsJson,
        updatedBy: 'admin'
      })
      .returning();

    res.status(201).json(newFlow);
  } catch (error) {
    console.error('Create help flow error:', error);
    res.status(500).json({ error: 'Failed to create help flow' });
  }
});

/**
 * PATCH /help/flows/:id
 * Update help flow
 */
router.patch('/help/flows/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, stepsJson } = req.body;

    const [updated] = await db
      .update(helpFlows)
      .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(stepsJson && { stepsJson }),
        updatedAt: new Date(),
        updatedBy: 'admin'
      })
      .where(eq(helpFlows.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Help flow not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update help flow error:', error);
    res.status(500).json({ error: 'Failed to update help flow' });
  }
});

/**
 * DELETE /help/flows/:id
 * Delete help flow
 */
router.delete('/help/flows/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(helpFlows)
      .where(eq(helpFlows.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Help flow not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete help flow error:', error);
    res.status(500).json({ error: 'Failed to delete help flow' });
  }
});

export default router;
