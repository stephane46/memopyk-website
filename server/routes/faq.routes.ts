/**
 * FAQ Routes
 * 
 * Handles FAQ sections and individual FAQs with CRUD operations and ordering.
 * 
 * Routes:
 * - GET    /faq-sections           - List all FAQ sections
 * - POST   /faq-sections           - Create new FAQ section
 * - PATCH  /faq-sections/:id       - Update FAQ section
 * - DELETE /faq-sections/:id       - Delete FAQ section
 * - PATCH  /faq-sections/:id/reorder - Update section order
 * 
 * - GET    /faqs                   - List all FAQs
 * - POST   /faqs                   - Create new FAQ
 * - PATCH  /faqs/:id               - Update FAQ
 * - DELETE /faqs/:id               - Delete FAQ
 * - PATCH  /faqs/:id/reorder       - Update FAQ order
 * 
 * - GET    /faq                    - Legacy: Get all FAQs (for frontend)
 */

import { Router, Request, Response } from 'express';
import { storage } from '../services/storage.service';

const router = Router();

// =============================================================================
// HELPER: Transform camelCase to snake_case for frontend compatibility
// =============================================================================

/**
 * Transform FAQ object from Drizzle's camelCase to snake_case
 * Frontend expects: section_id, question_en, question_fr, answer_en, answer_fr, order_index, is_active
 */
function transformFaqToSnakeCase(faq: Record<string, unknown>) {
  return {
    id: faq.id,
    section_id: faq.sectionId,
    question_en: faq.questionEn,
    question_fr: faq.questionFr,
    answer_en: faq.answerEn,
    answer_fr: faq.answerFr,
    order_index: faq.orderIndex,
    is_active: faq.isActive,
    created_at: faq.createdAt,
    updated_at: faq.updatedAt,
  };
}

/**
 * Transform FAQ section object from Drizzle's camelCase to snake_case
 * Frontend expects: title_en, title_fr, order_index
 */
function transformSectionToSnakeCase(section: Record<string, unknown>) {
  return {
    id: section.id,
    title_en: section.titleEn,
    title_fr: section.titleFr,
    name_en: section.titleEn, // Alias for compatibility
    name_fr: section.titleFr, // Alias for compatibility
    order_index: section.orderIndex,
    created_at: section.createdAt,
    updated_at: section.updatedAt,
  };
}

// =============================================================================
// FAQ SECTIONS ROUTES
// =============================================================================

/**
 * GET /faq-sections
 * List all FAQ sections
 */
router.get('/faq-sections', async (req: Request, res: Response) => {
  try {
    const sections = await storage.getFaqSections();
    // Transform to snake_case for frontend compatibility
    const transformed = sections.map((s: Record<string, unknown>) => transformSectionToSnakeCase(s));
    res.json(transformed);
  } catch (error) {
    console.error('Get FAQ sections error:', error);
    res.status(500).json({ error: 'Failed to get FAQ sections' });
  }
});

/**
 * POST /faq-sections
 * Create new FAQ section
 */
router.post('/faq-sections', async (req: Request, res: Response) => {
  try {
    const { title_fr, title_en, order_index } = req.body;
    
    if (!title_fr || !title_en) {
      return res.status(400).json({ error: 'French and English titles are required' });
    }
    
    const newSection = await storage.createFAQSection({
      title_fr,
      title_en,
      order_index: order_index || 0
    });
    
    res.status(201).json({ success: true, section: newSection });
  } catch (error) {
    console.error('Create FAQ section error:', error);
    res.status(500).json({ error: 'Failed to create FAQ section' });
  }
});

/**
 * PATCH /faq-sections/:id
 * Update FAQ section
 */
router.patch('/faq-sections/:id', async (req: Request, res: Response) => {
  try {
    const sectionId = req.params.id;
    const updates = req.body;
    
    const section = await storage.updateFAQSection(sectionId, updates);
    res.json(section);
  } catch (error) {
    console.error('Update FAQ section error:', error);
    res.status(500).json({ error: 'Failed to update FAQ section' });
  }
});

/**
 * DELETE /faq-sections/:id
 * Delete FAQ section
 */
