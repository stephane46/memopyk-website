import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  showSearch?: boolean;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  showSearch = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Working copy of selection (applied on OK, reverted on Cancel)
  const [draft, setDraft] = useState<Set<string>>(new Set(selected));

  const allValues = useMemo(() => new Set(options.map(o => o.value)), [options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  const allSelected = allValues.size > 0 && allValues.size === draft.size && [...allValues].every(v => draft.has(v));
  const noneSelected = draft.size === 0;
  const selectAllState: boolean | 'indeterminate' = allSelected ? true : noneSelected ? false : 'indeterminate';

  const handleSelectAll = () => {
    if (allSelected) {
      setDraft(new Set());
    } else {
      setDraft(new Set(allValues));
    }
  };

  const handleToggle = (value: string) => {
    const next = new Set(draft);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    setDraft(next);
  };

  const handleOk = () => {
    onChange(new Set(draft));
    setOpen(false);
    setSearchQuery('');
  };

  const handleCancel = () => {
    setDraft(new Set(selected));
    setOpen(false);
    setSearchQuery('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      // Sync draft with current selection when opening
      setDraft(new Set(selected));
      setSearchQuery('');
    }
    setOpen(nextOpen);
  };

  // Summary text for the trigger button
  const getSummary = () => {
    if (allSelected || selected.size === 0 && allValues.size === 0) return 'All';
    if (selected.size === 0) return 'None';
    if (selected.size === 1) {
      const opt = options.find(o => o.value === [...selected][0]);
      return opt?.label || '1 selected';
    }
    return `${selected.size} selected`;
  };

  const hasActiveFilter = !allSelected && selected.size > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`justify-between gap-1 min-w-[120px] ${
            hasActiveFilter
              ? 'border-[#D67C4A] bg-orange-50 dark:bg-orange-950 text-[#D67C4A]'
              : ''
          }`}
        >
          <span className="truncate text-left">
            {label}: {getSummary()}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex flex-col">
          {/* Search box */}
          {showSearch && (
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-7 text-sm"
                />
              </div>
            </div>
          )}

          {/* Select All */}
          <label className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
            <Checkbox
              checked={selectAllState}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">(Select All)</span>
          </label>

          {/* Options list */}
          <div className="max-h-[240px] overflow-y-auto">
            {filteredOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <Checkbox
                  checked={draft.has(option.value)}
                  onCheckedChange={() => handleToggle(option.value)}
                />
                <span className="text-sm flex-1 truncate">{option.label}</span>
                <span className="text-xs text-gray-400">
                  ({option.count.toLocaleString()})
                </span>
              </label>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400 text-center">
                No matches
              </div>
            )}
          </div>

          {/* OK / Cancel */}
          <div className="flex justify-end gap-2 p-2 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" size="sm" onClick={handleCancel} className="h-7 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleOk} className="h-7 text-xs bg-[#D67C4A] hover:bg-[#C56B3A] text-white">
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
