import { useQuery } from '@tanstack/react-query';
import { buildAnalyticsParams, buildAnalyticsUrl, logFilterApplication } from '../data/analyticsFilters';
import { useAnalyticsNewFilters } from '../analyticsNewFilters.store';

/**
 * 🚨 CRITICAL: UNIFIED ANALYTICS REPORT HOOKS - ENFORCE CENTRALIZATION 🚨
 * 
 * This module provides specialized hooks for each analytics report type that
 * enforce the centralized filtering system. All hooks use:
 * - useAnalyticsNewFilters store for consistent date ranges
 * - buildAnalyticsParams() for standardized parameter building
 * - buildAnalyticsUrl() for consistent URL construction
 * - logFilterApplication() for debugging filter application
 * 
 * ⛔ STRICT RULE: NO component should use useQuery directly for analytics data.
 * ⛔ STRICT RULE: NO manual URL construction or parameter building allowed.
 * ⛔ STRICT RULE: ALL analytics data MUST go through these centralized hooks.
 * 
 * If you need to add a new analytics endpoint:
 * 1. Add it to buildAnalyticsParams() in analyticsFilters.ts
 * 2. Create a new hook here following the existing pattern
 * 3. Components import and use your new hook - never useQuery directly
 * 
 * Violating these rules will cause filter inconsistencies and cache pollution.
 */

// ==================== TYPE DEFINITIONS ====================

// Import centralized types instead of duplicating
import type { TopVideoRow, TopVideosData } from '../data/types';

export interface CountryData {
  country: string;
  sessions: number;
  visitors: number;
  iso3?: string;
}

export interface CityData {
  country: string;
  city: string;
  sessions: number;
  visitors: number;
}

export interface GeoAnalyticsData {
  countries: CountryData[];
  cities: CityData[];
  totalSessions: number;
  totalVisitors: number;
  coverageCount: number;
}

export interface TrendDataPoint {
  date: string;
  formattedDate: string;
  totalViews: number;
  uniqueVisitors: number;
  averageWatchTime: number;
  completionRate: number;
  videoViews: number;
  totalEngagementSeconds: number; // Total engagement seconds for weighted averages
  // Previous period data for comparison
  previousTotalViews: number;
  previousUniqueVisitors: number;
  previousAverageWatchTime: number;
  previousTotalEngagementSeconds: number; // Previous period engagement seconds
  previousCompletionRate: number;
}

export interface PeriodAggregates {
  periodSessions: number;
  periodUsers: number;
  periodAverageWatchTime: number;
  periodTotalEngagement: number;
  prevPeriodSessions: number;
  prevPeriodUsers: number;
  prevPeriodAverageWatchTime: number;
  prevPeriodTotalEngagement: number;
}

export interface TrendsResponse {
  dailyData: TrendDataPoint[];
  periodAggregates: PeriodAggregates;
}

export type TrendsData = TrendDataPoint[];

// Common return type for all hooks with debugging info
export interface FilteredAnalyticsResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  appliedFilters: {
    dateRange: { start: string; end: string };
    exclusions: { dateEnabled: boolean; sinceDate?: string };
    segmentation: { language: string; country: string; videoId: string };
  };
  refetch: () => void;
}

// ==================== HOOK IMPLEMENTATIONS ====================

/**
 * Hook for Top Videos data (Video tab)
 * Fetches video performance metrics with centralized filtering
 */
