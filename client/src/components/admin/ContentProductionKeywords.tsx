import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, Target, Filter, ArrowUpDown, ArrowUp, ArrowDown, FileText, Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentKeywordsSkeleton } from '@/admin/skeletons/ContentKeywordsSkeleton';
import { KeywordFormModal } from './KeywordFormModal';
import { KeywordDeleteDialog } from './KeywordDeleteDialog';
import { MultiSelectFilter, FilterOption } from './MultiSelectFilter';
import { adminFetch } from '@/lib/queryClient';
import { formatCluster } from '@/lib/utils';

interface ContentKeyword {
  id: string;
  keyword: string;
  monthly_searches: number;
  competition: string;
  intent: string;
  tier: number;
  market: string;
  difficulty_score?: number;
  seasonal?: boolean;
  seasonal_months?: string[];
  cluster?: string;
  created_at: string;
  updated_at: string;
}

interface KeywordsStats {
  totalKeywords: number;
  totalVolume: number;
  tier1Count: number;
  highIntentCount: number;
  byMarket: Record<string, number>;
  byTier: Record<string, number>;
  byIntent: Record<string, number>;
  byCluster: Record<string, number>;
  byVolume: Record<string, number>;
}

interface PaginatedResponse {
  keywords: ContentKeyword[];
  pagination: {
    page: number;
    limit: number;
    offset: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

type SortColumn = 'keyword' | 'tier' | 'monthly_searches' | 'competition' | 'intent';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 100;
const BACKGROUND_CHUNK_SIZE = 500;

export function ContentProductionKeywords() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set(['fr', 'en']));
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set(['1', '2', '3']));
  const [selectedIntents, setSelectedIntents] = useState<Set<string>>(new Set(['high', 'medium', 'low']));
  const [selectedVolumes, setSelectedVolumes] = useState<Set<string>>(new Set(['mega', 'high', 'medium', 'low', 'minimal']));
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  const [clustersInitialized, setClustersInitialized] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('monthly_searches');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Background loading state
  const [allKeywords, setAllKeywords] = useState<ContentKeyword[]>([]);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [backgroundProgress, setBackgroundProgress] = useState(0);
  const backgroundLoadingRef = useRef(false);

  // CRUD modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<ContentKeyword | null>(null);
  const [deletingKeyword, setDeletingKeyword] = useState<ContentKeyword | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch stats (cached on server)
  const { data: stats, isLoading: statsLoading } = useQuery<KeywordsStats>({
    queryKey: ['/api/admin/content/keywords/stats'],
  });

  // Initialize cluster selection from stats (all selected by default)
  useEffect(() => {
    if (stats?.byCluster && !clustersInitialized) {
      setSelectedClusters(new Set(Object.keys(stats.byCluster)));
      setClustersInitialized(true);
    }
  }, [stats, clustersInitialized]);

  // Build filter options from stats
  const marketOptions: FilterOption[] = useMemo(() => {
    if (!stats?.byMarket) return [];
    return [
      { value: 'fr', label: '🇫🇷 France', count: stats.byMarket.fr || 0 },
      { value: 'en', label: '🇺🇸 English', count: stats.byMarket.en || 0 },
    ];
  }, [stats?.byMarket]);

  const tierOptions: FilterOption[] = useMemo(() => {
    if (!stats?.byTier) return [];
    return [
      { value: '1', label: 'Tier 1', count: stats.byTier['1'] || 0 },
      { value: '2', label: 'Tier 2', count: stats.byTier['2'] || 0 },
      { value: '3', label: 'Tier 3', count: stats.byTier['3'] || 0 },
    ];
  }, [stats?.byTier]);

  const intentOptions: FilterOption[] = useMemo(() => {
    if (!stats?.byIntent) return [];
    return [
      { value: 'high', label: 'High', count: stats.byIntent.high || 0 },
      { value: 'medium', label: 'Medium', count: stats.byIntent.medium || 0 },
      { value: 'low', label: 'Low', count: stats.byIntent.low || 0 },
    ];
  }, [stats?.byIntent]);

  const volumeOptions: FilterOption[] = useMemo(() => {
    if (!stats?.byVolume) return [];
    return [
      { value: 'mega', label: '50,000+', count: stats.byVolume.mega || 0 },
      { value: 'high', label: '5,000 - 49,999', count: stats.byVolume.high || 0 },
      { value: 'medium', label: '500 - 4,999', count: stats.byVolume.medium || 0 },
      { value: 'low', label: '50 - 499', count: stats.byVolume.low || 0 },
      { value: 'minimal', label: '0 - 49', count: stats.byVolume.minimal || 0 },
    ];
  }, [stats?.byVolume]);

  const clusterOptions: FilterOption[] = useMemo(() => {
    if (!stats?.byCluster) return [];
    return Object.entries(stats.byCluster)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cluster, count]) => ({
        value: cluster,
        label: formatCluster(cluster),
        count,
      }));
  }, [stats?.byCluster]);

  // Detect whether a filter is "all selected" (no filtering needed)
  const allMarkets = marketOptions.length > 0 && selectedMarkets.size === marketOptions.length;
  const allTiers = tierOptions.length > 0 && selectedTiers.size === tierOptions.length;
  const allIntents = intentOptions.length > 0 && selectedIntents.size === intentOptions.length;
  const allVolumes = volumeOptions.length > 0 && selectedVolumes.size === volumeOptions.length;
  const allClusters = clusterOptions.length > 0 && selectedClusters.size === clusterOptions.length;

  // Build query params for paginated fetch
  const buildQueryParams = useCallback((page: number, limit: number, offset?: number) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (offset !== undefined) params.set('offset', String(offset));
    if (!allMarkets && selectedMarkets.size > 0) params.set('market', [...selectedMarkets].join(','));
    if (!allTiers && selectedTiers.size > 0) params.set('tier', [...selectedTiers].join(','));
    if (!allIntents && selectedIntents.size > 0) params.set('intent', [...selectedIntents].join(','));
    if (!allVolumes && selectedVolumes.size > 0) params.set('volume_range', [...selectedVolumes].join(','));
    if (!allClusters && selectedClusters.size > 0) params.set('cluster', [...selectedClusters].join(','));
    if (debouncedSearch) params.set('search', debouncedSearch);
    return params.toString();
  }, [selectedMarkets, selectedTiers, selectedIntents, selectedVolumes, selectedClusters, allMarkets, allTiers, allIntents, allVolumes, allClusters, debouncedSearch]);

  // Serialize filter sets for dependency tracking
  const marketKey = [...selectedMarkets].sort().join(',');
  const tierKey = [...selectedTiers].sort().join(',');
  const intentKey = [...selectedIntents].sort().join(',');
  const volumeKey = [...selectedVolumes].sort().join(',');
  const clusterKey = [...selectedClusters].sort().join(',');

  // Fetch initial page of keywords
  const { data: initialData, isLoading: initialLoading, refetch } = useQuery<PaginatedResponse>({
    queryKey: ['/api/admin/content/keywords', marketKey, tierKey, intentKey, volumeKey, clusterKey, debouncedSearch, currentPage],
    queryFn: async () => {
      const params = buildQueryParams(currentPage, PAGE_SIZE);
      const res = await adminFetch(`/api/admin/content/keywords?${params}`);
      if (!res.ok) throw new Error('Failed to fetch keywords');
      return res.json();
    },
    enabled: clustersInitialized,
  });

  // Background loading function
  const loadRemainingKeywords = useCallback(async () => {
    if (!initialData?.pagination || backgroundLoadingRef.current) return;

    const { total, hasMore } = initialData.pagination;
    if (!hasMore || total <= PAGE_SIZE) {
      setAllKeywords(initialData.keywords);
      return;
    }

    backgroundLoadingRef.current = true;
    setIsBackgroundLoading(true);
    setAllKeywords(initialData.keywords);

    let offset = PAGE_SIZE;
    const loadedKeywords = [...initialData.keywords];

    while (offset < total && backgroundLoadingRef.current) {
      try {
        const params = buildQueryParams(1, BACKGROUND_CHUNK_SIZE, offset);
        const res = await adminFetch(`/api/admin/content/keywords?${params}`);
        if (!res.ok) break;

        const data: PaginatedResponse = await res.json();
        loadedKeywords.push(...data.keywords);
        setAllKeywords([...loadedKeywords]);
        setBackgroundProgress(Math.min(100, Math.round((loadedKeywords.length / total) * 100)));

        offset += BACKGROUND_CHUNK_SIZE;
      } catch (error) {
        console.error('Background loading error:', error);
        break;
      }
    }

    setIsBackgroundLoading(false);
    backgroundLoadingRef.current = false;
  }, [initialData, buildQueryParams]);

  // Start background loading after initial data arrives
  useEffect(() => {
    if (initialData && !initialLoading) {
      // Reset background loading state when filters change
      backgroundLoadingRef.current = false;
      setBackgroundProgress(0);
      loadRemainingKeywords();
    }
  }, [initialData, initialLoading, loadRemainingKeywords]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [marketKey, tierKey, intentKey, volumeKey, clusterKey]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Use allKeywords if background loaded, otherwise use initial page
  const displayKeywords = allKeywords.length > 0 ? allKeywords : (initialData?.keywords || []);

  // Client-side sorting (server returns by monthly_searches desc)
  const sortedKeywords = [...displayKeywords].sort((a, b) => {
    let aValue: any = a[sortColumn];
    let bValue: any = b[sortColumn];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination for display
  const totalFromServer = initialData?.pagination?.total || displayKeywords.length;
  const loadedCount = sortedKeywords.length;
  const totalPages = Math.ceil(totalFromServer / PAGE_SIZE);
  const paginatedKeywords = sortedKeywords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showingStart = loadedCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingEnd = Math.min(currentPage * PAGE_SIZE, loadedCount);

  // Intent colors: High intent (ready to buy) = green, Medium = blue, Low = gray
  const getIntentColor = (intent: string) => {
    switch (intent?.toLowerCase()) {
      case 'high':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Tier colors: Tier 1 (best) = green, Tier 2 = blue, Tier 3 = yellow, Tier 4 = gray
  const getTierBadgeColor = (tier: number) => {
    switch (tier) {
      case 1:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 2:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 3:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 4:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (statsLoading || initialLoading) {
    return <ContentKeywordsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Keyword Research</h2>
        <p className="text-gray-600 dark:text-gray-400">SEO keyword strategy and targeting framework</p>
      </div>

      {/* Stats Overview - from cached /stats endpoint */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-600 dark:text-gray-400">Total Keywords</CardDescription>
            <CardTitle className="text-3xl text-gray-900 dark:text-white">
              {(stats?.totalKeywords || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-600 dark:text-gray-400">Total Monthly Searches</CardDescription>
            <CardTitle className="text-3xl text-gray-900 dark:text-white">
              {(stats?.totalVolume || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-600 dark:text-gray-400">Tier 1 Keywords</CardDescription>
            <CardTitle className="text-3xl text-orange-600 dark:text-orange-400">
              {(stats?.tier1Count || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-600 dark:text-gray-400">High Intent</CardDescription>
            <CardTitle className="text-3xl text-purple-600 dark:text-purple-400">
              {(stats?.highIntentCount || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters — order matches table columns: Keyword | Market | Tier | Searches/mo | Competition | Intent */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-[180px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                data-testid="input-keyword-search"
              />
            </div>
            <MultiSelectFilter
              label="Cluster"
              options={clusterOptions}
              selected={selectedClusters}
              onChange={setSelectedClusters}
              showSearch
            />
            <MultiSelectFilter
              label="Market"
              options={marketOptions}
              selected={selectedMarkets}
              onChange={setSelectedMarkets}
            />
            <MultiSelectFilter
              label="Tier"
              options={tierOptions}
              selected={selectedTiers}
              onChange={setSelectedTiers}
            />
            <MultiSelectFilter
              label="Searches"
              options={volumeOptions}
              selected={selectedVolumes}
              onChange={setSelectedVolumes}
            />
            <MultiSelectFilter
              label="Intent"
              options={intentOptions}
              selected={selectedIntents}
              onChange={setSelectedIntents}
            />
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Target className="h-5 w-5" />
                Keywords ({totalFromServer.toLocaleString()})
                {isBackgroundLoading && (
                  <span className="flex items-center gap-1 text-sm font-normal text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading... {backgroundProgress}%
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400 mt-1">
                SEO keywords organized by tier and search intent
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#D67C4A] hover:bg-[#C56B3A] text-white"
              data-testid="button-new-keyword"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Keyword
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3">
                    <button
                      onClick={() => handleSort('keyword')}
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      data-testid="sort-keyword"
                    >
                      Keyword
                      {sortColumn === 'keyword' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-30" />
                      )}
                    </button>
                  </th>
                  <th className="text-center p-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Market</span>
                  </th>
                  <th className="text-left p-3">
                    <button
                      onClick={() => handleSort('tier')}
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      data-testid="sort-tier"
                    >
                      Tier
                      {sortColumn === 'tier' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-30" />
                      )}
                    </button>
                  </th>
                  <th className="text-right p-3">
                    <button
                      onClick={() => handleSort('monthly_searches')}
                      className="flex items-center gap-1 ml-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      data-testid="sort-searches"
                    >
                      Searches/mo
                      {sortColumn === 'monthly_searches' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-30" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-3">
                    <button
                      onClick={() => handleSort('competition')}
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      data-testid="sort-competition"
                    >
                      Competition
                      {sortColumn === 'competition' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-30" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-3">
                    <button
                      onClick={() => handleSort('intent')}
                      className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      data-testid="sort-intent"
                    >
                      Intent
                      {sortColumn === 'intent' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-30" />
                      )}
                    </button>
                  </th>
                  <th className="text-center p-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedKeywords.map((keyword) => (
                  <tr
                    key={keyword.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    data-testid={`row-keyword-${keyword.id}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium text-gray-900 dark:text-white">{keyword.keyword}</span>
                          {keyword.cluster && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                              · {formatCluster(keyword.cluster)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span title={keyword.market === 'fr' ? 'France' : 'English'}>
                        {keyword.market === 'fr' ? '🇫🇷' : '🇺🇸'}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="custom"
                        className={getTierBadgeColor(keyword.tier)}
                        data-tier-badge={keyword.tier}
                      >
                        Tier {keyword.tier}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-gray-900 dark:text-white">
                      {keyword.monthly_searches?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">
                      {keyword.competition || '—'}
                    </td>
                    <td className="p-3">
                      <Badge variant="custom" className={getIntentColor(keyword.intent)}>
                        {keyword.intent}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingKeyword(keyword)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          title="Edit keyword"
                          data-testid={`button-edit-keyword-${keyword.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingKeyword(keyword)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          title="Delete keyword"
                          data-testid={`button-delete-keyword-${keyword.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const params = new URLSearchParams(window.location.search);
                            params.set('tab', 'topics');
                            params.set('search', keyword.keyword);
                            params.delete('highlight');
                            const newUrl = `${window.location.pathname}?${params.toString()}`;
                            window.location.href = newUrl;
                          }}
                          className="text-[#D67C4A] hover:text-[#D67C4A] hover:bg-orange-50"
                          title={`View topics using "${keyword.keyword}"`}
                          data-testid={`button-view-topics-${keyword.id}`}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {paginatedKeywords.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No keywords match your filters
              </div>
            )}
          </div>

          {/* Pagination Controls - show when total exceeds page size */}
          {totalFromServer > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {showingStart.toLocaleString()}-{showingEnd.toLocaleString()} of {totalFromServer.toLocaleString()}
                {isBackgroundLoading && <span className="ml-2 text-gray-400">(loading more...)</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || (currentPage * PAGE_SIZE >= loadedCount && isBackgroundLoading)}
                  title={isBackgroundLoading && currentPage * PAGE_SIZE >= loadedCount ? 'Loading more data...' : ''}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyword Create/Edit Modal */}
      <KeywordFormModal
        isOpen={isCreateModalOpen || editingKeyword !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingKeyword(null);
        }}
        keyword={editingKeyword}
      />

      {/* Keyword Delete Dialog */}
      {deletingKeyword && (
        <KeywordDeleteDialog
          isOpen={true}
          onClose={() => setDeletingKeyword(null)}
          keyword={deletingKeyword}
        />
      )}
    </div>
  );
}
