import React, { useState, useEffect } from 'react';
import { AnalyticsNewTabNavigation } from './AnalyticsNewTabNavigation';
import { AnalyticsNewGlobalFilters } from './AnalyticsNewGlobalFilters';
import { IpExclusionsManager } from '@/components/admin/IpExclusionsManager';
import { AnalyticsNewOverview } from './AnalyticsNewOverview';
import { AnalyticsNewLiveView } from './AnalyticsNewLiveView';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import { AnalyticsNewVideo } from './AnalyticsNewVideo';
import { AnalyticsNewTrends } from './AnalyticsNewTrends';
import { AnalyticsNewGeo } from './AnalyticsNewGeo';
import { AnalyticsNewCta } from './AnalyticsNewCta';
import { AnalyticsNewBlog } from './AnalyticsNewBlog';
import DataSourceBadge from './components/DataSourceBadge';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { Badge } from '@/components/ui/badge';
import { Calendar, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import './analyticsNew.tokens.css';

// Placeholder components for other tabs

const AnalyticsNewClarity: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Microsoft Clarity</h2>
    <AnalyticsNewLoadingStates 
      mode="empty" 
      title="Clarity integration coming soon"
      description="Microsoft Clarity insights and heatmaps will be accessible here"
    />
  </div>
);

const AnalyticsNewFallback: React.FC = () => (
  <div className="analytics-new-container space-y-6">
    <h2 className="text-xl font-bold text-gray-900">Diagnostics</h2>
    <AnalyticsNewLoadingStates 
      mode="error" 
      title="Error handling and diagnostics"
      description="System diagnostics and error recovery tools will be available here"
      showRetry={true}
    />
  </div>
);

interface AnalyticsNewDashboardProps {
  className?: string;
}

export const AnalyticsNewDashboard: React.FC<AnalyticsNewDashboardProps> = ({ 
  className = '' 
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { sinceDate, sinceDateEnabled } = useAnalyticsNewFilters();

  // Get IP exclusions count for badge
  const { data: exclusions = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/analytics/exclusions'],
  });

  // Format date for display (DD MMMM YYYY French format)
  const formatSinceDateForBadge = (dateString: string): string => {
    try {
      const date = DateTime.fromISO(dateString).setZone('Europe/Paris');
      return date.setLocale('fr').toFormat('dd LLLL yyyy');
    } catch (error) {
      return dateString; // Fallback to original if parsing fails
    }
  };

  // Get active IP exclusions count
  const activeExclusionsCount = exclusions.filter(exc => exc.active).length;

  // Navigation functions for badges
  const navigateToExclusions = () => {
    handleTabChange('exclusions');
  };

  // Read query parameter on component mount and URL changes
  // Default to overview when since date is enabled
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('an_tab');
    
    // If since date is enabled and no specific tab requested, default to overview
    if (!urlTab && sinceDateEnabled) {
      setActiveTab('overview');
    } else {
      setActiveTab(urlTab || 'overview');
    }
  }, [sinceDateEnabled]);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(params.get('an_tab') || 'overview');
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle tab changes and update URL
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Update URL with query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('an_tab', tabId);
    window.history.pushState({}, '', url.toString());
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AnalyticsNewOverview />;
      case 'live':
        return <AnalyticsNewLiveView />;
      case 'video':
        return <AnalyticsNewVideo />;
      case 'geo':
        return <AnalyticsNewGeo />;
      case 'cta':
        return <AnalyticsNewCta />;
      case 'blog':
        return <AnalyticsNewBlog />;
      case 'trends':
        return <AnalyticsNewTrends />;
      case 'clarity':
        return <AnalyticsNewClarity />;
      case 'fallback':
        return <AnalyticsNewFallback />;
      case 'exclusions':
        return <IpExclusionsManager />;
      default:
        return <AnalyticsNewOverview />;
    }
  };

  return (
    <div 
      className={`h-screen bg-[var(--analytics-new-background)] font-[var(--analytics-new-font-family)] text-[var(--analytics-new-text)] overflow-y-auto ${className}`}
      data-testid="analytics-new-dashboard"
    >
      {/* Sticky Header Section - Now properly sticky within scroll container */}
      <div className="analytics-new-sticky-header">
        <div className="max-w-7xl mx-auto py-3 px-4">
          {/* Compact Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h1 className="text-xl font-bold text-[var(--analytics-new-text)] flex items-center gap-2">
                Analytics Dashboard
                <DataSourceBadge />
              </h1>
            </div>
            {/* Compact Header Info */}
            <div className="flex items-center gap-3 text-xs text-gray-600">
              {sinceDateEnabled && sinceDate && (
                <span className="inline-block">Since: {formatSinceDateForBadge(sinceDate)}</span>
              )}
              {activeExclusionsCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-gray-400">•</span>
                  <span>IPs: {activeExclusionsCount}</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Global Filters - Context-aware filtering */}
          <AnalyticsNewGlobalFilters hideDateFilters={activeTab === 'live'} />
          
          {/* Tab Navigation */}
          <div className="mt-2">
            <AnalyticsNewTabNavigation 
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>
        </div>
      </div>

      {/* Content - Ensure sufficient height for sticky behavior */}
      <div className="pb-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[150vh]">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};