export function useFilteredTopVideos(): FilteredAnalyticsResult<TopVideosData> {
  // Get filter state from store
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
  
  // Build standardized filter parameters
  const filterParams = buildAnalyticsParams('topVideos', {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Use TanStack Query with proper queryKey
  const { data, isLoading, error, refetch } = useQuery<TopVideosData>({
    queryKey: filterParams.queryKey,
    queryFn: async () => {
      // Debug logging
      logFilterApplication('topVideos', filterParams);
      
      // Build filtered URL
      const url = buildAnalyticsUrl('/api/ga4/report', filterParams);
      const urlObj = new URL(url);
      urlObj.searchParams.set('report', 'topVideos');
      
      const response = await fetch(urlObj.toString());
      if (!response.ok) {
        throw new Error(`Top Videos request failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Transform data to expected format
      const videos: TopVideoRow[] = (rawData.videos || rawData.data || []).map((item: any) => ({
        videoId: item.videoId || item.video_id || '',
        title: item.title || item.videoTitle || 'Unknown Video',
        views: item.views || item.sessions || 0,
        uniqueViewers: item.uniqueViewers || item.users || item.visitors || 0,
        averageWatchTime: item.averageWatchTime || item.avgWatchTime || item.avg_watch_time || 0,
        completionRate: item.completionRate || item.completion_rate || 0,
        engagement: item.engagement || item.engagementRate || 0,
        thumbnail: item.thumbnail || item.thumbnailUrl,
        duration: item.duration || item.videoDuration
      }));
      
      return {
        videos,
        totalViews: rawData.totalViews || videos.reduce((sum, v) => sum + v.views, 0),
        totalUniqueViewers: rawData.totalUniqueViewers || videos.reduce((sum, v) => sum + v.uniqueViewers, 0),
        averageCompletionRate: rawData.averageCompletionRate || 
          (videos.length > 0 ? videos.reduce((sum, v) => sum + v.completionRate, 0) / videos.length : 0)
      };
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    appliedFilters: filterParams.appliedFilters,
    refetch
  };
}

/**
 * Hook for Geographic data (Geo tab)
 * Fetches country and city analytics with centralized filtering
 */
export function useFilteredGeo(): FilteredAnalyticsResult<GeoAnalyticsData> {
  // Get filter state from store
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
  
  // Build standardized filter parameters
  const filterParams = buildAnalyticsParams('geo', {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Use TanStack Query with proper queryKey
  const { data, isLoading, error, refetch } = useQuery<GeoAnalyticsData>({
    queryKey: filterParams.queryKey,
    queryFn: async () => {
      // Debug logging
      logFilterApplication('geo', filterParams);
      
      // Build filtered URL
      const url = buildAnalyticsUrl('/api/ga4/geo', filterParams);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geographic data request failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Process countries data
      const countries: CountryData[] = (rawData.countries || []).map((item: any) => ({
        country: item.country || item.name || 'Unknown',
        sessions: item.sessions || item.views || 0,
        visitors: item.visitors || item.users || item.uniqueVisitors || 0,
        iso3: item.iso3 || item.countryCode
      }));
      
      // Process cities data
      const cities: CityData[] = (rawData.cities || []).map((item: any) => ({
        country: item.country || 'Unknown',
        city: item.city || item.name || 'Unknown',
        sessions: item.sessions || item.views || 0,
        visitors: item.visitors || item.users || item.uniqueVisitors || 0
      }));
      
      // Calculate totals
      const totalSessions = countries.reduce((sum, c) => sum + c.sessions, 0);
      const totalVisitors = countries.reduce((sum, c) => sum + c.visitors, 0);
      const coverageCount = countries.length;
      
      return {
        countries,
        cities,
        totalSessions,
        totalVisitors,
        coverageCount
      };
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    appliedFilters: filterParams.appliedFilters,
    refetch
  };
}

/**
 * Hook for Trends data (Trends tab)
 * Fetches time series analytics with centralized filtering
 */
export function useFilteredTrends(): FilteredAnalyticsResult<TrendsResponse> {
  // Get filter state from store
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
  
  // Build standardized filter parameters
  const filterParams = buildAnalyticsParams('trends', {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Use TanStack Query with proper queryKey
  const { data, isLoading, error, refetch } = useQuery<TrendsResponse>({
    queryKey: filterParams.queryKey,
    queryFn: async () => {
      // Debug logging
      logFilterApplication('trends', filterParams);
      
      // Build filtered URL
      const url = buildAnalyticsUrl('/api/ga4/trend', filterParams);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Trends data request failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      console.log('🔍 TRENDS HOOK: Received backend response structure:', {
        hasDailyData: !!rawData.dailyData,
        hasPeriodAggregates: !!rawData.periodAggregates,
        legacyStructure: !rawData.dailyData && Array.isArray(rawData),
        keys: Object.keys(rawData)
      });
      
      // Helper function to format dates
      const formatDate = (dateStr: string): string => {
        // Handle GA4 YYYYMMDD format (e.g., "20250906")
        if (dateStr && dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
          const day = parseInt(dateStr.substring(6, 8));
          const date = new Date(year, month, day);
          
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
      
      // ✅ CRITICAL FIX: Handle new backend structure with period aggregates
      if (rawData.dailyData && rawData.periodAggregates) {
        console.log('📊 TRENDS HOOK: Using NEW backend structure with period aggregates');
        console.log('📊 PERIOD AGGREGATES:', rawData.periodAggregates);
        
        // Process daily data
        const processedDailyData = rawData.dailyData.map((item: any) => {
          const rawDate = item.date || item.day;
          return {
            date: rawDate,
            formattedDate: formatDate(rawDate),
            totalViews: item.sessions || item.views || item.totalViews || 0,
            uniqueVisitors: item.users || item.visitors || item.uniqueVisitors || 0,
            averageWatchTime: item.avgSessionDuration || item.avg_watch_time || item.averageWatchTime || 0,
            completionRate: item.bounceRate || item.completion_rate || 0,
            videoViews: item.sessions || item.videoViews || 0,
            totalEngagementSeconds: item.totalEngagementSeconds || 0,
            // Previous period data for comparison
            previousTotalViews: item.previousSessions || 0,
            previousUniqueVisitors: item.previousUsers || 0,
            previousAverageWatchTime: item.previousAvgDuration || 0,
            previousCompletionRate: item.previousBounceRate || 0,
            previousTotalEngagementSeconds: item.previousTotalEngagementSeconds || 0
          };
        });
        
        // Sort data chronologically by date to prevent artifacts
        const sortedDailyData = processedDailyData.sort((a, b) => {
          return a.date.localeCompare(b.date);
        });
        
        return {
          dailyData: sortedDailyData,
          periodAggregates: rawData.periodAggregates
        };
      }
      
      // ✅ FALLBACK: Handle legacy structure (array format) for backward compatibility
      console.log('⚠️ TRENDS HOOK: Using LEGACY backend structure - daily data only');
      const trends = rawData.trends || rawData.daily || rawData;
      const processedData = (Array.isArray(trends) ? trends : []).map((item: any) => {
        const rawDate = item.date || item.day;
        return {
          date: rawDate,
          formattedDate: formatDate(rawDate),
          totalViews: item.sessions || item.views || item.totalViews || 0,
          uniqueVisitors: item.users || item.visitors || item.uniqueVisitors || 0,
          averageWatchTime: item.avgSessionDuration || item.avg_watch_time || item.averageWatchTime || 0,
          completionRate: item.bounceRate || item.completion_rate || 0,
          videoViews: item.sessions || item.videoViews || 0,
          totalEngagementSeconds: item.totalEngagementSeconds || 0,
          // Previous period data for comparison
          previousTotalViews: item.previousSessions || 0,
          previousUniqueVisitors: item.previousUsers || 0,
          previousAverageWatchTime: item.previousAvgDuration || 0,
          previousCompletionRate: item.previousBounceRate || 0,
          previousTotalEngagementSeconds: item.previousTotalEngagementSeconds || 0
        };
      });
      
      // Sort data chronologically by date to prevent artifacts
      const sortedData = processedData.sort((a, b) => {
        return a.date.localeCompare(b.date);
      });
      
      // Return in new format with empty period aggregates as fallback
      return {
        dailyData: sortedData,
        periodAggregates: {
          periodSessions: 0,
          periodUsers: 0,
          periodAverageWatchTime: 0,
          periodTotalEngagement: 0,
          prevPeriodSessions: 0,
          prevPeriodUsers: 0,
          prevPeriodAverageWatchTime: 0,
          prevPeriodTotalEngagement: 0
        }
      };
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    appliedFilters: filterParams.appliedFilters,
    refetch
  };
}

/**
 * Advanced hook for Trends data with custom metric selection
 * Provides additional configuration for specific trend analysis
 */
export function useFilteredTrendsAdvanced(options?: {
  metric?: 'views' | 'visitors' | 'watchTime' | 'completion';
  endpoint?: string;
  staleTime?: number;
}): FilteredAnalyticsResult<TrendsData> {
  const { metric = 'views', endpoint = '/api/ga4/trend', staleTime = 60 * 1000 } = options || {};
  
  // Get filter state from store
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
  
  // Build standardized filter parameters with metric
  const filterParams = buildAnalyticsParams('trends', {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Use TanStack Query with enhanced queryKey including metric
  const { data, isLoading, error, refetch } = useQuery<TrendsData>({
    queryKey: [...filterParams.queryKey, metric], // Include metric in cache key
    queryFn: async () => {
      // Debug logging
      logFilterApplication(`trends-${metric}`, filterParams);
      
      // Build filtered URL with metric parameter
      const url = buildAnalyticsUrl(endpoint, filterParams);
      const urlObj = new URL(url);
      urlObj.searchParams.set('metric', metric);
      
      const response = await fetch(urlObj.toString());
      if (!response.ok) {
        throw new Error(`Advanced Trends data request failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Use the same transformation logic as the base trends hook
      const baseHook = useFilteredTrends();
      return rawData; // Could be enhanced to process metric-specific transformations
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime,
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    appliedFilters: filterParams.appliedFilters,
    refetch
  };
}

/**
 * Hook for CTA (Call-to-Action) Analytics data
 * Fetches CTA click data for both "Free Consultation" (book_call) and "Free Quote" (quick_quote)
 */
export function useFilteredCta(): FilteredAnalyticsResult<import('../data/types').CtaAnalyticsData> {
  // Get filter state from store
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
  
  // Build standardized filter parameters
  const filterParams = buildAnalyticsParams('cta', {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId
  });
  
  // Use TanStack Query with proper queryKey
  const { data, isLoading, error, refetch } = useQuery<import('../data/types').CtaAnalyticsData>({
    queryKey: filterParams.queryKey,
    queryFn: async () => {
      // Debug logging
      logFilterApplication('cta', filterParams);
      
      // Build filtered URL
      const url = buildAnalyticsUrl('/api/ga4/cta', filterParams);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CTA Analytics request failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Return the ctaData from the API response
      return rawData.ctaData || {
        totalClicks: 0,
        timeRange: { start, end },
        ctas: {
          book_call: {
            ctaId: 'book_call',
            ctaName: 'Free Consultation',
            totalClicks: 0,
            languageBreakdown: { 'fr-FR': 0, 'en-US': 0 },
            sectionBreakdown: {},
            dailyTrend: []
          },
          quick_quote: {
            ctaId: 'quick_quote',
            ctaName: 'Free Quote', 
            totalClicks: 0,
            languageBreakdown: { 'fr-FR': 0, 'en-US': 0 },
            sectionBreakdown: {},
            dailyTrend: []
          }
        },
        languageTotals: { 'fr-FR': 0, 'en-US': 0 },
        dailyTotals: [],
        topSections: []
      };
    },
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000, // 2 minutes for CTA data
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    appliedFilters: filterParams.appliedFilters,
    refetch
  };
}