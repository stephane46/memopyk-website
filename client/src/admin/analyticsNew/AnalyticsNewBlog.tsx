import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Eye, TrendingUp, FileText, Hash, Folder } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface PopularBlogPost {
  postSlug: string;
  postTitle: string;
  language: string;
  viewCount: number;
  lastViewed: string;
}

interface BlogTrendData {
  date: string;
  views: number;
}

interface TopTopic {
  topicId: string;
  topicTitle: string;
  category: string;
  viewCount: number;
  postCount: number;
}

interface TopKeyword {
  keyword: string;
  viewCount: number;
  postCount: number;
}

interface CategoryPerformance {
  category: string;
  viewCount: number;
  postCount: number;
  percentage: number;
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: '2-digit' 
  });
};

const formatTooltipDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {formatTooltipDate(payload[0].payload.date)}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-[#D67C4A]">{payload[0].value}</span> views
        </p>
      </div>
    );
  }
  return null;
};

// Category colors for the bar chart
const CATEGORY_COLORS: Record<string, string> = {
  'Photo Organization': '#D67C4A',
  'Video Memory': '#2A4759',
  'Family Storytelling': '#89BAD9',
  'Digital Organization': '#011526',
  'Memory Products': '#F2EBDC',
  'Seasonal Content': '#A0522D'
};

