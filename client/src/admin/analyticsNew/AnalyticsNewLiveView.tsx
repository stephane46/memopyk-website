import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Globe, Monitor, Smartphone, Tablet, Eye, Info, MapPin, Clock, Languages } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Badge } from '@/components/ui/badge';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { CountryFlag } from '@/components/admin/CountryFlag';
import { DateTime } from 'luxon';

const STICKY_HEADER_HEIGHT = 120; // Approximate height of sticky filtering section

interface PrivateTrackingData {
  activeUsers: number;
  byCountry: Array<{ country: string; users: number; countryCode?: string }>;
  byDevice: Array<{ device: string; users: number }>;
  timestamp: string;
}

interface RecentVisitor {
  ip_address: string;
  country: string;
  region: string;
  city: string;
  language: string;
  last_visit: string;
  user_agent: string;
  visit_count: number;
  session_duration: number;
  previous_visit: string | null;
}

interface CurrentlyWatchingSession {
  sessionId: string;
  videoId: string | null;
  videoTitle?: string;
  progress: number;
  currentTime: number;
  duration: number;
  location: string;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  region?: string | null;
  regionCode?: string | null;
  device: string;
  clarityUrl: string;
}

interface CurrentlyWatchingData {
  totalActive: number;
  sessions: CurrentlyWatchingSession[];
  timestamp: string;
}

const AnalyticsNewActiveUsersBadge: React.FC<{ count: number; loading?: boolean }> = ({ 
  count, 
  loading = false 
}) => (
  <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
    <span className="font-semibold">
      {loading ? (
        <div className="w-6 h-4 bg-green-200 animate-pulse rounded" />
      ) : (
        count
      )}
    </span>
    <span className="text-sm">active (30m)</span>
  </div>
);

