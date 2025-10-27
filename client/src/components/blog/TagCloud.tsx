import { useQuery } from '@tanstack/react-query';
import { Tag, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag as TagType, ApiResponse } from '@/types/blog';
import { Link } from 'wouter';

interface TagCloudProps {
  limit?: number;
  language?: string;
  onTagClick?: (tag: TagType) => void;
  className?: string;
  view?: 'cloud' | 'list' | 'grid';
}

export default function TagCloud({
  limit = 20,
  language = 'en-US',
  onTagClick,
  className = '',
  view = 'cloud'
}: TagCloudProps) {
  const { data, isLoading, error } = useQuery<ApiResponse<TagType>>({
    queryKey: ['/api/blog/tags', language, limit],
    queryFn: async () => {
      const response = await fetch(`/api/blog/tags?language=${language}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    }
  });

  const handleTagClick = (e: React.MouseEvent, tag: TagType) => {
    if (onTagClick) {
      e.preventDefault();
      onTagClick(tag);
    }
  };

  if (error) {
    return (
      <div 
        className={`text-center py-8 ${className}`}
        data-testid="tag-cloud-error"
      >
        <p className="text-red-600">
          {language === 'fr-FR' 
            ? 'Erreur lors du chargement des tags' 
            : 'Failed to load tags'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`} data-testid="tag-cloud-loading">
        {view === 'cloud' && (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
        )}
        {view === 'list' && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {view === 'grid' && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )}
      </div>
    );
  }

  const tags = data?.data || [];

  if (tags.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`} data-testid="tag-cloud-empty">
        {language === 'fr-FR' 
          ? 'Aucun tag disponible' 
          : 'No tags available'}
      </div>
    );
  }

  // Calculate font sizes for cloud view based on post count
  const maxCount = Math.max(...tags.map(t => t.post_count || 0));
  const minCount = Math.min(...tags.map(t => t.post_count || 0));
  
  const getTagSize = (count: number = 0) => {
    if (maxCount === minCount) return 'text-base';
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio > 0.75) return 'text-xl font-semibold';
    if (ratio > 0.5) return 'text-lg font-medium';
    if (ratio > 0.25) return 'text-base';
    return 'text-sm';
  };

  // Cloud View
  if (view === 'cloud') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`} data-testid="tag-cloud-view">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/${language}/blog?tag=${tag.slug}&language=${language}`}
            onClick={(e) => handleTagClick(e, tag)}
            data-testid={`tag-cloud-item-${tag.slug}`}
          >
            <Badge
              variant="outline"
              className={`
                ${getTagSize(tag.post_count)}
                cursor-pointer hover:shadow-md transition-all duration-200
                border-2 hover:scale-105
                bg-white hover:bg-gray-50
              `}
              style={{
                borderColor: tag.color || '#D67C4A',
                color: tag.color || '#D67C4A'
              }}
            >
              {tag.icon && <Hash className="h-3 w-3 mr-1" />}
              {tag.name}
              {tag.post_count !== undefined && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({tag.post_count})
                </span>
              )}
            </Badge>
          </Link>
        ))}
      </div>
    );
  }

  // List View
  if (view === 'list') {
    return (
      <div className={`space-y-2 ${className}`} data-testid="tag-list-view">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/${language}/blog?tag=${tag.slug}&language=${language}`}
            onClick={(e) => handleTagClick(e, tag)}
            data-testid={`tag-list-item-${tag.slug}`}
          >
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer group">
              <div className="flex items-center gap-2">
                {tag.icon ? (
                  <Tag 
                    className="h-4 w-4" 
                    style={{ color: tag.color || '#D67C4A' }}
                  />
                ) : (
                  <Hash 
                    className="h-4 w-4"
                    style={{ color: tag.color || '#D67C4A' }}
                  />
                )}
                <span 
                  className="font-medium group-hover:underline"
                  style={{ color: tag.color || '#2A4759' }}
                >
                  {tag.name}
                </span>
              </div>
              <Badge 
                variant="secondary"
                className="bg-gray-100 text-gray-700"
              >
                {tag.post_count || 0}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  // Grid View
  if (view === 'grid') {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${className}`} data-testid="tag-grid-view">
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/${language}/blog?tag=${tag.slug}&language=${language}`}
            onClick={(e) => handleTagClick(e, tag)}
            data-testid={`tag-grid-item-${tag.slug}`}
          >
            <div 
              className="p-4 rounded-lg border-2 hover:shadow-md transition-all cursor-pointer group text-center"
              style={{ borderColor: tag.color || '#D67C4A' }}
            >
              {tag.icon ? (
                <Tag 
                  className="h-6 w-6 mx-auto mb-2" 
                  style={{ color: tag.color || '#D67C4A' }}
                />
              ) : (
                <Hash 
                  className="h-6 w-6 mx-auto mb-2"
                  style={{ color: tag.color || '#D67C4A' }}
                />
              )}
              <div 
                className="font-semibold text-sm mb-1 group-hover:underline"
                style={{ color: tag.color || '#2A4759' }}
              >
                {tag.name}
              </div>
              <div className="text-xs text-gray-500">
                {tag.post_count || 0} {language === 'fr-FR' ? 'articles' : 'posts'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  return null;
}
