import { useState, useEffect, useRef } from 'react';
import { adminFetch } from '@/lib/queryClient';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type KeywordSuggestion = {
  id: string;
  keyword: string;
  monthlySearches: number | null;
  cluster: string | null;
  market: string;
};

function formatVolume(vol: number | null): string {
  if (vol == null) return '—';
  if (vol >= 1000) return `${(vol / 1000).toFixed(vol >= 10000 ? 0 : 1)}K`;
  return vol.toString();
}

// ─── Single-select keyword combobox ───

interface KeywordComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'data-testid'?: string;
}

export function KeywordCombobox({ value, onChange, placeholder = 'Search keywords...', ...props }: KeywordComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '15' });
        if (search.trim()) params.set('search', search.trim());
        const res = await adminFetch(`/api/admin/content/keywords?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.keywords || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="max-w-md justify-between font-normal"
          data-testid={props['data-testid']}
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="py-4 text-center text-sm text-muted-foreground">Searching...</div>
            ) : suggestions.length === 0 && search.trim() ? (
              <CommandEmpty>
                No keywords found.
                <button
                  type="button"
                  className="block mx-auto mt-2 text-xs text-emerald-600 hover:underline"
                  onClick={() => {
                    onChange(search.trim());
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  Use "{search.trim()}" as custom keyword
                </button>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {suggestions.map((kw) => (
                  <CommandItem
                    key={kw.id}
                    value={kw.keyword}
                    onSelect={() => {
                      onChange(kw.keyword);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === kw.keyword ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate">{kw.keyword}</span>
                    <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                      {formatVolume(kw.monthlySearches)}/mo
                    </span>
                    {kw.cluster && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                        {kw.cluster}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Multi-select keyword combobox ───

interface MultiKeywordComboboxProps {
  values: string[];
  onChange: (values: string[]) => void;
  excludeKeyword?: string; // exclude the primary keyword from suggestions
  placeholder?: string;
  'data-testid'?: string;
}

export function MultiKeywordCombobox({ values, onChange, excludeKeyword, placeholder = 'Add keyword...', ...props }: MultiKeywordComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '15' });
        if (search.trim()) params.set('search', search.trim());
        const res = await adminFetch(`/api/admin/content/keywords?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.keywords || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, open]);

  const addKeyword = (kw: string) => {
    if (kw && !values.includes(kw)) {
      onChange([...values, kw]);
    }
    setSearch('');
  };

  const removeKeyword = (kw: string) => {
    onChange(values.filter(v => v !== kw));
  };

  // Filter out already-selected and the primary keyword
  const filtered = suggestions.filter(
    s => !values.includes(s.keyword) && s.keyword !== excludeKeyword
  );

  return (
    <div className="space-y-2">
      {/* Selected badges */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((kw) => (
            <Badge key={kw} variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300 px-2.5 py-0.5 text-xs font-medium">
              {kw}
              <button
                type="button"
                onClick={() => removeKeyword(kw)}
                className="ml-1.5 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Combobox */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="max-w-md justify-between font-normal"
            data-testid={props['data-testid']}
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="py-4 text-center text-sm text-muted-foreground">Searching...</div>
              ) : filtered.length === 0 && search.trim() ? (
                <CommandEmpty>
                  No keywords found.
                  <button
                    type="button"
                    className="block mx-auto mt-2 text-xs text-emerald-600 hover:underline"
                    onClick={() => {
                      addKeyword(search.trim());
                      setOpen(false);
                    }}
                  >
                    Add "{search.trim()}" as custom keyword
                  </button>
                </CommandEmpty>
              ) : (
                <CommandGroup>
                  {filtered.map((kw) => (
                    <CommandItem
                      key={kw.id}
                      value={kw.keyword}
                      onSelect={() => addKeyword(kw.keyword)}
                    >
                      <span className="flex-1 truncate">{kw.keyword}</span>
                      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                        {formatVolume(kw.monthlySearches)}/mo
                      </span>
                      {kw.cluster && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                          {kw.cluster}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
