import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, X, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ImageLabel } from '@shared/schema';

interface ImageLabelPickerProps {
  selectedLabels: ImageLabel[];
  onLabelsChange: (labels: ImageLabel[]) => void;
  placeholder?: string;
  maxLabels?: number;
}

export function ImageLabelPicker({ 
  selectedLabels, 
  onLabelsChange,
  placeholder = "Select labels...",
  maxLabels
}: ImageLabelPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Find the dialog container to prevent portal conflicts
  const [dialogContainer, setDialogContainer] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    // Look for parent dialog/modal container
    const dialogElement = containerRef.current?.closest('[role="dialog"]') as HTMLElement;
    setDialogContainer(dialogElement || document.body);
  }, []);

  // Fetch all labels
  const { data: labelsData } = useQuery({
    queryKey: ['/api/image-labels'],
    queryFn: async () => {
      const res = await fetch('/api/image-labels');
      if (!res.ok) throw new Error('Failed to fetch labels');
      return res.json();
    },
    staleTime: 30000
  });

  const allLabels: ImageLabel[] = labelsData?.data || [];
  
  // Client-side filtering for instant search
  const labels = searchValue.trim()
    ? allLabels.filter(label => 
        label.name.toLowerCase().includes(searchValue.trim().toLowerCase())
      )
    : allLabels;

  // Create new label mutation
  const createLabelMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('/api/image-labels', 'POST', { name });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create label');
      }
      return await response.json();
    },
    onSuccess: (result: any) => {
      // Invalidate ALL label queries to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/image-labels'] });
      
      if (result.data) {
        // Add the new label to selected labels
        onLabelsChange([...selectedLabels, result.data]);
        
        // Clear search and close popover to show the selected badge
        setSearchValue('');
        setOpen(false);
        
        toast({
          title: '✅ Label Created',
          description: `"${result.data.name}" has been added to your selection`
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: '❌ Creation Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Toggle label selection
  function toggleLabel(label: ImageLabel) {
    const isSelected = selectedLabels.some(l => l.id === label.id);
    
    if (isSelected) {
      onLabelsChange(selectedLabels.filter(l => l.id !== label.id));
    } else {
      if (maxLabels && selectedLabels.length >= maxLabels) {
        toast({
          title: '⚠️ Maximum Reached',
          description: `You can only select up to ${maxLabels} labels`,
          variant: 'destructive'
        });
        return;
      }
      onLabelsChange([...selectedLabels, label]);
    }
  }

  // Remove label from selection
  function removeLabel(labelId: string) {
    onLabelsChange(selectedLabels.filter(l => l.id !== labelId));
  }

  // Handle creating new label
  function handleCreateNew() {
    // Prevent double submission
    if (createLabelMutation.isPending) {
      return;
    }
    
    const trimmedName = searchValue.trim();
    
    if (!trimmedName) {
      toast({
        title: '⚠️ Invalid Name',
        description: 'Label name cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    // Check if already exists
    const exists = labels.some(l => l.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      toast({
        title: '⚠️ Already Exists',
        description: `Label "${trimmedName}" already exists`,
        variant: 'destructive'
      });
      return;
    }

    createLabelMutation.mutate(trimmedName);
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Selected Labels Display */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map(label => (
            <span
              key={label.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm"
              data-testid={`selected-label-${label.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <span>{label.name}</span>
              <button
                onClick={() => removeLabel(label.id)}
                className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                data-testid={`remove-label-${label.name.toLowerCase().replace(/\s+/g, '-')}`}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Label Picker Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            data-testid="button-open-label-picker"
          >
            <span className="flex items-center gap-2 text-gray-500">
              <Tag className="h-4 w-4" />
              {placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start" container={dialogContainer}>
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search or create label..." 
              value={searchValue}
              onValueChange={setSearchValue}
              data-testid="input-search-labels"
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-gray-500 mb-3">No labels found</p>
                  {searchValue.trim() && (
                    <Button
                      size="sm"
                      onClick={handleCreateNew}
                      disabled={createLabelMutation.isPending}
                      className="bg-[#D67C4A] hover:bg-[#D67C4A]/90"
                      data-testid="button-create-new-label"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create "{searchValue.trim()}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              
              <CommandGroup>
                {/* Create new option (always shown if search has value) */}
                {searchValue.trim() && !labels.some(l => l.name.toLowerCase() === searchValue.trim().toLowerCase()) && !createLabelMutation.isPending && (
                  <CommandItem
                    onSelect={handleCreateNew}
                    className="border-b border-gray-200 dark:border-gray-700"
                    data-testid="option-create-new-label"
                  >
                    <Plus className="h-4 w-4 mr-2 text-[#D67C4A]" />
                    <span className="font-medium text-[#D67C4A]">
                      Create "{searchValue.trim()}"
                    </span>
                  </CommandItem>
                )}

                {/* Existing labels */}
                {labels.map(label => {
                  const isSelected = selectedLabels.some(l => l.id === label.id);
                  
                  return (
                    <CommandItem
                      key={label.id}
                      value={label.name}
                      onSelect={() => toggleLabel(label)}
                      data-testid={`option-label-${label.name.toLowerCase().replace(/\s+/g, '-')}`}
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
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="font-medium">{label.name}</span>
                        {(label.usageCount ?? 0) > 0 && (
                          <span className="text-xs text-gray-400 ml-auto">
                            {label.usageCount} {label.usageCount === 1 ? 'image' : 'images'}
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
