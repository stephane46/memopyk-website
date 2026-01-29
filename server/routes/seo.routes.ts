/**
 * SEO Routes
 * 
 * Handles SEO settings management, meta tags, and SEO configuration.
 * 
 * Public Endpoints:
 * - GET /seo - Get all SEO settings
 * - POST /seo - Create SEO settings
 * - PATCH /seo/:id - Update SEO settings
 * - GET /seo-config - Get public SEO config by language
 * - GET /seo/test-timeout - Test SEO timeout functionality
 * 
 * Admin Endpoints (require authentication):
 * - GET /admin/seo - Get admin SEO settings
 * - POST /admin/seo - Save admin SEO settings with validation
 * - GET /admin/seo/preview - Preview SEO head HTML
 * - GET /admin/seo/history - Get SEO version history
 * - POST /admin/seo/rollback - Rollback to previous version
 * - POST /admin/seo/publish - Publish SEO settings
 */

import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../services/storage.service";

const router = Router();

// Extend Request type for admin user
interface AdminRequest extends Request {
  adminUser?: string;
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Simple admin authentication middleware
 * TODO: Enhance with proper session/JWT validation
 */
const requireAdmin = (req: AdminRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Simple check - in production this would validate against database
  const token = authHeader.replace('Bearer ', '');
  if (token !== 'admin-token-temp') {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
  
  req.adminUser = 'admin';
  next();
};

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

/**
 * GET /seo
 * Get all SEO settings
 */
router.get("/seo", async (req: Request, res: Response) => {
  try {
    const seo = await storage.getSeoSettings();
    res.json(seo);
  } catch (error) {
    console.error("Error fetching SEO settings:", error);
    res.status(500).json({ error: "Failed to get SEO settings" });
  }
});

/**
 * POST /seo
 * Create new SEO settings
 */
router.post("/seo", async (req: Request, res: Response) => {
  try {
    const seoData = req.body;
    const newSeo = await storage.createSeoSettings(seoData);
    res.status(201).json(newSeo);
  } catch (error) {
    console.error("Create SEO settings error:", error);
    res.status(500).json({ error: "Failed to create SEO settings" });
  }
});

/**
 * PATCH /seo/:id
 * Update existing SEO settings
 */
router.patch("/seo/:id", async (req: Request, res: Response) => {
  try {
    const seoId = req.params.id;
    const updates = req.body;
    const updatedSeo = await storage.updateSeoSettings(seoId, updates);
    
    if (!updatedSeo) {
      return res.status(404).json({ error: "SEO settings not found" });
    }
    
    res.json(updatedSeo);
  } catch (error) {
    console.error("Update SEO settings error:", error);
    res.status(500).json({ error: "Failed to update SEO settings" });
  }
});

/**
 * GET /seo-config
 * Public SEO Config endpoint - uses SeoService with timeout and fallback
 * Query params: lang (fr-FR | en-US)
 */
router.get("/seo-config", async (req: Request, res: Response) => {
  try {
    const lang = (req.query.lang as 'fr-FR' | 'en-US') || 'en-US';
    
    if (!['fr-FR', 'en-US'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid lang parameter. Use fr-FR or en-US' });
    }

    // Lazy load seoService to avoid circular dependencies
    const { seoService } = await import("../services/seo.service");
    const seoData = await seoService.getSeoSettings(lang);
    
    res.json(seoData || {});
  } catch (error) {
    console.error("Error fetching SEO config:", error);
    res.status(500).json({ error: "Failed to get SEO configuration" });
  }
});

/**
 * GET /seo/test-timeout
 * Test endpoint for SEO timeout functionality
 */
router.get("/seo/test-timeout", async (req: Request, res: Response) => {
  try {
    console.log("🧪 Testing SEO timeout functionality...");
    const { testSeoTimeout } = await import("../services/seo.service");
    const result = await testSeoTimeout();
    console.log("🧪 SEO timeout test result:", result);
    
    res.json({
      ...result,
      message: result.success 
        ? `✅ Timeout functionality working correctly. Database operation completed in ${result.databaseTimeoutMs}ms` 
        : `❌ Timeout test failed. Operation took ${result.databaseTimeoutMs}ms (expected < ${8000 + 1000}ms)`
    });
  } catch (error) {
    console.error("❌ SEO timeout test error:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'SEO timeout test failed'
    });
  }
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

/**
 * GET /admin/seo
 * Get admin SEO settings by language
 * Query params: lang (fr-FR | en-US)
 */
router.get("/admin/seo", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const lang = req.query.lang as 'fr-FR' | 'en-US';
    
    if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
    }

    const { seoService } = await import("../services/seo.service");
    const seoData = await seoService.getSeoSettings(lang);
    res.json(seoData || {});
    
  } catch (error) {
    console.error("Error fetching SEO settings:", error);
    res.status(500).json({ error: 'Failed to fetch SEO settings' });
  }
});

/**
 * POST /admin/seo
 * Save SEO settings with validation
 * Body: { lang, changeReason, ...seoData }
 */
router.post("/admin/seo", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { lang, changeReason, ...seoData } = req.body;
    
    if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
    }

