/**
 * Editorial Calendar Events — API Routes
 *
 * Manages seasonal/editorial events (Christmas, Mother's Day, etc.)
 * with per-market content completion tracking.
 */

import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import { z } from 'zod';
import { db } from '../db';
import { editorialEvents, editorialEventCompletions } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// ── Constants ──

const VALID_MARKETS = ['france', 'us', 'quebec', 'canada_en'] as const;
const VALID_STATUSES = ['not_started', 'in_review', 'published'] as const;

// ── Zod Schemas ──

const eventSchema = z.object({
  name: z.string().min(1).max(200),
  markets: z.array(z.enum(VALID_MARKETS)).min(1),
  base_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_overrides: z.record(z.string(), z.string()).nullable().optional(),
  reminder_offset_days: z.number().int().min(0).max(365).default(30),
  recurring: z.boolean().default(true),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#F97316'),
});

const eventUpdateSchema = eventSchema.partial();

const completionUpdateSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  linked_post_id: z.string().uuid().nullable().optional(),
  linked_topic_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// ── Helpers ──

function eventToDrizzle(data: z.infer<typeof eventSchema>) {
  return {
    name: data.name,
    markets: data.markets as string[],
    baseDate: data.base_date,
    dateOverrides: data.date_overrides ?? null,
    reminderOffsetDays: data.reminder_offset_days,
    recurring: data.recurring,
    color: data.color,
  };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

// ── GET /api/editorial-events ──
// List all events with their completions

router.get('/', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const events = await db.select().from(editorialEvents)
      .orderBy(desc(editorialEvents.baseDate));

    const completions = await db.select().from(editorialEventCompletions);

    const completionsByEvent = new Map<string, typeof completions>();
    for (const c of completions) {
      const arr = completionsByEvent.get(c.eventId) || [];
      arr.push(c);
      completionsByEvent.set(c.eventId, arr);
    }

    const result = events.map(event => ({
      ...event,
      completions: completionsByEvent.get(event.id) || [],
    }));

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching editorial events:', message);
    res.status(500).json({ error: message });
  }
});

// ── POST /api/editorial-events ──
// Create a new event

router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const [result] = await db.insert(editorialEvents)
      .values(eventToDrizzle(parsed.data))
      .returning();

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating editorial event:', message);
    res.status(500).json({ error: message });
  }
});

// ── PUT /api/editorial-events/:id ──
// Update an existing event

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = eventUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const drizzleData = stripUndefined(eventToDrizzle(parsed.data as z.infer<typeof eventSchema>));
    const [result] = await db.update(editorialEvents)
      .set({ ...drizzleData, updatedAt: new Date() })
      .where(eq(editorialEvents.id, req.params.id))
      .returning();

    if (!result) return res.status(404).json({ error: 'Event not found' });
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating editorial event:', message);
    res.status(500).json({ error: message });
  }
});

// ── DELETE /api/editorial-events/:id ──
// Delete event (completions cascade-deleted)

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await db.delete(editorialEvents).where(eq(editorialEvents.id, req.params.id));
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting editorial event:', message);
    res.status(500).json({ error: message });
  }
});

// ── PUT /api/editorial-events/:id/completions/:market ──
// Upsert completion status for an event+market pair

router.put('/:id/completions/:market', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id: eventId, market } = req.params;

    if (!VALID_MARKETS.includes(market as typeof VALID_MARKETS[number])) {
      return res.status(400).json({ error: `Invalid market: ${market}` });
    }

    const parsed = completionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    // Check if completion already exists
    const existing = await db.select().from(editorialEventCompletions)
      .where(and(
        eq(editorialEventCompletions.eventId, eventId),
        eq(editorialEventCompletions.market, market),
      ))
      .limit(1);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.linked_post_id !== undefined) updateData.linkedPostId = parsed.data.linked_post_id;
    if (parsed.data.linked_topic_id !== undefined) updateData.linkedTopicId = parsed.data.linked_topic_id;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    let result;
    if (existing.length > 0) {
      [result] = await db.update(editorialEventCompletions)
        .set(updateData)
        .where(and(
          eq(editorialEventCompletions.eventId, eventId),
          eq(editorialEventCompletions.market, market),
        ))
        .returning();
    } else {
      [result] = await db.insert(editorialEventCompletions)
        .values({
          eventId,
          market,
          status: parsed.data.status || 'not_started',
          linkedPostId: parsed.data.linked_post_id || null,
          linkedTopicId: parsed.data.linked_topic_id || null,
          notes: parsed.data.notes || null,
        })
        .returning();
    }

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating completion:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
