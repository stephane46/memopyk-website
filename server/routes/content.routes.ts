/**
 * Content Management Routes
 *
 * Admin endpoints for content production planning:
 * - Keywords: SEO keyword research data
 * - Topics: Pre-researched blog topics (102 topics)
 * - Plans: Weekly content schedules
 * - Assignments: Daily topic assignments
 *
 * Converted from hybridStorage to direct Supabase queries.
 */

import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();

// Lazy-loaded Supabase client (same pattern as blog.routes.ts)
let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error('Missing Supabase credentials');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ==============================================
// VALIDATION SCHEMAS
// ==============================================

const topicSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  target_word_count: z.number().int().positive().optional(),
  primary_keyword: z.string().min(1).max(200),
  secondary_keywords: z.array(z.string()).optional(),
  search_volume: z.number().int().nonnegative().nullable().optional(),
  competition: z.string().max(50).nullable().optional(),
  search_intent: z.string().max(100).optional(),
  content_angle: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  hero_image_concept: z.string().max(500).nullable().optional(),
  body_image_concepts: z.array(z.string()).nullable().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  status: z.string().max(50).optional(),
  memopyk_link_opportunities: z.string().max(1000).nullable().optional(),
});

const topicUpdateSchema = topicSchema.partial();

const planSchema = z.object({
  week_number: z.string().min(1).max(20),
  year: z.number().int().min(2020).max(2100),
  start_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  end_date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  topics_selected: z.array(z.string().uuid()).optional(),
  status: z.string().max(50).optional(),
  time_spent_minutes: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

const planUpdateSchema = planSchema.partial();

const assignmentSchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  topicId: z.string().uuid(),
  postId: z.string().uuid().optional(),
  status: z.enum(['planned', 'in_progress', 'published']).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const assignmentUpdateSchema = assignmentSchema.partial();

// ============================================
// KEYWORDS
// ============================================

/**
 * GET /keywords
 * List all keywords with optional filters
 */
router.get('/keywords', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tier, intent } = req.query;
    const sb = getSupabase();

    let query = sb.from('content_keywords').select('*');

    if (tier) query = query.eq('tier', parseInt(tier as string));
    if (intent) query = query.eq('intent', intent as string);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// ============================================
// TOPICS
// ============================================

/**
 * GET /topics
 * List all topics with optional filters and post_count
 */
router.get('/topics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category, priority, status } = req.query;
    const sb = getSupabase();

    let query = sb.from('content_topics').select('*');

    if (category) query = query.eq('category', category as string);
    if (priority) query = query.eq('priority', parseInt(priority as string));
    if (status) query = query.eq('status', status as string);

    const { data: topics, error } = await query.order('priority', { ascending: false });

    if (error) throw error;

    // Get post counts in a single query (fixes N+1 problem)
    const { data: postCounts, error: countError } = await sb
      .from('blog_posts')
      .select('source_topic_id')
      .not('source_topic_id', 'is', null);

    if (countError) throw countError;

    // Build count map
    const countMap = new Map<string, number>();
    (postCounts || []).forEach((post: { source_topic_id: string }) => {
      const current = countMap.get(post.source_topic_id) || 0;
      countMap.set(post.source_topic_id, current + 1);
    });

    // Merge counts into topics
    const topicsWithCounts = (topics || []).map((topic) => ({
      ...topic,
      post_count: countMap.get(topic.id) || 0
    }));

    res.json(topicsWithCounts);
  } catch (error: any) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

/**
 * GET /topics/:id
 * Get single topic by ID
 */
router.get('/topics/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_topics')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Topic not found' });

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

/**
 * POST /topics
 * Create new topic
 */
router.post('/topics', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = topicSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_topics')
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

/**
 * PATCH /topics/:id
 * Update topic
 */
router.patch('/topics/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = topicUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_topics')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating topic:', error);
    res.status(500).json({ error: 'Failed to update topic' });
  }
});

/**
 * DELETE /topics/:id
 * Delete topic
 */
router.delete('/topics/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('content_topics')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ error: 'Failed to delete topic' });
  }
});

// ============================================
// WEEKLY PLANS
// ============================================

/**
 * GET /plans
 * List all weekly plans with optional filters
 */
