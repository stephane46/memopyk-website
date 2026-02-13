import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link, useParams } from 'wouter';
import { Helmet } from 'react-helmet-async';
import PostBlocks from '@/components/blog/PostBlocks';
import NewsletterSignup from '@/components/blog/NewsletterSignup';
import TagCloud from '@/components/blog/TagCloud';
import GalleryComponent from '@/components/blog/GalleryComponent';
import FeaturedPostsSection from '@/components/blog/FeaturedPostsSection';
import { RelatedPosts } from '@/components/RelatedPosts';
import { DEFAULT_OG, DEFAULT_OG_FR } from '@/constants/seo';
import { Calendar, Clock, User, Share2, Twitter, Facebook, Linkedin, Link as LinkIcon, Star, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollTracker, trackShare } from '@/utils/analytics';

interface Author {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  avatar?: string;
  bio?: string;
  email?: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  description?: string;
  content: string;
  language: string;
  author?: Author;
  status: string;
  publish_date: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  canonical_url?: string;
  og_image_url?: string;
  og_description?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  reading_time_minutes?: number;
  is_featured?: boolean;
  featured_order?: number;
  hero_caption?: string;
  read_time_minutes?: number;
  comments_enabled?: boolean;
  disqus_thread_id?: string;
  tags?: Tag[];
}

