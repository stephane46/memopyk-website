/**
 * Blog Analytics Routes
 * Provides blog post view analytics from analytics_views + blog_posts tables.
 * 5 endpoints consumed by AnalyticsNewBlog.tsx
 *
 * Uses Drizzle ORM consistently with the rest of the codebase.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { analyticsViews, analyticsExclusions, analyticsSessions, blogPosts, contentTopics } from '@shared/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

const router = Router();

/**
 * Get excluded IPs for filtering
 */
async function getExcludedIPs(): Promise<string[]> {
  try {
    const rows = await db
      .select({ ipCidr: analyticsExclusions.ipCidr })
      .from(analyticsExclusions)
      .where(eq(analyticsExclusions.active, true));
    return rows.map(r => r.ipCidr.replace(/\/\d+$/, ''));
  } catch {
    return [];
  }
}

/**
 * Build common WHERE conditions for blog analytics queries
 */
function buildConditions(days: number, language?: string, excludedIPs: string[] = []) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const conditions: any[] = [
    sql`${analyticsViews.pageUrl} LIKE '%/blog/%'`,
    eq(analyticsViews.isTestData, false),
    gte(analyticsViews.createdAt, cutoff),
    // Exclude views from bot sessions
    sql`NOT EXISTS (SELECT 1 FROM ${analyticsSessions} WHERE ${analyticsSessions.sessionId} = ${analyticsViews.sessionId} AND ${analyticsSessions.isBot} = true)`,
  ];

  if (language) {
    conditions.push(eq(blogPosts.language, language));
  }

  if (excludedIPs.length > 0) {
    const ipList = sql.join(excludedIPs.map(ip => sql`${ip}`), sql`, `);
    conditions.push(
      sql`(${analyticsViews.ipAddress} IS NULL OR ${analyticsViews.ipAddress} NOT IN (${ipList}))`
    );
  }

  return conditions;
}

/**
 * GET /api/analytics/blog/popular
 * Returns popular blog posts ranked by view count
 */
router.get('/analytics/blog/popular', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days || '30'), 10);
    const language = req.query.language ? String(req.query.language) : undefined;
    const excludedIPs = await getExcludedIPs();
    const conditions = buildConditions(days, language, excludedIPs);

    const rows = await db
      .select({
        postSlug: blogPosts.slug,
        postTitle: blogPosts.title,
        language: blogPosts.language,
        viewCount: sql<number>`count(${analyticsViews.id})::int`,
        lastViewed: sql<string>`max(${analyticsViews.createdAt})`,
      })
      .from(analyticsViews)
      .innerJoin(
        blogPosts,
        sql`${blogPosts.slug} = SUBSTRING(${analyticsViews.pageUrl} FROM '/blog/([^/?#]+)')`
      )
      .where(and(...conditions))
      .groupBy(blogPosts.slug, blogPosts.title, blogPosts.language)
      .orderBy(desc(sql`count(${analyticsViews.id})`))
      .limit(20);

    res.json(rows.map(r => ({
      postSlug: r.postSlug,
      postTitle: r.postTitle,
      language: r.language,
      viewCount: r.viewCount,
      lastViewed: r.lastViewed || new Date().toISOString(),
    })));
  } catch (error: any) {
    console.error('[Blog Analytics] /popular error:', error);
    res.json([]);
  }
});

/**
 * GET /api/analytics/blog/trends
 * Returns daily blog view counts
 */
