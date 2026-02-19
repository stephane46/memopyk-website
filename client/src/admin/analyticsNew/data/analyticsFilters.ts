/**
 * 🚨 CRITICAL: CENTRALIZED ANALYTICS FILTERING MODULE - SINGLE SOURCE OF TRUTH 🚨
 * 
 * This module ensures ALL analytics data goes through the same filtering logic:
 * - Date range calculation
 * - Exclusion filters (IP, date)
 * - Query parameter building
 * - Cache key generation
 * 
 * ⛔ ABSOLUTE RULE: NO component should build its own query parameters or bypass this system.
 * ⛔ ABSOLUTE RULE: NO manual URLSearchParams, fetch() with custom URLs, or date calculations.
 * ⛔ ABSOLUTE RULE: ALL analytics requests MUST use buildAnalyticsParams() and buildAnalyticsUrl().
 * 
 * 🔒 ENFORCEMENT: If you see analytics code that doesn't use these functions:
 * 1. It's a bug that will cause filter inconsistencies
 * 2. Refactor it to use this centralized system immediately
 * 3. Do not add exceptions - extend this system instead
 * 
 * This prevents:
 * - Duplicate date/query logic
 * - Filter inconsistencies between tabs
 * - Cache collisions and stale data
 * - URL parameter mismatches
 */

export interface FilteredAnalyticsParams {
  // Backend API parameters
  preset?: string;
  startDate?: string;
  endDate?: string;
  since?: string;
  locale?: string;
  country?: string;
  videoId?: string;
  dataSource?: 'ga4' | 'memopyk';
  
  // Cache key for react-query
  queryKey: (string | null)[];
  
  // Debug info
  appliedFilters: {
    dateRange: { start: string; end: string };
    exclusions: { dateEnabled: boolean; sinceDate?: string };
    segmentation: { language: string; country: string; videoId: string };
    dataSource: 'ga4' | 'memopyk';
  };
}

/**
 * Builds standardized, filtered parameters for ALL analytics requests.
 * This ensures every tab sees the same filtered data.
 * 
 * NOTE: This function takes filter state as parameters (not hooks)
 * so it can be called from within React hooks safely.
 */
export function buildAnalyticsParams(
  reportType: 'kpis' | 'topVideos' | 'videoFunnel' | 'geo' | 'trends' | 'realtimeVideoProgress' | 'cta',
  filterState: {
    datePreset: string;
    start: string;
    end: string;
    sinceDate: string | undefined;
    sinceDateEnabled: boolean;
    language: string;
    country: string;
    videoId: string;
    dataSource?: 'ga4' | 'memopyk';
  }
): FilteredAnalyticsParams {
  const {
    datePreset,
    start,
    end,
    sinceDate,
    sinceDateEnabled,
    language,
    country,
    videoId,
    dataSource = 'ga4'
  } = filterState;
  
  // Build base parameters
  const params: Partial<FilteredAnalyticsParams> = {
    locale: language === 'all' ? 'all' : language,
  };

  // Always include explicit dates for endpoints that require them
  // Also include preset for endpoints that support it (backward compatibility)
  params.startDate = start;
  params.endDate = end;
  
  // Keep preset parameter for endpoints that support it (like /api/ga4/report)
  if (datePreset !== 'custom') {
    params.preset = datePreset;
  }
  
  // CRITICAL: Apply exclusion filters
  if (sinceDateEnabled && sinceDate) {
    params.since = sinceDate;
  }
  
  // Add segmentation filters (ALWAYS include country, even if 'all')
  params.country = country;
  if (videoId !== 'all') params.videoId = videoId;
  
  // Add data source parameter
  params.dataSource = dataSource;
  
  // ✅ CRITICAL FIX: Build cache key that includes ALL filter parameters to prevent cache collision
  const queryKey = [
    reportType, // Include report type
    datePreset !== 'custom' ? datePreset : null, // Include preset
    datePreset !== 'custom' ? null : [start, end], // Include explicit dates
    sinceDateEnabled && sinceDate ? sinceDate : 'none', // Include since date (use 'none' instead of null to differentiate)
    language === 'all' ? 'all' : language,
    country === 'all' ? 'all' : country,
    videoId === 'all' ? 'all' : videoId,
    dataSource // Include data source in cache key
  ];
  
  return {
    ...params,
    queryKey,
    appliedFilters: {
      dateRange: { start, end },
      exclusions: {
        dateEnabled: sinceDateEnabled,
        sinceDate: sinceDateEnabled ? sinceDate : undefined
      },
      segmentation: { language, country, videoId },
      dataSource
    }
  } as FilteredAnalyticsParams;
}

/**
 * Builds URL with query parameters for analytics API calls.
 * Ensures consistent parameter formatting across all endpoints.
 */
export function buildAnalyticsUrl(baseUrl: string, params: FilteredAnalyticsParams): string {
  const url = new URL(baseUrl, window.location.origin);
  
  // Add parameters to URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && key !== 'queryKey' && key !== 'appliedFilters') {
      url.searchParams.set(key, String(value));
    }
  });
  
  return url.toString();
}

/**
 * Filter application logging (no-op in production).
 */
export function logFilterApplication(_reportType: string, _params: FilteredAnalyticsParams) {
  // Debug logging removed for production
}