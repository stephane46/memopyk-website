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
import { AnalyticsNewFallback } from './AnalyticsNewFallback';
import DataSourceBadge from './components/DataSourceBadge';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import { Badge } from '@/components/ui/badge';
import { Calendar, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import './analyticsNew.tokens.css';

// Clarity tab — links to external dashboard
const AnalyticsNewClarity: React.FC = () => {
  const clarityProjectId = (import.meta as any).env?.VITE_CLARITY_PROJECT_ID;
  return (
    <div className="analytics-new-container space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Microsoft Clarity</h2>
      {clarityProjectId ? (
        <div className="p-6 bg-white rounded-lg border border-gray-200 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-gray-700">Clarity is configured</span>
          </div>
          <p className="text-sm text-gray-600">
            Project ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{clarityProjectId}</code>
          </p>
          <a
            href={`https://clarity.microsoft.com/projects/view/${clarityProjectId}/dashboard`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Clarity Dashboard
            <span className="text-xs opacity-75">&#8599;</span>
          </a>
        </div>
      ) : (
        <div className="p-6 bg-white rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-sm font-medium text-gray-700">Not configured</span>
          </div>
          <p className="text-sm text-gray-600">
            To enable Clarity heatmaps and session recordings:
          </p>
          <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1">
            <li>Create a project at <a href="https://clarity.microsoft.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">clarity.microsoft.com</a></li>
            <li>Add the project ID as <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">VITE_CLARITY_PROJECT_ID</code> in your environment</li>
            <li>Redeploy the application</li>
          </ol>
        </div>
      )}
    </div>
  );
};

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
            <div className="flex items-center gap-2">
              {sinceDateEnabled && sinceDate && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                  Since: {formatSinceDateForBadge(sinceDate)}
                </Badge>
              )}
              {activeExclusionsCount > 0 && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                  🟠 IPs: {activeExclusionsCount}
                </Badge>
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