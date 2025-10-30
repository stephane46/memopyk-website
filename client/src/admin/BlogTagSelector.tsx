import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Tag } from 'lucide-react';

type BlogTag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

interface BlogTagSelectorProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  label?: string;
}

export function BlogTagSelector({ selectedTagIds, onTagsChange, label = "Tags" }: BlogTagSelectorProps) {
  const { data: tagsData, isLoading } = useQuery({
    queryKey: ['/api/admin/blog/tags'],
    queryFn: async () => {
      const response = await fetch('/api/admin/blog/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    }
  });

  const tags: BlogTag[] = tagsData?.data || [];

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading tags...</span>
        </div>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <p className="text-sm text-gray-500">No tags available. Create tags in the Tag Management tab first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`transition-opacity ${isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
              data-testid={`tag-${tag.id}`}
            >
              <Badge
                style={{ backgroundColor: tag.color || '#D67C4A' }}
                className={`text-white cursor-pointer ${isSelected ? 'ring-2 ring-offset-2 ring-gray-900' : ''}`}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag.name}
              </Badge>
            </button>
          );
        })}
      </div>
      {selectedTagIds.length > 0 && (
        <p className="text-sm text-gray-600">
          {selectedTagIds.length} {selectedTagIds.length === 1 ? 'tag' : 'tags'} selected
        </p>
      )}
    </div>
  );
}
