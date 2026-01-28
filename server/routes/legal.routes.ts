/**
 * Legal Routes - Legal documents management (Terms, Privacy Policy, etc.)
 * 
 * Endpoints:
 * - GET /api/legal - Get all legal documents
 * - GET /api/legal/:type - Get legal document by type
 * - POST /api/legal - Create legal document (admin)
 * - PATCH /api/legal/:id - Update legal document (admin)
 * - DELETE /api/legal/:id - Delete legal document (admin)
 */

import { Router, Request, Response } from 'express';
import { hybridStorage } from '../services/storage.service';

const router = Router();

// =============================================================================
// Public Endpoints
// =============================================================================

/**
 * GET /api/legal
 * Get all legal documents
 */
router.get('/legal', async (req: Request, res: Response) => {
  try {
    const legal = await hybridStorage.getLegalDocuments();
    res.json(legal);
  } catch (error) {
    console.error('Get legal documents error:', error);
    res.status(500).json({ error: "Failed to get legal documents" });
  }
});

/**
 * GET /api/legal/:type
 * Get legal document by type (terms, privacy, cookies, etc.)
 */
router.get('/legal/:type', async (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    const legal = await hybridStorage.getLegalDocuments();
    const document = legal.find((doc: any) => doc.type === type);
    
    if (!document) {
      return res.status(404).json({ error: "Legal document not found" });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Get legal document error:', error);
    res.status(500).json({ error: "Failed to get legal document" });
  }
});

// =============================================================================
// Admin Endpoints
// =============================================================================

/**
 * POST /api/legal
 * Create new legal document (admin only)
 */
router.post('/legal', async (req: Request, res: Response) => {
  try {
    const document = req.body;
    
    if (!document.type || !document.title_en || !document.title_fr || !document.content_en || !document.content_fr) {
      return res.status(400).json({ 
        error: "Type, title, and content in both languages are required" 
      });
    }
    
    const newDocument = await hybridStorage.createLegalDocument(document);
    res.json({ success: true, document: newDocument });
  } catch (error) {
    console.error('Create legal document error:', error);
    res.status(500).json({ error: "Failed to create legal document" });
  }
});

/**
 * PATCH /api/legal/:id
 * Update legal document (admin only)
 */
router.patch('/legal/:id', async (req: Request, res: Response) => {
  try {
    const docId = req.params.id;
    const updates = req.body;
    
    const updatedDocument = await hybridStorage.updateLegalDocument(docId, updates);
    res.json({ success: true, document: updatedDocument });
  } catch (error) {
    console.error('Update legal document error:', error);
    res.status(500).json({ error: "Failed to update legal document" });
  }
});

/**
 * DELETE /api/legal/:id
 * Delete legal document (admin only)
 */
router.delete('/legal/:id', async (req: Request, res: Response) => {
  try {
    const docId = req.params.id;
    const deletedDocument = await hybridStorage.deleteLegalDocument(docId);
    res.json({ success: true, deleted: deletedDocument });
  } catch (error) {
    console.error('Delete legal document error:', error);
    res.status(500).json({ error: "Failed to delete legal document" });
  }
});

export default router;
