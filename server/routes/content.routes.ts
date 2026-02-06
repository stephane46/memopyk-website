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

// Simple in-memory cache for keywords stats
let keywordsStatsCache: { data: any; timestamp: number } | null = null;
const STATS_CACHE_TTL = 60000; // 1 minute

function invalidateStatsCache() {
  keywordsStatsCache = null;
}
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
  market: z.enum(['fr', 'en']).optional().default('fr'),
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

const keywordSchema = z.object({
  keyword: z.string().min(1).max(500),
  monthly_searches: z.number().int().nonnegative().nullable().optional(),
  competition: z.string().max(50).nullable().optional(),
  difficulty_score: z.number().int().min(0).max(100).nullable().optional(),
  intent: z.string().max(50).nullable().optional(),
  tier: z.number().int().min(1).max(4).nullable().optional(),
  market: z.enum(['fr', 'en']).optional().default('fr'),
  seasonal: z.boolean().optional(),
  seasonal_months: z.array(z.string()).nullable().optional(),
  cluster: z.string().max(200).nullable().optional(),
});

const keywordUpdateSchema = keywordSchema.partial();

// ============================================
// KEYWORDS
// ============================================

/**
 * GET /keywords/stats
 * Aggregated stats for summary cards and filter counts (cached)
 */
router.get('/keywords/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Return cached data if fresh
    if (keywordsStatsCache && Date.now() - keywordsStatsCache.timestamp < STATS_CACHE_TTL) {
      return res.json(keywordsStatsCache.data);
    }

    const sb = getSupabase();

    // Fetch all keywords for aggregation (more efficient than multiple COUNT queries)
    const { data: keywords, error } = await sb
      .from('content_keywords')
      .select('tier, intent, market, monthly_searches, cluster');

    if (error) throw error;

    // Calculate stats
    const stats = {
      totalKeywords: keywords?.length || 0,
      totalVolume: 0,
      tier1Count: 0,
      highIntentCount: 0,
      byMarket: {} as Record<string, number>,
      byTier: {} as Record<string, number>,
      byIntent: {} as Record<string, number>,
      byCluster: {} as Record<string, number>,
      byVolume: { mega: 0, high: 0, medium: 0, low: 0, minimal: 0 } as Record<string, number>,
    };

    for (const k of keywords || []) {
      const vol = k.monthly_searches || 0;
      stats.totalVolume += vol;

      // Volume range counts
      if (vol >= 50000) stats.byVolume.mega++;
      else if (vol >= 5000) stats.byVolume.high++;
      else if (vol >= 500) stats.byVolume.medium++;
      else if (vol >= 50) stats.byVolume.low++;
      else stats.byVolume.minimal++;

      // Tier counts
      const tier = String(k.tier || 0);
      stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;
      if (k.tier === 1) stats.tier1Count++;

      // Intent counts
      const intent = (k.intent || 'unknown').toLowerCase();
      stats.byIntent[intent] = (stats.byIntent[intent] || 0) + 1;
      if (intent === 'high') stats.highIntentCount++;

      // Market counts
      const market = k.market || 'fr';
      stats.byMarket[market] = (stats.byMarket[market] || 0) + 1;

      // Cluster counts
      if (k.cluster) {
        stats.byCluster[k.cluster] = (stats.byCluster[k.cluster] || 0) + 1;
      }
    }

    // Cache the result
    keywordsStatsCache = { data: stats, timestamp: Date.now() };

    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching keyword stats:', error);
    res.status(500).json({ error: 'Failed to fetch keyword stats' });
  }
});

/**
 * GET /keywords
 * List keywords with pagination and server-side filtering
 */
