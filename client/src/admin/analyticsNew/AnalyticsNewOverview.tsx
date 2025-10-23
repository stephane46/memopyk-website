import React, { useState, useEffect } from 'react';
import { Users, Video, Clock, MousePointer, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { OverviewKpis } from './components/OverviewKpis';
import { AnalyticsNewKpiCard, KpiData } from './AnalyticsNewKpiCard';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { useFilteredKpis } from './hooks/useFilteredAnalytics';
import './analyticsNew.tokens.css';

type MockState = 'normal' | 'loading' | 'empty' | 'error';

interface AnalyticsNewOverviewProps {
  className?: string;
}

// Helper function to format seconds into MM:SS format
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

// Helper function to calculate percentage change
const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const AnalyticsNewOverview: React.FC<AnalyticsNewOverviewProps> = ({ 
  className = '' 
}) => {
  const [mockState, setMockState] = useState<MockState>('normal');
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get current filter state
  const { datePreset, customDateStart, customDateEnd, sinceDate, sinceDateEnabled, getDateRange } = useAnalyticsNewFilters();
  
  // Get actual date range from preset
  const { start, end } = getDateRange();
  
  // Convert preset to the expected format for OverviewKpis component
  const preset = datePreset;

  // Get realtime GA4 data for active users
  const { data: ga4Data, isLoading: ga4Loading, error: ga4Error } = useQuery<any>({
    queryKey: ['/api/ga4/realtime'],
    refetchInterval: 15000, // Refresh every 15 seconds
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on quota exhausted errors
      if (error?.status === 500 && error?.message?.includes?.('RESOURCE_EXHAUSTED')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Use centralized filtering system for consistent data across all analytics tabs

  // Get analytics data through centralized filtering system
  const { data: reportData, isLoading: reportLoading, error: reportError } = useFilteredKpis<any>();

  const generateMockSparkline = () => {
    return Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 20);
  };

  // Handle state changes with mutual exclusion
  const handleStateChange = (newState: MockState) => {
    // Clear any existing loading timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }

    setMockState(newState);

    // Auto-return to normal after 3 seconds for loading state
    if (newState === 'loading') {
      const timeout = setTimeout(() => {
        setMockState('normal');
        setLoadingTimeout(null);
      }, 3000);
      setLoadingTimeout(timeout);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [loadingTimeout]);

  // Generate KPI data from real GA4 or mock data
  const generateKpiData = (): KpiData[] => {
    const USE_MOCK = import.meta.env?.VITE_USE_MOCK === "true";
    if (USE_MOCK) {
      return [
        {
          id: 'sessions',
          title: 'Total Sessions',
          value: mockState === 'empty' ? 0 : 2847,
          change: 12.3,
          trend: 'up',
          sparklineData: mockState === 'empty' ? [] : generateMockSparkline(),
          icon: Users,
          color: 'blue',
          isLoading: mockState === 'loading',
          error: mockState === 'error' ? 'Failed to load sessions data' : undefined,
        },
        {
          id: 'video-plays',
          title: 'Video Plays',
          value: mockState === 'empty' ? 0 : 1523,
          change: -2.1,
          trend: 'down',
          sparklineData: mockState === 'empty' ? [] : generateMockSparkline(),
          icon: Video,
          color: 'green',
          isLoading: mockState === 'loading',
          error: mockState === 'error' ? 'Failed to load video data' : undefined,
        },
        {
          id: 'avg-watch-time',
          title: 'Avg Watch Time',
          value: mockState === 'empty' ? '0:00' : '2:34',
          change: 8.7,
          trend: 'up',
          sparklineData: mockState === 'empty' ? [] : generateMockSparkline(),
          icon: Clock,
          color: 'orange',
          isLoading: mockState === 'loading',
          error: mockState === 'error' ? 'Failed to load watch time data' : undefined,
        },
        {
          id: 'cta-clicks',
          title: 'CTA Clicks',
          value: mockState === 'empty' ? 0 : 342,
          change: 15.8,
          trend: 'up',
          sparklineData: mockState === 'empty' ? [] : generateMockSparkline(),
          icon: MousePointer,
          color: 'purple',
          isLoading: mockState === 'loading',
          error: mockState === 'error' ? 'Failed to load CTA data' : undefined,
        },
        {
          id: 'completion-rate',
          title: 'Completion Rate',
          value: mockState === 'empty' ? '0%' : '68.4%',
          change: 0,
          trend: 'flat',
          sparklineData: mockState === 'empty' ? [] : generateMockSparkline(),
          icon: Eye,
          color: 'red',
          isLoading: mockState === 'loading',
          error: mockState === 'error' ? 'Failed to load completion data' : undefined,
        },
      ];
    }

    // Real GA4 data logic
    const kpis = reportData?.kpis;
    const sparklines = reportData?.sparklines;
    const previousKpis = reportData?.previousPeriod?.kpis;
    const isLoading = reportLoading;
    const error = reportError?.message;

    if (!kpis) {
      // Return loading or empty state
      return [
        {
          id: 'sessions',
          title: 'Total Sessions',
          value: 0,
          change: 0,
          trend: 'flat',
          sparklineData: [],
          icon: Users,
          color: 'blue',
          isLoading,
          error,
        },
        {
          id: 'video-plays',
          title: 'Video Plays',
          value: 0,
          change: 0,
          trend: 'flat',
          sparklineData: [],
          icon: Video,
          color: 'green',
          isLoading,
          error,
        },
        {
          id: 'avg-watch-time',
          title: 'Avg Watch Time',
          value: '0:00',
          change: 0,
          trend: 'flat',
          sparklineData: [],
          icon: Clock,
          color: 'orange',
          isLoading,
          error,
        },
        {
          id: 'completion-rate',
          title: 'Completion Rate',
          value: '0%',
          change: 0,
          trend: 'flat',
          sparklineData: [],
          icon: Eye,
          color: 'red',
          isLoading,
          error,
        },
      ];
    }

    // Calculate changes and trends - extract values from API response objects
    const sessionsChange = calculateChange(kpis.sessions?.value || 0, previousKpis?.sessions?.value || 0);
    const playsChange = calculateChange(kpis.plays?.value || 0, previousKpis?.plays?.value || 0);
    const watchTimeChange = calculateChange(kpis.avgWatch?.value || 0, previousKpis?.avgWatch?.value || 0);
    const completionChange = calculateChange(kpis.completions?.value || 0, previousKpis?.completions?.value || 0);

    const getTrend = (change: number) => {
      if (Math.abs(change) < 1) return 'flat';
      return change > 0 ? 'up' : 'down';
    };

    return [
      {
        id: 'sessions',
        title: 'Total Sessions',
        value: kpis.sessions?.value || 0,
        change: sessionsChange,
        trend: getTrend(sessionsChange),
        sparklineData: kpis.sessions?.trend || [],
        icon: Users,
        color: 'blue',
        isLoading: false,
        error: undefined,
      },
      {
        id: 'video-plays',
        title: 'Video Plays',
        value: kpis.plays?.value || 0,
        change: playsChange,
        trend: getTrend(playsChange),
        sparklineData: kpis.plays?.trend || [],
        icon: Video,
        color: 'green',
        isLoading: false,
        error: undefined,
      },
      {
        id: 'avg-watch-time',
        title: 'Avg Watch Time',
        value: formatWatchTime(kpis.avgWatch?.value || 0),
        change: watchTimeChange,
        trend: getTrend(watchTimeChange),
        sparklineData: kpis.avgWatch?.trend || [],
        icon: Clock,
        color: 'orange',
        isLoading: false,
        error: undefined,
      },
      {
        id: 'completion-rate',
        title: 'Completion Rate',
        value: kpis.completions?.value || 0,
        change: completionChange,
        trend: getTrend(completionChange),
        sparklineData: kpis.completions?.trend || [],
        icon: Eye,
        color: 'red',
        isLoading: false,
        error: undefined,
      },
    ];
  };

  const kpiData = generateKpiData();
  
  const realActiveUsers = ga4Data?.activeUsers || 0;
  const mockActiveUsers = mockState === 'empty' ? 0 : Math.floor(Math.random() * 20) + 5;

  return (
    <div className={`analytics-new-container space-y-6 ${className}`}>
      {/* Header with Active Users Badge */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">Analytics Overview</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge 
            variant="outline" 
            className="bg-green-50 text-green-700 border-green-200"
            data-testid="active-users-badge"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            {ga4Loading ? (
              <div className="inline-block w-6 h-4 bg-green-200 animate-pulse rounded mr-1" />
            ) : (
              realActiveUsers
            )} active now
          </Badge>
        </div>
      </div>

      {/* KPI Cards Grid - Phase 3 Fixtures */}
      <OverviewKpis 
        preset={preset === 'custom' ? '7d' : preset}
        startDate={end}    // Fixed: swap because getDateRange() returns backwards dates
        endDate={start}    // Fixed: swap because getDateRange() returns backwards dates
        data={reportData}
        loading={reportLoading}
        error={reportError}
        className="mb-6"
      />

      {/* Legacy KPI Cards for fallback */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ display: 'none' }}>
        {kpiData.map((kpi) => (
          <AnalyticsNewKpiCard
            key={kpi.id}
            data={kpi}
            className="transition-transform hover:scale-105"
          />
        ))}
      </div>

      {/* Mock State Toggles for Development */}
      {import.meta.env?.VITE_USE_MOCK === "true" && (
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-3">
            🔧 Phase 1 - Mock Data Mode
          </h3>
          <p className="text-xs text-yellow-700 mb-4">
            This overview is showing mock data with simulated states. Use the toggle controls below:
          </p>
          
          {/* Toggle Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="normal-state"
                checked={mockState === 'normal'}
                onCheckedChange={() => handleStateChange('normal')}
                data-testid="toggle-normal"
              />
              <Label htmlFor="normal-state" className="text-sm font-medium text-yellow-800">
                Normal
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="loading-state"
                checked={mockState === 'loading'}
                onCheckedChange={() => handleStateChange('loading')}
                data-testid="toggle-loading"
              />
              <Label htmlFor="loading-state" className="text-sm font-medium text-yellow-800">
                SIMULATE_LOADING
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="empty-state"
                checked={mockState === 'empty'}
                onCheckedChange={() => handleStateChange('empty')}
                data-testid="toggle-empty"
              />
              <Label htmlFor="empty-state" className="text-sm font-medium text-yellow-800">
                SIMULATE_EMPTY
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="error-state"
                checked={mockState === 'error'}
                onCheckedChange={() => handleStateChange('error')}
                data-testid="toggle-error"
              />
              <Label htmlFor="error-state" className="text-sm font-medium text-yellow-800">
                SIMULATE_ERROR
              </Label>
            </div>
          </div>

          {/* Current State Display */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="bg-white">
              Current State: <span className="font-bold text-yellow-800">{mockState.toUpperCase()}</span>
            </Badge>
            {mockState === 'loading' && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                Auto-returns to normal in 3s
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};