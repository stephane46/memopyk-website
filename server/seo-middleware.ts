import { Request, Response, NextFunction } from 'express';
import { seoService, type SeoData } from './seo-service';
import path from 'path';
import fs from 'fs';

// Simple in-memory cache for SEO data
interface SeoCache {
  data: SeoData;
  timestamp: number;
}

const seoCache = new Map<string, SeoCache>();
const SEO_CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Detect locale from URL path
 */
function detectLocale(url: string): 'fr-FR' | 'en-US' {
  if (url.startsWith('/fr-FR') || url.startsWith('/fr/')) {
    return 'fr-FR';
  }
  return 'en-US'; // Default to English
}

/**
 * Check if this is an HTML request that needs SEO tags
 */
function shouldProcessSEO(req: Request): boolean {
  const { path: urlPath, headers } = req;
  
  // Skip API routes, assets, and admin routes
  if (urlPath.startsWith('/api') || 
      urlPath.startsWith('/assets') || 
      urlPath.includes('/admin') ||
      urlPath.startsWith('/images') ||
      urlPath.startsWith('/flags') ||
      urlPath.includes('.') && !urlPath.endsWith('.html')) {
    return false;
  }
  
  // Only process requests that accept HTML
  const acceptHeader = headers.accept || '';
  return acceptHeader.includes('text/html');
}

/**
 * Check if URL path should have SEO processing
 * Exported version for use in proxy logic
 */
export const shouldProcessSeoUrl = (urlPath: string): boolean => {
  // Skip API routes, assets, and admin routes
  if (urlPath.startsWith('/api') || 
      urlPath.startsWith('/assets') || 
      urlPath.includes('/admin') ||
      urlPath.startsWith('/images') ||
      urlPath.startsWith('/flags') ||
      urlPath.includes('.') && !urlPath.endsWith('.html')) {
    return false;
  }
  
  return true;
};

/**
 * Get cached SEO data or fetch fresh data
 */