const AnalyticsNewProgressBar: React.FC<{ 
  label: string; 
  value: number; 
  max: number;
  color?: string;
  animate?: boolean;
}> = ({ 
  label, 
  value, 
  max, 
  color = 'bg-[var(--analytics-new-orange)]',
  animate = true 
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--analytics-new-text)]">{label}</span>
        <span className="text-[var(--analytics-new-text-muted)]">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ease-out ${color} ${
            animate ? 'animate-pulse' : ''
          }`}
          style={{ 
            width: `${percentage}%`,
            transition: 'width 1s ease-out'
          }}
        />
      </div>
    </div>
  );
};

export const AnalyticsNewLiveView: React.FC = () => {
  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [lastWatchingUpdate, setLastWatchingUpdate] = useState<string>('');
  const [isVisible, setIsVisible] = useState<boolean>(!document.hidden);
  
  // Since this component is rendered, Live View tab is active - just check visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Calculate whether polling should be enabled - if component is rendered, tab is active
  const shouldPoll = isVisible;
  
  // Private tracking data - refetch every 10 seconds when active
  const { data: privateData, isLoading: privateLoading, error: privateError } = useQuery<PrivateTrackingData>({
    queryKey: ['/api/analytics/live-tracking'],
    refetchInterval: shouldPoll ? 10000 : false, // 10 seconds when active
    refetchOnWindowFocus: false,
    enabled: shouldPoll, // Only query when tab is active and visible
  });

  // Recent visitors data - refetch every 15 seconds when active 
  const { data: recentVisitors, isLoading: visitorsLoading, error: visitorsError } = useQuery<RecentVisitor[]>({
    queryKey: ['/api/analytics/recent-visitors', 'today'],
    queryFn: () => fetch('/api/analytics/recent-visitors?datePreset=today&skipEnrichment=true').then(res => res.json()),
    select: (raw: any) => Array.isArray(raw) ? raw : raw?.visitors ?? raw?.data ?? [], // Normalize response to array
    refetchInterval: shouldPoll ? 15000 : false, // 15 seconds when active
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 5000,
    enabled: shouldPoll,
  });

  // Currently watching data - refetch every 15 seconds when active
  const { data: watchingData, isLoading: watchingLoading, error: watchingError } = useQuery<CurrentlyWatchingData>({
    queryKey: ['/api/tracker/currently-watching'],
    select: (raw: any) => raw?.sessions ? raw : { totalActive: raw?.totalActive ?? 0, sessions: raw?.sessions ?? [] }, // Normalize response shape
    refetchInterval: shouldPoll ? 15000 : false, // 15 seconds when active
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    staleTime: 0, // Always fetch fresh data
    gcTime: 5000, // Only cache for 5 seconds to prevent stale data (TanStack Query v5)
    enabled: shouldPoll, // Only query when tab is active and visible
  });


  // Update last refresh time
  useEffect(() => {
    if (privateData?.timestamp) {
      // Convert to 24h format (HH:mm:ss) for Paris timezone
      setLastUpdate(DateTime.fromISO(privateData.timestamp, { zone: 'UTC' })
        .setZone('Europe/Paris')
        .toFormat('HH:mm:ss'));
    }
  }, [privateData?.timestamp]);

  // Update last watching refresh time
  useEffect(() => {
    if (watchingData?.timestamp) {
      // Convert to 24h format (HH:mm:ss) for Paris timezone
      setLastWatchingUpdate(DateTime.fromISO(watchingData.timestamp, { zone: 'UTC' })
        .setZone('Europe/Paris')
        .toFormat('HH:mm:ss'));
    }
  }, [watchingData?.timestamp]);

  // Error states - be more specific about which services are failing
  const hasAnyErrors = privateError || watchingError || visitorsError;
  const errorDetails = [];
  if (privateError) errorDetails.push('Live tracking');
  if (watchingError) errorDetails.push('Currently watching');
  if (visitorsError) errorDetails.push('Recent visitors');
  
  // Only show error if ALL services are failing, not just some
  if (hasAnyErrors && errorDetails.length >= 2) {
    return (
      <div className="analytics-new-container space-y-6">
        <AnalyticsNewLoadingStates 
          mode="error" 
          title="Failed to load live data"
          description={`Unable to connect to: ${errorDetails.join(', ')}. Please check your connection.`}
          showRetry={true}
          onRetry={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/live-tracking'] });
            queryClient.invalidateQueries({ queryKey: ['/api/tracker/currently-watching'] });
            queryClient.invalidateQueries({ queryKey: ['/api/analytics/recent-visitors'] });
          }}
        />
      </div>
    );
  }
  
  // Debug: Add console logging to see what's failing
  if (hasAnyErrors) {
    console.log('Live View - Some services failing:', {
      privateError: privateError?.message,
      watchingError: watchingError?.message,
      visitorsError: visitorsError?.message,
      privateData,
      watchingData,
      recentVisitors
    });
  }

  // Loading state - show loading only if ALL are loading
  if ((privateLoading && !privateData) && (watchingLoading && !watchingData) && (visitorsLoading && !recentVisitors)) {
    return (
      <div className="analytics-new-container space-y-6">
        <AnalyticsNewLoadingStates 
          mode="loading" 
          title="Loading live analytics..."
          description="Fetching real-time visitor activity"
        />
      </div>
    );
  }

  return (
    <div className="analytics-new-container space-y-6" data-testid="analytics-new-live-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-[var(--analytics-new-text)]">Live View</h2>
          {privateData && (
            <AnalyticsNewActiveUsersBadge 
              count={privateData.activeUsers} 
              loading={privateLoading}
            />
          )}
        </div>
        <div className="text-xs text-[var(--analytics-new-text-muted)] mt-1">
          Last updated: {lastUpdate || 'Loading...'}
        </div>
      </div>

      {/* Private Tracking Stats - 2x2 Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users by Country */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="w-5 h-5 text-[var(--analytics-new-orange)]" />
            <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
              Active Users by Country
            </h3>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-medium">
              MEMOPYK
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
              🟠 IP Filtered
            </Badge>
          </div>
          
          {privateLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-2 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : privateData?.byCountry && privateData.byCountry.length > 0 ? (
            <div className="space-y-4">
              {privateData.byCountry.map((item, index) => (
                <div key={item.country} className="flex items-center space-x-3">
                  <CountryFlag country={item.countryCode || item.country} size={16} />
                  <div className="flex-1">
                    <AnalyticsNewProgressBar
                      label={item.country}
                      value={item.users}
                      max={privateData.activeUsers}
                      color={index === 0 ? 'bg-[var(--analytics-new-orange)]' : 'bg-gray-400'}
                      animate={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-[var(--analytics-new-text-muted)]">
              <Globe className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <div>No active users by country</div>
            </div>
          )}
        </div>

        {/* Active Users by Device */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Monitor className="w-5 h-5 text-[var(--analytics-new-orange)]" />
            <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
              Active Users by Device
            </h3>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-medium">
              MEMOPYK
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
              🟠 IP Filtered
            </Badge>
          </div>
          
          {privateLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-2 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : privateData?.byDevice && privateData.byDevice.length > 0 ? (
            <div className="space-y-4">
              {privateData.byDevice.map((item, index) => {
                const DeviceIcon = item.device === 'Mobile' ? Smartphone : 
                                 item.device === 'Tablet' ? Tablet : Monitor;
                
                return (
                  <div key={item.device} className="flex items-center space-x-3">
                    <DeviceIcon className="w-4 h-4 text-[var(--analytics-new-orange)]" />
                    <div className="flex-1">
                      <AnalyticsNewProgressBar
                        label={item.device}
                        value={item.users}
                        max={privateData.activeUsers}
                        color={index === 0 ? 'bg-[var(--analytics-new-orange)]' : 'bg-blue-400'}
                        animate={true}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-[var(--analytics-new-text-muted)]">
              <Monitor className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <div>No active users by device</div>
            </div>
          )}
        </div>

        {/* Recent Visitors */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="w-5 h-5 text-[var(--analytics-new-orange)]" />
            <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
              Recent Visitors (Today)
            </h3>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-medium">
              MEMOPYK
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
              🟠 IP Filtered
            </Badge>
          </div>
          
          {visitorsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : recentVisitors && recentVisitors.length > 0 ? (
            <TooltipProvider>
              <div ref={listRef} className="relative space-y-4 max-h-80 overflow-y-auto">
              {recentVisitors.slice(0, 5).map((visitor, index) => {
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
                
                return (
                  <TooltipPrimitive.Root key={`${visitor.ip_address}-${index}`}>
                    <TooltipPrimitive.Trigger asChild>
                      <div 
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors relative group"
                      >
                        {/* Compact visitor summary */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country} size={16} />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {visitor.country || 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-600">
                                {getRelativeTime(visitor.last_visit)}
                              </div>
                            </div>
                          </div>
                          <Info className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </TooltipPrimitive.Trigger>
                    <TooltipPrimitive.Portal container={listRef.current}>
                      <TooltipPrimitive.Content 
                        side="right" 
                        align="start" 
                        sideOffset={16}
                        alignOffset={100}
                        avoidCollisions={false}
                        className="z-50 w-80 px-4 pb-4 pt-0 bg-white border border-gray-200 rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                      >
                        <div className="space-y-3">
                          <div className="pb-2 border-b border-gray-100">
                            <h4 className="font-semibold text-gray-900 text-sm mb-1">Visitor Details</h4>
                            <p className="text-xs text-gray-500">Hover to view details</p>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3 text-sm">
                            {/* Location */}
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">Location</div>
                                <div className="flex items-center gap-2">
                                  <CountryFlag country={visitor.country} size={16} />
                                  <div className="text-xs">
                                    <div className="font-medium">{visitor.country || 'Unknown'}</div>
                                    {visitor.city && (
                                      <div className="text-gray-600">
                                        {visitor.city}, {visitor.region}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Language */}
                            <div className="flex items-start gap-2">
                              <Languages className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">Language</div>
                                <div className="text-xs flex items-center gap-1">
                                  <span>{formatLanguage(visitor.language).flag}</span>
                                  <span>{formatLanguage(visitor.language).display}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Visit Time */}
                            <div className="flex items-start gap-2">
                              <Clock className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">Visit Time</div>
                                <div className="text-xs text-gray-600">
                                  {getRelativeTime(visitor.last_visit)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TooltipPrimitive.Content>
                    </TooltipPrimitive.Portal>
                  </TooltipPrimitive.Root>
                );
              })}
              </div>
            </TooltipProvider>
          ) : (
            <div className="text-center py-4 text-[var(--analytics-new-text-muted)]">
              <Users className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <div>No recent visitors</div>
            </div>
          )}
        </div>
      </div>

      {/* Currently Watching Sessions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-[var(--analytics-new-orange)]" />
            <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
              Currently Watching
            </h3>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 font-medium">
              MEMOPYK
            </Badge>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
              🟠 IP Filtered
            </Badge>
            {watchingData && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm">
                {watchingData.totalActive} active sessions
              </span>
            )}
            <div className="text-sm text-[var(--analytics-new-text-muted)]">
              Auto-updated every 15 seconds
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-[var(--analytics-new-text-muted)]">
              Updated: {lastWatchingUpdate || 'Loading...'}
            </div>
          </div>
        </div>

        {watchingLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse flex space-x-4 p-4 border border-gray-200 rounded">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : watchingData?.sessions && watchingData.sessions.length > 0 ? (
          <TooltipProvider>
            <div className="space-y-4">
              {watchingData.sessions.map((session) => {
              // Helper functions for UI formatting
              const getVideoTitle = () => session.videoTitle || 'Video';
              const getLocationDisplay = () => {
                if (!session.country) return { hasFlag: false, text: 'Location unknown' };
                
                // Build city and region part
                let cityRegion = '';
                if (session.city) {
                  cityRegion = session.city;
                  if (session.region && session.region !== session.city) {
                    cityRegion += ` (${session.region})`;
                  }
                }
                
                return {
                  hasFlag: true,
                  country: session.country,
                  cityRegion: cityRegion || null,
                  countryCode: session.countryCode || null
                };
              };
              const getDeviceDisplay = () => {
                const device = session.device?.toLowerCase();
                if (device === 'desktop') return 'Desktop';
                if (device === 'mobile') return 'Mobile';
                if (device === 'tablet') return 'Tablet';
                return 'Desktop'; // fallback
              };
              const getTimeAgo = () => {
                const seconds = session.duration;
                if (seconds < 60) return `${seconds} s ago`;
                const minutes = Math.floor(seconds / 60);
                return `${minutes} min ago`;
              };
              const getShortId = () => {
                const id = session.sessionId.includes('...') 
                  ? session.sessionId.replace('...', '') 
                  : session.sessionId;
                return `#${id.slice(-4)}`;
              };

              const locationData = getLocationDisplay();

              return (
                <div 
                  key={session.sessionId} 
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`watching-session-${session.sessionId}`}
                >
                  {/* Title row with video name and optional Clarity link */}
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-[var(--analytics-new-text)]">
                      {getVideoTitle()}
                    </h4>
                    {session.clarityUrl && (
                      <a
                        href={session.clarityUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--analytics-new-orange)] hover:text-orange-600 font-medium"
                        data-testid={`view-clarity-${session.sessionId}`}
                      >
                        View in Clarity ↗︎
                      </a>
                    )}
                  </div>

                  {/* Enhanced location display with flag */}
                  <div className="mb-3 space-y-1">
                    {locationData.hasFlag ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <CountryFlag country={locationData.country || 'Unknown'} size={16} />
                          {locationData.cityRegion && (
                            <span className="text-sm font-bold text-[var(--analytics-new-text)]">
                              {locationData.cityRegion}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-light text-[var(--analytics-new-text-muted)] ml-6">
                          {locationData.country}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-[var(--analytics-new-text-muted)]">
                        {locationData.text}
                      </div>
                    )}
                  </div>

                  {/* Meta line: Device • timeAgo • #shortId */}
                  <div className="text-sm text-[var(--analytics-new-text-muted)] mb-3 flex items-center">
                    <span>
                      {getDeviceDisplay()} • {getTimeAgo()}
                    </span>
                    <TooltipPrimitive.Root>
                      <TooltipPrimitive.Trigger asChild>
                        <Info className="w-3 h-3 ml-1 text-gray-400 cursor-help" />
                      </TooltipPrimitive.Trigger>
                      <TooltipPrimitive.Portal>
                        <TooltipPrimitive.Content className="max-w-xs z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-lg text-sm">
                          <p>
                            This shows when the viewer's last activity was detected. If it's only a few seconds ago, the video is actively playing. If it's longer, the viewer may have paused, left the page, or lost connection.
                          </p>
                        </TooltipPrimitive.Content>
                      </TooltipPrimitive.Portal>
                    </TooltipPrimitive.Root>
                    <span className="text-gray-400 ml-1"> • {getShortId()}</span>
                  </div>

                  {/* Progress row: Progress bar + percentage label */}
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 bg-[var(--memopyk-orange)] rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${Math.max(0, Math.min(session.progress, 100))}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-[var(--analytics-new-text-muted)]">
                      {Math.round(Math.max(0, Math.min(session.progress, 100)))}%
                    </span>
                  </div>
                </div>
              );
              })}
            </div>
          </TooltipProvider>
        ) : (
          <div className="text-center py-8 text-[var(--analytics-new-text-muted)]">
            <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <div>No active sessions right now</div>
            <div className="text-sm">Sessions will appear here when visitors are watching videos</div>
          </div>
        )}
      </div>
    </div>
  );
};