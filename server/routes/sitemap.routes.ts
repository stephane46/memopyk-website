/**
 * Sitemap Routes
 *
 * Dynamic XML sitemap generated from published blog posts + static pages.
 * Each page gets two entries (fr-FR + en-US) with xhtml:link hreflang alternates.
 * Cached for 1 hour.
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { blogPosts } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

let sitemapCache: { xml: string; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const BASE_URL = 'https://www.memopyk.com';
const LOCALES = ['fr-FR', 'en-US'] as const;

/** Generate hreflang alternate links for a given path suffix */
function hreflangLinks(pageSuffix: string): string {
  const lines: string[] = [];
  lines.push(`    <xhtml:link rel="alternate" hreflang="fr" href="${BASE_URL}/fr-FR${pageSuffix}"/>`);
  lines.push(`    <xhtml:link rel="alternate" hreflang="en" href="${BASE_URL}/en-US${pageSuffix}"/>`);
  lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE_URL}/fr-FR${pageSuffix}"/>`);
  return lines.join('\n');
}

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

    // Static pages as locale-relative path suffixes
    const staticPages = [
      { suffix: '', changefreq: 'weekly', priority: '1.0' },
      { suffix: '/gallery', changefreq: 'monthly', priority: '0.8' },
      { suffix: '/blog', changefreq: 'daily', priority: '0.9' },
      { suffix: '/contact', changefreq: 'monthly', priority: '0.7' },
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

    // Static pages: two entries per page (one per locale)
    for (const page of staticPages) {
      for (const locale of LOCALES) {
        urls.push(`  <url>
    <loc>${BASE_URL}/${locale}${page.suffix}</loc>
${hreflangLinks(page.suffix)}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
      }
    }

    // Blog posts: two entries per post (one per locale)
    for (const post of sitemapPosts) {
      const lastmod = post.updatedAt || post.publishedAt;
      const blogSuffix = `/blog/${post.slug}`;
      for (const locale of LOCALES) {
        urls.push(`  <url>
    <loc>${BASE_URL}/${locale}${blogSuffix}</loc>
${hreflangLinks(blogSuffix)}${lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
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
