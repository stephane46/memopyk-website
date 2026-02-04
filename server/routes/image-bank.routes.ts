/**
 * Image Bank Routes
 *
 * CRUD operations for the Image Bank (centralized image library for blog posts)
 * and Image Labels (colored tags for organizing images).
 *
 * IMAGE BANK ROUTES:
 * - GET    /image-bank           - List images (with filters: category, usage, search)
 * - POST   /image-bank/upload    - Upload new image
 * - PATCH  /image-bank/:id       - Update image metadata
 * - DELETE /image-bank/:id       - Delete image
 *
 * IMAGE LABELS ROUTES:
 * - GET    /image-labels         - List all labels
 * - POST   /image-labels         - Create new label
 * - PATCH  /image-labels/:id     - Update label (name)
 * - DELETE /image-labels/:id     - Delete label
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { imageBank, imageLabels, imageLabelLinks } from '@shared/schema';
import { eq, ilike, and, or, sql, inArray, desc } from 'drizzle-orm';
import { requireAdmin } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, unlinkSync } from 'fs';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

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

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
try {
  mkdirSync(uploadsDir, { recursive: true });
} catch (error) {
  console.error('Failed to create uploads directory:', error);
}

// Configure multer for image uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueId = uuidv4().slice(0, 8);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 50);
    cb(null, `${baseName}-${uniqueId}${ext}`);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Predefined colors for auto-assignment to new labels
const LABEL_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
];

// Get a color for a new label (rotate through colors)
async function getNextLabelColor(): Promise<string> {
  const existingLabels = await db.select().from(imageLabels);
  const usedColors = new Set(existingLabels.map(l => l.color));

  // Find first unused color, or cycle if all are used
  for (const color of LABEL_COLORS) {
    if (!usedColors.has(color)) return color;
  }

  // If all colors used, pick based on count
  return LABEL_COLORS[existingLabels.length % LABEL_COLORS.length];
}

// =============================================================================
// IMAGE BANK ROUTES
// =============================================================================

/**
 * GET /image-bank
 * List images with optional filters
 * Query params: category, usage, search
 */
router.get('/image-bank', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category, usage, search } = req.query;

    // Build query conditions
    const conditions: any[] = [];

    if (category && category !== 'all') {
      conditions.push(eq(imageBank.category, category as string));
    }

    if (usage && usage !== 'all') {
      switch (usage) {
        case 'unused':
          conditions.push(eq(imageBank.usageCount, 0));
          break;
        case 'used':
          conditions.push(sql`${imageBank.usageCount} > 0`);
          break;
        case 'hero':
          // Images used as hero images - would need to join with blog_posts
          conditions.push(sql`${imageBank.usageCount} > 0`);
          break;
        case 'body':
          // Images used in body - would need content analysis
          conditions.push(sql`${imageBank.usageCount} > 0`);
          break;
      }
    }

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(imageBank.filename, searchTerm),
          ilike(imageBank.originalFilename, searchTerm),
          ilike(imageBank.altText, searchTerm),
          sql`array_to_string(${imageBank.tags}, ',') ILIKE ${searchTerm}`
        )
      );
    }

    // Execute query
    let query = db.select().from(imageBank);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const images = await query.orderBy(desc(imageBank.createdAt));

    res.json(images);
  } catch (error) {
    console.error('List images error:', error);
    res.status(500).json({ error: 'Failed to list images' });
  }
});

/**
 * POST /image-bank/upload
 * Upload new image to storage and create database record
 * FormData: file, altText, category, tags
 */
