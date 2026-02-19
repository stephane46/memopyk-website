import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/queryClient';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type TopicSuggestion = {
  id: string;
  title: string;
  category: string | null;
  status: string;
};

function formatStatus(status: string): string {
  switch (status) {
    case 'backlog': return 'Backlog';
    case 'planned': return 'Planned';
    case 'in_progress': return 'In Progress';
    case 'published': return 'Published';
    default: return status;
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'backlog': return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'planned': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'published': return 'bg-green-100 text-green-700 border-green-200';
    default: return '';
  }
}

interface TopicComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  'data-testid'?: string;
}

export function TopicCombobox({ value, onChange, placeholder = 'Link to a planned topic...', ...props }: TopicComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<string>('');

  // Fetch all topics when popover opens (topics are a small set, ~25-40)
  useEffect(() => {
    if (!open || topics.length > 0) return;

    const fetchTopics = async () => {
      setLoading(true);
      try {
        const res = await adminFetch('/api/admin/content/topics');
        if (res.ok) {
          const data = await res.json();
          setTopics(data || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchTopics();
  }, [open]);

  // Resolve initial selected title from value (topic ID)
  useEffect(() => {
    if (!value) {
      setSelectedTitle('');
      return;
    }
    // Try to find in already-loaded topics
    const found = topics.find(t => t.id === value);
    if (found) {
      setSelectedTitle(found.title);
      return;
    }
    // Fetch the specific topic to get its title
    const fetchTitle = async () => {
      try {
        const res = await adminFetch(`/api/admin/content/topics/${value}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedTitle(data.title || '');
        }
      } catch {
        // ignore
      }
    };
    fetchTitle();
  }, [value, topics]);

  // Client-side filter
  const filtered = search.trim()
    ? topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : topics;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="max-w-md justify-between font-normal"
            data-testid={props['data-testid']}
          >
            {selectedTitle ? (
              <span className="truncate">{selectedTitle}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[450px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search topics..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">Loading topics...</div>
              ) : filtered.length === 0 ? (
                <CommandEmpty>No topics found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filtered.map((topic) => (
                    <CommandItem
                      key={topic.id}
                      value={topic.id}
                      onSelect={() => {
                        onChange(topic.id);
                        setSelectedTitle(topic.title);
                        setOpen(false);
                        setSearch('');
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', value === topic.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="flex-1 truncate">{topic.title}</span>
                      {topic.category && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                          {topic.category}
                        </Badge>
                      )}
                      <Badge className={cn('ml-1 text-[10px] px-1.5 py-0 border', statusBadgeClass(topic.status))}>
                        {formatStatus(topic.status)}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setSelectedTitle('');
          }}
          className="text-gray-400 hover:text-red-500"
          title="Remove topic link"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
