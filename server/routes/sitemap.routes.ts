/**
 * Sitemap Routes
 *
 * Dynamic XML sitemap generated from published blog posts + static pages.
 * Cached for 1 hour.
 */

import { Router, Request, Response } from 'express';
import { getSupabase } from './blog-shared';

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
    const supabase = getSupabase();
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at, include_in_sitemap')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Sitemap: error fetching blog posts:', error);
    }

    const blogPosts = (posts || []).filter((p: any) => p.include_in_sitemap !== false);

    // Build XML
    const urls: string[] = [];

    for (const page of staticPages) {
      urls.push(`  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
    }

    for (const post of blogPosts) {
      const lastmod = post.updated_at || post.published_at;
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
