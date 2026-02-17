/**
 * Content Management Routes
 *
 * Admin endpoints for content production planning:
 * - Keywords: SEO keyword research data
 * - Topics: Pre-researched blog topics (102 topics)
 * - Plans: Weekly content schedules
 * - Assignments: Daily topic assignments
 *
 * Uses Drizzle ORM for all database queries.
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import { z } from 'zod';
import { db } from '../db';
import { contentKeywords, contentTopics, contentDailyAssignments, contentWeeklyPlans, blogPosts } from '@shared/schema';
import { eq, and, or, desc, asc, ilike, inArray, sql, not, isNull, gte, lte } from 'drizzle-orm';

const router = Router();

// Simple in-memory cache for keywords stats
let keywordsStatsCache: { data: any; timestamp: number } | null = null;
const STATS_CACHE_TTL = 60000; // 1 minute

function invalidateStatsCache() {
  keywordsStatsCache = null;
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
  role: z.enum(['pillar', 'spoke']).optional().default('spoke'),
  parent_topic_id: z.string().uuid().nullable().optional(),
  cluster: z.string().max(200).nullable().optional(),
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

// Helper: convert snake_case zod-validated topic data to camelCase Drizzle columns
function topicToDrizzle(data: z.infer<typeof topicSchema>) {
  return {
    title: data.title,
    slug: data.slug,
    category: data.category,
    type: data.type,
    market: data.market,
    targetWordCount: data.target_word_count,
    primaryKeyword: data.primary_keyword,
    secondaryKeywords: data.secondary_keywords,
    searchVolume: data.search_volume,
    competition: data.competition,
    searchIntent: data.search_intent,
    contentAngle: data.content_angle,
    description: data.description,
    heroImageConcept: data.hero_image_concept,
    bodyImageConcepts: data.body_image_concepts,
    priority: data.priority,
    status: data.status,
    role: data.role,
    parentTopicId: data.parent_topic_id,
    cluster: data.cluster,
    memopykLinkOpportunities: data.memopyk_link_opportunities,
  };
}

// Helper: convert snake_case zod-validated keyword data to camelCase Drizzle columns
function keywordToDrizzle(data: z.infer<typeof keywordSchema>) {
  return {
    keyword: data.keyword,
    monthlySearches: data.monthly_searches,
    competition: data.competition,
    difficultyScore: data.difficulty_score,
    intent: data.intent,
    tier: data.tier,
    market: data.market,
    seasonal: data.seasonal,
    seasonalMonths: data.seasonal_months,
    cluster: data.cluster,
  };
}

// Helper: convert snake_case zod-validated plan data to camelCase Drizzle columns
function planToDrizzle(data: z.infer<typeof planSchema>) {
  return {
    weekNumber: data.week_number,
    year: data.year,
    startDate: new Date(data.start_date),
    endDate: new Date(data.end_date),
    topicsSelected: data.topics_selected,
    status: data.status,
    timeSpentMinutes: data.time_spent_minutes,
    notes: data.notes,
  };
}

// Helper: strip undefined values from a partial object
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

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

    // Fetch all keywords for aggregation (more efficient than multiple COUNT queries)
    const keywords = await db.select({
      tier: contentKeywords.tier,
      intent: contentKeywords.intent,
      market: contentKeywords.market,
      monthlySearches: contentKeywords.monthlySearches,
      cluster: contentKeywords.cluster,
      competition: contentKeywords.competition,
    }).from(contentKeywords);

    // Calculate stats
    const stats = {
      totalKeywords: keywords.length,
      totalVolume: 0,
      tier1Count: 0,
      highIntentCount: 0,
      byMarket: {} as Record<string, number>,
      byTier: {} as Record<string, number>,
      byIntent: {} as Record<string, number>,
      byCluster: {} as Record<string, number>,
      byCompetition: {} as Record<string, number>,
      byVolume: { mega: 0, high: 0, medium: 0, low: 0, minimal: 0 } as Record<string, number>,
    };

    for (const k of keywords) {
      const vol = k.monthlySearches || 0;
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

      // Competition counts
      const comp = (k.competition || 'unknown').toLowerCase();
      stats.byCompetition[comp] = (stats.byCompetition[comp] || 0) + 1;

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
    const { tier, intent, market, cluster, competition, search, volume_range, page, limit, offset } = req.query;

    // Parse pagination params
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 100, 500); // Max 500 per request
    const offsetNum = offset !== undefined
      ? parseInt(offset as string)
      : (pageNum - 1) * limitNum;

    // Build filter conditions
    const conditions: any[] = [];

    if (tier) {
      const tiers = (tier as string).split(',').map(t => parseInt(t.trim()));
      if (tiers.length === 1) {
        conditions.push(eq(contentKeywords.tier, tiers[0]));
      } else {
        conditions.push(inArray(contentKeywords.tier, tiers));
      }
    }
    if (intent) {
      const intents = (intent as string).split(',').map(i => i.trim().toLowerCase());
      if (intents.length === 1) {
        conditions.push(ilike(contentKeywords.intent, intents[0]));
      } else {
        conditions.push(inArray(contentKeywords.intent, intents));
      }
    }
    if (market) {
      const markets = (market as string).split(',').map(m => m.trim());
      if (markets.length === 1) {
        conditions.push(eq(contentKeywords.market, markets[0]));
      } else {
        conditions.push(inArray(contentKeywords.market, markets));
      }
    }
    if (search) {
      conditions.push(ilike(contentKeywords.keyword, `%${search}%`));
    }
    if (cluster) {
      const clusters = (cluster as string).split(',').map(c => c.trim());
      if (clusters.length === 1) {
        conditions.push(eq(contentKeywords.cluster, clusters[0]));
      } else {
        conditions.push(inArray(contentKeywords.cluster, clusters));
      }
    }
    if (competition) {
      const comps = (competition as string).split(',').map(c => c.trim().toLowerCase());
      if (comps.length === 1) {
        conditions.push(ilike(contentKeywords.competition, comps[0]));
      } else {
        conditions.push(inArray(contentKeywords.competition, comps));
      }
    }
    if (volume_range) {
      const ranges = (volume_range as string).split(',').map(r => r.trim());
      const rangeBounds: Record<string, [number, number]> = {
        mega: [50000, 999999999],
        high: [5000, 49999],
        medium: [500, 4999],
        low: [50, 499],
        minimal: [0, 49],
      };
      const rangeConditions = ranges
        .filter(r => rangeBounds[r])
        .map(r => and(
          gte(contentKeywords.monthlySearches, rangeBounds[r][0]),
          lte(contentKeywords.monthlySearches, rangeBounds[r][1])
        ));
      if (rangeConditions.length > 0) {
        conditions.push(or(...rangeConditions));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Execute count query
    const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(contentKeywords)
      .where(whereClause);

    // Execute data query with pagination
    const data = await db.select().from(contentKeywords)
      .where(whereClause)
      .orderBy(sql`${contentKeywords.monthlySearches} desc nulls last`)
      .offset(offsetNum)
      .limit(limitNum);

    // Enrich with topics_count and posts_count for this page of keywords
    const keywords: any[] = data;
    if (keywords.length > 0) {
      const kwTexts = [...new Set(keywords.map((k: any) => k.keyword))];
      const kwMarkets = [...new Set(keywords.map((k: any) => k.market))];

      // Topics count: group by (primary_keyword, market)
      const topicCounts = await db.select({
        id: contentTopics.id,
        primaryKeyword: contentTopics.primaryKeyword,
        market: contentTopics.market,
      }).from(contentTopics)
        .where(and(
          inArray(contentTopics.primaryKeyword, kwTexts),
          inArray(contentTopics.market, kwMarkets)
        ));

      // Posts count: topics that have linked blog posts
      const topicIds = topicCounts.map(t => t.id).filter(Boolean);
      let postCounts: { sourceTopicId: string | null }[] = [];
      if (topicIds.length > 0) {
        postCounts = await db.select({
          sourceTopicId: blogPosts.sourceTopicId,
        }).from(blogPosts)
          .where(inArray(blogPosts.sourceTopicId, topicIds));
      }

      // Build lookup maps: "keyword|market" → count
      const topicCountMap: Record<string, number> = {};
      const topicIdsByKw: Record<string, string[]> = {};
      for (const t of topicCounts) {
        const key = `${t.primaryKeyword}|${t.market}`;
        topicCountMap[key] = (topicCountMap[key] || 0) + 1;
        if (!topicIdsByKw[key]) topicIdsByKw[key] = [];
        topicIdsByKw[key].push(t.id);
      }

      const postCountMap: Record<string, number> = {};
      for (const p of postCounts) {
        for (const [key, ids] of Object.entries(topicIdsByKw)) {
          if (p.sourceTopicId && ids.includes(p.sourceTopicId)) {
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
    const [keyword] = await db.select().from(contentKeywords)
      .where(eq(contentKeywords.id, req.params.id))
      .limit(1);

    if (!keyword) return res.status(404).json({ error: 'Keyword not found' });

    res.json(keyword);
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

    const [result] = await db.insert(contentKeywords)
      .values(keywordToDrizzle(parsed.data))
      .returning();

    invalidateStatsCache();
    res.json(result);
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

    const drizzleData = stripUndefined(keywordToDrizzle(parsed.data as z.infer<typeof keywordSchema>));
    const [result] = await db.update(contentKeywords)
      .set({ ...drizzleData, updatedAt: new Date() })
      .where(eq(contentKeywords.id, req.params.id))
      .returning();

    invalidateStatsCache();
    res.json(result);
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
    await db.delete(contentKeywords).where(eq(contentKeywords.id, req.params.id));

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

    const conditions: any[] = [];
    if (category) conditions.push(eq(contentTopics.category, category as string));
    if (priority) conditions.push(eq(contentTopics.priority, parseInt(priority as string)));
    if (status) conditions.push(eq(contentTopics.status, status as string));
    if (market) conditions.push(eq(contentTopics.market, market as string));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const topics = await db.select().from(contentTopics)
      .where(whereClause)
      .orderBy(desc(contentTopics.priority));

    // Get post counts in a single query (fixes N+1 problem)
    const postCounts = await db.select({
      sourceTopicId: blogPosts.sourceTopicId,
    }).from(blogPosts)
      .where(not(isNull(blogPosts.sourceTopicId)));

    // Build count map
    const countMap = new Map<string, number>();
    for (const post of postCounts) {
      if (post.sourceTopicId) {
        const current = countMap.get(post.sourceTopicId) || 0;
        countMap.set(post.sourceTopicId, current + 1);
      }
    }

    // Merge counts into topics
    const topicsWithCounts = topics.map((topic) => ({
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
    const [topic] = await db.select().from(contentTopics)
      .where(eq(contentTopics.id, req.params.id))
      .limit(1);

    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    res.json(topic);
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

    const [result] = await db.insert(contentTopics)
      .values(topicToDrizzle(parsed.data))
      .returning();

    res.json(result);
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

    const drizzleData = stripUndefined(topicToDrizzle(parsed.data as z.infer<typeof topicSchema>));
    const [result] = await db.update(contentTopics)
      .set({ ...drizzleData, updatedAt: new Date() })
      .where(eq(contentTopics.id, req.params.id))
      .returning();

    res.json(result);
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
    const topicId = req.params.id;

    // Check for dependent assignments - still block if any exist
    const assignments = await db.select({ id: contentDailyAssignments.id })
      .from(contentDailyAssignments)
      .where(eq(contentDailyAssignments.topicId, topicId))
      .limit(1);

    if (assignments.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete topic with existing assignments',
        code: 'HAS_ASSIGNMENTS',
        hint: 'Delete or reassign the assignments first'
      });
    }

    // Unlink any blog posts that reference this topic (set source_topic_id to null)
    await db.update(blogPosts)
      .set({ sourceTopicId: null })
      .where(eq(blogPosts.sourceTopicId, topicId));

    // Now safe to delete the topic
    await db.delete(contentTopics).where(eq(contentTopics.id, topicId));

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

    const conditions: any[] = [];
    if (year) conditions.push(eq(contentWeeklyPlans.year, parseInt(year as string)));
    if (status) conditions.push(eq(contentWeeklyPlans.status, status as string));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.select().from(contentWeeklyPlans)
      .where(whereClause)
      .orderBy(desc(contentWeeklyPlans.createdAt));

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
    const [plan] = await db.select().from(contentWeeklyPlans)
      .where(eq(contentWeeklyPlans.id, req.params.id))
      .limit(1);

    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    res.json(plan);
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

    const [result] = await db.insert(contentWeeklyPlans)
      .values(planToDrizzle(parsed.data))
      .returning();

    res.json(result);
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

    const drizzleData = stripUndefined(planToDrizzle(parsed.data as z.infer<typeof planSchema>));
    const [result] = await db.update(contentWeeklyPlans)
      .set({ ...drizzleData, updatedAt: new Date() })
      .where(eq(contentWeeklyPlans.id, req.params.id))
      .returning();

    res.json(result);
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
    await db.delete(contentWeeklyPlans).where(eq(contentWeeklyPlans.id, req.params.id));

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

    const conditions: any[] = [];
    if (startDate) conditions.push(gte(contentDailyAssignments.date, new Date(startDate as string)));
    if (endDate) conditions.push(lte(contentDailyAssignments.date, new Date(endDate as string)));
    if (status) conditions.push(eq(contentDailyAssignments.status, status as string));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.select().from(contentDailyAssignments)
      .where(whereClause)
      .orderBy(asc(contentDailyAssignments.date));

    // Drizzle returns camelCase natively — no conversion needed
    res.json(data);
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
    const [assignment] = await db.select().from(contentDailyAssignments)
      .where(eq(contentDailyAssignments.id, req.params.id))
      .limit(1);

    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    // Drizzle returns camelCase natively — no conversion needed
    res.json(assignment);
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

    const [result] = await db.insert(contentDailyAssignments)
      .values({
        date: new Date(parsed.data.date),
        topicId: parsed.data.topicId,
        status: parsed.data.status || 'planned',
        notes: parsed.data.notes || null,
      })
      .returning();

    res.json(result);
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

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date);
    if (parsed.data.topicId !== undefined) updateData.topicId = parsed.data.topicId;
    if (parsed.data.postId !== undefined) updateData.postId = parsed.data.postId;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    const [result] = await db.update(contentDailyAssignments)
      .set(updateData)
      .where(eq(contentDailyAssignments.id, req.params.id))
      .returning();

    res.json(result);
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
    await db.delete(contentDailyAssignments).where(eq(contentDailyAssignments.id, req.params.id));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting daily assignment:', error);
    res.status(500).json({ error: 'Failed to delete daily assignment' });
  }
});

export default router;
