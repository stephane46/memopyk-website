import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { Search, Calendar, Clock, ArrowRight, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchBar from '@/components/blog/SearchBar';
import { BlogPost, ApiResponse } from '@/types/blog';

type SortOption = 'relevance' | 'date' | 'title';

export default function SearchResultsPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const query = searchParams.get('q') || '';
  const languageParam = searchParams.get('language') || 'en-US';
  
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error, refetch } = useQuery<ApiResponse<BlogPost>>({
    queryKey: ['/api/blog/posts/search', query, languageParam, limit, (currentPage - 1) * limit],
    queryFn: async () => {
      if (!query) return { success: true, data: [], total: 0 };
      
      const response = await fetch(
        `/api/blog/posts/search?q=${encodeURIComponent(query)}&language=${languageParam}&limit=${limit}&offset=${(currentPage - 1) * limit}`
      );
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: !!query
  });

  const results = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'relevance':
        return (b.relevance_score || 0) - (a.relevance_score || 0);
      case 'date':
        const dateB = b.published_at || (b as any).publish_date;
        const dateA = a.published_at || (a as any).publish_date;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  // Reset page when query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const formatDate = (post: BlogPost) => {
    const dateString = post.published_at || (post as any).publish_date;
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString(
      languageParam === 'fr-FR' ? 'fr-FR' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  return (
    <>
      <Helmet>
        <title>
          {query 
            ? `${languageParam === 'fr-FR' ? 'Recherche : ' : 'Search: '}${query} - MEMOPYK Blog`
            : languageParam === 'fr-FR' ? 'Recherche - MEMOPYK Blog' : 'Search - MEMOPYK Blog'
          }
        </title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-8">
            <Link href={`/${languageParam}/blog`}>
              <Button variant="ghost" className="mb-4" data-testid="button-back-to-blog">
                <ChevronLeft className="h-4 w-4 mr-2" />
                {languageParam === 'fr-FR' ? 'Retour au blog' : 'Back to blog'}
              </Button>
            </Link>

            <h1 className="text-4xl font-['Playfair_Display'] font-bold text-[#2A4759] mb-6">
              {languageParam === 'fr-FR' ? 'Recherche' : 'Search'}
            </h1>

            <SearchBar 
              language={languageParam}
              className="mb-6"
              autoNavigate={true}
            />
          </div>

          {/* Results Header */}
          {query && (
            <div className="max-w-4xl mx-auto mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
                <div>
                  <p className="text-lg text-gray-700" data-testid="text-search-query">
                    {languageParam === 'fr-FR' 
                      ? `Résultats pour "${query}"` 
                      : `Showing results for "${query}"`}
                  </p>
                  <p className="text-sm text-gray-500" data-testid="text-results-count">
                    {total} {total === 1 
                      ? (languageParam === 'fr-FR' ? 'résultat trouvé' : 'result found')
                      : (languageParam === 'fr-FR' ? 'résultats trouvés' : 'results found')
                    }
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {languageParam === 'fr-FR' ? 'Trier par :' : 'Sort by:'}
                  </span>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger className="w-40" data-testid="select-sort-by">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">
                        {languageParam === 'fr-FR' ? 'Pertinence' : 'Relevance'}
                      </SelectItem>
                      <SelectItem value="date">
                        {languageParam === 'fr-FR' ? 'Date' : 'Date'}
                      </SelectItem>
                      <SelectItem value="title">
                        {languageParam === 'fr-FR' ? 'Titre' : 'Title'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="max-w-4xl mx-auto space-y-6" data-testid="search-results-loading">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="max-w-4xl mx-auto" data-testid="search-results-error">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <p className="text-red-600 text-center">
                    {languageParam === 'fr-FR' 
                      ? 'Erreur lors de la recherche. Veuillez réessayer.' 
                      : 'Search failed. Please try again.'}
                  </p>
                  <Button 
                    onClick={() => refetch()} 
                    variant="outline" 
                    className="mt-4 mx-auto block"
                    data-testid="button-retry-search"
                  >
                    {languageParam === 'fr-FR' ? 'Réessayer' : 'Retry'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* No Results */}
          {!isLoading && !error && query && sortedResults.length === 0 && (
            <div className="max-w-4xl mx-auto" data-testid="search-results-empty">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {languageParam === 'fr-FR' ? 'Aucun résultat trouvé' : 'No results found'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {languageParam === 'fr-FR' 
                      ? `Aucun article ne correspond à "${query}"` 
                      : `No posts match "${query}"`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {languageParam === 'fr-FR' 
                      ? 'Essayez avec des mots-clés différents ou plus généraux' 
                      : 'Try different or more general keywords'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results */}
          {!isLoading && !error && sortedResults.length > 0 && (
            <div className="max-w-4xl mx-auto space-y-6" data-testid="search-results-list">
              {sortedResults.map((post) => (
                <Card 
                  key={post.id} 
                  className="hover:shadow-lg transition-shadow"
                  data-testid={`search-result-card-${post.slug}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-2xl font-['Playfair_Display'] text-[#2A4759] mb-2">
                          <Link href={`/${languageParam}/blog/${post.slug}`}>
                            <span className="hover:text-[#D67C4A] cursor-pointer transition-colors">
                              {post.title}
                            </span>
                          </Link>
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                          {post.relevance_score && (
                            <Badge 
                              variant="secondary" 
                              className="bg-[#D67C4A]/10 text-[#D67C4A]"
                              data-testid={`relevance-score-${post.slug}`}
                            >
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              {Math.round(post.relevance_score * 100)}% {languageParam === 'fr-FR' ? 'pertinent' : 'relevant'}
                            </Badge>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(post)}
                          </span>
                          {post.read_time_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {post.read_time_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      {post.image?.url && (
                        <img 
                          src={post.image.url} 
                          alt={post.title}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-gray-700 line-clamp-3">
                      {post.description}
                    </CardDescription>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/${languageParam}/blog/${post.slug}`}>
                      <Button variant="ghost" className="text-[#D67C4A] hover:text-[#D67C4A]/90" data-testid={`button-read-more-${post.slug}`}>
                        {languageParam === 'fr-FR' ? 'Lire la suite' : 'Read More'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8" data-testid="search-pagination">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    {languageParam === 'fr-FR' ? 'Précédent' : 'Previous'}
                  </Button>
                  
                  <span className="px-4 py-2 text-sm text-gray-600">
                    {languageParam === 'fr-FR' ? 'Page' : 'Page'} {currentPage} {languageParam === 'fr-FR' ? 'sur' : 'of'} {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    data-testid="button-next-page"
                  >
                    {languageParam === 'fr-FR' ? 'Suivant' : 'Next'}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
