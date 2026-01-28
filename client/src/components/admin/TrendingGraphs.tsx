import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, ScatterChart, Scatter
} from 'recharts';
import { 
  TrendingUp, Globe, Languages, Play, Users, Clock, Eye, 
  BarChart3, PieChart as PieChartIcon, Activity, Video,
  RefreshCw, MousePointer, Zap
} from 'lucide-react';
import { formatInt, formatSeconds, formatPercent } from '@/utils/format';
import { CountryFlag } from './CountryFlag';

// Professional color palette
const COLORS = {
  primary: '#2563eb',
  secondary: '#16a34a', 
  accent: '#dc2626',
  warning: '#ea580c',
  info: '#0891b2',
  purple: '#9333ea',
  pink: '#db2777',
  indigo: '#6366f1',
  teal: '#0d9488',
  orange: '#ea580c'
};

const CHART_COLORS = [
  COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.warning,
  COLORS.info, COLORS.purple, COLORS.pink, COLORS.indigo, COLORS.teal, COLORS.orange
];

interface TrendingGraphsProps {
  dateFrom?: string;
  dateTo?: string;
}

interface GA4Data {
  totalViews: number;
  uniqueVisitors: number;
  activeVisitors: number;
  videoPlays: number;
  countries: number;
  languages: number;
  topCountries?: Array<{ country: string; visitors: number; countryCode: string }>;
  topLanguages?: Array<{ language: string; visitors: number }>;
  siteLanguageChoice?: Array<{ language: string; visitors: number; percentage: number }>;
  topReferrers?: Array<{ source: string; visitors: number }>;
}

interface TimeSeriesData {
  date: string;
  visitors: number;
  totalViews: number;
  uniqueViews: number;
  countries: number;
  sessions: number;
  viewsPerVisitor: number;
}

interface VideoPerformance {
  video_id: string;
  video_title: string;
  views: number;
  total_watch_time: number;
  average_completion_rate: number;
}

