import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, Target, ArrowUpDown, ArrowUp, ArrowDown, Tag, Plus, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ContentKeywordsSkeleton } from '@/admin/skeletons/ContentKeywordsSkeleton';
import { KeywordFormModal } from './KeywordFormModal';
import { KeywordDeleteDialog } from './KeywordDeleteDialog';
import { MultiSelectFilter, FilterOption } from './MultiSelectFilter';
import { adminFetch } from '@/lib/queryClient';
import { formatCluster } from '@/lib/utils';
import { VOLUME_RANGES } from '@shared/blogTypes';

interface ContentKeyword {
  id: string;
  keyword: string;
  monthlySearches: number;
  competition: string;
  intent: string;
  tier: number;
  market: string;
  difficultyScore?: number;
  seasonal?: boolean;
  seasonalMonths?: string[];
  cluster?: string;
  topicsCount?: number;
  postsCount?: number;
  createdAt: string;
  updatedAt: string;
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
  byCompetition: Record<string, number>;
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

type SortColumn = 'keyword' | 'market' | 'tier' | 'monthlySearches' | 'competition' | 'intent';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 100;
const BACKGROUND_CHUNK_SIZE = 500;

interface QuickFilterPreset {
  label: string;
  filters: {
    market?: string[];
    tier?: string[];
    intent?: string[];
    competition?: string[];
    volume?: string[];
  };
}

const QUICK_FILTERS: Record<string, QuickFilterPreset> = {
  quickWins: {
    label: 'Quick Wins',
    filters: { tier: ['1', '2'], competition: ['low'], volume: ['medium', 'high', 'mega'] },
  },
  trafficDrivers: {
    label: 'Traffic Drivers',
    filters: { tier: ['2'], volume: ['mega', 'high'] },
  },
  moneyKeywords: {
    label: 'Money Keywords',
    filters: { tier: ['1', '2'], intent: ['commercial', 'transactional'] },
  },
  francePriority: {
    label: 'France Priority',
    filters: { market: ['fr'], tier: ['1', '2'] },
  },
  blogIdeas: {
    label: 'Blog Ideas',
    filters: { tier: ['1', '2'], intent: ['informational'], competition: ['low', 'medium'] },
  },
};

export function ContentProductionKeywords() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(new Set(['fr', 'en']));
  const [selectedTiers, setSelectedTiers] = useState<Set<string>>(new Set(['1', '2', '3']));
  const [selectedIntents, setSelectedIntents] = useState<Set<string>>(new Set(['commercial', 'informational', 'transactional']));
  const [selectedCompetitions, setSelectedCompetitions] = useState<Set<string>>(new Set(['low', 'medium', 'high']));
  const [selectedVolumes, setSelectedVolumes] = useState<Set<string>>(new Set(['mega', 'high', 'medium', 'low', 'minimal']));
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  const [clustersInitialized, setClustersInitialized] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('monthlySearches');
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

