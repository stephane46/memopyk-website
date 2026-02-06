import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, Target, Filter, ArrowUpDown, ArrowUp, ArrowDown, FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { ContentKeywordsSkeleton } from '@/admin/skeletons/ContentKeywordsSkeleton';
import { KeywordFormModal } from './KeywordFormModal';
import { KeywordDeleteDialog } from './KeywordDeleteDialog';

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
  notes?: string;
  created_at: string;
  updated_at: string;
}

type SortColumn = 'keyword' | 'tier' | 'monthly_searches' | 'competition' | 'intent';
type SortDirection = 'asc' | 'desc';

export function ContentProductionKeywords() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('monthly_searches');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // CRUD modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<ContentKeyword | null>(null);
  const [deletingKeyword, setDeletingKeyword] = useState<ContentKeyword | null>(null);

  const { data: keywords = [], isLoading } = useQuery<ContentKeyword[]>({
    queryKey: ['/api/admin/content/keywords'],
  });

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const filteredKeywords = keywords
    .filter(keyword => {
      const matchesSearch = keyword.keyword.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = selectedTier === null || keyword.tier === selectedTier;
      const matchesIntent = selectedIntent === null || keyword.intent.toLowerCase() === selectedIntent.toLowerCase();
      const matchesMarket = selectedMarket === null || keyword.market === selectedMarket;
      return matchesSearch && matchesTier && matchesIntent && matchesMarket;
    })
    .sort((a, b) => {
      let aValue: any = a[sortColumn];
      let bValue: any = b[sortColumn];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // String comparison for text columns
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const tierStats = {
    1: keywords.filter(k => k.tier === 1).length,
    2: keywords.filter(k => k.tier === 2).length,
    3: keywords.filter(k => k.tier === 3).length,
    4: keywords.filter(k => k.tier === 4).length,
  };

  const intentStats = keywords.reduce((acc, k) => {
    const intent = k.intent.toLowerCase();
    acc[intent] = (acc[intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const marketStats = keywords.reduce((acc, k) => {
    const market = k.market || 'fr';
    acc[market] = (acc[market] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSearchVolume = keywords.reduce((sum, k) => sum + (k.monthly_searches || 0), 0);

  const getCompetitionColor = (competition: string) => {
    switch (competition.toLowerCase()) {
      case 'low':
      case 'very low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getIntentColor = (intent: string) => {
    switch (intent.toLowerCase()) {
      case 'high':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTierBadgeColor = (tier: number) => {
    switch (tier) {
      case 1:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 2:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 3:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 4:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return <ContentKeywordsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Keyword Research</h2>
        <p className="text-gray-600 dark:text-gray-400">SEO keyword strategy and targeting framework</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-600 dark:text-gray-400">Total Keywords</CardDescription>
            <CardTitle className="text-3xl text-gray-900 dark:text-white">{keywords.length.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-600 dark:text-gray-400">Total Monthly Searches</CardDescription>
            <CardTitle className="text-3xl text-gray-900 dark:text-white">
              {totalSearchVolume.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-600 dark:text-gray-400">Tier 1 Keywords</CardDescription>
            <CardTitle className="text-3xl text-orange-600 dark:text-orange-400">{tierStats[1].toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-gray-600 dark:text-gray-400">High Intent</CardDescription>
            <CardTitle className="text-3xl text-purple-600 dark:text-purple-400">
              {(intentStats['high'] || 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                data-testid="input-keyword-search"
              />
            </div>

            {/* Market Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Market</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMarket(null)}
                  className={selectedMarket === null ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-market-all"
                >
                  All ({keywords.length.toLocaleString()})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMarket('fr')}
                  className={selectedMarket === 'fr' ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-market-fr"
                >
                  🇫🇷 France ({(marketStats['fr'] || 0).toLocaleString()})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMarket('en')}
                  className={selectedMarket === 'en' ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-market-en"
                >
                  🇬🇧 English ({(marketStats['en'] || 0).toLocaleString()})
                </Button>
              </div>
            </div>

            {/* Tier Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tier</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTier(null)}
                  className={selectedTier === null ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-tier-all"
                >
                  All ({keywords.length.toLocaleString()})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTier(1)}
                  className={selectedTier === 1 ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-tier-1"
                >
                  Tier 1 ({tierStats[1].toLocaleString()})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTier(2)}
                  className={selectedTier === 2 ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-tier-2"
                >
                  Tier 2 ({tierStats[2].toLocaleString()})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTier(3)}
                  className={selectedTier === 3 ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-tier-3"
                >
                  Tier 3 ({tierStats[3].toLocaleString()})
                </Button>
              </div>
            </div>

            {/* Intent Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search Intent</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIntent(null)}
                  className={selectedIntent === null ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-intent-all"
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIntent('high')}
                  className={selectedIntent === 'high' ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-intent-high"
                >
                  High ({(intentStats['high'] || 0).toLocaleString()})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIntent('medium')}
                  className={selectedIntent === 'medium' ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-intent-medium"
                >
                  Medium ({(intentStats['medium'] || 0).toLocaleString()})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIntent('low')}
                  className={selectedIntent === 'low' ? 'bg-[#D67C4A] text-white border-[#D67C4A] hover:bg-[#C06B3A] hover:text-white' : ''}
                  data-testid="button-intent-low"
                >
                  Low ({(intentStats['low'] || 0).toLocaleString()})
                </Button>
              </div>
            </div>
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
                Keywords ({filteredKeywords.length.toLocaleString()})
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
                {filteredKeywords.map((keyword) => (
                  <tr
                    key={keyword.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                    data-testid={`row-keyword-${keyword.id}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{keyword.keyword}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span title={keyword.market === 'fr' ? 'France' : 'English'}>
                        {keyword.market === 'fr' ? '🇫🇷' : '🇬🇧'}
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
                    <td className="p-3">
                      <Badge variant="custom" className={getCompetitionColor(keyword.competition)}>
                        {keyword.competition}
                      </Badge>
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

            {filteredKeywords.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No keywords match your filters
              </div>
            )}
          </div>
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