router.get('/keywords', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tier, intent, market, cluster, search, volume_range, page, limit, offset } = req.query;
    const sb = getSupabase();

    // Parse pagination params
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 100, 500); // Max 500 per request
    const offsetNum = offset !== undefined
      ? parseInt(offset as string)
      : (pageNum - 1) * limitNum;

    // Build count query for total (with same filters)
    let countQuery = sb.from('content_keywords').select('*', { count: 'exact', head: true });
    let dataQuery = sb.from('content_keywords').select('*');

    // Apply filters to both queries (supports comma-separated multi-values)
    if (tier) {
      const tiers = (tier as string).split(',').map(t => parseInt(t.trim()));
      if (tiers.length === 1) {
        countQuery = countQuery.eq('tier', tiers[0]);
        dataQuery = dataQuery.eq('tier', tiers[0]);
      } else {
        countQuery = countQuery.in('tier', tiers);
        dataQuery = dataQuery.in('tier', tiers);
      }
    }
    if (intent) {
      const intents = (intent as string).split(',').map(i => i.trim().toLowerCase());
      if (intents.length === 1) {
        countQuery = countQuery.ilike('intent', intents[0]);
        dataQuery = dataQuery.ilike('intent', intents[0]);
      } else {
        countQuery = countQuery.in('intent', intents);
        dataQuery = dataQuery.in('intent', intents);
      }
    }
    if (market) {
      const markets = (market as string).split(',').map(m => m.trim());
      if (markets.length === 1) {
        countQuery = countQuery.eq('market', markets[0]);
        dataQuery = dataQuery.eq('market', markets[0]);
      } else {
        countQuery = countQuery.in('market', markets);
        dataQuery = dataQuery.in('market', markets);
      }
    }
    if (search) {
      const searchPattern = `%${search}%`;
      countQuery = countQuery.ilike('keyword', searchPattern);
      dataQuery = dataQuery.ilike('keyword', searchPattern);
    }
    if (cluster) {
      const clusters = (cluster as string).split(',').map(c => c.trim());
      if (clusters.length === 1) {
        countQuery = countQuery.eq('cluster', clusters[0]);
        dataQuery = dataQuery.eq('cluster', clusters[0]);
      } else {
        countQuery = countQuery.in('cluster', clusters);
        dataQuery = dataQuery.in('cluster', clusters);
      }
    }
    if (volume_range) {
      // Volume ranges: mega(50000+), high(5000-49999), medium(500-4999), low(50-499), minimal(0-49)
      const ranges = (volume_range as string).split(',').map(r => r.trim());
      const rangeBounds: Record<string, [number, number]> = {
        mega: [50000, 999999999],
        high: [5000, 49999],
        medium: [500, 4999],
        low: [50, 499],
        minimal: [0, 49],
      };
      // Build OR conditions for selected ranges
      const conditions = ranges
        .filter(r => rangeBounds[r])
        .map(r => `monthly_searches.gte.${rangeBounds[r][0]},monthly_searches.lte.${rangeBounds[r][1]}`);
      if (conditions.length > 0) {
        const orFilter = conditions.map(c => `and(${c})`).join(',');
        countQuery = countQuery.or(orFilter);
        dataQuery = dataQuery.or(orFilter);
      }
    }

    // Execute count query
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // Apply pagination and ordering to data query
    const { data, error } = await dataQuery
      .order('monthly_searches', { ascending: false, nullsFirst: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (error) throw error;

    // Enrich with topics_count and posts_count for this page of keywords
    const keywords = data || [];
    if (keywords.length > 0) {
      const kwTexts = [...new Set(keywords.map((k: any) => k.keyword))];
      const kwMarkets = [...new Set(keywords.map((k: any) => k.market))];

      // Topics count: group by (primary_keyword, market)
      const { data: topicCounts } = await sb
        .from('content_topics')
        .select('id, primary_keyword, market')
        .in('primary_keyword', kwTexts)
        .in('market', kwMarkets);

      // Posts count: topics that have linked blog posts
      const topicIds = topicCounts?.map((t: any) => t.id).filter(Boolean) || [];
      let postCounts: any[] = [];
      if (topicIds.length > 0) {
        const { data: posts } = await sb
          .from('blog_posts')
          .select('source_topic_id')
          .in('source_topic_id', topicIds);
        postCounts = posts || [];
      }

      // Build lookup maps: "keyword|market" → count
      const topicCountMap: Record<string, number> = {};
      const topicIdsByKw: Record<string, string[]> = {};
      for (const t of topicCounts || []) {
        const key = `${t.primary_keyword}|${t.market}`;
        topicCountMap[key] = (topicCountMap[key] || 0) + 1;
        if (!topicIdsByKw[key]) topicIdsByKw[key] = [];
        topicIdsByKw[key].push(t.id);
      }

      const postCountMap: Record<string, number> = {};
      for (const p of postCounts) {
        // Find which keyword this post's topic belongs to
        for (const [key, ids] of Object.entries(topicIdsByKw)) {
          if (ids.includes(p.source_topic_id)) {
            postCountMap[key] = (postCountMap[key] || 0) + 1;
            break;
          }
        }
      }

      // Attach counts to each keyword
      for (const kw of keywords) {
        const key = `${kw.keyword}|${kw.market}`;
        kw.topics_count = topicCountMap[key] || 0;
        kw.posts_count = postCountMap[key] || 0;
      }
    }

    // Return paginated response
    const total = count || 0;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      keywords,
      pagination: {
        page: pageNum,
        limit: limitNum,
        offset: offsetNum,
        total,
        totalPages,
        hasMore: offsetNum + (keywords.length || 0) < total
      }
    });
  } catch (error: any) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