    const { seoService } = await import("../services/seo.service");
    const dataToSave = { lang, ...seoData };
    await seoService.saveSeoSettings(dataToSave, req.adminUser || 'admin', changeReason);
    
    res.json({ 
      success: true, 
      message: 'SEO settings saved successfully',
      lang,
      savedBy: req.adminUser
    });
    
  } catch (error: any) {
    console.error("Error saving SEO settings:", error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to save SEO settings' 
    });
  }
});

/**
 * GET /admin/seo/preview
 * Preview the raw head snippet as the server will inject it
 * Query params: lang (fr-FR | en-US)
 */
router.get("/admin/seo/preview", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const lang = req.query.lang as 'fr-FR' | 'en-US';
    
    if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
    }

    const { seoService } = await import("../services/seo.service");
    const headHtml = await seoService.generateHeadPreview(lang);
    
    res.json({
      lang,
      headHtml,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error generating SEO preview:", error);
    res.status(500).json({ error: 'Failed to generate SEO preview' });
  }
});

/**
 * GET /admin/seo/history
 * Get SEO version history
 * Query params: lang (fr-FR | en-US)
 */
router.get("/admin/seo/history", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const lang = req.query.lang as 'fr-FR' | 'en-US';
    
    if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
    }

    const { seoService } = await import("../services/seo.service");
    const history = await seoService.getSeoHistory(lang);
    
    res.json({
      lang,
      history,
      count: history.length
    });
    
  } catch (error) {
    console.error("Error fetching SEO history:", error);
    res.status(500).json({ error: 'Failed to fetch SEO history' });
  }
});

/**
 * POST /admin/seo/rollback
 * Rollback to a previous version
 * Body: { lang, version }
 */
router.post("/admin/seo/rollback", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { lang, version } = req.body;
    
    if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
    }

    if (!version || typeof version !== 'number') {
      return res.status(400).json({ error: 'Invalid or missing version number' });
    }

    const { seoService } = await import("../services/seo.service");
    await seoService.rollbackToVersion(lang, version, req.adminUser || 'admin');
    
    res.json({ 
      success: true, 
      message: `Rolled back to version ${version}`,
      lang,
      version,
      rolledBackBy: req.adminUser
    });
    
  } catch (error: any) {
    console.error("Error rolling back SEO settings:", error);
    res.status(500).json({ 
      error: error.message || 'Failed to rollback SEO settings' 
    });
  }
});

/**
 * POST /admin/seo/publish
 * Generate/flush server template for that locale
 * Query params: lang (fr-FR | en-US)
 */
router.post("/admin/seo/publish", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const lang = req.query.lang as 'fr-FR' | 'en-US';
    
    if (!lang || !['fr-FR', 'en-US'].includes(lang)) {
      return res.status(400).json({ error: 'Invalid or missing lang parameter. Use fr-FR or en-US' });
    }

    const { seoService } = await import("../services/seo.service");

    // Generate preview to validate current settings
    const headHtml = await seoService.generateHeadPreview(lang);
    
    // Create backup
    const seoData = await seoService.getSeoSettings(lang);
    if (seoData) {
      await seoService.createBackup(seoData, req.adminUser || 'admin');
    }
    
    res.json({ 
      success: true, 
      message: 'SEO settings published successfully',
      lang,
      headHtml,
      publishedBy: req.adminUser,
      publishedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error publishing SEO settings:", error);
    res.status(500).json({ error: 'Failed to publish SEO settings' });
  }
});

export default router;
