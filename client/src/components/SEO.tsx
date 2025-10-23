import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest } from '../lib/queryClient';

interface SEOProps {
  page?: string;
}

export function SEO({ page = 'homepage' }: SEOProps) {
  const { language } = useLanguage();
  
  // Fetch SEO settings from admin panel - using the correct API endpoint
  const { data: seoData } = useQuery({
    queryKey: ['/api/seo'],
    queryFn: () => apiRequest('/api/seo', 'GET'),
  });

  // Find the settings for the current page
  const seoSettings = Array.isArray(seoData) ? 
    seoData.find((item: any) => item.page === page) : 
    null;

  // If no data is available, don't render anything yet (loading state)
  if (!seoData) {
    return null;
  }

  const isEnglish = language === 'en-US';
  const langCode = isEnglish ? 'En' : 'Fr';
  
  // Default fallback values
  const defaultTitle = isEnglish ? 
    'MEMOPYK – Unique memory films & albums from your photos and videos' :
    'MEMOPYK – Films & albums souvenirs à partir de vos photos et vidéos';
  const defaultDescription = isEnglish ?
    'MEMOPYK turns your photos and videos into unique souvenir films and albums. A fully human, creative, and inspiring service.' :
    'MEMOPYK transforme vos photos et vidéos en albums et films souvenirs uniques. Un service 100 % humain, créatif et inspirant.';
  
  // Get content based on language from the actual API response
  const title = seoSettings?.[`metaTitle${langCode}`] || defaultTitle;
  const description = seoSettings?.[`metaDescription${langCode}`] || defaultDescription;
  const keywords = seoSettings?.[`metaKeywords${langCode}`] || '';
  const ogTitle = seoSettings?.[`ogTitle${langCode}`] || title;
  const ogDescription = seoSettings?.[`ogDescription${langCode}`] || description;
  const ogImage = seoSettings?.ogImageUrl || 'https://memopyk.com/logo.svg';
  const ogType = seoSettings?.ogType || 'website';
  const twitterCard = seoSettings?.twitterCard || 'summary_large_image';
  const twitterTitle = seoSettings?.[`twitterTitle${langCode}`] || title;
  const twitterDescription = seoSettings?.[`twitterDescription${langCode}`] || description;
  const twitterImage = seoSettings?.twitterImageUrl || ogImage;
  const canonicalUrl = seoSettings?.canonicalUrl || `https://memopyk.com/${language}`;
  
  // Robots meta
  const robotsContent = [];
  if (seoSettings?.robotsIndex !== false) robotsContent.push('index');
  else robotsContent.push('noindex');
  if (seoSettings?.robotsFollow !== false) robotsContent.push('follow');
  else robotsContent.push('nofollow');
  if (seoSettings?.robotsNoArchive) robotsContent.push('noarchive');
  if (seoSettings?.robotsNoSnippet) robotsContent.push('nosnippet');

  // Structured data
  const structuredData = seoSettings?.structuredData || seoSettings?.jsonLd || {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "MEMOPYK",
    "url": "https://memopyk.com",
    "logo": "https://memopyk.com/logo.svg",
    "description": description,
    "sameAs": []
  };

  return (
    <Helmet>
      {/* Basic SEO */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={robotsContent.join(', ')} />

      {/* Hreflang */}
      <link rel="alternate" hrefLang="fr-FR" href="https://memopyk.com/fr-FR" />
      <link rel="alternate" hrefLang="en-US" href="https://memopyk.com/en-US" />
      <link rel="alternate" hrefLang="x-default" href="https://memopyk.com/en-US" />

      {/* Open Graph */}
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={canonicalUrl} />
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
      {seoSettings?.customMetaTags && 
        Object.entries(seoSettings.customMetaTags).map(([key, value]) => (
          <meta key={key} name={key} content={String(value)} />
        ))
      }
    </Helmet>
  );
}