  // Quick filter preset state
  const [activePreset, setActivePreset] = useState<string | null>(null);

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
      { value: 'commercial', label: 'Commercial', count: stats.byIntent.commercial || 0 },
      { value: 'informational', label: 'Informational', count: stats.byIntent.informational || 0 },
      { value: 'transactional', label: 'Transactional', count: stats.byIntent.transactional || 0 },
    ];
  }, [stats?.byIntent]);

  const volumeOptions: FilterOption[] = useMemo(() => {
    if (!stats?.byVolume) return [];
    return Object.entries(VOLUME_RANGES).map(([key, range]) => ({
      value: key,
      label: range.label,
      count: stats.byVolume[key] || 0,
    }));
  }, [stats?.byVolume]);

  const competitionOptions: FilterOption[] = useMemo(() => {
    if (!stats?.byCompetition) return [];
    return [
      { value: 'low', label: 'Low', count: stats.byCompetition.low || 0 },
      { value: 'medium', label: 'Medium', count: stats.byCompetition.medium || 0 },
      { value: 'high', label: 'High', count: stats.byCompetition.high || 0 },
    ];
  }, [stats?.byCompetition]);

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
  const allCompetitions = competitionOptions.length > 0 && selectedCompetitions.size === competitionOptions.length;
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
    if (!allCompetitions && selectedCompetitions.size > 0) params.set('competition', [...selectedCompetitions].join(','));
    if (!allVolumes && selectedVolumes.size > 0) params.set('volume_range', [...selectedVolumes].join(','));
    if (!allClusters && selectedClusters.size > 0) params.set('cluster', [...selectedClusters].join(','));
    if (debouncedSearch) params.set('search', debouncedSearch);
    return params.toString();
  }, [selectedMarkets, selectedTiers, selectedIntents, selectedCompetitions, selectedVolumes, selectedClusters, allMarkets, allTiers, allIntents, allCompetitions, allVolumes, allClusters, debouncedSearch]);

  // Serialize filter sets for dependency tracking
  const marketKey = [...selectedMarkets].sort().join(',');
  const tierKey = [...selectedTiers].sort().join(',');
  const intentKey = [...selectedIntents].sort().join(',');
  const competitionKey = [...selectedCompetitions].sort().join(',');
  const volumeKey = [...selectedVolumes].sort().join(',');
  const clusterKey = [...selectedClusters].sort().join(',');

  // Fetch initial page of keywords
  const { data: initialData, isLoading: initialLoading, refetch } = useQuery<PaginatedResponse>({
    queryKey: ['/api/admin/content/keywords', marketKey, tierKey, intentKey, competitionKey, volumeKey, clusterKey, debouncedSearch],
    queryFn: async () => {
      const params = buildQueryParams(1, PAGE_SIZE);
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
  }, [marketKey, tierKey, intentKey, competitionKey, volumeKey, clusterKey]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Use allKeywords if background loaded, otherwise use initial page
  const displayKeywords = allKeywords.length > 0 ? allKeywords : (initialData?.keywords || []);

  // Client-side sorting (server returns by monthly_searches desc)
  const sortedKeywords = useMemo(() => {
    return [...displayKeywords].sort((a, b) => {
      let aValue: any = (a as any)[sortColumn];
      let bValue: any = (b as any)[sortColumn];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;

      // Secondary sort by keyword name for stability
      const aKey = a.keyword.toLowerCase();
      const bKey = b.keyword.toLowerCase();
      if (aKey < bKey) return -1;
      if (aKey > bKey) return 1;
      return 0;
    });
  }, [displayKeywords, sortColumn, sortDirection]);

  // Pagination for display
  const totalFromServer = initialData?.pagination?.total || displayKeywords.length;
  const loadedCount = sortedKeywords.length;
  const totalPages = Math.ceil(totalFromServer / PAGE_SIZE);
  const paginatedKeywords = sortedKeywords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showingStart = loadedCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingEnd = Math.min(currentPage * PAGE_SIZE, totalFromServer);

  // Intent colors: commercial (ready to buy) = green, transactional = purple, informational = blue
  const getIntentColor = (intent: string) => {
    switch (intent?.toLowerCase()) {
      case 'commercial':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'transactional':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'informational':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
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

  // Competition colors: Low = easy = green, Medium = amber, High = hard = red
  const getCompetitionColor = (comp: string) => {
    switch (comp?.toLowerCase()) {
      case 'low':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-amber-600 dark:text-amber-400';
      case 'high':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  // Navigate to another tab with keyword filter
  const navigateToTab = (tab: string, keyword: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    params.set('search', keyword);
    params.delete('highlight');
    window.location.href = `${window.location.pathname}?${params.toString()}`;
  };

  // All values helpers for resetting
  const allMarketValues = useMemo(() => new Set(marketOptions.map(o => o.value)), [marketOptions]);
  const allTierValues = useMemo(() => new Set(tierOptions.map(o => o.value)), [tierOptions]);
  const allIntentValues = useMemo(() => new Set(intentOptions.map(o => o.value)), [intentOptions]);
  const allCompetitionValues = useMemo(() => new Set(competitionOptions.map(o => o.value)), [competitionOptions]);
  const allVolumeValues = useMemo(() => new Set(volumeOptions.map(o => o.value)), [volumeOptions]);
  const allClusterValues = useMemo(() => new Set(clusterOptions.map(o => o.value)), [clusterOptions]);

  const applyPreset = (key: string) => {
    if (activePreset === key) {
      clearFilters();
      return;
    }
    const preset = QUICK_FILTERS[key];
    if (!preset) return;
    const f = preset.filters;
    setSelectedMarkets(f.market ? new Set(f.market) : new Set(allMarketValues));
    setSelectedTiers(f.tier ? new Set(f.tier) : new Set(allTierValues));
    setSelectedIntents(f.intent ? new Set(f.intent) : new Set(allIntentValues));
    setSelectedCompetitions(f.competition ? new Set(f.competition) : new Set(allCompetitionValues));
    setSelectedVolumes(f.volume ? new Set(f.volume) : new Set(allVolumeValues));
    setSelectedClusters(new Set(allClusterValues));
    setSearchQuery('');
    setActivePreset(key);
  };

  const clearFilters = () => {
    setSelectedMarkets(new Set(allMarketValues));
    setSelectedTiers(new Set(allTierValues));
    setSelectedIntents(new Set(allIntentValues));
    setSelectedCompetitions(new Set(allCompetitionValues));
    setSelectedVolumes(new Set(allVolumeValues));
    setSelectedClusters(new Set(allClusterValues));
    setSearchQuery('');
    setActivePreset(null);
  };

  // Wrap filter onChange to clear active preset when user manually changes
  const withPresetClear = <T,>(setter: (v: T) => void) => (v: T) => {
    setActivePreset(null);
    setter(v);
  };

  if (statsLoading || initialLoading) {
    return <ContentKeywordsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview - from cached /stats endpoint */}
      <div className="grid grid-cols-4 gap-4 mt-6 mb-6">
        <Card className="py-0">
          <CardContent className="p-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total Keywords</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">{(stats?.totalKeywords || 0).toLocaleString()}</span>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total Monthly Searches</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">{(stats?.totalVolume || 0).toLocaleString()}</span>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Tier 1 Keywords</span>
            <span className="text-base font-bold text-orange-600 dark:text-orange-400">{(stats?.tier1Count || 0).toLocaleString()}</span>
          </CardContent>
        </Card>
        <Card className="py-0">
          <CardContent className="p-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Purchase Intent</span>
            <span className="text-base font-bold text-purple-600 dark:text-purple-400">{(stats?.highIntentCount || 0).toLocaleString()}</span>
          </CardContent>
        </Card>
      </div>

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
          {/* Quick filter presets */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {Object.entries(QUICK_FILTERS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  activePreset === key
                    ? 'bg-[#D67C4A] text-white border-[#D67C4A]'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-[#D67C4A] hover:text-[#D67C4A]'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={clearFilters}
              className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 hover:border-gray-300"
              title="Clear all filters"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {/* Filter row — aligned with table columns */}
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="p-2 text-left">
                    <div className="flex items-center gap-1">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-[9px] h-3.5 w-3.5 text-gray-400" />
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => { setActivePreset(null); setSearchQuery(e.target.value); }}
                          className="pl-8 h-9 text-sm bg-white dark:bg-gray-800"
                          data-testid="input-keyword-search"
                        />
                      </div>
                      <MultiSelectFilter
                        label="Cluster"
                        options={clusterOptions}
                        selected={selectedClusters}
                        onChange={withPresetClear(setSelectedClusters)}
                        showSearch
                      />
                    </div>
                  </th>
                  <th className="p-2 text-center">
                    <MultiSelectFilter
                      label="Market"
                      options={marketOptions}
                      selected={selectedMarkets}
                      onChange={withPresetClear(setSelectedMarkets)}
                    />
                  </th>
                  <th className="p-2">
                    <MultiSelectFilter
                      label="Tier"
                      options={tierOptions}
                      selected={selectedTiers}
                      onChange={withPresetClear(setSelectedTiers)}
                    />
                  </th>
                  <th className="p-2 text-right">
                    <MultiSelectFilter
                      label="Searches"
                      options={volumeOptions}
                      selected={selectedVolumes}
                      onChange={withPresetClear(setSelectedVolumes)}
                    />
                  </th>
                  <th className="p-2">
                    <MultiSelectFilter
                      label="Comp."
                      options={competitionOptions}
                      selected={selectedCompetitions}
                      onChange={withPresetClear(setSelectedCompetitions)}
                    />
                  </th>
                  <th className="p-2">
                    <MultiSelectFilter
                      label="Intent"
                      options={intentOptions}
                      selected={selectedIntents}
                      onChange={withPresetClear(setSelectedIntents)}
                    />
                  </th>
                  <th className="p-2" />
                  <th className="p-2" />
                  <th className="p-2" />
                </tr>
                {/* Column headers row */}
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
                    <button
                      onClick={() => handleSort('market')}
                      className="flex items-center gap-1 mx-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      data-testid="sort-market"
                    >
                      Market
                      {sortColumn === 'market' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-30" />
                      )}
                    </button>
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
                      onClick={() => handleSort('monthlySearches')}
                      className="flex items-center gap-1 ml-auto text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      data-testid="sort-searches"
                    >
                      Searches/mo
                      {sortColumn === 'monthlySearches' ? (
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
                      Comp.
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
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Planned Posts</span>
                  </th>
                  <th className="text-center p-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Posts</span>
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
                            <span className="inline-flex items-center gap-1 ml-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded px-1.5 py-0.5">
                              <Tag className="h-3 w-3" />
                              {formatCluster(keyword.cluster)}
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
                      {keyword.monthlySearches?.toLocaleString() || 'N/A'}
                    </td>
                    <td className="p-3">
                      <span className={`font-medium ${getCompetitionColor(keyword.competition)}`}>
                        {keyword.competition || '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge variant="custom" className={getIntentColor(keyword.intent)}>
                        {keyword.intent}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      {keyword.topicsCount ? (
                        <button
                          onClick={() => navigateToTab('topics', keyword.keyword)}
                          className="text-sm font-medium text-[#D67C4A] hover:underline"
                          title={`View ${keyword.topicsCount} topic(s)`}
                        >
                          {keyword.topicsCount}
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {keyword.postsCount ? (
                        <button
                          onClick={() => {
                            const params = new URLSearchParams(window.location.search);
                            params.set('tab', 'posts');
                            params.set('filterKeyword', keyword.keyword);
                            params.delete('highlight');
                            window.location.href = `${window.location.pathname}?${params.toString()}`;
                          }}
                          className="text-sm font-medium text-[#D67C4A] hover:underline"
                          title={`View ${keyword.postsCount} post(s)`}
                        >
                          {keyword.postsCount}
                        </button>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
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