router.get('/plans', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { year, status } = req.query;
    const sb = getSupabase();

    let query = sb.from('content_weekly_plans').select('*');

    if (year) query = query.eq('year', parseInt(year as string));
    if (status) query = query.eq('status', status as string);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching weekly plans:', error);
    res.status(500).json({ error: 'Failed to fetch weekly plans' });
  }
});

/**
 * GET /plans/:id
 * Get single plan by ID
 */
router.get('/plans/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_weekly_plans')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Plan not found' });

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching weekly plan:', error);
    res.status(500).json({ error: 'Failed to fetch weekly plan' });
  }
});

/**
 * POST /plans
 * Create new weekly plan
 */
router.post('/plans', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = planSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_weekly_plans')
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating weekly plan:', error);
    res.status(500).json({ error: 'Failed to create weekly plan' });
  }
});

/**
 * PATCH /plans/:id
 * Update weekly plan
 */
router.patch('/plans/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = planUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_weekly_plans')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating weekly plan:', error);
    res.status(500).json({ error: 'Failed to update weekly plan' });
  }
});

/**
 * DELETE /plans/:id
 * Delete weekly plan
 */
router.delete('/plans/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('content_weekly_plans')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting weekly plan:', error);
    res.status(500).json({ error: 'Failed to delete weekly plan' });
  }
});

// ============================================
// DAILY ASSIGNMENTS
// ============================================

/**
 * GET /assignments
 * List assignments with date range filter
 */
router.get('/assignments', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;
    const sb = getSupabase();

    let query = sb.from('content_daily_assignments').select('*');

    if (startDate) query = query.gte('date', startDate as string);
    if (endDate) query = query.lte('date', endDate as string);
    if (status) query = query.eq('status', status as string);

    const { data, error } = await query.order('date', { ascending: true });

    if (error) throw error;

    // Convert snake_case to camelCase for frontend compatibility
    const formatted = (data || []).map(a => ({
      id: a.id,
      date: a.date,
      topicId: a.topic_id,
      postId: a.post_id,
      status: a.status,
      notes: a.notes,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching daily assignments:', error);
    res.status(500).json({ error: 'Failed to fetch daily assignments' });
  }
});

/**
 * GET /assignments/:id
 * Get single assignment by ID
 */
router.get('/assignments/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_daily_assignments')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Assignment not found' });

    // Convert to camelCase
    res.json({
      id: data.id,
      date: data.date,
      topicId: data.topic_id,
      postId: data.post_id,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error: any) {
    console.error('Error fetching daily assignment:', error);
    res.status(500).json({ error: 'Failed to fetch daily assignment' });
  }
});

/**
 * POST /assignments
 * Create new daily assignment
 */
router.post('/assignments', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = assignmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const sb = getSupabase();

    // Convert camelCase input to snake_case for database
    const insertData: any = {
      date: parsed.data.date,
      topic_id: parsed.data.topicId,
      status: parsed.data.status || 'planned',
      notes: parsed.data.notes || null
    };

    const { data, error } = await sb
      .from('content_daily_assignments')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    // Return camelCase
    res.json({
      id: data.id,
      date: data.date,
      topicId: data.topic_id,
      postId: data.post_id,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error: any) {
    console.error('Error creating daily assignment:', error);
    res.status(500).json({ error: 'Failed to create daily assignment' });
  }
});

/**
 * PATCH /assignments/:id
 * Update daily assignment
 */
router.patch('/assignments/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = assignmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const sb = getSupabase();

    // Convert camelCase input to snake_case
    const updateData: any = { updated_at: new Date().toISOString() };
    if (parsed.data.date !== undefined) updateData.date = parsed.data.date;
    if (parsed.data.topicId !== undefined) updateData.topic_id = parsed.data.topicId;
    if (parsed.data.postId !== undefined) updateData.post_id = parsed.data.postId;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    const { data, error } = await sb
      .from('content_daily_assignments')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Return camelCase
    res.json({
      id: data.id,
      date: data.date,
      topicId: data.topic_id,
      postId: data.post_id,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  } catch (error: any) {
    console.error('Error updating daily assignment:', error);
    res.status(500).json({ error: 'Failed to update daily assignment' });
  }
});

/**
 * DELETE /assignments/:id
 * Delete daily assignment
 */
router.delete('/assignments/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('content_daily_assignments')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting daily assignment:', error);
    res.status(500).json({ error: 'Failed to delete daily assignment' });
  }
});

export default router;
