import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Clock, Tag, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BlogPost, ApiResponse } from '@/types/blog';

interface RelatedPostsSectionProps {
  slug: string;
  limit?: number;
  language?: string;
  className?: string;
}

export default function RelatedPostsSection({
  slug,
  limit = 5,
  language = 'en-US',
  className = ''
}: RelatedPostsSectionProps) {
  const { data, isLoading, error } = useQuery<ApiResponse<BlogPost>>({
    queryKey: ['/api/blog/posts', slug, 'related', language, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/blog/posts/${slug}/related?language=${language}&limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch related posts');
      return response.json();
    }
  });

  const relatedPosts = data?.data || [];

  if (error || relatedPosts.length === 0) {
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
        {relatedPosts.map((post) => (
          <Card 
            key={post.id} 
            className="group hover:shadow-xl transition-shadow duration-300"
            data-testid={`related-post-card-${post.slug}`}
          >
            {/* Thumbnail */}
            {post.image?.url && (
              <div className="relative overflow-hidden rounded-t-lg aspect-video">
                <Link href={`/${language}/blog/${post.slug}`}>
                  <img
                    src={post.image.url}
                    alt={post.title}
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
            )}

            <CardHeader>
              <CardTitle className="text-xl font-['Playfair_Display'] group-hover:text-[#D67C4A] transition-colors line-clamp-2">
                <Link href={`/${language}/blog/${post.slug}`}>
                  <span className="cursor-pointer">{post.title}</span>
                </Link>
              </CardTitle>
              
              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 pt-2">
                {post.read_time_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {post.read_time_minutes} min
                  </span>
                )}
                {post.tags && post.tags.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    {post.tags.slice(0, 2).map(t => t.name).join(', ')}
                  </span>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <CardDescription className="text-gray-700 line-clamp-3">
                {post.description}
              </CardDescription>
            </CardContent>

            <CardFooter>
              <Link href={`/${language}/blog/${post.slug}`}>
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