export const AnalyticsNewBlog: React.FC = () => {
  const [, setLocation] = useLocation();
  const { datePreset, language, country } = useAnalyticsNewFilters();

  // Map period to days
  const days = datePreset === '7d' ? 7 : datePreset === '30d' ? 30 : 90;

  // Map language filter to blog language format
  const blogLanguage = language === 'en' ? 'en-US' : language === 'fr' ? 'fr-FR' : undefined;

  // Cross-tab navigation functions using wouter's setLocation for SPA navigation
  const navigateToPostsTab = (postSlug?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'blog');
    params.set('cptab', 'posts');
    if (postSlug) {
      params.set('highlightPost', postSlug);
    }
    setLocation(`/admin?${params.toString()}`);
  };

  const navigateToTopicsTab = (topicId: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'blog');
    params.set('cptab', 'topics');
    params.set('highlightTopic', topicId);
    setLocation(`/admin?${params.toString()}`);
  };

  const navigateToPostsWithKeyword = (keyword: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'blog');
    params.set('cptab', 'posts');
    params.set('filterKeyword', keyword);
    setLocation(`/admin?${params.toString()}`);
  };

  const getEndpoint = (baseEndpoint: string) => `/api/analytics/blog${baseEndpoint}`;

  const { data: popularPosts, isLoading: postsLoading, error: postsError, refetch: refetchPosts } = useQuery<PopularBlogPost[]>({
    queryKey: ['/api/analytics/blog/popular', { days, blogLanguage }],
    queryFn: async () => {
      const params = new URLSearchParams({ days: days.toString() });
      if (blogLanguage) params.append('language', blogLanguage);
      const response = await fetch(`${getEndpoint('/popular')}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch popular blog posts');
      return response.json();
    }
  });

  const { data: trendsData, isLoading: trendsLoading, error: trendsError, refetch: refetchTrends } = useQuery<BlogTrendData[]>({
    queryKey: ['/api/analytics/blog/trends', { days, blogLanguage }],
    queryFn: async () => {
      const params = new URLSearchParams({ days: days.toString() });
      if (blogLanguage) params.append('language', blogLanguage);
      const response = await fetch(`${getEndpoint('/trends')}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch blog trends');
      return response.json();
    }
  });

  const { data: topTopics, isLoading: topicsLoading } = useQuery<TopTopic[]>({
    queryKey: ['/api/analytics/blog/topics', { days, blogLanguage }],
    queryFn: async () => {
      const params = new URLSearchParams({ days: days.toString() });
      if (blogLanguage) params.append('language', blogLanguage);
      const response = await fetch(`${getEndpoint('/topics')}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch top topics');
      return response.json();
    }
  });

  const { data: topKeywords, isLoading: keywordsLoading } = useQuery<TopKeyword[]>({
    queryKey: ['/api/analytics/blog/keywords', { days, blogLanguage }],
    queryFn: async () => {
      const params = new URLSearchParams({ days: days.toString() });
      if (blogLanguage) params.append('language', blogLanguage);
      const response = await fetch(`${getEndpoint('/keywords')}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch top keywords');
      return response.json();
    }
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<CategoryPerformance[]>({
    queryKey: ['/api/analytics/blog/categories', { days, blogLanguage }],
    queryFn: async () => {
      const params = new URLSearchParams({ days: days.toString() });
      if (blogLanguage) params.append('language', blogLanguage);
      const response = await fetch(`${getEndpoint('/categories')}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch category performance');
      return response.json();
    }
  });

  const isLoading = postsLoading || trendsLoading || topicsLoading || keywordsLoading || categoriesLoading;
  const error = postsError || trendsError;

  const handleRetry = () => {
    refetchPosts();
    refetchTrends();
  };

  if (isLoading) {
    return (
      <div className="analytics-new-container space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Blog Analytics</h2>
          <div className="text-sm text-gray-600">Last {days} days</div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">MEMOPYK</Badge>
          <span>Source: MEMOPYK Analytics</span>
        </div>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.message || 'Unknown error';
    return (
      <div className="analytics-new-container space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Blog Analytics</h2>
          <div className="text-sm text-gray-600">Last {days} days</div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">MEMOPYK</Badge>
          <span>Source: MEMOPYK Analytics</span>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load blog analytics</h3>
          <p className="text-sm text-red-700 mb-4">
            Could not load blog analytics data. This may be temporary.
          </p>
          <p className="text-xs text-red-600 mb-4 font-mono">{errorMessage}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            data-testid="blog-retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalViews = popularPosts?.reduce((sum, post) => sum + post.viewCount, 0) || 0;

  if (!popularPosts || popularPosts.length === 0) {
    return (
      <div className="analytics-new-container space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Blog Analytics</h2>

        {/* Source Info */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">MEMOPYK</Badge>
          <span>Source: MEMOPYK Analytics</span>
        </div>

        <AnalyticsNewLoadingStates
          mode="empty"
          title="No blog data yet"
          description={`No blog posts have been viewed in the last ${days} days`}
        />
      </div>
    );
  }

  const formatLastViewed = (dateString: string) => {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: enUS });
  };

  return (
    <div className="analytics-new-container space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Blog Analytics</h2>
        <div className="text-sm text-gray-600">
          Last {days} days
        </div>
      </div>

      {/* Source Info */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">MEMOPYK</Badge>
        <span>Source: MEMOPYK Analytics</span>
      </div>

      {/* Blog Views Trend Chart */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#D67C4A]" />
                Blog Views Over Time
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                Daily blog post views for the selected period
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{totalViews}</div>
              <div className="text-sm text-gray-600">Total Views</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trendsData && trendsData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="blogViewsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D67C4A" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#D67C4A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#D67C4A" 
                    strokeWidth={2}
                    fill="url(#blogViewsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Popular Posts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#D67C4A]" />
              Popular Blog Posts
            </h3>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              MEMOPYK
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Most viewed blog posts ranked by total views
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Post Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Views
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Last Viewed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {popularPosts.map((post, index) => (
                <tr 
                  key={post.postSlug}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  data-testid={`blog-post-${post.postSlug}`}
                  onClick={() => navigateToPostsTab(post.postSlug)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`
                        inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold
                        ${index === 0 ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${index === 1 ? 'bg-gray-200 text-gray-800' : ''}
                        ${index === 2 ? 'bg-orange-100 text-orange-800' : ''}
                        ${index > 2 ? 'bg-gray-100 text-gray-600' : ''}
                      `}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate hover:text-[#D67C4A]">
                          {post.postTitle}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-1">
                          /{post.language}/blog/{post.postSlug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {post.language === 'en-US' ? 'EN' : 'FR'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {post.viewCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                    {formatLastViewed(post.lastViewed)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Total unique posts: <span className="font-semibold text-gray-900">{popularPosts.length}</span>
            </span>
            <span className="text-gray-600">
              Total views: <span className="font-semibold text-gray-900">
                {totalViews}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Topics and Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Content Topics */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Folder className="h-5 w-5 text-[#D67C4A]" />
                Top Content Topics
              </h3>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                MEMOPYK
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Topics ranked by total traffic from all linked posts
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {topTopics && topTopics.length > 0 ? (
              topTopics.map((topic, index) => (
                <div
                  key={topic.topicId}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  data-testid={`topic-${topic.topicId}`}
                  onClick={() => navigateToTopicsTab(topic.topicId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={`
                          inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold
                          ${index === 0 ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${index === 1 ? 'bg-gray-200 text-gray-800' : ''}
                          ${index === 2 ? 'bg-orange-100 text-orange-800' : ''}
                          ${index > 2 ? 'bg-gray-100 text-gray-600' : ''}
                        `}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate hover:text-[#D67C4A]">
                            {topic.topicTitle}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {topic.category} • {topic.postCount} post{topic.postCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {topic.viewCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No topic data available
              </div>
            )}
          </div>
        </div>

        {/* Top SEO Keywords */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Hash className="h-5 w-5 text-[#D67C4A]" />
                Top SEO Keywords
              </h3>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                MEMOPYK
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Keywords ranked by traffic they drive
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {topKeywords && topKeywords.length > 0 ? (
              topKeywords.map((keyword, index) => (
                <div
                  key={keyword.keyword}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  data-testid={`keyword-${keyword.keyword}`}
                  onClick={() => navigateToPostsWithKeyword(keyword.keyword)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={`
                          inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold
                          ${index === 0 ? 'bg-yellow-100 text-yellow-800' : ''}
                          ${index === 1 ? 'bg-gray-200 text-gray-800' : ''}
                          ${index === 2 ? 'bg-orange-100 text-orange-800' : ''}
                          ${index > 2 ? 'bg-gray-100 text-gray-600' : ''}
                        `}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate hover:text-[#D67C4A]">
                            {keyword.keyword}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {keyword.postCount} post{keyword.postCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {keyword.viewCount}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                No keyword data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Performance */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#D67C4A]" />
              Category Performance
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              MEMOPYK
            </Badge>
          </div>
          <CardDescription className="text-sm text-gray-600 mt-1">
            Traffic breakdown by content category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories && categories.length > 0 ? (
            <div className="space-y-4">
              {/* Bar Chart */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="category" 
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: any) => [`${value} views`, 'Views']}
                    />
                    <Bar dataKey="viewCount" radius={[8, 8, 0, 0]}>
                      {categories.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CATEGORY_COLORS[entry.category] || '#D67C4A'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Category Stats Table */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <div 
                      key={cat.category}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cat.category}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {cat.postCount} post{cat.postCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{cat.percentage}%</p>
                        <p className="text-xs text-gray-500">{cat.viewCount} views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No category data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