router.delete('/faq-sections/:id', async (req: Request, res: Response) => {
  try {
    const sectionId = req.params.id;
    
    await storage.deleteFAQSection(sectionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete FAQ section error:', error);
    res.status(500).json({ error: 'Failed to delete FAQ section' });
  }
});

/**
 * PATCH /faq-sections/:id/reorder
 * Update FAQ section order
 */
router.patch('/faq-sections/:id/reorder', async (req: Request, res: Response) => {
  try {
    const sectionId = req.params.id;
    const { order_index } = req.body;
    
    if (typeof order_index !== 'number') {
      return res.status(400).json({ error: 'order_index must be a number' });
    }
    
    console.log(`🔄 Reordering FAQ section: ${sectionId} to order ${order_index}`);
    const updatedSection = await storage.updateFAQSection(sectionId, { order_index });
    res.json({ success: true, section: updatedSection });
  } catch (error) {
    console.error('Reorder FAQ section error:', error);
    res.status(500).json({ error: 'Failed to reorder FAQ section' });
  }
});

// =============================================================================
// FAQS ROUTES
// =============================================================================

/**
 * GET /faqs
 * List all FAQs
 */
router.get('/faqs', async (req: Request, res: Response) => {
  try {
    const faqs = await storage.getFaqs();
    // Transform to snake_case for frontend compatibility
    const transformed = faqs.map((f: Record<string, unknown>) => transformFaqToSnakeCase(f));
    res.json(transformed);
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({ error: 'Failed to get FAQs' });
  }
});

/**
 * POST /faqs
 * Create new FAQ
 */
router.post('/faqs', async (req: Request, res: Response) => {
  try {
    const { section_id, question_en, question_fr, answer_en, answer_fr, order_index, is_active } = req.body;
    
    if (!section_id || !question_en || !question_fr || !answer_en || !answer_fr) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const newFaq = await storage.createFAQ({
      section_id,
      question_en,
      question_fr,
      answer_en,
      answer_fr,
      order_index: order_index || 0,
      is_active: is_active !== undefined ? is_active : true
    });
    
    res.status(201).json({ success: true, faq: newFaq });
  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

/**
 * PATCH /faqs/:id
 * Update FAQ
 */
router.patch('/faqs/:id', async (req: Request, res: Response) => {
  try {
    console.log('🔧 ===== FAQ PATCH ENDPOINT HIT =====');
    console.log('🔧 PATCH /faqs/:id - ID:', req.params.id);
    console.log('🔧 PATCH /faqs/:id - Body:', req.body);
    
    const faqId = req.params.id;
    const updates = req.body;
    
    const faq = await storage.updateFAQ(faqId, updates);
    
    console.log('✅ FAQ update completed successfully:', faq);
    res.json(faq);
  } catch (error) {
    console.error('❌ Update FAQ error:', error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

/**
 * DELETE /faqs/:id
 * Delete FAQ
 */
router.delete('/faqs/:id', async (req: Request, res: Response) => {
  try {
    const faqId = req.params.id;
    console.log('🗑️ DELETE /faqs/:id - ID:', faqId);
    
    await storage.deleteFAQ(faqId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

/**
 * PATCH /faqs/:id/reorder
 * Update FAQ order
 */
router.patch('/faqs/:id/reorder', async (req: Request, res: Response) => {
  try {
    const faqId = req.params.id;
    const { order_index } = req.body;
    
    if (typeof order_index !== 'number') {
      return res.status(400).json({ error: 'order_index must be a number' });
    }
    
    console.log(`🔄 Reordering FAQ: ${faqId} to order ${order_index}`);
    const updatedFaq = await storage.updateFAQ(faqId, { order_index });
    res.json({ success: true, faq: updatedFaq });
  } catch (error) {
    console.error('Reorder FAQ error:', error);
    res.status(500).json({ error: 'Failed to reorder FAQ' });
  }
});

// =============================================================================
// LEGACY ROUTES (for frontend compatibility)
// =============================================================================

/**
 * GET /faq
 * Legacy: Get all FAQs (for frontend display)
 */
router.get('/faq', async (req: Request, res: Response) => {
  try {
    const faqs = await storage.getFaqs();
    // Transform to snake_case for frontend compatibility
    const transformed = faqs.map((f: Record<string, unknown>) => transformFaqToSnakeCase(f));
    res.json(transformed);
  } catch (error) {
    console.error('Get FAQ content error:', error);
    res.status(500).json({ error: 'Failed to get FAQ content' });
  }
});

export default router;