async function getCachedSeoData(lang: 'fr-FR' | 'en-US'): Promise<SeoData> {
  const cacheKey = `seo-${lang}`;
  const cached = seoCache.get(cacheKey);
  
  // Check if cache is valid
  if (cached && (Date.now() - cached.timestamp) < SEO_CACHE_TTL) {
    return cached.data;
  }
  
  try {
    // Fetch fresh data from SEO service
    const seoData = await seoService.getSeoSettings(lang);
    
    if (seoData) {
      // Cache the data
      seoCache.set(cacheKey, {
        data: seoData,
        timestamp: Date.now()
      });
      return seoData;
    }
  } catch (error) {
    console.warn(`SEO Service error for ${lang}:`, error);
  }
  
  // Fallback to default data if service fails
  const fallbackData: SeoData = {
    lang,
    title: lang === 'fr-FR' 
      ? 'MEMOPYK – Films et albums souvenirs uniques à partir de vos photos et vidéos'
      : 'MEMOPYK – Unique memory films & albums from your photos and videos',
    description: lang === 'fr-FR'
      ? 'MEMOPYK transforme vos photos et vidéos en films et albums souvenirs uniques. Un service entièrement humain, créatif et inspirant.'
      : 'MEMOPYK turns your photos and videos into unique memory films and albums. A fully human, creative, and inspiring service.',
    canonical: `https://memopyk.com/${lang}`,
    robotsIndex: true,
    robotsFollow: true,
    robotsNoArchive: false,
    robotsNoSnippet: false,
    hreflang: [
      { lang: 'fr-FR', href: 'https://memopyk.com/fr-FR' },
      { lang: 'en-US', href: 'https://memopyk.com/en-US' },
      { lang: 'x-default', href: 'https://memopyk.com/en-US' }
    ],
    openGraph: {
      title: lang === 'fr-FR' 
        ? 'MEMOPYK – Films et albums souvenirs uniques'
        : 'MEMOPYK – Unique memory films & albums',
      description: lang === 'fr-FR'
        ? 'MEMOPYK transforme vos photos et vidéos en films et albums souvenirs uniques. Un service entièrement humain, créatif et inspirant.'
        : 'MEMOPYK turns your photos and videos into unique memory films and albums. A fully human, creative, and inspiring service.',
      type: 'website',
      url: `https://memopyk.com/${lang}`,
      image: lang === 'fr-FR' 
        ? 'https://memopyk.com/images/fr-home-1200x630.jpg'
        : 'https://memopyk.com/images/en-home-1200x630.jpg'
    },
    twitter: {
      card: 'summary_large_image',
      title: lang === 'fr-FR' 
        ? 'MEMOPYK – Films et albums souvenirs uniques'
        : 'MEMOPYK – Unique memory films & albums',
      description: lang === 'fr-FR'
        ? 'MEMOPYK transforme vos photos et vidéos en films et albums souvenirs uniques. Un service entièrement humain, créatif et inspirant.'
        : 'MEMOPYK turns your photos and videos into unique memory films and albums. A fully human, creative, and inspiring service.',
      image: lang === 'fr-FR' 
        ? 'https://memopyk.com/images/fr-home-1200x630.jpg'
        : 'https://memopyk.com/images/en-home-1200x630.jpg'
    }
  };
  
  // Cache fallback data temporarily
  seoCache.set(cacheKey, {
    data: fallbackData,
    timestamp: Date.now()
  });
  
  return fallbackData;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate SEO tags HTML
 */
function generateSeoTags(seoData: SeoData, currentUrl: string): string {
  const tags: string[] = [];
  
  // Basic SEO tags
  if (seoData.title) {
    tags.push(`<title>${escapeHtml(seoData.title)}</title>`);
  }
  if (seoData.description) {
    tags.push(`<meta name="description" content="${escapeHtml(seoData.description)}" />`);
  }
  if (seoData.keywords) {
    tags.push(`<meta name="keywords" content="${escapeHtml(seoData.keywords)}" />`);
  }
  if (seoData.canonical) {
    tags.push(`<link rel="canonical" href="${escapeHtml(seoData.canonical)}" />`);
  }

  // Robots meta
  const robotsContent = [];
  if (seoData.robotsIndex) robotsContent.push('index'); else robotsContent.push('noindex');
  if (seoData.robotsFollow) robotsContent.push('follow'); else robotsContent.push('nofollow');
  if (seoData.robotsNoArchive) robotsContent.push('noarchive');
  if (seoData.robotsNoSnippet) robotsContent.push('nosnippet');
  tags.push(`<meta name="robots" content="${robotsContent.join(', ')}" />`);

  // Hreflang
  if (seoData.hreflang) {
    seoData.hreflang.forEach(item => {
      tags.push(`<link rel="alternate" hreflang="${escapeHtml(item.lang)}" href="${escapeHtml(item.href)}" />`);
    });
  }

  // Open Graph
  if (seoData.openGraph) {
    // Add site name
    tags.push(`<meta property="og:site_name" content="MEMOPYK" />`);
    if (seoData.openGraph.title) {
      tags.push(`<meta property="og:title" content="${escapeHtml(seoData.openGraph.title)}" />`);
    }
    if (seoData.openGraph.description) {
      tags.push(`<meta property="og:description" content="${escapeHtml(seoData.openGraph.description)}" />`);
    }
    if (seoData.openGraph.image) {
      tags.push(`<meta property="og:image" content="${escapeHtml(seoData.openGraph.image)}" />`);
    }
    if (seoData.openGraph.type) {
      tags.push(`<meta property="og:type" content="${escapeHtml(seoData.openGraph.type)}" />`);
    }
    if (seoData.openGraph.url) {
      tags.push(`<meta property="og:url" content="${escapeHtml(seoData.openGraph.url)}" />`);
    }
  }

  // Twitter Card
  if (seoData.twitter) {
    if (seoData.twitter.card) {
      tags.push(`<meta name="twitter:card" content="${escapeHtml(seoData.twitter.card)}" />`);
    }
    if (seoData.twitter.title) {
      tags.push(`<meta name="twitter:title" content="${escapeHtml(seoData.twitter.title)}" />`);
    }
    if (seoData.twitter.description) {
      tags.push(`<meta name="twitter:description" content="${escapeHtml(seoData.twitter.description)}" />`);
    }
    if (seoData.twitter.image) {
      tags.push(`<meta name="twitter:image" content="${escapeHtml(seoData.twitter.image)}" />`);
    }
  }

  // JSON-LD structured data
  if (seoData.jsonLd) {
    try {
      JSON.parse(seoData.jsonLd); // Validate JSON
      tags.push(`<script type="application/ld+json">${seoData.jsonLd}</script>`);
    } catch (error) {
      console.warn('Invalid JSON-LD, skipping:', error);
    }
  }

  // Extra meta tags
  if (seoData.extras) {
    seoData.extras.forEach(extra => {
      tags.push(`<meta name="${escapeHtml(extra.name)}" content="${escapeHtml(extra.content)}" />`);
    });
  }

  return tags.join('\n    '); // Indent for proper HTML formatting
}

/**
 * Parse HTML tag attributes and preserve them while setting lang
 */
function preserveHtmlAttributes(htmlTag: string, newLang: string): string {
  // Extract existing attributes from HTML tag
  const match = htmlTag.match(/<html([^>]*)>/i);
  if (!match) {
    return `<html lang="${newLang}">`;
  }
  
  const existingAttrs = match[1];
  const attributes = new Map<string, string>();
  
  // Parse existing attributes
  const attrRegex = /\s*([a-zA-Z-]+)(?:\s*=\s*["']([^"']*?)["'])?/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(existingAttrs)) !== null) {
    const [, name, value = ''] = attrMatch;
    if (name && name.toLowerCase() !== 'lang') {
      attributes.set(name, value);
    }
  }
  
  // Add/update lang attribute
  attributes.set('lang', newLang);
  
  // Reconstruct HTML tag with preserved attributes
  const attrString = Array.from(attributes.entries())
    .map(([name, value]) => value ? `${name}="${value}"` : name)
    .join(' ');
    
  return `<html ${attrString}>`;
}

