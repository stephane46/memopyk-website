/**
 * Sitemap Routes
 *
 * Dynamic XML sitemap generated from published blog posts + static pages.
 * Cached for 1 hour.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { blogPosts } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

let sitemapCache: { xml: string; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * GET /sitemap.xml
 * Dynamic XML sitemap
 */
router.get('/sitemap.xml', async (_req: Request, res: Response) => {
  try {
    // Return cached version if fresh
    if (sitemapCache && Date.now() - sitemapCache.timestamp < CACHE_TTL) {
      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(sitemapCache.xml);
    }

    const baseUrl = 'https://www.memopyk.com';

    // Static pages
    const staticPages = [
      { loc: '/', changefreq: 'weekly', priority: '1.0' },
      { loc: '/gallery', changefreq: 'monthly', priority: '0.8' },
      { loc: '/faq', changefreq: 'monthly', priority: '0.7' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.7' },
      { loc: '/partners', changefreq: 'monthly', priority: '0.6' },
      { loc: '/blog', changefreq: 'daily', priority: '0.9' },
    ];

    // Fetch published blog posts
    const posts = await db.select({
      slug: blogPosts.slug,
      updatedAt: blogPosts.updatedAt,
      publishedAt: blogPosts.publishedAt,
      includeInSitemap: blogPosts.includeInSitemap
    })
      .from(blogPosts)
      .where(eq(blogPosts.status, 'published'))
      .orderBy(desc(blogPosts.publishedAt));

    const sitemapPosts = posts.filter((p) => p.includeInSitemap !== false);

    // Build XML
    const urls: string[] = [];

    for (const page of staticPages) {
      urls.push(`  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
    }

    for (const post of sitemapPosts) {
      const lastmod = post.updatedAt || post.publishedAt;
      urls.push(`  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    // Cache the result
    sitemapCache = { xml, timestamp: Date.now() };

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('Sitemap generation failed');
  }
});

export default router;
