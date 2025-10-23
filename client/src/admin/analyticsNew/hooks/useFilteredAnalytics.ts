import { useQuery } from '@tanstack/react-query';
import { buildAnalyticsParams, buildAnalyticsUrl, logFilterApplication, FilteredAnalyticsParams } from '../data/analyticsFilters';
import { useAnalyticsNewFilters } from '../analyticsNewFilters.store';

/**
 * UNIFIED ANALYTICS DATA HOOK
 * 
 * This hook ensures ALL analytics data goes through the centralized filtering system.
 * No component should use useQuery directly for analytics data.
 */

interface UseFilteredAnalyticsConfig {
  reportType: 'kpis' | 'topVideos' | 'videoFunnel' | 'geo' | 'trends' | 'realtimeVideoProgress';
  endpoint?: string; // Override default endpoint
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

export function useFilteredAnalytics<T>(config: UseFilteredAnalyticsConfig) {
  // Get filter state from store (this is a React hook call)
  const {
    datePreset,
    getDateRange,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  } = useAnalyticsNewFilters();
  
  // Get date range
  const { start, end } = getDateRange();
  
  // Build standardized filter parameters (pass state as parameters)
  const filterParams = buildAnalyticsParams(config.reportType, {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Determine API endpoint
  const defaultEndpoint = `/api/ga4/${config.reportType === 'kpis' ? 'kpis' : 'report'}`;
  const endpoint = config.endpoint || defaultEndpoint;
  
  return useQuery<T>({
    queryKey: filterParams.queryKey,
    queryFn: async () => {
      // Debug logging
      logFilterApplication(config.reportType, filterParams);
      
      // Build filtered URL
      const url = buildAnalyticsUrl(endpoint, filterParams);
      
      // Special handling for non-KPI reports
      if (config.reportType !== 'kpis') {
        // Add report type parameter for /api/ga4/report endpoint
        const urlObj = new URL(url);
        urlObj.searchParams.set('report', config.reportType);
        const finalUrl = urlObj.toString();
        
        const response = await fetch(finalUrl);
        if (!response.ok) {
          throw new Error(`Analytics request failed: ${response.status}`);
        }
        return response.json();
      }
      
      // KPIs use direct endpoint
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Analytics KPIs request failed: ${response.status}`);
      }
      return response.json();
    },
    enabled: config.enabled ?? true,
    refetchInterval: config.refetchInterval,
    staleTime: 0, // ✅ TEMPORARY: Set to 0 for immediate testing
  });
}

/**
 * Specialized hook for KPI data (Overview tab)
 */
export function useFilteredKpis<T>() {
  return useFilteredAnalytics<T>({
    reportType: 'kpis',
    staleTime: 2 * 60 * 1000, // 2 minutes for KPIs
  });
}

/**
 * Specialized hook for video data (Video tab)
 */
export function useFilteredTopVideos<T>() {
  return useFilteredAnalytics<T>({
    reportType: 'topVideos',
  });
}

/**
 * Specialized hook for trend data (Trends tab)
 */
export function useFilteredTrends<T>(customEndpoint?: string) {
  return useFilteredAnalytics<T>({
    reportType: 'trends',
    endpoint: customEndpoint,
  });
}

/**
 * Specialized hook for geo data (Geo tab)
 */
export function useFilteredGeo<T>() {
  return useFilteredAnalytics<T>({
    reportType: 'geo',
    endpoint: '/api/ga4/geo',
  });
}