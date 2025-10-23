import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { buildAnalyticsParams, buildAnalyticsUrl } from '../admin/analyticsNew/data/analyticsFilters';
import { useAnalyticsNewFilters } from '../admin/analyticsNew/analyticsNewFilters.store';

export interface GA4KPIsData {
  plays: number;
  avgWatchSeconds: number;
  completionRate: number;
  topLocale: Array<{
    locale: string;
    users: number;
  }>;
}

export interface GA4TopVideo {
  video_id: string;
  plays: number;
  avg_watch_time_sec: number;
  reach50_pct: number;
  complete100_pct: number;
}

export type GA4TopVideosData = GA4TopVideo[];

export interface GA4FunnelRow {
  video_id: string;
  percent: number;
  count: number;
}

export type GA4FunnelData = GA4FunnelRow[] | { p25: number; p50: number; p75: number; p100: number; };

export interface GA4TrendDay {
  date: string;
  plays: number;
  avg_watch_time_sec: number;
}

export type GA4TrendData = GA4TrendDay[];

export interface GA4RealtimeEvent {
  ts: string;
  event: string;
  video_id: string;
  locale: string;
  percent?: number;
}

export interface GA4RealtimeData {
  active: number;
  recent: GA4RealtimeEvent[];
  cached: boolean;
}

export interface UseGA4VideoAnalyticsParams {
  startDate: string;
  endDate: string;
  locale?: string;
}

export const useGA4VideoAnalytics = (params: UseGA4VideoAnalyticsParams) => {
  const { startDate, endDate, locale = 'all' } = params;
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // ✅ CRITICAL FIX: Use centralized filter system instead of hardcoded parameters
  const filters = useAnalyticsNewFilters();
  
  // Build filter state for centralized parameter system
  const filterState = {
    datePreset: 'custom',
    start: startDate,
    end: endDate,
    sinceDate: undefined,
    sinceDateEnabled: false,
    language: locale !== 'all' ? locale : filters.language, // Use store language if locale is 'all'
    country: 'all',
    videoId: 'all'
  };

  // ✅ FIXED: KPIs query using centralized parameter system
  const kpisQuery = useQuery<GA4KPIsData>({
    queryKey: (() => {
      const filterParams = buildAnalyticsParams('kpis', filterState);
      return filterParams.queryKey;
    })(),
    queryFn: async () => {
      const filterParams = buildAnalyticsParams('kpis', filterState);
      const url = buildAnalyticsUrl('/api/ga4/kpis', filterParams);
      
      console.log('🔍 GA4 KPIs Request URL (centralized):', url);
      console.log('🔍 GA4 KPIs Filter State:', filterState);
      
      const response = await fetch(url);
      console.log('🔍 GA4 KPIs Response Status:', response.status, response.ok);
      
      if (!response.ok) {
        const error = await response.json();
        console.log('🔍 GA4 KPIs Error Response:', error);
        throw new Error(error.error || 'Failed to fetch GA4 KPIs');
      }
      
      const result = await response.json();
      console.log('🔍 GA4 KPIs Success Response:', result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!(startDate && endDate)
  });

  // Top videos query
  const topVideosQuery = useQuery<GA4TopVideosData>({
    queryKey: ['ga4-top-videos', startDate, endDate, locale],
    queryFn: async () => {
      console.log('🔍 GA4 Top Videos Request URL:', `/api/ga4/top-videos?startDate=${startDate}&endDate=${endDate}&locale=${locale}&limit=10`);
      const response = await fetch(
        `/api/ga4/top-videos?startDate=${startDate}&endDate=${endDate}&locale=${locale}&limit=10`
      );
      console.log('🔍 GA4 Top Videos Response Status:', response.status, response.ok);
      if (!response.ok) {
        const error = await response.json();
        console.log('🔍 GA4 Top Videos Error Response:', error);
        throw new Error(error.error || 'Failed to fetch GA4 top videos');
      }
      const result = await response.json();
      console.log('🔍 GA4 Top Videos Success Response:', result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!(startDate && endDate)
  });

  // Funnel query
  const funnelQuery = useQuery<GA4FunnelData>({
    queryKey: ['ga4-funnel', startDate, endDate, locale],
    queryFn: async () => {
      const response = await fetch(
        `/api/ga4/funnel?startDate=${startDate}&endDate=${endDate}&locale=${locale}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GA4 funnel data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!(startDate && endDate)
  });

  // Trend query
  const trendQuery = useQuery<GA4TrendData>({
    queryKey: ['ga4-trend', startDate, endDate, locale],
    queryFn: async () => {
      const response = await fetch(
        `/api/ga4/trend?startDate=${startDate}&endDate=${endDate}&locale=${locale}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GA4 trend data');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!(startDate && endDate)
  });

  // Realtime query (shorter cache time)
  const realtimeQuery = useQuery<GA4RealtimeData>({
    queryKey: ['ga4-realtime'],
    queryFn: async () => {
      const response = await fetch('/api/ga4/realtime');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch GA4 realtime data');
      }
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute for realtime data
    refetchInterval: 2 * 60 * 1000 // Auto-refresh every 2 minutes
  });

  // Refresh function to force new data
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        kpisQuery.refetch(),
        topVideosQuery.refetch(),
        funnelQuery.refetch(),
        trendQuery.refetch(),
        realtimeQuery.refetch()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if any query is loading
  const isLoading = kpisQuery.isLoading || topVideosQuery.isLoading || 
                   funnelQuery.isLoading || trendQuery.isLoading || realtimeQuery.isLoading;
  
  // Debug query states
  console.log('🔍 GA4 Query States:', {
    kpis: { isLoading: kpisQuery.isLoading, error: kpisQuery.error, data: !!kpisQuery.data, enabled: !!(startDate && endDate) },
    topVideos: { isLoading: topVideosQuery.isLoading, error: topVideosQuery.error, data: !!topVideosQuery.data, enabled: !!(startDate && endDate) },
    startDate, endDate, locale
  });

  // Check if any query has an error
  const error = kpisQuery.error || topVideosQuery.error || 
               funnelQuery.error || trendQuery.error || realtimeQuery.error;

  // Check if all data is cached - new API doesn't have cached property
  const allCached = false; // Always fresh data with new direct API

  return {
    kpis: kpisQuery.data,
    topVideos: topVideosQuery.data,
    funnel: funnelQuery.data,
    trend: trendQuery.data,
    realtime: realtimeQuery.data,
    isLoading,
    isRefreshing,
    error,
    allCached,
    refresh
  };
};