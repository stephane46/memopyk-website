import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  description?: string;
  excerpt?: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  publish_date: string;
  reading_time_minutes?: number;
}

interface RelatedPostsProps {
  currentPostSlug: string;
  language: 'en-US' | 'fr-FR';
  blogRoute: string;
}

export function RelatedPosts({ currentPostSlug, language, blogRoute }: RelatedPostsProps) {
  const { data: relatedPosts, isLoading } = useQuery<RelatedPost[]>({
    queryKey: ['/api/blog/posts', currentPostSlug, 'related'],
    queryFn: async () => {
      const response = await fetch(`/api/blog/posts/${currentPostSlug}/related`);
      if (!response.ok) throw new Error('Failed to fetch related posts');
      const result = await response.json();
      return result.data || [];
    }
  });

  const t = {
    'fr-FR': {
      title: 'Articles similaires',
      readMore: 'Lire l\'article',
      minRead: 'min de lecture',
      noRelated: 'Aucun article similaire pour le moment'
    },
    'en-US': {
      title: 'Related Articles',
      readMore: 'Read article',
      minRead: 'min read',
      noRelated: 'No related articles at the moment'
    }
  }[language];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'fr-FR' ? 'fr-FR' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  if (isLoading) {
    return (
      <div className="mt-16 py-12 border-t border-gray-200">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#D67C4A]" />
          <p className="text-gray-500">Loading related posts...</p>
        </div>
      </div>
    );
  }

  if (!relatedPosts || relatedPosts.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 py-12 border-t border-gray-200">
      <div className="mb-8">
        <h2 className="text-3xl font-['Playfair_Display'] text-[#2A4759] font-bold" data-testid="text-related-posts-title">
          {t.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedPosts.slice(0, 3).map((post) => (
          <Link
            key={post.id}
            href={`${blogRoute}/${post.slug}`}
            data-testid={`card-related-post-${post.slug}`}
          >
            <Card className="group h-full overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 bg-white">
              {post.featured_image_url && (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={post.featured_image_url}
                    alt={post.featured_image_alt || post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    data-testid={`img-related-post-${post.slug}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              )}
              <CardContent className="p-6">
                <h3
                  className="text-xl font-['Playfair_Display'] text-[#2A4759] mb-3 leading-tight group-hover:text-[#D67C4A] transition-colors line-clamp-2"
                  data-testid={`text-related-post-title-${post.slug}`}
                >
                  {post.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2" data-testid={`text-related-post-excerpt-${post.slug}`}>
                  {post.description || post.excerpt}
                </p>
                
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#D67C4A]" />
                    <span data-testid={`text-related-post-date-${post.slug}`}>
                      {formatDate(post.publish_date)}
                    </span>
                  </div>
                  {post.reading_time_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#D67C4A]" />
                      <span>{post.reading_time_minutes} {t.minRead}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
