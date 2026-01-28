import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Users,
  Globe,
  BarChart3,
  RefreshCw,
  Calendar,
  Target,
  Languages,
  MapPin,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useFilteredCta } from './hooks/useFilteredReports';
import type { CtaAnalyticsData } from './data/types';
import { cn } from '@/lib/utils';
import './analyticsNew.tokens.css';

interface CtaKpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
}

const CtaKpiCard: React.FC<CtaKpiCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color,
  trend 
}) => {
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Activity;
  const trendColor = trend?.direction === 'up' ? 'text-green-600' : trend?.direction === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">{subtitle}</p>
          {trend && (
            <div className={`flex items-center space-x-1 ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span className="text-xs font-medium">{trend.percentage}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface CtaBreakdownRowProps {
  ctaName: string;
  ctaId: string;
  totalClicks: number;
  frClicks: number;
  enClicks: number;
  rank: number;
  sections: Record<string, number>;
}

const CtaBreakdownRow: React.FC<CtaBreakdownRowProps> = ({ 
  ctaName, 
  ctaId, 
  totalClicks, 
  frClicks, 
  enClicks, 
  rank,
  sections 
}) => {
  const frPercentage = totalClicks > 0 ? Math.round((frClicks / totalClicks) * 100) : 0;
  const enPercentage = totalClicks > 0 ? Math.round((enClicks / totalClicks) * 100) : 0;
  const topSection = Object.entries(sections).sort(([,a], [,b]) => b - a)[0];

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
          {rank}
        </div>
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{ctaName}</span>
          <span className="text-xs text-gray-500 flex items-center space-x-1">
            <Target className="h-3 w-3" />
            <span>ID: {ctaId}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-6 text-sm">
        <div className="text-center">
          <div className="font-semibold text-gray-900">{totalClicks.toLocaleString()}</div>
          <div className="text-gray-500 text-xs">Total Clicks</div>
        </div>
        <div className="text-center">
          <div className="flex items-center space-x-1">
            <span className="font-semibold text-blue-600">{frClicks}</span>
            <span className="text-gray-400">FR</span>
            <span className="font-semibold text-green-600">{enClicks}</span>
            <span className="text-gray-400">EN</span>
          </div>
          <div className="text-gray-500 text-xs">Language Split</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-gray-900">{topSection?.[0] || 'N/A'}</div>
          <div className="text-gray-500 text-xs">Top Section</div>
        </div>
      </div>
    </div>
  );
};

export const AnalyticsNewCta: React.FC<{ className?: string }> = ({ className = '' }) => {
  // Use centralized filtering system with the useFilteredCta hook
  const { data: ctaData, isLoading: ctaLoading, error: ctaError, refetch, appliedFilters } = useFilteredCta();

  // Create default empty data structure when no data exists
  const defaultCtaData = {
    totalClicks: 0,
    ctas: {
      book_call: {
        totalClicks: 0,
        languageBreakdown: { 'fr-FR': 0, 'en-US': 0 },
        sectionBreakdown: {}
      },
      quick_quote: {
        totalClicks: 0,
        languageBreakdown: { 'fr-FR': 0, 'en-US': 0 },
        sectionBreakdown: {}
      }
    },
    languageTotals: { 'fr-FR': 0, 'en-US': 0 },
    dailyTotals: [],
    topSections: []
  };

  // Use actual data if available, otherwise use default empty data
  const displayData = ctaData || defaultCtaData;

  // Process data for visualizations - ALWAYS call this hook before any returns
  const processedData = React.useMemo(() => {
    const { ctas, languageTotals, dailyTotals, topSections } = displayData;
    
    // Language breakdown data for pie chart
    const languageData = [
      { name: 'French', value: languageTotals['fr-FR'], color: '#3B82F6' },
      { name: 'English', value: languageTotals['en-US'], color: '#10B981' }
    ];

    // CTA comparison data
    const ctaComparisonData = [
      {
        name: 'Free Consultation',
        clicks: ctas.book_call.totalClicks,
        'fr-FR': ctas.book_call.languageBreakdown['fr-FR'],
        'en-US': ctas.book_call.languageBreakdown['en-US']
      },
      {
        name: 'Free Quote', 
        clicks: ctas.quick_quote.totalClicks,
        'fr-FR': ctas.quick_quote.languageBreakdown['fr-FR'],
        'en-US': ctas.quick_quote.languageBreakdown['en-US']
      }
    ];

    return {
      languageData,
      ctaComparisonData,
      dailyTrend: dailyTotals,
      sections: topSections,
      insights: {
        topCta: ctas.book_call.totalClicks > ctas.quick_quote.totalClicks ? 'book_call' : 'quick_quote',
        dominantLanguage: languageTotals['fr-FR'] > languageTotals['en-US'] ? 'French' : 'English',
        averageDaily: dailyTotals.length > 0 ? Math.round(displayData.totalClicks / dailyTotals.length) : 0
      }
    };
  }, [displayData]);

  // Loading skeleton
  if (ctaLoading) {
    return (
      <div className={cn('analytics-new-container space-y-6', className)}>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-white border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (ctaError) {
    return (
      <div className={cn('analytics-new-container', className)}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-red-600 mb-2">❌ CTA Analytics Error</div>
              <p className="text-sm text-red-700 mb-4">{ctaError.message}</p>
              <Button 
                onClick={() => refetch()} 
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
                data-testid="retry-button"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  const { ctas, languageTotals, topSections } = displayData;
  const insights = processedData?.insights;

  return (
    <div className={cn('analytics-new-container space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--analytics-new-text)]">CTA Analytics</h2>
          <p className="text-[var(--analytics-new-text-muted)] mt-1">
            Call-to-Action button performance and engagement metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-gray-600" data-testid="date-range-badge">
            {appliedFilters.dateRange.start} to {appliedFilters.dateRange.end}
          </Badge>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm"
            data-testid="refresh-button"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CtaKpiCard
          title="Total CTA Clicks"
          value={displayData.totalClicks.toLocaleString()}
          subtitle="All call-to-action interactions"
          icon={MousePointerClick}
          color="text-orange-600"
          data-testid="total-clicks-card"
        />
        <CtaKpiCard
          title="Free Consultation"
          value={ctas.book_call.totalClicks.toLocaleString()}
          subtitle="Book call button clicks"
          icon={Target}
          color="text-blue-600"
          data-testid="consultation-clicks-card"
        />
        <CtaKpiCard
          title="Free Quote"
          value={ctas.quick_quote.totalClicks.toLocaleString()}
          subtitle="Quick quote button clicks"
          icon={BarChart3}
          color="text-green-600"
          data-testid="quote-clicks-card"
        />
        <CtaKpiCard
          title="Daily Average"
          value={insights?.averageDaily.toString() || '0'}
          subtitle="Average clicks per day"
          icon={Calendar}
          color="text-purple-600"
          data-testid="daily-average-card"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-gray-600" />
              <span>Daily CTA Clicks Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedData?.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="formattedDate" 
                    fontSize={12}
                    stroke="#666"
                  />
                  <YAxis fontSize={12} stroke="#666" />
                  <Tooltip 
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#f97316"
                    fill="#fed7aa"
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Language Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Languages className="h-5 w-5 text-gray-600" />
              <span>Language Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData?.languageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {processedData?.languageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value.toLocaleString(), 'Clicks']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CTA Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <span>CTA Performance Comparison</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData?.ctaComparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" fontSize={12} stroke="#666" />
                  <YAxis fontSize={12} stroke="#666" />
                  <Tooltip />
                  <Bar dataKey="fr-FR" stackId="a" fill="#3B82F6" name="French" />
                  <Bar dataKey="en-US" stackId="a" fill="#10B981" name="English" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Sections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-gray-600" />
              <span>Top Performing Sections</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSections.length > 0 ? (
                topSections.map((section, index) => (
                  <div key={section.sectionName} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900 capitalize">
                        {section.sectionName.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold text-gray-900">{section.clicks}</span>
                      <Badge variant="secondary">{section.percentage}%</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-sm">No section data available</div>
                  <div className="text-gray-400 text-xs mt-1">CTA clicks will appear here when recorded</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed CTA Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-gray-600" />
            <span>Detailed CTA Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <CtaBreakdownRow
              ctaName="Free Consultation"
              ctaId="book_call"
              totalClicks={ctas.book_call.totalClicks}
              frClicks={ctas.book_call.languageBreakdown['fr-FR']}
              enClicks={ctas.book_call.languageBreakdown['en-US']}
              rank={1}
              sections={ctas.book_call.sectionBreakdown}
            />
            <CtaBreakdownRow
              ctaName="Free Quote"
              ctaId="quick_quote"
              totalClicks={ctas.quick_quote.totalClicks}
              frClicks={ctas.quick_quote.languageBreakdown['fr-FR']}
              enClicks={ctas.quick_quote.languageBreakdown['en-US']}
              rank={2}
              sections={ctas.quick_quote.sectionBreakdown}
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
};