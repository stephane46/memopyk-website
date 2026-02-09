/**
 * Contact Routes - Contact form submissions and management
 * 
 * Endpoints:
 * - GET /api/contact - Get contact info/settings
 * - POST /api/contacts - Submit contact form
 * - GET /api/contacts - List all contacts (admin)
 * - PATCH /api/contacts/:id - Update contact status (admin)
 * - DELETE /api/contacts/:id - Delete contact (admin)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../services/storage.service';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// =============================================================================
// Validation Schemas
// =============================================================================

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  package: z.string().min(1, "Please select a package"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

const contactStatusSchema = z.enum(['new', 'responded', 'closed']);

// =============================================================================
// Public Endpoints
// =============================================================================

/**
 * GET /api/contact
 * Get contact information/settings (public)
 */
router.get('/contact', async (req: Request, res: Response) => {
  try {
    const contact = await storage.getContacts();
    res.json(contact);
  } catch (error) {
    console.error('Get contact info error:', error);
    res.status(500).json({ error: "Failed to get contact info" });
  }
});

/**
 * POST /api/contacts
 * Submit contact form (public)
 */
router.post('/contacts', async (req: Request, res: Response) => {
  try {
    const result = contactFormSchema.parse(req.body);
    console.log("📧 Contact form submission:", result);
    
    // Store contact in hybrid storage
    const contact = await storage.createContact(result);
    
    res.json({ success: true, message: "Message sent successfully", contact });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0]?.message || "Invalid form data" });
    }
    console.error('Contact form error:', error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// =============================================================================
// Admin Endpoints
// =============================================================================

/**
 * GET /api/contacts
 * Get all contact submissions (admin)
 */
router.get('/contacts', requireAdmin, async (req: Request, res: Response) => {
  try {
    const contacts = await storage.getContacts();
    res.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: "Failed to get contacts" });
  }
});

/**
 * PATCH /api/contacts/:id
 * Update contact status (admin)
 */
router.patch('/contacts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const contactId = req.params.id;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['new', 'responded', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: "Invalid status. Use: new, responded, or closed" 
      });
    }
    
    const contact = await storage.updateContactStatus(contactId, status);
    res.json({ success: true, contact });
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({ error: "Failed to update contact status" });
  }
});

/**
 * DELETE /api/contacts/:id
 * Delete contact (admin)
 */
router.delete('/contacts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const contactId = req.params.id;
    const deletedContact = await storage.deleteContact(contactId);
    res.json({ success: true, deleted: deletedContact });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

export default router;