router.post('/image-bank/upload', requireAdmin, uploadImage.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { altText, category, tags } = req.body;

    // Get image dimensions
    let width: number | undefined;
    let height: number | undefined;
    try {
      const metadata = await sharp(file.path).metadata();
      width = metadata.width;
      height = metadata.height;
    } catch (e) {
      console.warn('Could not get image dimensions:', e);
    }

    // Upload to Supabase Storage
    const supabase = getSupabase();
    const storagePath = `image-bank/${file.filename}`;
    const fileBuffer = await sharp(file.path).toBuffer();

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error('Failed to upload to storage');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Parse tags from comma-separated string
    const tagArray = tags
      ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    // Insert into database
    const [newImage] = await db
      .insert(imageBank)
      .values({
        filename: file.filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        width,
        height,
        publicUrl,
        storagePath,
        altText: altText || null,
        category: category || 'General',
        tags: tagArray,
        usageCount: 0,
        usedInPosts: []
      })
      .returning();

    // Clean up temp file
    try {
      unlinkSync(file.path);
    } catch (e) {
      console.warn('Could not delete temp file:', e);
    }

    console.log(`✅ Image uploaded to bank: ${file.originalname} -> ${publicUrl}`);

    res.status(201).json(newImage);
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

/**
 * PATCH /image-bank/:id
 * Update image metadata
 */
router.patch('/image-bank/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { altText, category, tags } = req.body;

    const updateData: any = {
      updatedAt: new Date()
    };

    if (altText !== undefined) updateData.altText = altText;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;

    const [updated] = await db
      .update(imageBank)
      .set(updateData)
      .where(eq(imageBank.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Image not found' });
    }

    console.log(`✅ Image updated: ${id}`);

    res.json(updated);
  } catch (error) {
    console.error('Update image error:', error);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

/**
 * DELETE /image-bank/:id
 * Delete image from storage and database
 */
router.delete('/image-bank/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get image first to know storage path
    const [image] = await db
      .select()
      .from(imageBank)
      .where(eq(imageBank.id, id))
      .limit(1);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete from Supabase Storage
    const supabase = getSupabase();
    const { error: deleteStorageError } = await supabase.storage
      .from('media')
      .remove([image.storagePath]);

    if (deleteStorageError) {
      console.warn('Storage delete warning:', deleteStorageError);
      // Continue anyway - might already be deleted
    }

    // Delete label links first (cascade should handle this, but explicit is safer)
    await db
      .delete(imageLabelLinks)
      .where(eq(imageLabelLinks.imageId, id));

    // Delete from database
    const [deleted] = await db
      .delete(imageBank)
      .where(eq(imageBank.id, id))
      .returning();

    console.log(`✅ Image deleted: ${id}`);

    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// =============================================================================
// IMAGE LABELS ROUTES
// =============================================================================

/**
 * GET /image-labels
 * List all image labels with usage counts
 */
router.get('/image-labels', requireAdmin, async (req: Request, res: Response) => {
  try {
    const labels = await db
      .select()
      .from(imageLabels)
      .orderBy(imageLabels.name);

    // Calculate actual usage counts from image_bank tags array
    const images = await db.select({ tags: imageBank.tags }).from(imageBank);

    const tagCounts = new Map<string, number>();
    for (const img of images) {
      if (img.tags) {
        for (const tag of img.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
    }

    // Update usage counts on labels
    const labelsWithCounts = labels.map(label => ({
      ...label,
      usageCount: tagCounts.get(label.name) || 0
    }));

    res.json({ data: labelsWithCounts });
  } catch (error) {
    console.error('List labels error:', error);
    res.status(500).json({ error: 'Failed to list labels' });
  }
});

/**
 * POST /image-labels
 * Create new image label with auto-assigned color
 */
router.post('/image-labels', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    // Check for duplicate name
    const existing = await db
      .select()
      .from(imageLabels)
      .where(eq(imageLabels.name, name.trim()))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Label with this name already exists' });
    }

    // Auto-assign color if not provided
    const labelColor = color || await getNextLabelColor();

    const [newLabel] = await db
      .insert(imageLabels)
      .values({
        name: name.trim(),
        color: labelColor,
        createdBy: 'admin'
      })
      .returning();

    console.log(`✅ Image label created: ${name} (${labelColor})`);

    res.status(201).json({ data: newLabel });
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Label with this name already exists' });
    }
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

/**
 * PATCH /image-labels/:id
 * Update label name (color is auto-assigned)
 */
router.patch('/image-labels/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    // Get old label to update image_bank tags
    const [oldLabel] = await db
      .select()
      .from(imageLabels)
      .where(eq(imageLabels.id, id))
      .limit(1);

    if (!oldLabel) {
      return res.status(404).json({ error: 'Label not found' });
    }

    // Update label
    const [updated] = await db
      .update(imageLabels)
      .set({
        name: name.trim(),
        updatedAt: new Date()
      })
      .where(eq(imageLabels.id, id))
      .returning();

    // Update tags in all images that use this label
    if (oldLabel.name !== name.trim()) {
      // Get all images with the old tag
      const imagesWithTag = await db
        .select()
        .from(imageBank)
        .where(sql`${oldLabel.name} = ANY(${imageBank.tags})`);

      // Update each image's tags
      for (const img of imagesWithTag) {
        const newTags = img.tags?.map(t => t === oldLabel.name ? name.trim() : t) || [];
        await db
          .update(imageBank)
          .set({ tags: newTags })
          .where(eq(imageBank.id, img.id));
      }

      console.log(`✅ Label renamed: ${oldLabel.name} -> ${name} (updated ${imagesWithTag.length} images)`);
    }

    res.json({ data: updated });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Label with this name already exists' });
    }
    console.error('Update label error:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
});

/**
 * DELETE /image-labels/:id
 * Delete label (also removes from all images using it)
 */
router.delete('/image-labels/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get label first
    const [label] = await db
      .select()
      .from(imageLabels)
      .where(eq(imageLabels.id, id))
      .limit(1);

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    // Remove tag from all images that use it
    const imagesWithTag = await db
      .select()
      .from(imageBank)
      .where(sql`${label.name} = ANY(${imageBank.tags})`);

    for (const img of imagesWithTag) {
      const newTags = img.tags?.filter(t => t !== label.name) || [];
      await db
        .update(imageBank)
        .set({ tags: newTags })
        .where(eq(imageBank.id, img.id));
    }

    // Delete label links
    await db
      .delete(imageLabelLinks)
      .where(eq(imageLabelLinks.labelId, id));

    // Delete label
    const [deleted] = await db
      .delete(imageLabels)
      .where(eq(imageLabels.id, id))
      .returning();

    console.log(`✅ Image label deleted: ${label.name} (removed from ${imagesWithTag.length} images)`);

    res.json({ success: true, deleted });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

export default router;
