/**
 * Blog Analytics Routes
 * Provides blog post view analytics from analytics_views + blog_posts tables.
 * 5 endpoints consumed by AnalyticsNewBlog.tsx
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Get excluded IPs for filtering (matches pattern from analytics.routes.ts)
 */
async function getExcludedIPs(): Promise<string[]> {
  try {
    const { rows } = await pool.query(
      `SELECT ip_cidr FROM analytics_exclusions WHERE active = true`
    );
    return rows.map((r: any) => r.ip_cidr.replace(/\/\d+$/, ''));
  } catch {
    return [];
  }
}

/**
 * Build WHERE clause fragments for date range, language, and IP exclusion
 */
function buildFilters(
  days: number,
  language?: string,
  excludeIPs: string[] = [],
  excludeTest = true
): { where: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  // Date range
  conditions.push(`av.created_at >= NOW() - INTERVAL '${days} days'`);

  // Language filter (analytics_views.language or joined blog_posts.language)
  if (language) {
    conditions.push(`bp.language = $${idx}`);
    params.push(language);
    idx++;
  }

  // IP exclusion
  if (excludeIPs.length > 0) {
    conditions.push(`(av.ip_address IS NULL OR av.ip_address NOT IN (${excludeIPs.map(() => `$${idx++}`).join(',')}))`);
    params.push(...excludeIPs);
  }

  // Exclude test data
  if (excludeTest) {
    conditions.push(`av.is_test_data = false`);
  }

  // Blog pages only
  conditions.push(`av.page_url LIKE '%/blog/%'`);

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * Extract blog post slug from a page_url like /fr-FR/blog/some-slug or /en-US/blog/some-slug
 */
function extractSlug(pageUrl: string): string | null {
  const match = pageUrl.match(/\/blog\/([^/?#]+)/);
  return match ? match[1] : null;
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

    const { rows } = await pool.query(
      `SELECT
         bp.slug as post_slug,
         bp.title as post_title,
         bp.language,
         COUNT(av.id) as view_count,
         MAX(av.created_at) as last_viewed
       FROM analytics_views av
       JOIN blog_posts bp ON bp.slug = SUBSTRING(av.page_url FROM '/blog/([^/?#]+)')
       WHERE av.page_url LIKE '%/blog/%'
         AND av.is_test_data = false
         AND av.created_at >= NOW() - INTERVAL '${days} days'
         ${language ? `AND bp.language = $1` : ''}
         ${excludedIPs.length > 0
           ? `AND (av.ip_address IS NULL OR av.ip_address NOT IN (${excludedIPs.map((_, i) => `$${(language ? 2 : 1) + i}`).join(',')}))`
           : ''}
       GROUP BY bp.slug, bp.title, bp.language
       ORDER BY view_count DESC
       LIMIT 20`,
      [...(language ? [language] : []), ...excludedIPs]
    );

    // If no views joined with posts, return empty
    res.json(rows.map(r => ({
      post_slug: r.post_slug,
      post_title: r.post_title,
      language: r.language,
      view_count: parseInt(r.view_count, 10),
      last_viewed: r.last_viewed?.toISOString() || new Date().toISOString(),
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

    const params: any[] = [];
    let idx = 1;

    let langFilter = '';
    if (language) {
      langFilter = `AND EXISTS (SELECT 1 FROM blog_posts bp WHERE bp.slug = SUBSTRING(av.page_url FROM '/blog/([^/?#]+)') AND bp.language = $${idx})`;
      params.push(language);
      idx++;
    }

    let ipFilter = '';
    if (excludedIPs.length > 0) {
      ipFilter = `AND (av.ip_address IS NULL OR av.ip_address NOT IN (${excludedIPs.map(() => `$${idx++}`).join(',')}))`;
      params.push(...excludedIPs);
    }

    const { rows } = await pool.query(
      `SELECT
         DATE(av.created_at) as date,
         COUNT(av.id) as views
       FROM analytics_views av
       WHERE av.page_url LIKE '%/blog/%'
         AND av.is_test_data = false
         AND av.created_at >= NOW() - INTERVAL '${days} days'
         ${langFilter}
         ${ipFilter}
       GROUP BY DATE(av.created_at)
       ORDER BY date ASC`,
      params
    );

    res.json(rows.map(r => ({
      date: r.date?.toISOString().split('T')[0] || '',
      views: parseInt(r.views, 10),
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

    const params: any[] = [];
    let idx = 1;

    let langFilter = '';
    if (language) {
      langFilter = `AND bp.language = $${idx}`;
      params.push(language);
      idx++;
    }

    let ipFilter = '';
    if (excludedIPs.length > 0) {
      ipFilter = `AND (av.ip_address IS NULL OR av.ip_address NOT IN (${excludedIPs.map(() => `$${idx++}`).join(',')}))`;
      params.push(...excludedIPs);
    }

    const { rows } = await pool.query(
      `SELECT
         ct.id as topic_id,
         ct.title as topic_title,
         ct.category,
         COUNT(av.id) as view_count,
         COUNT(DISTINCT bp.id) as post_count
       FROM content_topics ct
       JOIN blog_posts bp ON bp.source_topic_id = ct.id
       JOIN analytics_views av ON SUBSTRING(av.page_url FROM '/blog/([^/?#]+)') = bp.slug
       WHERE av.page_url LIKE '%/blog/%'
         AND av.is_test_data = false
         AND av.created_at >= NOW() - INTERVAL '${days} days'
         ${langFilter}
         ${ipFilter}
       GROUP BY ct.id, ct.title, ct.category
       ORDER BY view_count DESC
       LIMIT 10`,
      params
    );

    res.json(rows.map(r => ({
      topic_id: r.topic_id,
      topic_title: r.topic_title,
      category: r.category || 'Uncategorized',
      view_count: parseInt(r.view_count, 10),
      post_count: parseInt(r.post_count, 10),
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

    const params: any[] = [];
    let idx = 1;

    let langFilter = '';
    if (language) {
      langFilter = `AND bp.language = $${idx}`;
      params.push(language);
      idx++;
    }

    let ipFilter = '';
    if (excludedIPs.length > 0) {
      ipFilter = `AND (av.ip_address IS NULL OR av.ip_address NOT IN (${excludedIPs.map(() => `$${idx++}`).join(',')}))`;
      params.push(...excludedIPs);
    }

    // Query posts that have primary_keyword set and have views
    const { rows } = await pool.query(
      `SELECT
         bp.primary_keyword as keyword,
         COUNT(av.id) as view_count,
         COUNT(DISTINCT bp.id) as post_count
       FROM blog_posts bp
       JOIN analytics_views av ON SUBSTRING(av.page_url FROM '/blog/([^/?#]+)') = bp.slug
       WHERE av.page_url LIKE '%/blog/%'
         AND av.is_test_data = false
         AND av.created_at >= NOW() - INTERVAL '${days} days'
         AND bp.primary_keyword IS NOT NULL
         AND bp.primary_keyword != ''
         ${langFilter}
         ${ipFilter}
       GROUP BY bp.primary_keyword
       ORDER BY view_count DESC
       LIMIT 10`,
      params
    );

    res.json(rows.map(r => ({
      keyword: r.keyword,
      view_count: parseInt(r.view_count, 10),
      post_count: parseInt(r.post_count, 10),
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

    const params: any[] = [];
    let idx = 1;

    let langFilter = '';
    if (language) {
      langFilter = `AND bp.language = $${idx}`;
      params.push(language);
      idx++;
    }

    let ipFilter = '';
    if (excludedIPs.length > 0) {
      ipFilter = `AND (av.ip_address IS NULL OR av.ip_address NOT IN (${excludedIPs.map(() => `$${idx++}`).join(',')}))`;
      params.push(...excludedIPs);
    }

    // Get category from content_topics (joined through blog_posts.source_topic_id)
    const { rows } = await pool.query(
      `SELECT
         COALESCE(ct.category, 'Uncategorized') as category,
         COUNT(av.id) as view_count,
         COUNT(DISTINCT bp.id) as post_count
       FROM blog_posts bp
       LEFT JOIN content_topics ct ON bp.source_topic_id = ct.id
       JOIN analytics_views av ON SUBSTRING(av.page_url FROM '/blog/([^/?#]+)') = bp.slug
       WHERE av.page_url LIKE '%/blog/%'
         AND av.is_test_data = false
         AND av.created_at >= NOW() - INTERVAL '${days} days'
         ${langFilter}
         ${ipFilter}
       GROUP BY ct.category
       ORDER BY view_count DESC`,
      params
    );

    // Calculate percentages
    const totalViews = rows.reduce((sum: number, r: any) => sum + parseInt(r.view_count, 10), 0);

    res.json(rows.map(r => ({
      category: r.category,
      view_count: parseInt(r.view_count, 10),
      post_count: parseInt(r.post_count, 10),
      percentage: totalViews > 0 ? Math.round((parseInt(r.view_count, 10) / totalViews) * 100) : 0,
    })));
  } catch (error: any) {
    console.error('[Blog Analytics] /categories error:', error);
    res.json([]);
  }
});

export default router;