router.get('/analytics/blog/trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days || '30'), 10);
    const language = req.query.language ? String(req.query.language) : undefined;
    const excludedIPs = await getExcludedIPs();

    const cutoff = new Date(Date.now() - days * 86400000);
    const conditions: any[] = [
      sql`${analyticsViews.pageUrl} LIKE '%/blog/%'`,
      eq(analyticsViews.isTestData, false),
      gte(analyticsViews.createdAt, cutoff),
      sql`NOT EXISTS (SELECT 1 FROM ${analyticsSessions} WHERE ${analyticsSessions.sessionId} = ${analyticsViews.sessionId} AND ${analyticsSessions.isBot} = true)`,
    ];

    // Language filter requires subquery since we don't want a full JOIN for trends
    if (language) {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM blog_posts bp WHERE bp.slug = SUBSTRING(${analyticsViews.pageUrl} FROM '/blog/([^/?#]+)') AND bp.language = ${language})`
      );
    }

    if (excludedIPs.length > 0) {
      const ipList = sql.join(excludedIPs.map(ip => sql`${ip}`), sql`, `);
      conditions.push(
        sql`(${analyticsViews.ipAddress} IS NULL OR ${analyticsViews.ipAddress} NOT IN (${ipList}))`
      );
    }

    const rows = await db
      .select({
        date: sql<string>`DATE(${analyticsViews.createdAt})`,
        views: sql<number>`count(${analyticsViews.id})::int`,
      })
      .from(analyticsViews)
      .where(and(...conditions))
      .groupBy(sql`DATE(${analyticsViews.createdAt})`)
      .orderBy(sql`DATE(${analyticsViews.createdAt})`);

    res.json(rows.map(r => ({
      date: String(r.date).split('T')[0],
      views: r.views,
    })));
  } catch (error: any) {
    console.error('[Blog Analytics] /trends error:', error);
    res.json([]);
  }
});

/**
 * GET /api/analytics/blog/topics
 * Returns topics ranked by total views from linked posts
 */
router.get('/analytics/blog/topics', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days || '30'), 10);
    const language = req.query.language ? String(req.query.language) : undefined;
    const excludedIPs = await getExcludedIPs();

    const cutoff = new Date(Date.now() - days * 86400000);
    const conditions: any[] = [
      sql`${analyticsViews.pageUrl} LIKE '%/blog/%'`,
      eq(analyticsViews.isTestData, false),
      gte(analyticsViews.createdAt, cutoff),
      sql`NOT EXISTS (SELECT 1 FROM ${analyticsSessions} WHERE ${analyticsSessions.sessionId} = ${analyticsViews.sessionId} AND ${analyticsSessions.isBot} = true)`,
    ];

    if (language) {
      conditions.push(eq(blogPosts.language, language));
    }

    if (excludedIPs.length > 0) {
      const ipList = sql.join(excludedIPs.map(ip => sql`${ip}`), sql`, `);
      conditions.push(
        sql`(${analyticsViews.ipAddress} IS NULL OR ${analyticsViews.ipAddress} NOT IN (${ipList}))`
      );
    }

    const rows = await db
      .select({
        topicId: contentTopics.id,
        topicTitle: contentTopics.title,
        category: contentTopics.category,
        viewCount: sql<number>`count(${analyticsViews.id})::int`,
        postCount: sql<number>`count(DISTINCT ${blogPosts.id})::int`,
      })
      .from(contentTopics)
      .innerJoin(blogPosts, eq(blogPosts.sourceTopicId, contentTopics.id))
      .innerJoin(
        analyticsViews,
        sql`SUBSTRING(${analyticsViews.pageUrl} FROM '/blog/([^/?#]+)') = ${blogPosts.slug}`
      )
      .where(and(...conditions))
      .groupBy(contentTopics.id, contentTopics.title, contentTopics.category)
      .orderBy(desc(sql`count(${analyticsViews.id})`))
      .limit(10);

    res.json(rows.map(r => ({
      topicId: r.topicId,
      topicTitle: r.topicTitle,
      category: r.category || 'Uncategorized',
      viewCount: r.viewCount,
      postCount: r.postCount,
    })));
  } catch (error: any) {
    console.error('[Blog Analytics] /topics error:', error);
    res.json([]);
  }
});

/**
 * GET /api/analytics/blog/keywords
 * Returns keywords ranked by traffic from posts that use them
 */
router.get('/analytics/blog/keywords', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days || '30'), 10);
    const language = req.query.language ? String(req.query.language) : undefined;
    const excludedIPs = await getExcludedIPs();

    const cutoff = new Date(Date.now() - days * 86400000);
    const conditions: any[] = [
      sql`${analyticsViews.pageUrl} LIKE '%/blog/%'`,
      eq(analyticsViews.isTestData, false),
      gte(analyticsViews.createdAt, cutoff),
      sql`NOT EXISTS (SELECT 1 FROM ${analyticsSessions} WHERE ${analyticsSessions.sessionId} = ${analyticsViews.sessionId} AND ${analyticsSessions.isBot} = true)`,
      sql`${blogPosts.primaryKeyword} IS NOT NULL AND ${blogPosts.primaryKeyword} != ''`,
    ];

    if (language) {
      conditions.push(eq(blogPosts.language, language));
    }

    if (excludedIPs.length > 0) {
      const ipList = sql.join(excludedIPs.map(ip => sql`${ip}`), sql`, `);
      conditions.push(
        sql`(${analyticsViews.ipAddress} IS NULL OR ${analyticsViews.ipAddress} NOT IN (${ipList}))`
      );
    }

    const rows = await db
      .select({
        keyword: blogPosts.primaryKeyword,
        viewCount: sql<number>`count(${analyticsViews.id})::int`,
        postCount: sql<number>`count(DISTINCT ${blogPosts.id})::int`,
      })
      .from(blogPosts)
      .innerJoin(
        analyticsViews,
        sql`SUBSTRING(${analyticsViews.pageUrl} FROM '/blog/([^/?#]+)') = ${blogPosts.slug}`
      )
      .where(and(...conditions))
      .groupBy(blogPosts.primaryKeyword)
      .orderBy(desc(sql`count(${analyticsViews.id})`))
      .limit(10);

    res.json(rows.map(r => ({
      keyword: r.keyword,
      viewCount: r.viewCount,
      postCount: r.postCount,
    })));
  } catch (error: any) {
    console.error('[Blog Analytics] /keywords error:', error);
    res.json([]);
  }
});

/**
 * GET /api/analytics/blog/categories
 * Returns category performance breakdown
 */
router.get('/analytics/blog/categories', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days || '30'), 10);
    const language = req.query.language ? String(req.query.language) : undefined;
    const excludedIPs = await getExcludedIPs();

    const cutoff = new Date(Date.now() - days * 86400000);
    const conditions: any[] = [
      sql`${analyticsViews.pageUrl} LIKE '%/blog/%'`,
      eq(analyticsViews.isTestData, false),
      gte(analyticsViews.createdAt, cutoff),
      // Exclude views from bot sessions
      sql`NOT EXISTS (SELECT 1 FROM ${analyticsSessions} WHERE ${analyticsSessions.sessionId} = ${analyticsViews.sessionId} AND ${analyticsSessions.isBot} = true)`,
    ];

    if (language) {
      conditions.push(eq(blogPosts.language, language));
    }

    if (excludedIPs.length > 0) {
      const ipList = sql.join(excludedIPs.map(ip => sql`${ip}`), sql`, `);
      conditions.push(
        sql`(${analyticsViews.ipAddress} IS NULL OR ${analyticsViews.ipAddress} NOT IN (${ipList}))`
      );
    }

    const rows = await db
      .select({
        category: sql<string>`COALESCE(${contentTopics.category}, 'Uncategorized')`,
        viewCount: sql<number>`count(${analyticsViews.id})::int`,
        postCount: sql<number>`count(DISTINCT ${blogPosts.id})::int`,
      })
      .from(blogPosts)
      .leftJoin(contentTopics, eq(blogPosts.sourceTopicId, contentTopics.id))
      .innerJoin(
        analyticsViews,
        sql`SUBSTRING(${analyticsViews.pageUrl} FROM '/blog/([^/?#]+)') = ${blogPosts.slug}`
      )
      .where(and(...conditions))
      .groupBy(contentTopics.category)
      .orderBy(desc(sql`count(${analyticsViews.id})`));

    const totalViews = rows.reduce((sum, r) => sum + r.viewCount, 0);

    res.json(rows.map(r => ({
      category: r.category,
      viewCount: r.viewCount,
      postCount: r.postCount,
      percentage: totalViews > 0 ? Math.round((r.viewCount / totalViews) * 100) : 0,
    })));
  } catch (error: any) {
    console.error('[Blog Analytics] /categories error:', error);
    res.json([]);
  }
});

export default router;
