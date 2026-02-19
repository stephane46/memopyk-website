import React, { useState, useEffect } from 'react';
import { Eye, Users, UserCheck, RotateCcw, X, MapPin, Clock, Languages, Info, Network, Timer } from 'lucide-react';
import { useFilteredKpis } from "../hooks/useFilteredAnalytics";
import { useAnalyticsNewFilters } from '../analyticsNewFilters.store';
import { useQuery } from '@tanstack/react-query';
import type { KpisResponse } from "../data/types";
import { AnalyticsNewLoadingStates } from '../AnalyticsNewLoadingStates';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CountryFlag } from '@/components/admin/CountryFlag';
import { DateTime } from 'luxon';
import { useLanguage } from '@/contexts/LanguageContext';
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
  
  // Get dates and filters from global filter store
  const { getDateRange, country, datePreset, sinceDate, sinceDateEnabled, dataSource } = useAnalyticsNewFilters();
  
  // Get IP exclusions to show in dynamic report
  const { data: ipExclusions = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/analytics/exclusions'],
  });

  // Get page locale for date formatting
  const { language: pageLocale } = useLanguage();

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
  
  // Visitor insights for dynamic report
  const [visitorInsights, setVisitorInsights] = useState<{
    topCountries: { country: string; count: number }[];
    topCities: { city: string; country: string; count: number }[];
    languages: { language: string; count: number }[];
    recentVisitors: number;
    avgDuration: number;
    last24Hours: number;
    loading: boolean;
  }>({ 
    topCountries: [], 
    topCities: [],
    languages: [],
    recentVisitors: 0, 
    avgDuration: 0,
    last24Hours: 0,
    loading: true 
  });

  // Fetch visitor insights for dynamic report
  useEffect(() => {
    const fetchVisitorInsights = async () => {
      try {
        const dateRange = getDateRange();
        const response = await fetch(
          `/api/analytics/recent-visitors?dateFrom=${dateRange.start}&dateTo=${dateRange.end}`
        );
        const visitors = await response.json();
        
        // Calculate top countries
        const countryMap = new Map<string, number>();
        visitors.forEach((visitor: any) => {
          const country = visitor.country || 'Unknown';
          countryMap.set(country, (countryMap.get(country) || 0) + 1);
        });
        const topCountries = Array.from(countryMap.entries())
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        
        // Calculate top cities
        const cityMap = new Map<string, { country: string; count: number }>();
        visitors.forEach((visitor: any) => {
          const city = visitor.city || 'Unknown';
          const country = visitor.country || 'Unknown';
          const key = `${city}, ${country}`;
          const existing = cityMap.get(key) || { country, count: 0 };
          cityMap.set(key, { country, count: existing.count + 1 });
        });
        const topCities = Array.from(cityMap.entries())
          .map(([cityKey, data]) => ({ 
            city: cityKey.split(', ')[0], 
            country: data.country, 
            count: data.count 
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        
        // Calculate language breakdown
        const languageMap = new Map<string, number>();
        visitors.forEach((visitor: any) => {
          const lang = visitor.language || 'Unknown';
          languageMap.set(lang, (languageMap.get(lang) || 0) + 1);
        });
        const languages = Array.from(languageMap.entries())
          .map(([language, count]) => ({ language, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 2);
        
        // Calculate average session duration
        const totalDuration = visitors.reduce((sum: number, v: any) => 
          sum + (v.duration || 0), 0
        );
        const avgDuration = visitors.length > 0 ? totalDuration / visitors.length : 0;
        
        // Calculate last 24 hours activity
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last24Hours = visitors.filter((v: any) => {
          const visitDate = new Date(v.lastVisit || v.createdAt);
          return visitDate >= yesterday;
        }).length;
        
        setVisitorInsights({
          topCountries,
          topCities,
          languages,
          recentVisitors: visitors.length,
          avgDuration,
          last24Hours,
          loading: false
        });
      } catch (error) {
        console.error('Failed to fetch visitor insights:', error);
        setVisitorInsights({ 
          topCountries: [], 
          topCities: [],
          languages: [],
          recentVisitors: 0,
          avgDuration: 0,
          last24Hours: 0,
          loading: false 
        });
      }
    };
    
    fetchVisitorInsights();
  }, [datePreset, sinceDate, sinceDateEnabled, country]);

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
        const existingIndex = acc.findIndex(v => v.ipAddress === visitor.ipAddress);
        if (existingIndex === -1) {
          acc.push(visitor);
        } else {
          // Keep the most recent visit
          if (new Date(visitor.lastVisit) > new Date(acc[existingIndex].lastVisit)) {
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
        visitor.visitCount > 1
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
          label={dataSource === 'memopyk' ? 'Sessions (MEMOPYK)' : 'Sessions (GA4)'} 
          value={totalViews?.value || 0}
          trend={totalViews?.trend || []}
          icon={Eye}
          color="blue"
          onDetailClick={handleTotalViewsModalOpen}
          change={totalViews?.change || 0}
          description={
            dataSource === 'memopyk'
              ? 'Individual visits recorded by MEMOPYK'
              : 'Visitor sessions from Google Analytics'
          }
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
          description={
            dataSource === 'memopyk'
              ? 'Unique visitors recorded by MEMOPYK'
              : 'Distinct visitors (GA4 cookie-based)'
          }
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
          description={
            dataSource === 'memopyk'
              ? 'Visitors who came back during this period'
              : 'Returning visitors'
          }
          data-testid="kpi-return-visitors"
        />
      </div>
      
      {/* Dynamic Analytics Report - Using Real Numbers */}
      <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-3 text-sm flex-1">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">📊 Analytics Report for Current View</h3>
            </div>
            
            {/* Current Metrics */}
            <div className="space-y-2">
              <div className="text-gray-800">
                <span className="font-medium">Your site received</span>{' '}
                <span className="font-bold text-blue-600">{totalViews?.value || 0} visitor {(totalViews?.value || 0) === 1 ? 'session' : 'sessions'}</span>{' '}
                {datePreset === '7d' && 'in the last 7 days'}
                {datePreset === '30d' && 'in the last 30 days'}
                {datePreset === '90d' && 'in the last 90 days'}
                {datePreset === 'today' && 'today'}
                {datePreset === 'yesterday' && 'yesterday'}
                {datePreset === 'custom' && 'in the selected period'}
                , with{' '}
                <span className="font-bold text-green-600">{uniqueVisitors?.value || 0} unique {(uniqueVisitors?.value || 0) === 1 ? 'visitor' : 'visitors'}</span>
                {uniqueVisitors?.value > 0 && returnVisitors?.value > 0 && (
                  <span>
                    {' '}({Math.round((returnVisitors.value / uniqueVisitors.value) * 100)}% returning visitors)
                  </span>
                )}.
              </div>
              
              {/* Active Filters Info */}
              <div className="pt-2 border-t border-blue-200">
                <div className="font-medium text-gray-800 mb-1">Active Filters:</div>
                <div className="space-y-1 ml-4">
                  {(() => {
                    const activeExclusions = ipExclusions?.filter((e: any) => e.active) || [];
                    const hasIpFilters = activeExclusions.length > 0;
                    const hasDateFilter = sinceDateEnabled && sinceDate;
                    
                    if (!hasIpFilters && !hasDateFilter) {
                      return (
                        <div className="text-gray-600">
                          ✅ No exclusions active - showing all data
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        {hasIpFilters && (
                          <div className="text-gray-700">
                            <span className="text-orange-600 font-medium">🚫 IP Exclusions:</span>{' '}
                            {activeExclusions.length} IP {activeExclusions.length === 1 ? 'address' : 'addresses'} excluded{' '}
                            <span className="text-gray-600">
                              (affects MEMOPYK logs only, not GA4 data shown above)
                            </span>
                          </div>
                        )}
                        {hasDateFilter && (
                          <div className="text-gray-700">
                            <span className="text-orange-600 font-medium">📅 Date Filter:</span>{' '}
                            Excluding data before {sinceDate}{' '}
                            <span className="text-gray-600">
                              (affects MEMOPYK logs only)
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* Visitor Details from Eye Icon Data */}
              {!visitorInsights.loading && visitorInsights.recentVisitors > 0 && (
                <>
                  {/* Data source note when GA4 is selected but breakdowns use MEMOPYK */}
                  {dataSource === 'ga4' && (
                    <div className="pt-2 border-t border-blue-200">
                      <div className="text-gray-600 text-xs bg-amber-50 border border-amber-200 rounded p-2">
                        <span className="font-medium text-amber-700">Note:</span> Geographic, language, and behavioral breakdowns below are from MEMOPYK local tracking logs ({visitorInsights.recentVisitors} {visitorInsights.recentVisitors === 1 ? 'session' : 'sessions'}) and may show different totals than the GA4 figures above.
                      </div>
                    </div>
                  )}

                  {/* Top Countries */}
                  {visitorInsights.topCountries.length > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                      <div className="font-medium text-gray-800 mb-1">🌍 Top Countries:</div>
                      <div className="ml-4 space-y-1">
                        {visitorInsights.topCountries.map((item, index) => (
                          <div key={item.country} className="text-gray-700 flex items-center gap-2">
                            <span className="font-medium text-blue-600">#{index + 1}</span>
                            <span>{item.country}</span>
                            <span className="text-gray-500">-</span>
                            <span className="font-medium">{item.count} {item.count === 1 ? 'visitor' : 'visitors'}</span>
                            <span className="text-gray-500">
                              ({Math.round((item.count / visitorInsights.recentVisitors) * 100)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Top Cities */}
                  {visitorInsights.topCities.length > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                      <div className="font-medium text-gray-800 mb-1">🏙️ Top Cities:</div>
                      <div className="ml-4 space-y-1">
                        {visitorInsights.topCities.map((item, index) => (
                          <div key={`${item.city}-${item.country}`} className="text-gray-700 flex items-center gap-2">
                            <span className="font-medium text-blue-600">#{index + 1}</span>
                            <span>{item.city}, {item.country}</span>
                            <span className="text-gray-500">-</span>
                            <span className="font-medium">{item.count} {item.count === 1 ? 'visitor' : 'visitors'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Languages */}
                  {visitorInsights.languages.length > 0 && (
                    <div className="pt-2 border-t border-blue-200">
                      <div className="font-medium text-gray-800 mb-1">🗣️ Visitor Languages:</div>
                      <div className="ml-4 space-y-1">
                        {visitorInsights.languages.map((item) => (
                          <div key={item.language} className="text-gray-700 flex items-center gap-2">
                            <span className="font-medium">{item.language}</span>
                            <span className="text-gray-500">-</span>
                            <span>{item.count} {item.count === 1 ? 'visitor' : 'visitors'}</span>
                            <span className="text-gray-500">
                              ({Math.round((item.count / visitorInsights.recentVisitors) * 100)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Session Duration & Recent Activity */}
                  <div className="pt-2 border-t border-blue-200">
                    <div className="font-medium text-gray-800 mb-1">⏱️ Visitor Behavior:</div>
                    <div className="ml-4 space-y-1">
                      {visitorInsights.avgDuration > 0 && (
                        <div className="text-gray-700">
                          <span className="font-medium">Average session:</span>{' '}
                          {Math.floor(visitorInsights.avgDuration / 60)}m {Math.floor(visitorInsights.avgDuration % 60)}s
                        </div>
                      )}
                      {visitorInsights.last24Hours > 0 && (
                        <div className="text-gray-700">
                          <span className="font-medium">Last 24 hours:</span>{' '}
                          {visitorInsights.last24Hours} {visitorInsights.last24Hours === 1 ? 'visitor' : 'visitors'}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {/* Key Insight */}
              <div className="pt-2 border-t border-blue-200">
                <div className="text-gray-700">
                  <span className="font-medium">💡 Key Insight:</span>{' '}
                  {dataSource === 'memopyk'
                    ? <>{(totalViews?.value || 0) === 1 ? 'This' : 'These'} {totalViews?.value || 0} {(totalViews?.value || 0) === 1 ? 'session represents a' : 'sessions represent'} real human {(totalViews?.value || 0) === 1 ? 'visitor' : 'visitors'} recorded by MEMOPYK.</>
                    : <>{(totalViews?.value || 0) === 1 ? 'This' : 'These'} {totalViews?.value || 0} {(totalViews?.value || 0) === 1 ? 'session is' : 'sessions are'} tracked by Google Analytics 4. Each session can include multiple page views, so your total pageview count in GA4 will be higher.</>
                  }
                  {country !== 'all' && (
                    <span className="block mt-1 text-blue-700">
                      📍 Filtered by country: {country}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Click to view details */}
              <div className="pt-2 border-t border-blue-200">
                <div className="text-gray-600 text-xs flex items-center gap-2">
                  <Eye className="h-3 w-3" />
                  <span>Click the eye icon (👁️) on any metric above to view detailed visitor data</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Explanation */}
      <div className="mt-4 bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-300 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-xs text-gray-600 flex-1">
            <div className="font-medium text-gray-700">
              📊 Understanding GA4 vs MEMOPYK Data Sources
            </div>
            
            <div className="space-y-1.5">
              <div>
                <span className="font-medium text-gray-700">GA4 (Google Analytics):</span> Google Analytics tracks visitors by loading a script in their browser. Many real visitors are invisible to GA4 because their browser blocks that script — Firefox, Safari, Brave, and content blockers all do this by default.
              </div>
              {(() => {
                const activeExclusion = ipExclusions?.find((e: any) => e.active && e.label && e.appliesFrom && e.ipCidr !== '0.0.0.0/32');
                if (activeExclusion) {
                  const appliesDate = new Date(activeExclusion.appliesFrom).toLocaleDateString(pageLocale, {
                    day: 'numeric', month: 'long', year: 'numeric'
                  });
                  return (
                    <div className="italic text-gray-500">
                      Your {activeExclusion.label} was excluded from GA4 starting {appliesDate}.
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <span className="font-medium text-gray-700">MEMOPYK (Local Logs):</span> Server-side tracking that captures every real visitor to your site. Bot and crawler traffic is automatically detected and excluded, so these numbers reflect real human visitors only{ipExclusions && ipExclusions.length > 0 && ` (currently ${ipExclusions.filter((e: any) => e.active).length} IP ${ipExclusions.filter((e: any) => e.active).length === 1 ? 'address' : 'addresses'} excluded)`}.
              </div>

              <div className="pt-1 border-t border-gray-300 space-y-1.5">
                <div>
                  <span className="font-medium text-gray-700">💡 Why the difference?</span> The gap represents real visitors whose browsers block GA4.
                </div>
                <div>
                  MEMOPYK automatically filters out crawlers and bots. The remaining difference comes from genuine human visitors whose browsers prevent GA4's tracking script from loading. Server-side tracking captures these visitors because HTTP requests cannot be blocked by browser privacy features.
                </div>
                <div>
                  <ul className="ml-4 mt-1 space-y-0.5 list-disc">
                    <li>In France, 30-40% of internet users have some form of tracking protection enabled</li>
                    <li>Firefox, Safari, and Brave block third-party tracking scripts by default</li>
                    <li>MEMOPYK shows a more complete picture of your real audience</li>
                  </ul>
                </div>
              </div>

              <div className="text-gray-500 italic">
                Toggle the data source switch above to compare GA4 (Google's tracking) vs MEMOPYK (your local filtered logs).
              </div>
            </div>
          </div>
        </div>
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
                  <span className="font-bold">Sessions Details ({dataSource === 'ga4' ? 'GA4' : 'MEMOPYK'})</span>
                </div>
                <Badge
                  variant="outline"
                  className={dataSource === 'ga4' ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs' : 'bg-orange-50 text-orange-700 border-orange-200 text-xs'}
                >
                  {dataSource === 'ga4' ? '📊 GA4 Data' : '🟠 MEMOPYK Filtered'}
                </Badge>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6" onWheel={(e) => e.stopPropagation()}>
              {/* Data Source Explanation Header */}
              <div className="-mx-6 mb-6 -mt-4 p-4 bg-blue-50 border border-blue-200 rounded-b-lg border-t-0">
                <div className="space-y-1 text-sm">
                  <div className="text-gray-900 font-medium">
                    {dataSource === 'ga4' ? '📊 GA4 Sessions' : '🟠 MEMOPYK Sessions'}: {totalViews?.value || 0} visitor sessions
                  </div>
                  <div className="text-gray-700">
                    ℹ️ Sessions = individual visits. One session can include multiple pageviews.
                  </div>
                  <div className="text-gray-700">
                    {dataSource === 'ga4'
                      ? '🔍 Detail records below from MEMOPYK logs (GA4 does not provide individual session details)'
                      : '🔍 Detail records from MEMOPYK logs'
                    }
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
                      key={`${visitor.ipAddress}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-gray-600">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.countryCode || visitor.country} size={20} />
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
                            <span className="text-xs text-gray-600">Last Seen</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {getRelativeTime(visitor.lastVisit || visitor.createdAt)}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="h-4 w-4 text-purple-600" />
                            <span className="text-xs text-gray-600">IP Address</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {visitor.ipAddress || 'Unknown'}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Timer className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-gray-600">Duration</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatDuration(visitor.sessionDuration)}
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
                  🟠 MEMOPYK Filtered
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
                  {(uniqueVisitors?.value || 0) !== (uniqueVisitorsData?.length || 0) && (
                    <div className="text-gray-900">
                      ⚠️ GA4 reports {uniqueVisitors?.value || 0} total
                    </div>
                  )}
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
                      key={`${visitor.ipAddress}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-gray-600">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.countryCode || visitor.country} size={20} />
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
                            <span className="text-xs text-gray-600">Last Seen</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {getRelativeTime(visitor.lastVisit || visitor.createdAt)}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="h-4 w-4 text-purple-600" />
                            <span className="text-xs text-gray-600">IP Address</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {visitor.ipAddress || 'Unknown'}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Timer className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-gray-600">Duration</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatDuration(visitor.sessionDuration)}
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
                  🟠 MEMOPYK Filtered
                </Badge>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-6" onWheel={(e) => e.stopPropagation()}>
              {/* Data Source Explanation Header */}
              <div className="-mx-6 mb-6 -mt-4 p-4 bg-purple-50 border border-purple-200 rounded-b-lg border-t-0">
                <div className="space-y-0 text-sm">
                  <div className="text-gray-900">
                    📊 Showing {returningVisitors?.length || 0} detailed {(returningVisitors?.length || 0) === 1 ? 'record' : 'records'} from MEMOPYK logs
                  </div>
                  {(returnVisitors?.value || 0) !== (returningVisitors?.length || 0) && (
                    <div className="text-gray-900">
                      ⚠️ GA4 reports {returnVisitors?.value || 0} total
                    </div>
                  )}
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
                      key={`${visitor.ipAddress}-${index}`}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="text-xs text-gray-600">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.countryCode || visitor.country} size={20} />
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
                            {getRelativeTime(visitor.lastVisit)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {visitor.visitCount} visits total
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="h-4 w-4 text-purple-600" />
                            <span className="text-xs text-gray-600">IP Address</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {visitor.ipAddress || 'Unknown'}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Timer className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-gray-600">Duration</span>
                          </div>
                          <div className="text-base font-semibold text-gray-900">
                            {formatDuration(visitor.sessionDuration)}
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
        change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-400"
      }`}>
        {change > 0 ? "▲" : change < 0 ? "▼" : "—"}{' '}
        {change === 0 ? "No change vs previous period" : `${Math.abs(change)}% vs previous period`}
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