export default function BlogPostPage() {
  const [location, setLocation] = useLocation();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const hasLanguagePrefix = location.startsWith('/fr-FR/') || location.startsWith('/en-US/');
  const urlLanguageCode = location.includes('/fr-FR') ? 'fr-FR' : 'en-US';
  const [readingProgress, setReadingProgress] = useState(0);
  const scrollTrackerRef = useRef<ScrollTracker | null>(null);

  // Scroll to top when blog post changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const { data: post, isLoading } = useQuery<Post | null>({
    queryKey: ['/api/blog/post', slug, urlLanguageCode],
    queryFn: async () => {
      // Try with the URL's language first
      const response = await fetch(`/api/blog/posts/${slug}?language=${urlLanguageCode}`);
      if (response.ok) {
        const data = await response.json();
        if (data && !data.error) return data;
      }

      // If not found, retry without language filter (post may be in another language)
      if (response.status === 404) {
        const fallbackResponse = await fetch(`/api/blog/posts/${slug}`);
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          if (data && !data.error) return data;
        }
      }

      return null;
    }
  });

  // Redirect to correct language-prefixed URL if post language doesn't match URL
  useEffect(() => {
    if (post && post.language && post.language !== urlLanguageCode) {
      const langPrefix = post.language === 'fr-FR' ? '/fr-FR' : '/en-US';
      setLocation(`${langPrefix}/blog/${post.slug}`, { replace: true });
    }
  }, [post, urlLanguageCode, setLocation]);

  // Derive language from post data (when available) or URL prefix
  const languageCode = (post?.language as 'fr-FR' | 'en-US') || urlLanguageCode;
  const language = languageCode === 'fr-FR' ? 'fr' : 'en';

  // Track blog post view for analytics (exclude admin and development)
  useEffect(() => {
    if (!post || !slug) return;
    
    // Don't track if in admin mode
    const isAdmin = window.location.pathname.includes('/admin');
    if (isAdmin) return;
    
    // Don't track if in development/preview environment
    const isDevelopment = window.location.hostname.includes('replit.dev') || 
                         window.location.hostname.includes('localhost') ||
                         window.location.hostname === '127.0.0.1';
    if (isDevelopment) {
      console.log('📊 Blog view tracking skipped: development environment');
      return;
    }
    
    // Get or create session ID
    let baseSessionId = localStorage.getItem('memopyk-base-session-id');
    if (!baseSessionId) {
      baseSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('memopyk-base-session-id', baseSessionId);
    }
    
    let tabId = sessionStorage.getItem('memopyk-tab-id');
    if (!tabId) {
      tabId = Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('memopyk-tab-id', tabId);
    }
    
    const sessionId = `${baseSessionId}_${tabId}`;
    
    // Track view
    fetch('/api/analytics/blog/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post_slug: slug,
        post_title: post.title,
        language: languageCode,
        session_id: sessionId
      })
    }).catch(err => console.warn('Blog view tracking failed:', err));
  }, [post, slug, languageCode]);

  // Reading progress tracker + GA4 scroll engagement tracking
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const trackLength = documentHeight - windowHeight;
      const progress = (scrollTop / trackLength) * 100;
      setReadingProgress(Math.min(Math.max(progress, 0), 100));
    };

    window.addEventListener('scroll', handleScroll);
    
    // Initialize GA4 scroll engagement tracking
    if (post) {
      const pageName = `Blog: ${post.title}`;
      scrollTrackerRef.current = new ScrollTracker(pageName);
      scrollTrackerRef.current.init();
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Clean up scroll tracker
      if (scrollTrackerRef.current) {
        scrollTrackerRef.current.destroy();
        scrollTrackerRef.current = null;
      }
    };
  }, [post]);


  const t = {
    'fr-FR': {
      backToBlog: 'Retour au blog',
      notFound: 'Article non trouvé',
      notFoundDescription: 'L\'article que vous recherchez n\'existe pas ou a été supprimé.',
      readingTime: 'min de lecture',
      by: 'Par',
      share: 'Partager',
      copyLink: 'Copier le lien',
      linkCopied: 'Lien copié !',
    },
    'en-US': {
      backToBlog: 'Back to blog',
      notFound: 'Article not found',
      notFoundDescription: 'The article you are looking for does not exist or has been removed.',
      readingTime: 'min read',
      by: 'By',
      share: 'Share',
      copyLink: 'Copy link',
      linkCopied: 'Link copied!',
    }
  }[languageCode];

  const blogRoute = language === 'fr' ? '/fr-FR/blog' : '/en-US/blog';

  const getAuthorName = (author?: Author) => {
    if (!author) return null;
    if (author.name) return author.name;
    if (author.first_name && author.last_name) {
      return `${author.first_name} ${author.last_name}`;
    }
    return author.first_name || author.last_name || null;
  };

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const title = post?.title || '';
    const pageName = `Blog: ${title}`;
    
    // Track share event to GA4
    trackShare(platform, url, pageName);
    
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
    };
    
    if (platform === 'copy') {
      await navigator.clipboard.writeText(url);
      alert(t.linkCopied);
    } else if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F2EBDC] to-white">
        <div className="h-2 bg-gray-200 sticky top-0 z-50">
          <div className="h-full bg-[#D67C4A]" style={{ width: '0%' }}></div>
        </div>
        <div className="relative h-96 bg-gray-300 animate-pulse"></div>
        <div className="container mx-auto px-4 max-w-4xl -mt-20 relative z-10">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 animate-pulse">
            <div className="h-12 bg-gray-300 rounded mb-6 max-w-2xl"></div>
            <div className="h-6 bg-gray-300 rounded mb-8 max-w-xs"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <>
        <Helmet>
          <title>{t.notFound} | MEMOPYK</title>
        </Helmet>
        <div className="min-h-screen bg-gradient-to-b from-[#F2EBDC] to-white">
          <header className="bg-gradient-to-br from-[#2A4759] via-[#2A4759] to-[#1a2d38] text-white py-6">
            <div className="container mx-auto px-4">
              <Link href={blogRoute} data-testid="link-back-to-blog">
                <span className="inline-flex items-center text-[#D67C4A] hover:text-[#F2EBDC] transition-colors cursor-pointer font-medium group">
                  <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t.backToBlog}
                </span>
              </Link>
            </div>
          </header>
          <main className="container mx-auto px-4 py-20 text-center">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-12">
              <svg className="w-24 h-24 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h1 className="text-4xl font-['Playfair_Display'] text-[#2A4759] mb-4 font-semibold" data-testid="text-not-found-title">
                {t.notFound}
              </h1>
              <p className="text-gray-600 text-lg" data-testid="text-not-found-description">{t.notFoundDescription}</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  const defaultOg = languageCode === 'fr-FR' ? DEFAULT_OG_FR : DEFAULT_OG;
  
  const seoTitle = post.meta_title || post.title;
  const seoDescription = post.meta_description || post.description || post.excerpt || "";
  const seoKeywords = post.meta_keywords;
  
  function resolveHero(raw?: string | null, _width?: number) {
    if (!raw) return null;
    if (raw.includes('REPLACE') || raw.startsWith('[')) return null;
    // Images are now stored as full Supabase Storage URLs or external URLs
    return raw;
  }

  const heroUrl =
    resolveHero(post.featured_image_url) ??
    resolveHero(post.og_image_url) ??
    defaultOg.url;

  const heroSrcSet = post.featured_image_url || post.og_image_url
    ? [640, 828, 1200, 1920]
        .map(w => `${resolveHero(post.featured_image_url || post.og_image_url, w)} ${w}w`)
        .join(', ')
    : undefined;

  const ogUrl =
    resolveHero(post.og_image_url) ??
    resolveHero(post.featured_image_url) ??
    defaultOg.url;

  return (
    <>
      <Helmet>
        <title>{seoTitle} | MEMOPYK</title>
        <meta name="description" content={seoDescription} />
        {seoKeywords && <meta name="keywords" content={seoKeywords} />}
        {post.canonical_url && <link rel="canonical" href={post.canonical_url} />}
        
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={post.og_description || seoDescription} />
        <meta property="og:image" content={ogUrl} />
        <meta property="og:image:width" content={String(defaultOg.width)} />
        <meta property="og:image:height" content={String(defaultOg.height)} />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.publish_date} />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={post.og_description || seoDescription} />
        <meta name="twitter:image" content={ogUrl} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#F2EBDC] to-white">
        {/* Reading Progress Bar */}
        <div className="h-2 bg-gray-200 sticky top-0 z-50">
          <div 
            className="h-full bg-gradient-to-r from-[#D67C4A] to-[#89BAD9] transition-all duration-150"
            style={{ width: `${readingProgress}%` }}
          ></div>
        </div>

        {/* Hero Section with Overlay */}
        {heroUrl && (
          <div className="relative h-96 md:h-[32rem] overflow-hidden bg-[#2A4759]">
            <img
              src={heroUrl}
              srcSet={heroSrcSet}
              sizes="100vw"
              alt={post.featured_image_alt || post.title}
              loading="eager"
              decoding="async"
              className="w-full h-full object-contain"
              data-testid="img-post-hero"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            
            {/* Back Button Overlay */}
            <div className="absolute top-6 left-0 right-0 z-10">
              <div className="container mx-auto px-4">
                <Link href={blogRoute} data-testid="link-back-to-blog">
                  <span className="inline-flex items-center text-white hover:text-[#D67C4A] transition-colors cursor-pointer font-medium group bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
                    <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    {t.backToBlog}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Article Container with Overlap */}
        <article className="container mx-auto px-4 max-w-4xl -mt-20 md:-mt-32 relative z-10 pb-20">
          {/* Main Content Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Article Header */}
            <header className="px-6 md:px-8 pt-6 md:pt-8 pb-4 md:pb-6 border-b border-gray-100">
              <h1
                className="text-4xl md:text-5xl lg:text-6xl font-['Playfair_Display'] text-[#2A4759] mb-4 leading-tight"
                data-testid="text-post-title"
              >
                {post.title}
              </h1>
              
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D67C4A]" />
                  <time dateTime={post.publish_date} data-testid="text-post-date" className="text-sm">
                    {new Date(post.publish_date).toLocaleDateString(
                      languageCode === 'fr-FR' ? 'fr-FR' : 'en-US',
                      { year: 'numeric', month: 'long', day: 'numeric' }
                    )}
                  </time>
                </div>
                {(post.reading_time_minutes || post.read_time_minutes) && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#D67C4A]" />
                      <span data-testid="text-reading-time" className="text-sm">
                        {post.reading_time_minutes || post.read_time_minutes} {t.readingTime}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Tags Section */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4" data-testid="post-tags">
                  {post.tags.map((tag) => (
                    <Link key={tag.id} href={`/${languageCode}/blog?tag=${tag.slug}&language=${languageCode}`}>
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:shadow-md transition-all border-2"
                        style={{ 
                          borderColor: tag.color || '#D67C4A',
                          color: tag.color || '#D67C4A'
                        }}
                        data-testid={`tag-badge-${tag.slug}`}
                      >
                        {tag.icon && <Hash className="h-3 w-3 mr-1" />}
                        {tag.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}

              {/* Hero Caption */}
              {post.hero_caption && (
                <p className="text-lg text-gray-600 italic border-l-4 border-[#D67C4A] pl-4 mb-4" data-testid="text-hero-caption">
                  {post.hero_caption}
                </p>
              )}
            </header>

            {/* Article Content */}
            <div className="px-6 md:px-8 pt-3 md:pt-4 pb-6 md:pb-8" data-testid="post-content">
              {/* Simple CMS: Render content field directly */}
              <div>
                <PostBlocks content={typeof post.content === 'string' ? post.content : ''} />
              </div>

              {/* Share Buttons */}
              <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-gray-100">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  {t.share}:
                </span>
                <button
                  onClick={() => handleShare('twitter')}
                  className="p-2 rounded-full hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                  aria-label="Share on Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="p-2 rounded-full hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors"
                  aria-label="Share on Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="p-2 rounded-full hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                  aria-label="Share on LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="p-2 rounded-full hover:bg-green-50 text-gray-600 hover:text-[#25D366] transition-colors"
                  aria-label="Share on WhatsApp"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleShare('copy')}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600 hover:text-[#D67C4A] transition-colors"
                  aria-label={t.copyLink}
                >
                  <LinkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Galleries Section */}
            <div className="px-6 md:px-8 pb-6" data-testid="post-galleries">
              <GalleryComponent slug={slug} language={languageCode} />
            </div>

            {/* Newsletter Signup */}
            <div className="px-6 md:px-8 pb-6 md:pb-8">
              <NewsletterSignup language={languageCode} />
            </div>
          </div>

          {/* Related Posts Section */}
          <div className="mt-12">
            <RelatedPosts currentPostSlug={post.slug} language={languageCode} blogRoute={blogRoute} />
          </div>

          {/* Featured Posts CTA */}
          <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-['Playfair_Display'] font-bold text-[#2A4759] mb-6 text-center">
              {languageCode === 'fr-FR' ? 'Articles en vedette' : 'Featured Articles'}
            </h3>
            <FeaturedPostsSection language={languageCode} limit={3} autoPlay={true} autoPlayInterval={6000} excludeSlug={post.slug} />
          </div>

          {/* Back to Blog CTA */}
          <div className="mt-12 text-center">
            <Link href={blogRoute}>
              <span className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#2A4759] to-[#1a2d38] text-white rounded-full hover:shadow-xl transition-all cursor-pointer group font-semibold">
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t.backToBlog}
              </span>
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}
