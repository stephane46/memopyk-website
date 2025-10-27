import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BlogPost, ApiResponse } from '@/types/blog';
import { useLocation } from 'wouter';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  onResults?: (results: BlogPost[]) => void;
  language?: string;
  className?: string;
  placeholder?: string;
  autoNavigate?: boolean;
}

export default function SearchBar({
  onSearch,
  onResults,
  language = 'en-US',
  className = '',
  placeholder,
  autoNavigate = true
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const defaultPlaceholder = language === 'fr-FR' 
    ? 'Rechercher des articles...' 
    : 'Search posts...';

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/blog/posts/search?q=${encodeURIComponent(searchQuery)}&language=${language}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const result: ApiResponse<BlogPost> = await response.json();

      if (result.success) {
        onResults?.(result.data);
        onSearch?.(searchQuery);
      } else {
        throw new Error('Search returned no results');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(language === 'fr-FR' 
        ? 'Erreur lors de la recherche' 
        : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [language, onSearch, onResults]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (autoNavigate) {
      setLocation(`/${language}/blog/search?q=${encodeURIComponent(query)}&language=${language}`);
    } else {
      performSearch(query);
    }
  }, [query, autoNavigate, language, setLocation, performSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setError(null);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <form 
      onSubmit={handleSubmit}
      className={`relative flex items-center gap-2 ${className}`}
      data-testid="search-bar-form"
    >
      <div className="relative flex-1">
        <Search 
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          className="pl-10 pr-10"
          disabled={isLoading}
          data-testid="input-search"
          aria-label={language === 'fr-FR' ? 'Rechercher' : 'Search'}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="button-clear-search"
            aria-label={language === 'fr-FR' ? 'Effacer' : 'Clear'}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Button
        type="submit"
        disabled={!query.trim() || isLoading}
        data-testid="button-search"
        className="bg-[#D67C4A] hover:bg-[#D67C4A]/90"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {language === 'fr-FR' ? 'Recherche...' : 'Searching...'}
          </>
        ) : (
          <>
            <Search className="h-4 w-4 mr-2" />
            {language === 'fr-FR' ? 'Rechercher' : 'Search'}
          </>
        )}
      </Button>

      {error && (
        <div 
          className="absolute top-full mt-2 left-0 right-0 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md text-sm"
          role="alert"
          data-testid="text-search-error"
        >
          {error}
        </div>
      )}
    </form>
  );
}
