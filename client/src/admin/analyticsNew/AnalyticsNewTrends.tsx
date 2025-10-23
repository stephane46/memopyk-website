import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Video, Clock, Users, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart } from 'recharts';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { useFilteredTrends, TrendDataPoint, TrendsData, TrendsResponse } from './hooks/useFilteredReports';
import './analyticsNew.tokens.css';

// Using centralized TrendDataPoint and TrendsData types from useFilteredReports

interface TrendCardProps {
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  description: string;
}

const TrendCard: React.FC<TrendCardProps> = ({ title, value, trend, icon, description }) => {
  const getTrendIcon = () => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (trend > 0) return 'text-emerald-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="text-gray-400">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="flex items-center mt-2">
          {getTrendIcon()}
          <span className={`text-sm ml-1 ${getTrendColor()}`}>
            {trend !== 0 && (trend > 0 ? '+' : '')}{trend.toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};

const formatDate = (dateStr: string): string => {
  // Handle GA4 YYYYMMDD format (e.g., "20250906")
  if (dateStr && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    const date = new Date(year, month, day);
    
    // Use "Sep 05" format as requested
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit' 
    });
  }
  
  // Fallback for other formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if parsing fails
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: '2-digit' 
  });
};

const formatTooltipDate = (dateStr: string): string => {
  // Handle GA4 YYYYMMDD format (e.g., "20250906")
  if (dateStr && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  // Fallback for other formats
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr; // Return original if parsing fails
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

export const AnalyticsNewTrends: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<'views' | 'visitors' | 'watchTime' | 'completion'>('views');
  
  // Get current filter state from store (used for display only)
  const { datePreset } = useAnalyticsNewFilters();

  // Fetch trend data using centralized filtering hook
  const { data: trendsResponse, isLoading, error, appliedFilters } = useFilteredTrends();

  console.log('📈 TRENDS: Using centralized filtering:', {
    appliedFilters,
    dataPoints: trendsResponse?.dailyData?.length || 0,
    hasPeriodAggregates: !!trendsResponse?.periodAggregates
  });

  // ✅ CRITICAL FIX: Use period aggregates for cards, daily data for charts
  const calculateTrendMetrics = () => {
    if (!trendsResponse || !trendsResponse.dailyData || trendsResponse.dailyData.length === 0) {
      return {
        totalViews: { current: 0, trend: 0 },
        uniqueVisitors: { current: 0, trend: 0 },
        averageWatchTime: { current: 0, trend: 0 },
        completionRate: { current: 0, trend: 0 }
      };
    }

    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const { periodAggregates, dailyData } = trendsResponse;

    // ✅ CRITICAL FIX: Use period aggregates for cards (matches Overview tab exactly)
    if (periodAggregates && (periodAggregates.periodSessions > 0 || periodAggregates.periodUsers > 0)) {
      console.log('📊 TRENDS: Using PERIOD AGGREGATES for cards (consistent with Overview tab)');
      console.log('📊 PERIOD DATA:', {
        sessions: periodAggregates.periodSessions,
        users: periodAggregates.periodUsers,
        avgWatchTime: periodAggregates.periodAverageWatchTime,
        prevSessions: periodAggregates.prevPeriodSessions,
        prevUsers: periodAggregates.prevPeriodUsers,
        prevAvgWatchTime: periodAggregates.prevPeriodAverageWatchTime
      });

      // Calculate completion rate from daily averages (since it's a rate metric)
      const currentCompletion = dailyData.length > 0
        ? dailyData.reduce((sum, item) => sum + item.completionRate, 0) / dailyData.length
        : 0;
      const previousCompletion = dailyData.length > 0
        ? dailyData.reduce((sum, item) => sum + item.previousCompletionRate, 0) / dailyData.length
        : 0;

      return {
        totalViews: {
          current: periodAggregates.periodSessions,
          trend: calculatePercentageChange(periodAggregates.periodSessions, periodAggregates.prevPeriodSessions)
        },
        uniqueVisitors: {
          current: periodAggregates.periodUsers, // ✅ CRITICAL: Using period-level unique users (non-additive metric)
          trend: calculatePercentageChange(periodAggregates.periodUsers, periodAggregates.prevPeriodUsers)
        },
        averageWatchTime: {
          current: periodAggregates.periodAverageWatchTime,
          trend: calculatePercentageChange(periodAggregates.periodAverageWatchTime, periodAggregates.prevPeriodAverageWatchTime)
        },
        completionRate: {
          current: currentCompletion,
          trend: calculatePercentageChange(currentCompletion, previousCompletion)
        }
      };
    }

    // ✅ FALLBACK: Legacy calculation for backward compatibility
    console.log('⚠️ TRENDS: Using LEGACY summing for cards (fallback mode)');
    const calculatePeriodSum = (period: typeof dailyData, metric: keyof TrendDataPoint) => {
      return period.reduce((sum, item) => sum + (item[metric] as number), 0);
    };

    // Helper function for safe division (avoid NaN)
    const safeDiv = (numerator: number, denominator: number): number => {
      return denominator > 0 ? numerator / denominator : 0;
    };

    // Current period totals (legacy summing)
    const currentViews = calculatePeriodSum(dailyData, 'totalViews');
    const currentVisitors = calculatePeriodSum(dailyData, 'uniqueVisitors'); // ⚠️ Still incorrect for unique users
    
    // Calculate weighted average (total_engagement_seconds / total_sessions)
    const currentTotalEngagement = calculatePeriodSum(dailyData, 'totalEngagementSeconds');
    const currentWatchTime = safeDiv(currentTotalEngagement, currentViews);
    
    const currentCompletion = dailyData.length > 0
      ? calculatePeriodSum(dailyData, 'completionRate') / dailyData.length
      : 0;

    // Previous period totals (legacy summing)
    const previousViews = calculatePeriodSum(dailyData, 'previousTotalViews');
    const previousVisitors = calculatePeriodSum(dailyData, 'previousUniqueVisitors'); // ⚠️ Still incorrect for unique users
    
    // Calculate weighted average for previous period
    const previousTotalEngagement = calculatePeriodSum(dailyData, 'previousTotalEngagementSeconds');
    const previousWatchTime = safeDiv(previousTotalEngagement, previousViews);
    
    const previousCompletion = dailyData.length > 0
      ? calculatePeriodSum(dailyData, 'previousCompletionRate') / dailyData.length
      : 0;

    return {
      totalViews: {
        current: currentViews,
        trend: calculatePercentageChange(currentViews, previousViews)
      },
      uniqueVisitors: {
        current: currentVisitors,
        trend: calculatePercentageChange(currentVisitors, previousVisitors)
      },
      averageWatchTime: {
        current: currentWatchTime,
        trend: calculatePercentageChange(currentWatchTime, previousWatchTime)
      },
      completionRate: {
        current: currentCompletion,
        trend: calculatePercentageChange(currentCompletion, previousCompletion)
      }
    };
  };

  const metrics = calculateTrendMetrics();

  const formatWatchTime = (seconds: number): string => {
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}min`;
    }
  };

  const formatDurationTooltip = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const secs = Math.round(seconds % 60);
    
    if (hours > 0) {
      if (mins > 0 && secs > 0) {
        return `${hours}h ${mins}min ${secs}s`;
      } else if (mins > 0) {
        return `${hours}h ${mins}min`;
      } else {
        return `${hours}h`;
      }
    } else {
      if (secs > 0) {
        return `${mins}min ${secs}s`;
      } else {
        return `${mins}min`;
      }
    }
  };

  const getChartData = () => {
    // ✅ CRITICAL FIX: Use dailyData for charts (line visualizations)
    const dailyData = trendsResponse?.dailyData;
    if (!dailyData || dailyData.length === 0) return [];
    
    console.log('📈 CHART DATA: Using dailyData for line charts');
    
    switch (selectedMetric) {
      case 'visitors':
        return dailyData.map(item => ({ 
          ...item, 
          value: item.uniqueVisitors,
          previousValue: item.previousUniqueVisitors
        }));
      case 'watchTime':
        return dailyData.map(item => ({ 
          ...item, 
          value: item.averageWatchTime,
          previousValue: item.previousAverageWatchTime
        }));
      case 'completion':
        return dailyData.map(item => ({ 
          ...item, 
          value: item.completionRate,
          previousValue: item.previousCompletionRate
        }));
      default:
        return dailyData.map(item => ({ 
          ...item, 
          value: item.totalViews,
          previousValue: item.previousTotalViews
        }));
    }
  };

  const getChartConfig = () => {
    switch (selectedMetric) {
      case 'visitors':
        return {
          color: '#3B82F6',
          label: 'Visiteurs uniques',
          format: (value: number) => value.toLocaleString('fr-FR')
        };
      case 'watchTime':
        return {
          color: '#10B981',
          label: 'Temps de visionnage',
          format: (value: number) => formatDurationTooltip(value)
        };
      case 'completion':
        return {
          color: '#8B5CF6',
          label: 'Completion Rate (%)',
          format: (value: number) => `${Math.round(value)}%`
        };
      default:
        return {
          color: '#D67C4A',
          label: 'Total Views',
          format: (value: number) => value.toLocaleString('fr-FR')
        };
    }
  };

  if (isLoading) {
    return (
      <AnalyticsNewLoadingStates 
        mode="loading" 
        title="Loading trends"
        description="Analyzing performance data..."
      />
    );
  }

  if (error) {
    return (
      <AnalyticsNewLoadingStates 
        mode="error" 
        title="Loading error"
        description="Unable to load trends data"
      />
    );
  }

  const chartConfig = getChartConfig();
  const chartData = getChartData();

  return (
    <div className="analytics-new-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📈 Trends</h2>
          <p className="text-gray-600 mt-1">
            Website analytics trends and visitor behavior over time
          </p>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          {datePreset === '7d' ? 'Last 7 days' : 
           datePreset === '30d' ? 'Last 30 days' : 'Last 90 days'}
        </Badge>
      </div>

      {/* Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendCard
          title="Website Sessions"
          value={metrics.totalViews.current.toLocaleString('en-US')}
          trend={metrics.totalViews.trend}
          icon={<Eye className="h-4 w-4" />}
          description="Total visits to the website"
        />
        <TrendCard
          title="Unique Visitors"
          value={metrics.uniqueVisitors.current.toLocaleString('en-US')}
          trend={metrics.uniqueVisitors.trend}
          icon={<Users className="h-4 w-4" />}
          description="Distinct visitors (IP-based)"
        />
        <TrendCard
          title="Average Session Duration"
          value={formatWatchTime(metrics.averageWatchTime.current)}
          trend={metrics.averageWatchTime.trend}
          icon={<Clock className="h-4 w-4" />}
          description="Time spent on site per visit"
        />
        <TrendCard
          title="Video Engagement"
          value={`${Math.round(metrics.completionRate.current)}%`}
          trend={metrics.completionRate.trend}
          icon={<Video className="h-4 w-4" />}
          description="Visitors who watched videos"
        />
      </div>

      {/* Chart Section */}
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Time Series Evolution
              </CardTitle>
              <CardDescription className="text-gray-600">
                Daily trend analysis
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedMetric === 'views' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('views')}
                className={selectedMetric === 'views' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              >
                Sessions
              </Button>
              <Button
                variant={selectedMetric === 'visitors' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('visitors')}
                className={selectedMetric === 'visitors' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              >
                Visitors
              </Button>
              <Button
                variant={selectedMetric === 'watchTime' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('watchTime')}
                className={selectedMetric === 'watchTime' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              >
                Duration
              </Button>
              <Button
                variant={selectedMetric === 'completion' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMetric('completion')}
                className={selectedMetric === 'completion' ? 'seo-language-btn-active' : 'seo-language-btn-inactive'}
              >
                Engagement
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tick={{ fill: '#6b7280' }}
                  tickFormatter={chartConfig.format}
                />
                <Tooltip 
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0] && payload[0].payload) {
                      return formatTooltipDate(payload[0].payload.date);
                    }
                    return value;
                  }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'previousValue' ? 'Previous Period' : 'Current Period';
                    return [chartConfig.format(value), label] as [string, string];
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const formattedDate = payload[0]?.payload?.date ? formatTooltipDate(payload[0].payload.date) : label;
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-gray-900 mb-2">{formattedDate}</p>
                          {payload.map((entry, index) => {
                            const isCurrent = entry.name !== 'previousValue';
                            return (
                              <p key={index} className={`text-sm ${isCurrent ? 'font-bold' : ''}`} style={{ color: entry.color }}>
                                {entry.name === 'previousValue' ? 'Previous Period' : 'Current Period'}: {chartConfig.format(entry.value as number)}
                              </p>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Current period - solid line */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartConfig.color}
                  strokeWidth={3}
                  dot={{ fill: chartConfig.color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: chartConfig.color }}
                />
                {/* Previous period - dotted line */}
                <Line
                  type="monotone"
                  dataKey="previousValue"
                  stroke={chartConfig.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'transparent', stroke: chartConfig.color, strokeWidth: 1, r: 3 }}
                  opacity={0.7}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Metric Explanation */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-orange-400">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  About this metric
                </h4>
                <div className="text-sm text-gray-700">
                  {getMetricExplanation(selectedMetric)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function for metric explanations  
const getMetricExplanation = (metric: string) => {
  
  switch (metric) {
    case 'sessions':
    case 'views':
      return (
        <>
          <p className="mb-2">
            Website Sessions represent individual visits to the site. Each session includes all page views and interactions during a single visit, helping you understand reach and visitor engagement patterns.
          </p>
          <p className="text-xs text-gray-600">
            Sessions are additive - the chart shows daily totals that can be summed to match the card value. A session begins when someone arrives and ends after 30 minutes of inactivity or browser closure.
          </p>
        </>
      );
    case 'visitors':
      return (
        <>
          <p className="mb-2">
            Unique Visitors shows how many different people visited during the selected period. The card displays period-level unique visitors (deduplicated), while the chart shows daily unique visitors.
          </p>
          <p className="text-xs text-gray-600">
            <strong>Important:</strong> Daily chart values should not be summed as the same person visiting multiple days would be counted multiple times. The card shows the true unique count across the entire period.
          </p>
        </>
      );
    case 'watchTime':
    case 'duration':
      return (
        <>
          <p className="mb-2">
            Session Duration measures average time visitors spend per visit. The card shows the overall period average, while the chart displays daily averages for each day.
          </p>
          <p className="text-xs text-gray-600">
            <strong>Important:</strong> Daily duration values represent averages and should not be summed. The card shows the weighted average duration across all sessions in the period.
          </p>
        </>
      );
    case 'completion':
    case 'engagement':
      return (
        <>
          <p className="mb-2">
            Video Engagement tracks the percentage of visitors who actively interact with the video portfolio. The card shows the overall period rate, while the chart displays daily engagement rates.
          </p>
          <p className="text-xs text-gray-600">
            <strong>Important:</strong> Daily engagement percentages represent rates and should not be summed. The card shows the average engagement rate across the entire period.
          </p>
        </>
      );
    default:
      return (
        <>
          <p className="mb-2">
            This metric provides insights into website performance and visitor behavior, helping you understand how effectively the portfolio converts visitors into potential clients.
          </p>
          <p className="text-xs text-gray-600">
            Data is collected through Google Analytics 4 with real-time processing. Metrics are filtered to exclude internal traffic and bot visits for accurate business intelligence.
          </p>
        </>
      );
  }
};