/**
 * Remove existing SEO meta tags to prevent duplicates
 */
function removeExistingSeoTags(html: string): string {
  let modifiedHtml = html;
  
  // Remove existing title tag (ensure only one)
  modifiedHtml = modifiedHtml.replace(/<title[^>]*>.*?<\/title>/gi, '');
  
  // Remove existing meta description
  modifiedHtml = modifiedHtml.replace(/<meta\s+name=['"]description['"][^>]*>/gi, '');
  
  // Remove existing meta keywords
  modifiedHtml = modifiedHtml.replace(/<meta\s+name=['"]keywords['"][^>]*>/gi, '');
  
  // Remove existing meta robots
  modifiedHtml = modifiedHtml.replace(/<meta\s+name=['"]robots['"][^>]*>/gi, '');
  
  // Remove existing canonical link
  modifiedHtml = modifiedHtml.replace(/<link\s+rel=['"]canonical['"][^>]*>/gi, '');
  
  // Remove existing hreflang links
  modifiedHtml = modifiedHtml.replace(/<link\s+rel=['"]alternate['"][^>]*hreflang[^>]*>/gi, '');
  
  // Remove existing Open Graph tags
  modifiedHtml = modifiedHtml.replace(/<meta\s+property=['"]og:[^'"]*['"][^>]*>/gi, '');
  
  // Remove existing Twitter Card tags
  modifiedHtml = modifiedHtml.replace(/<meta\s+name=['"]twitter:[^'"]*['"][^>]*>/gi, '');
  
  // Remove existing JSON-LD structured data (be careful with this one)
  modifiedHtml = modifiedHtml.replace(/<script\s+type=['"]application\/ld\+json['"][^>]*>[\s\S]*?<\/script>/gi, '');
  
  return modifiedHtml;
}

/**
 * Inject SEO tags into HTML
 */
function injectSeoTags(html: string, seoData: SeoData, currentUrl: string): string {
  const locale = seoData.lang;
  const htmlLang = locale === 'fr-FR' ? 'fr' : 'en';
  
  // Generate SEO tags
  const seoTags = generateSeoTags(seoData, currentUrl);
  
  let modifiedHtml = html;
  
  // 1. Preserve HTML attributes while setting lang
  modifiedHtml = modifiedHtml.replace(
    /<html[^>]*>/i,
    (match) => preserveHtmlAttributes(match, htmlLang)
  );
  
  // 2. Remove existing SEO tags to prevent duplicates
  modifiedHtml = removeExistingSeoTags(modifiedHtml);
  
  // 3. Inject SEO tags in head (before </head> or after <head>)
  const headEndRegex = /<\/head>/i;
  const headStartRegex = /<head[^>]*>/i;
  
  if (headEndRegex.test(modifiedHtml)) {
    // Insert before closing head tag
    modifiedHtml = modifiedHtml.replace(
      headEndRegex,
      `    ${seoTags}\n  </head>`
    );
  } else if (headStartRegex.test(modifiedHtml)) {
    // Insert after opening head tag
    modifiedHtml = modifiedHtml.replace(
      headStartRegex,
      `<head>\n    ${seoTags}`
    );
  } else {
    console.warn('Could not find head tag to inject SEO tags');
  }
  
  return modifiedHtml;
}

/**
 * Development SEO handler - processes HTML and injects SEO tags
 * This function is called by the proxy onProxyRes handler
 */
export const processSeoForDev = async (originalUrl: string, htmlContent: string): Promise<string> => {
  try {
    const locale = detectLocale(originalUrl);
    const seoData = await getCachedSeoData(locale);
    
    return injectSeoTags(htmlContent, seoData, originalUrl);
  } catch (error) {
    console.error('Dev SEO processing error:', error);
    return htmlContent; // Return original content on error
  }
};

/**
 * Check if content is HTML that needs SEO processing
 */
export const isHtmlResponse = (contentType: string | undefined): boolean => {
  return !!(contentType && contentType.includes('text/html'));
};

/**
 * SEO middleware for production mode (serves modified index.html)
 */
export const prodSeoMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (!shouldProcessSEO(req)) {
    return next();
  }

  try {
    const locale = detectLocale(req.originalUrl);
    const seoData = await getCachedSeoData(locale);
    
    // Read the static index.html file
    const clientDist = path.resolve(process.cwd(), "dist");
    const indexPath = path.join(clientDist, "index.html");
    
    if (!fs.existsSync(indexPath)) {
      console.warn('index.html not found at', indexPath);
      return next();
    }
    
    const html = fs.readFileSync(indexPath, 'utf-8');
    const modifiedHtml = injectSeoTags(html, seoData, req.originalUrl);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(modifiedHtml);
    
  } catch (error) {
    console.error('Production SEO injection error:', error);
    next(); // Fall back to default behavior
  }
};