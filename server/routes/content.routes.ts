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

// ============================================
// KEYWORDS
// ============================================

/**
 * GET /keywords
 * List all keywords with optional filters
 */
router.get('/keywords', async (req: Request, res: Response) => {
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
router.get('/topics', async (req: Request, res: Response) => {
  try {
    const { category, priority, status } = req.query;
    const sb = getSupabase();

    let query = sb.from('content_topics').select('*');

    if (category) query = query.eq('category', category as string);
    if (priority) query = query.eq('priority', parseInt(priority as string));
    if (status) query = query.eq('status', status as string);

    const { data: topics, error } = await query.order('priority', { ascending: false });

    if (error) throw error;

    // Add post_count to each topic
    const topicsWithCounts = await Promise.all(
      (topics || []).map(async (topic) => {
        const { count } = await sb
          .from('blog_posts')
          .select('*', { count: 'exact', head: true })
          .eq('source_topic_id', topic.id);

        return { ...topic, post_count: count || 0 };
      })
    );

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
router.get('/topics/:id', async (req: Request, res: Response) => {
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
router.post('/topics', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_topics')
      .insert(req.body)
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
router.patch('/topics/:id', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_topics')
      .update({ ...req.body, updated_at: new Date().toISOString() })
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
router.delete('/topics/:id', async (req: Request, res: Response) => {
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
router.get('/plans', async (req: Request, res: Response) => {
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
router.get('/plans/:id', async (req: Request, res: Response) => {
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
router.post('/plans', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_weekly_plans')
      .insert(req.body)
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
router.patch('/plans/:id', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_weekly_plans')
      .update({ ...req.body, updated_at: new Date().toISOString() })
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
router.delete('/plans/:id', async (req: Request, res: Response) => {
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
router.get('/assignments', async (req: Request, res: Response) => {
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
router.get('/assignments/:id', async (req: Request, res: Response) => {
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
router.post('/assignments', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();

    // Convert camelCase input to snake_case for database
    const insertData: any = {
      date: req.body.date,
      topic_id: req.body.topicId,
      status: req.body.status || 'planned',
      notes: req.body.notes || null
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
router.patch('/assignments/:id', async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();

    // Convert camelCase input to snake_case
    const updateData: any = { updated_at: new Date().toISOString() };
    if (req.body.date !== undefined) updateData.date = req.body.date;
    if (req.body.topicId !== undefined) updateData.topic_id = req.body.topicId;
    if (req.body.postId !== undefined) updateData.post_id = req.body.postId;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

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
router.delete('/assignments/:id', async (req: Request, res: Response) => {
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
