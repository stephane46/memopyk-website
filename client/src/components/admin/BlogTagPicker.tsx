import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, X, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface BlogTag {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface BlogTagPickerProps {
  selectedTags: BlogTag[];
  onTagsChange: (tags: BlogTag[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export function BlogTagPicker({ 
  selectedTags, 
  onTagsChange,
  placeholder = "Select tags...",
  maxTags
}: BlogTagPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { toast } = useToast();

  // Fetch tags with autocomplete
  const { data: tagsData } = useQuery({
    queryKey: ['/api/admin/blog/tags', searchValue],
    queryFn: async () => {
      const params = searchValue ? `?suggest=${encodeURIComponent(searchValue)}` : '';
      const res = await fetch(`/api/admin/blog/tags${params}`);
      if (!res.ok) throw new Error('Failed to fetch tags');
      return res.json();
    },
    staleTime: 30000
  });

  const tags: BlogTag[] = tagsData?.data || [];

  // Create new tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('/api/admin/blog/tags', 'POST', { 
        name,
        color: generateColor(name)
      });
      return await response.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/blog/tags'] });
      
      if (result.data) {
        onTagsChange([...selectedTags, result.data]);
        toast({
          title: '✅ Tag Created',
          description: `"${result.data.name}" has been added`
        });
      }
      
      setSearchValue('');
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Creation Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Generate color based on tag name (consistent hashing)
  function generateColor(name: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#ABEBC6',
      '#FAD7A0', '#D7BDE2'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // Toggle tag selection
  function toggleTag(tag: BlogTag) {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    
    if (isSelected) {
      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      if (maxTags && selectedTags.length >= maxTags) {
        toast({
          title: '⚠️ Maximum Reached',
          description: `You can only select up to ${maxTags} tags`,
          variant: 'destructive'
        });
        return;
      }
      onTagsChange([...selectedTags, tag]);
    }
  }

  // Remove tag from selection
  function removeTag(tagId: string) {
    onTagsChange(selectedTags.filter(t => t.id !== tagId));
  }

  // Handle creating new tag
  function handleCreateNew() {
    const trimmedName = searchValue.trim();
    
    if (!trimmedName) {
      toast({
        title: '⚠️ Invalid Name',
        description: 'Tag name cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    // Check if already exists
    const exists = tags.some(t => t.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      toast({
        title: '⚠️ Already Exists',
        description: `Tag "${trimmedName}" already exists`,
        variant: 'destructive'
      });
      return;
    }

    createTagMutation.mutate(trimmedName);
  }

  return (
    <div className="space-y-2">
      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
          {selectedTags.map(tag => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.color || '#6B7280' }}
              className="text-white pl-2 pr-1 py-1 flex items-center gap-1"
              data-testid={`selected-tag-${tag.slug}`}
            >
              <span className="text-sm font-medium">{tag.name}</span>
              <button
                onClick={() => removeTag(tag.id)}
                className="ml-1 hover:bg-black/20 rounded-full p-0.5 transition"
                data-testid={`remove-tag-${tag.slug}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Tag Picker Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            data-testid="button-open-tag-picker"
          >
            <span className="flex items-center gap-2 text-gray-500">
              <Tag className="h-4 w-4" />
              {placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search or create tag..." 
              value={searchValue}
              onValueChange={setSearchValue}
              data-testid="input-search-tags"
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-gray-500 mb-3">No tags found</p>
                  {searchValue.trim() && (
                    <Button
                      size="sm"
                      onClick={handleCreateNew}
                      disabled={createTagMutation.isPending}
                      className="bg-[#D67C4A] hover:bg-[#D67C4A]/90"
                      data-testid="button-create-new-tag"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create "{searchValue.trim()}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              
              <CommandGroup>
                {/* Create new option (always shown if search has value) */}
                {searchValue.trim() && !tags.some(t => t.name.toLowerCase() === searchValue.trim().toLowerCase()) && (
                  <CommandItem
                    onSelect={handleCreateNew}
                    className="border-b border-gray-200 dark:border-gray-700"
                    data-testid="option-create-new-tag"
                  >
                    <Plus className="h-4 w-4 mr-2 text-[#D67C4A]" />
                    <span className="font-medium text-[#D67C4A]">
                      Create "{searchValue.trim()}"
                    </span>
                  </CommandItem>
                )}

                {/* Existing tags */}
                {tags.map(tag => {
                  const isSelected = selectedTags.some(t => t.id === tag.id);
                  
                  return (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => toggleTag(tag)}
                      data-testid={`option-tag-${tag.slug}`}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color || '#6B7280' }}
                        />
                        <span className="font-medium">{tag.name}</span>
                        {(tag.usageCount ?? 0) > 0 && (
                          <span className="text-xs text-gray-400 ml-auto">
                            {tag.usageCount} {tag.usageCount === 1 ? 'post' : 'posts'}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
