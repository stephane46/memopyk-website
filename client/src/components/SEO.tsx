import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest } from '../lib/queryClient';

interface SEOProps {
  page?: string;
}

interface SeoData {
  lang: 'fr-FR' | 'en-US';
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  robotsNoArchive?: boolean;
  robotsNoSnippet?: boolean;
  jsonLd?: string | object;
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  hreflang?: Array<{
    lang: string;
    href: string;
  }>;
  extras?: Array<{
    name: string;
    content: string;
  }>;
}

export function SEO({ page = 'homepage' }: SEOProps) {
  const { language } = useLanguage();
  
  // Fetch SEO configuration using the new seo-config endpoint with language parameter
  const { data: seoData } = useQuery<SeoData>({
    queryKey: ['/api/seo-config', language],
    queryFn: async () => {
      const response = await apiRequest(`/api/seo-config?lang=${language}`, 'GET');
      return response as unknown as SeoData;
    },
  });

  // If no data is available, don't render anything yet (loading state)
  if (!seoData) {
    return null;
  }

  // Default fallback values
  const defaultTitle = language === 'en-US' ? 
    'MEMOPYK – Unique memory films & albums from your photos and videos' :
    'MEMOPYK – Films & albums souvenirs à partir de vos photos et vidéos';
  const defaultDescription = language === 'en-US' ?
    'MEMOPYK turns your photos and videos into unique souvenir films and albums. A fully human, creative, and inspiring service.' :
    'MEMOPYK transforme vos photos et vidéos en albums et films souvenirs uniques. Un service 100 % humain, créatif et inspirant.';
  
  // Get content from the SeoService response (already language-specific)
  const title = seoData.title || defaultTitle;
  const description = seoData.description || defaultDescription;
  const keywords = seoData.keywords || '';
  const ogTitle = seoData.openGraph?.title || title;
  const ogDescription = seoData.openGraph?.description || description;
  const ogImage = seoData.openGraph?.image || 'https://memopyk.com/logo.svg';
  const ogType = seoData.openGraph?.type || 'website';
  const ogUrl = seoData.openGraph?.url || `https://memopyk.com/${language}`;
  const twitterCard = seoData.twitter?.card || 'summary_large_image';
  const twitterTitle = seoData.twitter?.title || title;
  const twitterDescription = seoData.twitter?.description || description;
  const twitterImage = seoData.twitter?.image || ogImage;
  const canonicalUrl = seoData.canonical || `https://memopyk.com/${language}`;
  
  // Robots meta
  const robotsContent = [];
  if (seoData.robotsIndex !== false) robotsContent.push('index');
  else robotsContent.push('noindex');
  if (seoData.robotsFollow !== false) robotsContent.push('follow');
  else robotsContent.push('nofollow');
  if (seoData.robotsNoArchive) robotsContent.push('noarchive');
  if (seoData.robotsNoSnippet) robotsContent.push('nosnippet');

  // Structured data - parse if it's a string
  let structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MEMOPYK",
    "url": "https://memopyk.com",
    "logo": "https://memopyk.com/logo.svg",
    "description": description,
    "sameAs": []
  };
  
  if (seoData.jsonLd) {
    try {
      structuredData = typeof seoData.jsonLd === 'string' 
        ? JSON.parse(seoData.jsonLd) 
        : seoData.jsonLd;
    } catch (e) {
      console.warn('Failed to parse structured data:', e);
    }
  }
  
  // Get hreflang links
  const hreflangLinks = seoData.hreflang || [
    { lang: 'fr-FR', href: 'https://memopyk.com/fr-FR' },
    { lang: 'en-US', href: 'https://memopyk.com/en-US' },
    { lang: 'x-default', href: 'https://memopyk.com/en-US' }
  ];

  return (
    <Helmet>
      {/* Basic SEO */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={robotsContent.join(', ')} />

      {/* Hreflang */}
      {hreflangLinks.map((link) => (
        <link key={link.lang} rel="alternate" hrefLang={link.lang} href={link.href} />
      ))}

      {/* Open Graph */}
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="MEMOPYK" />
      <meta property="og:image" content={ogImage} />

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={twitterDescription} />
      <meta name="twitter:image" content={twitterImage} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}

      {/* Custom Meta Tags */}
      {seoData.extras && seoData.extras.map((extra) => (
        <meta key={extra.name} name={extra.name} content={extra.content} />
      ))}
    </Helmet>
  );
}