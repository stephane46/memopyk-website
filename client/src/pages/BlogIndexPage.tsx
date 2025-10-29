import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { DEFAULT_OG, DEFAULT_OG_FR } from '@/constants/seo';
import { Calendar, Clock, User } from 'lucide-react';

interface Author {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  avatar?: string;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  description?: string;
  excerpt?: string;
  language: string;
  author?: Author;
  status: string;
  publish_date: string;
  meta_title?: string;
  meta_description?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  reading_time_minutes?: number;
}

export default function BlogIndexPage() {
  const [location] = useLocation();
  const languageCode = location.includes('/fr-FR') ? 'fr-FR' : 'en-US';
  const language = languageCode === 'fr-FR' ? 'fr' : 'en';

  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ['/api/blog/posts', languageCode],
    queryFn: async () => {
      const response = await fetch(`/api/blog/posts?language=${languageCode}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      const result = await response.json();
      
      // Extract posts array from API response
      const posts = result.data || [];
      
      // Client-side guard: filter out any posts that don't match the expected language
      return posts.filter((post: Post) => {
        if (post.language !== languageCode) {
          console.warn(`⚠️ Filtered out post with mismatched language: ${post.slug} (expected ${languageCode}, got ${post.language})`);
          return false;
        }
        return true;
      });
    }
  });

  const t = {
    'fr-FR': {
      title: 'Blog MEMOPYK',
      subtitle: 'Inspirations, conseils et histoires',
      description: 'Découvrez nos derniers articles sur les films souvenirs et la préservation des mémoires',
      readMore: 'Lire l\'article',
      backHome: 'Retour à l\'accueil',
      noPosts: 'Aucun article disponible pour le moment',
      featuredArticle: 'Article à la une',
      latestArticles: 'Derniers articles',
      minRead: 'min de lecture',
      by: 'Par'
    },
    'en-US': {
      title: 'MEMOPYK Blog',
      subtitle: 'Inspiration, Tips & Stories',
      description: 'Discover our latest articles about memory films and preserving your memories',
      readMore: 'Read article',
      backHome: 'Back to home',
      noPosts: 'No articles available at the moment',
      featuredArticle: 'Featured article',
      latestArticles: 'Latest articles',
      minRead: 'min read',
      by: 'By'
    }
  }[languageCode];

  const homeRoute = language === 'fr' ? '/fr-FR' : '/en-US';
  const blogRoute = language === 'fr' ? '/fr-FR/blog' : '/en-US/blog';
  const defaultOg = languageCode === 'fr-FR' ? DEFAULT_OG_FR : DEFAULT_OG;

  const featuredPost = posts && posts.length > 0 ? posts[0] : null;
  const regularPosts = posts && posts.length > 1 ? posts.slice(1) : [];

  const getAuthorName = (author?: Author) => {
    if (!author) return null;
    if (author.name) return author.name;
    if (author.first_name && author.last_name) {
      return `${author.first_name} ${author.last_name}`;
    }
    return author.first_name || author.last_name || null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      languageCode === 'fr-FR' ? 'fr-FR' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  return (
    <>
      <Helmet>
        <title>{t.title} | MEMOPYK</title>
        <meta name="description" content={t.description} />
        
        <meta property="og:title" content={`${t.title} | MEMOPYK`} />
        <meta property="og:description" content={t.description} />
        <meta property="og:image" content={defaultOg.url} />
        <meta property="og:image:width" content={String(defaultOg.width)} />
        <meta property="og:image:height" content={String(defaultOg.height)} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://memopyk.org${blogRoute}`} />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${t.title} | MEMOPYK`} />
        <meta name="twitter:description" content={t.description} />
        <meta name="twitter:image" content={defaultOg.url} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-[#F2EBDC] to-white">
        {/* Enhanced Hero Section */}
        <header className="relative bg-gradient-to-br from-[#2A4759] via-[#2A4759] to-[#1a2d38] text-white py-16 md:py-24 overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D67C4A] rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#89BAD9] rounded-full blur-3xl opacity-10 translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="container mx-auto px-4 relative z-10">
            <Link href={homeRoute} data-testid="link-home">
              <span className="inline-flex items-center text-[#D67C4A] hover:text-[#F2EBDC] transition-colors cursor-pointer font-medium group">
                <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t.backHome}
              </span>
            </Link>
            <div className="mt-8 max-w-3xl">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-['Playfair_Display'] font-bold leading-tight" data-testid="text-blog-title">
                {t.title}
              </h1>
              <p className="text-xl md:text-2xl text-[#89BAD9] mt-4 font-light" data-testid="text-blog-subtitle">
                {t.subtitle}
              </p>
              <p className="text-base md:text-lg text-gray-300 mt-3 leading-relaxed" data-testid="text-blog-description">
                {t.description}
              </p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 md:py-20">
          {isLoading ? (
            <div className="space-y-12">
              {/* Featured skeleton */}
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="h-96 bg-gray-300"></div>
                    <div className="p-8 flex flex-col justify-center">
                      <div className="h-10 bg-gray-300 rounded mb-4"></div>
                      <div className="h-6 bg-gray-300 rounded mb-2"></div>
                      <div className="h-6 bg-gray-300 rounded w-3/4 mb-6"></div>
                      <div className="h-4 bg-gray-300 rounded w-32"></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Regular posts skeleton */}
              <div>
                <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                      <div className="w-full h-64 bg-gray-300"></div>
                      <div className="p-6">
                        <div className="h-6 bg-gray-300 rounded mb-4"></div>
                        <div className="h-4 bg-gray-300 rounded mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="space-y-16">
              {/* Featured Post */}
              {featuredPost && (
                <section>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D67C4A] to-transparent"></div>
                    <h2 className="text-2xl font-['Playfair_Display'] text-[#2A4759] font-semibold">
                      {t.featuredArticle}
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#D67C4A] via-[#D67C4A] to-transparent"></div>
                  </div>
                  
                  <Link
                    href={`${blogRoute}/${featuredPost.slug}`}
                    data-testid={`card-blog-featured-${featuredPost.slug}`}
                  >
                    <article className="group bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1">
                      <div className="grid md:grid-cols-2 gap-0">
                        {featuredPost.featured_image_url && (
                          <div className="relative h-96 md:h-auto overflow-hidden">
                            <img
                              src={featuredPost.featured_image_url}
                              alt={featuredPost.featured_image_alt || featuredPost.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              data-testid={`img-blog-featured-${featuredPost.slug}`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                        )}
                        <div className="p-8 md:p-12 flex flex-col justify-center">
                          <h3
                            className="text-3xl md:text-4xl font-['Playfair_Display'] text-[#2A4759] mb-4 leading-tight group-hover:text-[#D67C4A] transition-colors"
                            data-testid={`text-blog-featured-title-${featuredPost.slug}`}
                          >
                            {featuredPost.title}
                          </h3>
                          <p className="text-gray-700 text-lg mb-6 leading-relaxed line-clamp-3" data-testid={`text-blog-featured-excerpt-${featuredPost.slug}`}>
                            {featuredPost.description || featuredPost.excerpt}
                          </p>
                          
                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
                            {getAuthorName(featuredPost.author) && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-[#D67C4A]" />
                                <span>{t.by} {getAuthorName(featuredPost.author)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#D67C4A]" />
                              <span data-testid={`text-blog-featured-date-${featuredPost.slug}`}>
                                {formatDate(featuredPost.publish_date)}
                              </span>
                            </div>
                            {featuredPost.reading_time_minutes && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#D67C4A]" />
                                <span>{featuredPost.reading_time_minutes} {t.minRead}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="inline-flex items-center text-[#D67C4A] font-semibold group-hover:gap-3 transition-all" data-testid={`link-read-more-featured-${featuredPost.slug}`}>
                            <span>{t.readMore}</span>
                            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                </section>
              )}

              {/* Regular Posts Grid */}
              {regularPosts.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#89BAD9] to-transparent"></div>
                    <h2 className="text-2xl font-['Playfair_Display'] text-[#2A4759] font-semibold">
                      {t.latestArticles}
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-[#89BAD9] via-[#89BAD9] to-transparent"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {regularPosts.map((post) => (
                      <Link
                        key={post.id}
                        href={`${blogRoute}/${post.slug}`}
                        data-testid={`card-blog-post-${post.slug}`}
                      >
                        <article className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer h-full flex flex-col transform hover:-translate-y-1">
                          {post.featured_image_url && (
                            <div className="relative h-56 overflow-hidden">
                              <img
                                src={post.featured_image_url}
                                alt={post.featured_image_alt || post.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                data-testid={`img-blog-featured-${post.slug}`}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                          )}
                          <div className="p-6 flex-1 flex flex-col">
                            <h3
                              className="text-xl font-['Playfair_Display'] text-[#2A4759] mb-3 leading-tight group-hover:text-[#D67C4A] transition-colors line-clamp-2"
                              data-testid={`text-blog-title-${post.slug}`}
                            >
                              {post.title}
                            </h3>
                            <p className="text-gray-600 mb-4 flex-1 line-clamp-3 text-sm leading-relaxed" data-testid={`text-blog-excerpt-${post.slug}`}>
                              {post.description || post.excerpt}
                            </p>
                            
                            {/* Metadata */}
                            <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-[#D67C4A]" />
                                  <span data-testid={`text-blog-date-${post.slug}`}>
                                    {formatDate(post.publish_date)}
                                  </span>
                                </div>
                                {post.reading_time_minutes && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-[#D67C4A]" />
                                    <span>{post.reading_time_minutes} {t.minRead}</span>
                                  </div>
                                )}
                              </div>
                              
                              {getAuthorName(post.author) && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <User className="w-3.5 h-3.5 text-[#D67C4A]" />
                                  <span>{t.by} {getAuthorName(post.author)}</span>
                                </div>
                              )}
                              
                              <div className="inline-flex items-center text-[#D67C4A] font-semibold text-sm group-hover:gap-2 transition-all" data-testid={`link-read-more-${post.slug}`}>
                                <span>{t.readMore}</span>
                                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="inline-block p-8 bg-white rounded-2xl shadow-lg">
                <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-2xl font-['Playfair_Display'] text-[#2A4759] font-semibold" data-testid="text-no-posts">
                  {t.noPosts}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