/**
 * GET /keywords/:id
 * Get single keyword by ID
 */
router.get('/keywords/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_keywords')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Keyword not found' });

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching keyword:', error);
    res.status(500).json({ error: 'Failed to fetch keyword' });
  }
});

/**
 * POST /keywords
 * Create new keyword
 */
router.post('/keywords', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = keywordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_keywords')
      .insert(parsed.data)
      .select()
      .single();

    if (error) throw error;

    invalidateStatsCache();
    res.json(data);
  } catch (error: any) {
    console.error('Error creating keyword:', error);
    res.status(500).json({ error: 'Failed to create keyword' });
  }
});

/**
 * PATCH /keywords/:id
 * Update keyword
 */
router.patch('/keywords/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = keywordUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('content_keywords')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    invalidateStatsCache();
    res.json(data);
  } catch (error: any) {
    console.error('Error updating keyword:', error);
    res.status(500).json({ error: 'Failed to update keyword' });
  }
});

/**
 * DELETE /keywords/:id
 * Delete keyword
 */
router.delete('/keywords/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('content_keywords')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    invalidateStatsCache();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting keyword:', error);
    res.status(500).json({ error: 'Failed to delete keyword' });
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
    const { category, priority, status, market } = req.query;
    const sb = getSupabase();

    let query = sb.from('content_topics').select('*');

    if (category) query = query.eq('category', category as string);
    if (priority) query = query.eq('priority', parseInt(priority as string));
    if (status) query = query.eq('status', status as string);
    if (market) query = query.eq('market', market as string);

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
 * Delete topic (unlinks blog posts, blocks if assignments exist)
 */
router.delete('/topics/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = getSupabase();
    const topicId = req.params.id;

    // Check for dependent assignments - still block if any exist
    const { data: assignments, error: assignmentError } = await sb
      .from('content_daily_assignments')
      .select('id')
      .eq('topic_id', topicId)
      .limit(1);

    if (assignmentError) throw assignmentError;

    if (assignments && assignments.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete topic with existing assignments',
        code: 'HAS_ASSIGNMENTS',
        hint: 'Delete or reassign the assignments first'
      });
    }

    // Unlink any blog posts that reference this topic (set source_topic_id to null)
    const { error: unlinkError } = await sb
      .from('blog_posts')
      .update({ source_topic_id: null })
      .eq('source_topic_id', topicId);

    if (unlinkError) throw unlinkError;

    // Now safe to delete the topic
    const { error } = await sb
      .from('content_topics')
      .delete()
      .eq('id', topicId);

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
