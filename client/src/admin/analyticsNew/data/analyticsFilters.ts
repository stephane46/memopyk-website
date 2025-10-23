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
  
  // Cache key for react-query
  queryKey: (string | null)[];
  
  // Debug info
  appliedFilters: {
    dateRange: { start: string; end: string };
    exclusions: { dateEnabled: boolean; sinceDate?: string };
    segmentation: { language: string; country: string; videoId: string };
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
    videoId
  } = filterState;
  
  // Build base parameters
  const params: Partial<FilteredAnalyticsParams> = {
    locale: language === 'all' ? 'all' : language,
  };

  // 🔍 CRITICAL DEBUG: Verify locale parameter handling
  console.log('🔍 LOCALE PARAM:', language, '→', params.locale);
  console.log('🟢 FRONTEND DEBUG:', {
    'input_language': language,
    'output_locale': params.locale,
    'filterState': filterState,
    'reportType': reportType
  });
  
  // ✅ CRITICAL FIX: ALWAYS include explicit dates for endpoints that require them (like /api/ga4/geo)
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
  
  // Add segmentation filters
  if (country !== 'all') params.country = country;
  if (videoId !== 'all') params.videoId = videoId;
  
  // ✅ CRITICAL FIX: Build cache key that includes ALL filter parameters to prevent cache collision
  const queryKey = [
    reportType, // Include report type
    datePreset !== 'custom' ? datePreset : null, // Include preset
    datePreset !== 'custom' ? null : [start, end], // Include explicit dates
    sinceDateEnabled && sinceDate ? sinceDate : 'none', // Include since date (use 'none' instead of null to differentiate)
    language === 'all' ? 'all' : language,
    country === 'all' ? 'all' : country,
    videoId === 'all' ? 'all' : videoId
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
      segmentation: { language, country, videoId }
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
 * Debug logging for filter application.
 * Helps troubleshoot exclusion filter issues.
 */
export function logFilterApplication(reportType: string, params: FilteredAnalyticsParams) {
  console.log(`🔍 ANALYTICS FILTER [${reportType.toUpperCase()}]:`, {
    queryKey: params.queryKey,
    appliedFilters: params.appliedFilters,
    apiParams: {
      preset: params.preset,
      startDate: params.startDate,
      endDate: params.endDate,
      since: params.since,
      locale: params.locale
    }
  });
  
  if (params.appliedFilters.exclusions.dateEnabled) {
    console.log(`✅ EXCLUSION FILTER ACTIVE: Excluding data before ${params.appliedFilters.exclusions.sinceDate}`);
  } else {
    console.log(`❌ EXCLUSION FILTER DISABLED: Showing all data`);
  }
}