import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Clock, Tag, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchRelatedPosts, assetUrl, PostCard } from '@/services/relatedPosts';

interface RelatedPostsSectionProps {
  slug: string;
  limit?: number;
  language?: string;
  className?: string;
}

export default function RelatedPostsSection({
  slug,
  limit = 3,
  language = 'en-US',
  className = ''
}: RelatedPostsSectionProps) {
  const { data: relatedPosts, isLoading, error } = useQuery<PostCard[]>({
    queryKey: ['/api/blog/related', slug, language, limit],
    queryFn: () => fetchRelatedPosts(slug, language, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // GA4 tracking for related post clicks
  const handleRelatedClick = (toSlug: string, position: number) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'related_click', {
        event_category: 'Blog',
        event_label: `${slug} -> ${toSlug}`,
        from_slug: slug,
        to_slug: toSlug,
        position: position,
        value: 5 // EUR value for related post click
      });
      console.log(`📊 Related post click tracked: ${slug} -> ${toSlug} (position ${position})`);
    }
  };

  if (error || !relatedPosts || relatedPosts.length === 0) {
    return null; // Don't show section if no related posts
  }

  if (isLoading) {
    return (
      <div className={`py-12 ${className}`} data-testid="related-posts-loading">
        <h2 className="text-3xl font-['Playfair_Display'] font-bold text-[#2A4759] mb-8">
          {language === 'fr-FR' ? 'Articles similaires' : 'Related Posts'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`py-12 border-t border-gray-200 ${className}`} data-testid="related-posts-section">
      <h2 className="text-3xl font-['Playfair_Display'] font-bold text-[#2A4759] mb-2">
        {language === 'fr-FR' ? 'Articles similaires' : 'Related Posts'}
      </h2>
      <p className="text-gray-600 mb-8">
        {language === 'fr-FR' 
          ? 'Découvrez d\'autres articles qui pourraient vous intéresser' 
          : 'Discover more articles you might enjoy'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedPosts.map((post, idx) => (
          <Card 
            key={post.id} 
            className="group hover:shadow-xl transition-shadow duration-300"
            data-testid={`related-post-card-${post.slug}`}
          >
            {/* Thumbnail */}
            <div className="relative overflow-hidden rounded-t-lg aspect-video bg-gray-100">
              <Link 
                href={`/${language}/blog/${post.slug}`}
                onClick={() => handleRelatedClick(post.slug, idx + 1)}
              >
                <img
                  src={assetUrl(post.image?.id)}
                  alt={post.hero_caption || post.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                  loading="lazy"
                />
              </Link>
              {post.matching_tags && post.matching_tags > 0 && (
                <Badge 
                  className="absolute top-3 right-3 bg-[#D67C4A] hover:bg-[#D67C4A]/90"
                  data-testid={`matching-tags-badge-${post.slug}`}
                >
                  {post.matching_tags} {language === 'fr-FR' ? 'tags communs' : 'matching tags'}
                </Badge>
              )}
            </div>

            <CardHeader>
              <CardTitle className="text-xl font-['Playfair_Display'] group-hover:text-[#D67C4A] transition-colors line-clamp-2">
                <Link 
                  href={`/${language}/blog/${post.slug}`}
                  onClick={() => handleRelatedClick(post.slug, idx + 1)}
                >
                  <span className="cursor-pointer">{post.title}</span>
                </Link>
              </CardTitle>
              
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 pt-2">
                {post.published_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(post.published_at).toLocaleDateString(
                      language === 'fr-FR' ? 'fr-FR' : 'en-US',
                      { year: 'numeric', month: 'short', day: 'numeric' }
                    )}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <CardDescription className="text-gray-700 line-clamp-3">
                {post.description || post.hero_caption}
              </CardDescription>
            </CardContent>

            <CardFooter>
              <Link 
                href={`/${language}/blog/${post.slug}`}
                onClick={() => handleRelatedClick(post.slug, idx + 1)}
              >
                <Button 
                  variant="ghost" 
                  className="text-[#D67C4A] hover:text-[#D67C4A]/90 p-0"
                  data-testid={`button-read-related-${post.slug}`}
                >
                  {language === 'fr-FR' ? 'Lire l\'article' : 'Read article'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
