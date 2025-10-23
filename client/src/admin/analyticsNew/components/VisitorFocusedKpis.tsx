import React, { useState, useEffect } from 'react';
import { Eye, Users, UserCheck, RotateCcw, X, MapPin, Clock, Languages, Info, Network, Timer } from 'lucide-react';
import { useFilteredKpis } from "../hooks/useFilteredAnalytics";
import { useAnalyticsNewFilters } from '../analyticsNewFilters.store';
import type { KpisResponse } from "../data/types";
import { AnalyticsNewLoadingStates } from '../AnalyticsNewLoadingStates';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CountryFlag } from '@/components/admin/CountryFlag';
import { DateTime } from 'luxon';
interface VisitorFocusedKpisProps {
  preset?: "today" | "yesterday" | "7d" | "30d" | "90d";
  className?: string;
  // Add explicit start/end dates to ensure synchronization with main dashboard
  startDate?: string;
  endDate?: string;
}

// Cache bust v3.0 - FORCE COMPLETE REFRESH FOR BADGE FIXES  
export function VisitorFocusedKpis({ preset = "7d", className = "", startDate, endDate }: VisitorFocusedKpisProps) {
  const { data, isLoading: loading, error } = useFilteredKpis<KpisResponse>();
  
  // Get dates from global filter store instead of local calculations
  const { getDateRange, country } = useAnalyticsNewFilters();
  
  // Modal states
  const [isTotalViewsModalOpen, setIsTotalViewsModalOpen] = useState(false);
  const [isUniqueVisitorsModalOpen, setIsUniqueVisitorsModalOpen] = useState(false);
  const [isReturnVisitorsModalOpen, setIsReturnVisitorsModalOpen] = useState(false);
  
  // Modal data states - SEPARATE for each modal
  const [totalViewsData, setTotalViewsData] = useState<any[]>([]);
  const [uniqueVisitorsData, setUniqueVisitorsData] = useState<any[]>([]);
  const [returningVisitors, setReturningVisitors] = useState<any[]>([]);
  
  // Loading states for modals
  const [isLoadingTotalViews, setIsLoadingTotalViews] = useState(false);
  const [isLoadingUniqueVisitors, setIsLoadingUniqueVisitors] = useState(false);
  const [isLoadingReturningVisitors, setIsLoadingReturningVisitors] = useState(false);

  // ESC key functionality to close modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTotalViewsModalOpen(false);
        setIsUniqueVisitorsModalOpen(false);
        setIsReturnVisitorsModalOpen(false);
      }
    };

    // Add event listener only when any modal is open
    if (isTotalViewsModalOpen || isUniqueVisitorsModalOpen || isReturnVisitorsModalOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isTotalViewsModalOpen, isUniqueVisitorsModalOpen, isReturnVisitorsModalOpen]);

  if (loading) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="error" 
          title="Error loading visitor metrics"
          description="Unable to fetch visitor analytics data"
          showRetry={true}
        />
      </div>
    );
  }

  if (!data || !data.kpis) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="empty" 
          title="No visitor data available"
          description="No visitor analytics data found for the selected period"
        />
      </div>
    );
  }

  const { totalViews, uniqueVisitors, returnVisitors } = data.kpis;

  // Get dates from global store - this ensures consistency with exclusion filters
  const getGlobalDateRange = () => {
    const { start, end } = getDateRange();
    return {
      startDate: start,
      endDate: end
    };
  };

  // Modal handlers
  const handleTotalViewsModalOpen = async () => {
    setIsTotalViewsModalOpen(true);
    setIsLoadingTotalViews(true);
    // Fetch ALL sessions/views (can show same IP multiple times for different sessions)
    try {
      // Always use global store dates to ensure consistency with main dashboard
      const dateRange = getGlobalDateRange();
      const calcStartDate = dateRange.startDate;
      const calcEndDate = dateRange.endDate;
      console.log('📊 TOTAL VIEWS: Using global store dates (with exclusion filter):', calcStartDate, 'to', calcEndDate);
      
      // Trigger location enrichment in background (don't wait for it)
      fetch(`/api/analytics/enrich-locations?startDate=${calcStartDate}&endDate=${calcEndDate}`, {
        method: 'POST'
      }).then(() => {
        console.log('🌍 Location enrichment completed in background');
      }).catch((enrichError) => {
        console.warn('Location enrichment failed:', enrichError);
      });
      
      // Build URL with country filter if one is selected
      const url = new URL('/api/analytics/recent-visitors', window.location.origin);
      url.searchParams.set('dateFrom', calcStartDate);
      url.searchParams.set('dateTo', calcEndDate);
      url.searchParams.set('skipEnrichment', 'true');
      if (country && country !== 'all') {
        url.searchParams.set('country', country);
        console.log('🌍 TOTAL VIEWS: Including country filter:', country);
      }
      
      const response = await fetch(url.toString());
      const allVisitors = await response.json();
      
      // Show ALL visitors/sessions (can include multiple sessions from same IP)
      setTotalViewsData(allVisitors);
    } catch (error) {
      console.error('Failed to fetch total views data:', error);
    } finally {
      setIsLoadingTotalViews(false);
    }
  };

  const handleUniqueVisitorsModalOpen = async () => {
    setIsUniqueVisitorsModalOpen(true);
    setIsLoadingUniqueVisitors(true);
    // Fetch UNIQUE visitors data (different from total views which shows all sessions)
    try {
      // Always use global store dates to ensure consistency with main dashboard
      const dateRange = getGlobalDateRange();
      const calcStartDate = dateRange.startDate;
      const calcEndDate = dateRange.endDate;
      console.log('👥 UNIQUE VISITORS: Using global store dates (with exclusion filter):', calcStartDate, 'to', calcEndDate);
      
      // Trigger location enrichment in background (don't wait for it)
      fetch(`/api/analytics/enrich-locations?startDate=${calcStartDate}&endDate=${calcEndDate}`, {
        method: 'POST'
      }).then(() => {
        console.log('🌍 Location enrichment completed in background');
      }).catch((enrichError) => {
        console.warn('Location enrichment failed:', enrichError);
      });
      
      // Build URL with country filter if one is selected
      const url = new URL('/api/analytics/recent-visitors', window.location.origin);
      url.searchParams.set('dateFrom', calcStartDate);
      url.searchParams.set('dateTo', calcEndDate);
      url.searchParams.set('skipEnrichment', 'true');
      url.searchParams.set('uniqueOnly', 'true');
      if (country && country !== 'all') {
        url.searchParams.set('country', country);
        console.log('🌍 UNIQUE VISITORS: Including country filter:', country);
      }
      
      // Call UNIQUE visitors endpoint (different from total sessions)
      const response = await fetch(url.toString());
      const uniqueVisitors = await response.json();
      
      // For unique visitors, ensure we only show the latest visit per IP
      const uniqueByIP = uniqueVisitors.reduce((acc: any[], visitor: any) => {
        const existingIndex = acc.findIndex(v => v.ip_address === visitor.ip_address);
        if (existingIndex === -1) {
          acc.push(visitor);
        } else {
          // Keep the most recent visit
          if (new Date(visitor.created_at) > new Date(acc[existingIndex].created_at)) {
            acc[existingIndex] = visitor;
          }
        }
        return acc;
      }, []);
      
      setUniqueVisitorsData(uniqueByIP);
    } catch (error) {
      console.error('Failed to fetch unique visitors:', error);
    } finally {
      setIsLoadingUniqueVisitors(false);
    }
  };

  const handleReturnVisitorsModalOpen = async () => {
    setIsReturnVisitorsModalOpen(true);
    setIsLoadingReturningVisitors(true);
    // Fetch returning visitors data using explicit date range (prioritize props over preset)
    try {
      // Always use global store dates to ensure consistency with main dashboard
      const dateRange = getGlobalDateRange();
      const calcStartDate = dateRange.startDate;
      const calcEndDate = dateRange.endDate;
      console.log('🔄 RETURN VISITORS: Using global store dates (with exclusion filter):', calcStartDate, 'to', calcEndDate);
      
      // Trigger location enrichment in background (don't wait for it)
      fetch(`/api/analytics/enrich-locations?startDate=${calcStartDate}&endDate=${calcEndDate}`, {
        method: 'POST'
      }).then(() => {
        console.log('🌍 Location enrichment completed in background');
      }).catch((enrichError) => {
        console.warn('Location enrichment failed:', enrichError);
      });
      
      // Build URL with country filter if one is selected
      const url = new URL('/api/analytics/recent-visitors', window.location.origin);
      url.searchParams.set('dateFrom', calcStartDate);
      url.searchParams.set('dateTo', calcEndDate);
      url.searchParams.set('skipEnrichment', 'true');
      if (country && country !== 'all') {
        url.searchParams.set('country', country);
        console.log('🌍 RETURN VISITORS: Including country filter:', country);
      }
      
      const response = await fetch(url.toString());
      const allVisitors = await response.json();
      
      // Filter to show returning visitors only (server already deduplicates and tracks visit counts)
      const returningData = allVisitors.filter((visitor: any) => 
        visitor.visit_count > 1
      );
      
      setReturningVisitors(returningData);
    } catch (error) {
      console.error('Failed to fetch returning visitors:', error);
    } finally {
      setIsLoadingReturningVisitors(false);
    }
  };

  const formatLanguage = (lang: string) => {
    const languageMap: { [key: string]: { flag: string; display: string } } = {
      'fr': { flag: '🇫🇷', display: 'French' },
      'fr-FR': { flag: '🇫🇷', display: 'French' },
      'fr-fr': { flag: '🇫🇷', display: 'French' },
      'en': { flag: '🇺🇸', display: 'English' },
      'en-US': { flag: '🇺🇸', display: 'English (US)' },
      'en-us': { flag: '🇺🇸', display: 'English (US)' },
      'en-GB': { flag: '🇬🇧', display: 'English (UK)' }
    };
    return languageMap[lang] || { flag: '🌐', display: lang || 'Unknown' };
  };

  const getRelativeTime = (dateString: string) => {
    // Parse UTC timestamp from database, then convert to Paris time
    const date = DateTime.fromISO(dateString, { zone: 'UTC' }).setZone('Europe/Paris');
    const now = DateTime.now().setZone('Europe/Paris');
    const diffInMs = now.toMillis() - date.toMillis();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  const formatDuration = (durationSeconds: number | null | undefined) => {
    if (!durationSeconds || durationSeconds <= 0) {
      return 'Unknown';
    }

    const seconds = Math.floor(durationSeconds); // Duration is already in seconds from backend
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return `${seconds}s`;
    } else if (minutes < 60) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${hours}h ${minutes % 60}m`;
    }
  };

  return (
    <TooltipProvider>
      <div className={`grid gap-4 md:grid-cols-3 ${className}`}>
        <VisitorKpiCard 
          label="Total Views" 
          value={totalViews?.value || 0}
          trend={totalViews?.trend || []}
          icon={Eye}
          color="blue"
          onDetailClick={handleTotalViewsModalOpen}
          change={totalViews?.change || 0}
          description="Page views across site"
          data-testid="kpi-total-views"
        />
        <VisitorKpiCard 
          label="Unique Visitors" 
          value={uniqueVisitors?.value || 0}
          trend={uniqueVisitors?.trend || []}
          icon={Users}
          color="green"
          onDetailClick={handleUniqueVisitorsModalOpen}
          change={uniqueVisitors?.change || 0}
          description="Distinct visitors (IP-based)"
          data-testid="kpi-unique-visitors"
        />
        <VisitorKpiCard 
          label="Return Visitors" 
          value={returnVisitors?.value || 0}
          trend={returnVisitors?.trend || []}
          icon={RotateCcw}
          color="purple"
          onDetailClick={handleReturnVisitorsModalOpen}
          change={returnVisitors?.change || 0}
          description="Returning visitors"
          data-testid="kpi-return-visitors"
        />
      </div>
      
      {/* Help tooltip for data source explanation */}
      <div className="mt-4 flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
              <Info className="h-4 w-4" />
              Why do numbers differ between GA4 and MEMOPYK logs?
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm p-4">
            <div className="space-y-2 text-sm">
              <div className="font-medium">ℹ️ Numbers differ because:</div>
              <div className="space-y-1 ml-4">
                <div>- GA4: Advanced ML identifies cross-device visitors</div>
                <div>- MEMOPYK logs: Precise same-IP tracking only</div>
                <div>- Both perspectives provide valuable insights</div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Total Views Modal */}
      {isTotalViewsModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-[340px] z-50"
          onClick={(e) => e.target === e.currentTarget && setIsTotalViewsModalOpen(false)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 flex flex-col max-h-[calc(100vh-400px)]">
            <div 
              className="px-6 py-2 bg-blue-50 text-gray-900 flex-shrink-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Eye style={{ width: '24px', height: '24px' }} />
                  <span className="font-bold">Total Views Details</span>
                </div>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                  🟠 IP Filtered
                </Badge>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6" onWheel={(e) => e.stopPropagation()}>
              {/* Data Source Explanation Header */}
              <div className="-mx-6 mb-6 -mt-4 p-4 bg-blue-50 border border-blue-200 rounded-b-lg border-t-0">
                <div className="space-y-0 text-sm">
                  <div className="text-gray-900">
                    📊 Showing {totalViewsData?.length || 0} detailed records from MEMOPYK logs
                  </div>
                  <div className="text-gray-900">
                    ⚠️ GA4 reports {totalViews?.value || 0} total (includes cross-device returns)
                  </div>
                </div>
              </div>

              {isLoadingTotalViews ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p style={{ margin: 0 }}>Fetching visitor data...</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>This may take up to 30 seconds</p>
                  </div>
                </div>
              ) : totalViewsData && totalViewsData.length > 0 ? (
                <div className="space-y-4">
                  {totalViewsData.slice(0, 50).map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-gray-600">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-base font-semibold text-gray-900">{visitor.country || 'Unknown'}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-gray-600">Language</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatLanguage(visitor.language).display}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-xs text-gray-600">Visit Time</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {getRelativeTime(visitor.last_visit || visitor.created_at)}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="h-4 w-4 text-purple-600" />
                            <span className="text-xs text-gray-600">IP Address</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {visitor.ip_address || 'Unknown'}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Timer className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-gray-600">Duration</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatDuration(visitor.session_duration)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Eye style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No recent views found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unique Visitors Modal */}
      {isUniqueVisitorsModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-[340px] z-50"
          onClick={(e) => e.target === e.currentTarget && setIsUniqueVisitorsModalOpen(false)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 flex flex-col max-h-[calc(100vh-400px)]">
            <div 
              className="px-6 py-2 bg-green-50 text-gray-900 flex-shrink-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users style={{ width: '24px', height: '24px' }} />
                  <span className="font-bold">Unique Visitors Details</span>
                </div>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                  🟠 IP Filtered
                </Badge>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6" onWheel={(e) => e.stopPropagation()}>
              {/* Data Source Explanation Header */}
              <div className="-mx-6 mb-6 -mt-4 p-4 bg-green-50 border border-green-200 rounded-b-lg border-t-0">
                <div className="space-y-0 text-sm">
                  <div className="text-gray-900">
                    📊 Showing {uniqueVisitorsData?.length || 0} detailed records from MEMOPYK logs
                  </div>
                  <div className="text-gray-900">
                    ⚠️ GA4 reports {uniqueVisitors?.value || 0} total (includes cross-device returns)
                  </div>
                </div>
              </div>

              {isLoadingUniqueVisitors ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                    <p style={{ margin: 0 }}>Fetching visitor data...</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>This may take up to 30 seconds</p>
                  </div>
                </div>
              ) : uniqueVisitorsData && uniqueVisitorsData.length > 0 ? (
                <div className="space-y-4">
                  {uniqueVisitorsData.slice(0, 50).map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-gray-600">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-base font-semibold text-gray-900">{visitor.country || 'Unknown'}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-gray-600">Language</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatLanguage(visitor.language).display}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-xs text-gray-600">First Visit</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {getRelativeTime(visitor.last_visit || visitor.created_at)}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="h-4 w-4 text-purple-600" />
                            <span className="text-xs text-gray-600">IP Address</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {visitor.ip_address || 'Unknown'}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Timer className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-gray-600">Duration</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatDuration(visitor.session_duration)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Users style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No unique visitors found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Return Visitors Modal */}
      {isReturnVisitorsModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-[340px] z-50"
          onClick={(e) => e.target === e.currentTarget && setIsReturnVisitorsModalOpen(false)}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 flex flex-col max-h-[calc(100vh-400px)]">
            <div 
              className="px-6 py-2 bg-purple-50 text-gray-900 flex-shrink-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck style={{ width: '24px', height: '24px' }} />
                  <span className="font-bold">Return Visitors Details</span>
                </div>
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                  🟠 IP Filtered
                </Badge>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6" onWheel={(e) => e.stopPropagation()}>
              {/* Data Source Explanation Header */}
              <div className="-mx-6 mb-6 -mt-4 p-4 bg-purple-50 border border-purple-200 rounded-b-lg border-t-0">
                <div className="space-y-0 text-sm">
                  <div className="text-gray-900">
                    📊 Showing {returningVisitors?.length || 0} detailed records from MEMOPYK logs
                  </div>
                  <div className="text-gray-900">
                    ⚠️ GA4 reports {returnVisitors?.value || 0} total (includes cross-device returns)
                  </div>
                </div>
              </div>

              {isLoadingReturningVisitors ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    <p style={{ margin: 0 }}>Fetching visitor data...</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>This may take up to 30 seconds</p>
                  </div>
                </div>
              ) : returningVisitors && returningVisitors.length > 0 ? (
                <div className="space-y-4">
                  {returningVisitors.map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-gray-600">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-base font-semibold text-gray-900">{visitor.country || 'Unknown'}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-gray-600">Language</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatLanguage(visitor.language).display}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="text-xs text-gray-600">Last Visit</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {getRelativeTime(visitor.last_visit)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {visitor.visit_count} visits total
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="h-4 w-4 text-purple-600" />
                            <span className="text-xs text-gray-600">IP Address</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {visitor.ip_address || 'Unknown'}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Timer className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-gray-600">Duration</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatDuration(visitor.session_duration)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <UserCheck style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No returning visitors found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}

interface VisitorKpiCardProps {
  label: string;
  value: number;
  trend?: Array<{ date: string; value: number }>;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  onDetailClick: () => void;
  change: number; // Percentage change vs previous period
  description: string; // Descriptive text under the value
  'data-testid'?: string;
}

function VisitorKpiCard({ 
  label, 
  value, 
  trend, 
  icon: Icon, 
  color, 
  onDetailClick,
  change,
  description,
  'data-testid': testId 
}: VisitorKpiCardProps) {
  const USE_MOCK = import.meta.env?.VITE_USE_MOCK === "true";

  const colorClasses = {
    blue: {
      border: 'border-l-blue-500',
      icon: 'text-blue-500',
      eyeIcon: 'text-blue-500 hover:text-blue-700'
    },
    green: {
      border: 'border-l-green-500',
      icon: 'text-green-500',
      eyeIcon: 'text-green-500 hover:text-green-700'
    },
    purple: {
      border: 'border-l-purple-500',
      icon: 'text-purple-500',
      eyeIcon: 'text-purple-500 hover:text-purple-700'
    },
    orange: {
      border: 'border-l-orange-500',
      icon: 'text-orange-500',
      eyeIcon: 'text-orange-500 hover:text-orange-700'
    },
    red: {
      border: 'border-l-red-500',
      icon: 'text-red-500',
      eyeIcon: 'text-red-500 hover:text-red-700'
    }
  };

  const colors = colorClasses[color];

  return (
    <div 
      className={`analytics-new-card border-l-4 ${colors.border} relative`} 
      data-testid={testId}
    >
      {/* Header with icon and label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className={`h-4 w-4 ${colors.icon}`} />
          <div className="text-sm font-medium text-[var(--analytics-new-text-muted)]">
            {label}
          </div>
        </div>
        {USE_MOCK && (
          <div className="text-xs text-orange-500 font-medium">🧪 Mock</div>
        )}
      </div>

      {/* Value display */}
      <div className="text-2xl font-bold text-[var(--analytics-new-text)] mb-2">
        {value.toLocaleString()}
      </div>

      {/* Percentage change */}
      <div className={`text-xs flex items-center gap-1 mt-1 ${
        change >= 0 ? "text-green-600" : "text-red-600"
      }`}>
        {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs previous period
      </div>

      {/* Description */}
      <p className="text-xs text-[var(--analytics-new-text-muted)] mt-1">
        {description}
      </p>

      {/* Sparkline trend */}
      {trend && trend.length > 0 && (
        <div className="flex items-center space-x-1 mb-3">
          {trend.slice(-7).map((point, index) => (
            <div
              key={index}
              className="flex-1 bg-gray-200 rounded-sm overflow-hidden"
              style={{ height: '4px' }}
            >
              <div
                className={`h-full bg-[var(--analytics-new-accent)] transition-all duration-300`}
                style={{ 
                  width: trend.length > 1 
                    ? `${Math.max(10, (point.value / Math.max(...trend.map(t => t.value))) * 100)}%` 
                    : '100%'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Eye icon for detailed view (bottom right) */}
      <button
        onClick={onDetailClick}
        className={`absolute bottom-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors ${colors.eyeIcon}`}
        title={`View ${label} details`}
        data-testid={`${testId}-detail-button`}
      >
        <Eye className="h-4 w-4" />
      </button>
    </div>
  );
}