export function TrendingGraphs({ dateFrom, dateTo }: TrendingGraphsProps) {
  const [selectedChart, setSelectedChart] = useState('overview');

  // Fetch GA4 comprehensive data
  const { data: ga4Data, isLoading: ga4Loading } = useQuery<GA4Data>({
    queryKey: ['ga4-trending-data', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);
      
      const response = await fetch(`/api/ga4/clean-comprehensive?${params}`);
      if (!response.ok) throw new Error(`GA4 API error: ${response.status}`);
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Note: Removed time series data fetching as we now use period comparison

  // Fetch dashboard data for video performance
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard', dateFrom, dateTo],
    enabled: true
  });

  const isLoading = ga4Loading || dashboardLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Trending Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading trending data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name}:</span>
            <span>{formatter ? formatter(entry.value, entry.name) : entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Period comparison chart
  const PeriodComparisonChart = () => {
    if (!ga4Data) {
      return (
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comparison data available</p>
          </div>
        </div>
      );
    }

    // Create period comparison data
    const comparisonData = [
      {
        metric: 'Page Views',
        current: ga4Data.totalViews,
        previous: Math.round(ga4Data.totalViews / (1 + (ga4Data.viewsChange || 0) / 100)),
        change: ga4Data.viewsChange || 0
      },
      {
        metric: 'Unique Visitors', 
        current: ga4Data.uniqueVisitors,
        previous: Math.round(ga4Data.uniqueVisitors / (1 + (ga4Data.uniqueVisitorsChange || 0) / 100)),
        change: ga4Data.uniqueVisitorsChange || 0
      },
      {
        metric: 'Return Visitors',
        current: ga4Data.returnVisitors,
        previous: Math.round(ga4Data.returnVisitors / (1 + (ga4Data.returnVisitorsChange || 0) / 100)),
        change: ga4Data.returnVisitorsChange || 0
      },
      {
        metric: 'Video Plays',
        current: ga4Data.totalVideoStarts,
        previous: Math.round(ga4Data.totalVideoStarts / (1 + (ga4Data.videoStartsChange || 0) / 100)),
        change: ga4Data.videoStartsChange || 0
      }
    ];

    return (
      <div className="space-y-6">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="metric" 
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis fontSize={12} />
            <Tooltip 
              content={<CustomTooltip 
                formatter={(value: number, name: string) => [formatInt(value), name]}
              />}
            />
            <Legend />
            <Bar 
              dataKey="current" 
              fill={COLORS.primary}
              name="Current Period"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="previous" 
              fill={COLORS.secondary}
              name="Previous Period"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Period comparison summary */}
        <div className="grid grid-cols-2 gap-4">
          {comparisonData.map((item) => (
            <div key={item.metric} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{item.metric}</h4>
                <div className={`flex items-center gap-1 text-xs ${
                  item.change >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {item.change >= 0 ? "▲" : "▼"} {Math.abs(item.change)}%
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Current: </span>
                  <span className="font-semibold">{formatInt(item.current)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Previous: </span>
                  <span>{formatInt(item.previous)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Geographic distribution chart
  const GeographicChart = () => {
    const topCountries = ga4Data?.topCountries?.slice(0, 8) || [];
    
    if (!topCountries.length) {
      return (
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No geographic data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topCountries} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="country" 
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis fontSize={12} />
            <Tooltip 
              content={<CustomTooltip 
                formatter={(value: number) => [formatInt(value), 'Visitors']}
              />}
            />
            <Bar 
              dataKey="visitors" 
              fill={COLORS.info}
              radius={[4, 4, 0, 0]}
              name="Visitors"
            />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Country list with flags */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {topCountries.map((country, index) => (
            <div key={country.country} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <CountryFlag country={country.countryCode} className="w-4 h-3" />
                <span className="font-medium">{country.country}</span>
              </div>
              <Badge variant="secondary">{formatInt(country.visitors)}</Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Language preferences chart
  const LanguageChart = () => {
    const languageData = ga4Data?.siteLanguageChoice || [];
    
    if (!languageData.length) {
      return (
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Languages className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No language data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={languageData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              dataKey="visitors"
              label={({ language, percentage }) => `${language}: ${formatPercent(percentage, 1)}`}
              labelLine={false}
            >
              {languageData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatInt(value), 'Visitors']}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Language breakdown */}
        <div className="space-y-2">
          {languageData.map((lang, index) => (
            <div key={lang.language} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="font-medium">{lang.language}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{formatInt(lang.visitors)}</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatPercent(lang.percentage, 1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Video performance chart
  const VideoPerformanceChart = () => {
    const videoData = (dashboardData as any)?.videoPerformance?.slice(0, 6) || [];
    
    if (!videoData.length) {
      return (
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No video performance data available</p>
          </div>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={videoData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="video_title" 
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis yAxisId="left" fontSize={12} />
          <YAxis yAxisId="right" orientation="right" fontSize={12} />
          <Tooltip 
            content={<CustomTooltip 
              formatter={(value: number, name: string) => [
                name.includes('Views') ? formatInt(value) : 
                name.includes('Time') ? formatSeconds(value) :
                name.includes('Rate') ? formatPercent(value, 1) : value,
                name
              ]}
            />}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="views"
            fill={COLORS.primary}
            name="Views"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="average_completion_rate"
            stroke={COLORS.accent}
            strokeWidth={3}
            name="Completion Rate (%)"
            dot={{ fill: COLORS.accent, r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // Traffic sources chart
  const TrafficSourcesChart = () => {
    const referrerData = ga4Data?.topReferrers?.slice(0, 6) || [];
    
    if (!referrerData.length) {
      return (
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <MousePointer className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No traffic source data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={referrerData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="visitors"
              label={({ source, visitors }) => `${source}: ${formatInt(visitors)}`}
              labelLine={false}
            >
              {referrerData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatInt(value), 'Visitors']}
            />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Sources breakdown */}
        <div className="space-y-2">
          {referrerData.map((source, index) => (
            <div key={source.source} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="font-medium">{source.source || 'Direct'}</span>
              </div>
              <Badge variant="secondary">{formatInt(source.visitors)}</Badge>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trending Analytics
            </CardTitle>
            <CardDescription>
              Period comparison charts showing current vs previous period performance
              {dateFrom && dateTo && (
                <span className="ml-2 text-sm font-medium text-orange-600">
                  • {dateFrom} to {dateTo} vs previous period
                </span>
              )}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Live Data
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedChart} onValueChange={setSelectedChart} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Comparison
            </TabsTrigger>
            <TabsTrigger value="geographic" className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              Geographic
            </TabsTrigger>
            <TabsTrigger value="languages" className="flex items-center gap-1">
              <Languages className="h-4 w-4" />
              Languages
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-1">
              <Video className="h-4 w-4" />
              Videos
            </TabsTrigger>
            <TabsTrigger value="sources" className="flex items-center gap-1">
              <MousePointer className="h-4 w-4" />
              Sources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Period Comparison</h3>
              <Badge variant="secondary">Current vs Previous Period</Badge>
            </div>
            <PeriodComparisonChart />
          </TabsContent>

          <TabsContent value="geographic" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Geographic Distribution</h3>
              <Badge variant="secondary">Top Countries</Badge>
            </div>
            <GeographicChart />
          </TabsContent>

          <TabsContent value="languages" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Language Preferences</h3>
              <Badge variant="secondary">Site Languages</Badge>
            </div>
            <LanguageChart />
          </TabsContent>

          <TabsContent value="videos" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Video Performance</h3>
              <Badge variant="secondary">Views & Completion</Badge>
            </div>
            <VideoPerformanceChart />
          </TabsContent>

          <TabsContent value="sources" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Traffic Sources</h3>
              <Badge variant="secondary">Top Referrers</Badge>
            </div>
            <TrafficSourcesChart />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}