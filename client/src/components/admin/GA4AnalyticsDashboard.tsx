import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, TrendingUp } from 'lucide-react';
import { useDashboardFilters } from '@/analytics/FiltersContext';
import { AnalyticsControls } from './AnalyticsControls';
import { TopVideosSection } from './TopVideosSection';
import { KpiStrip } from './KpiStrip';
import { FunnelChart } from './FunnelChart';
import { TrendChart } from './TrendChart';
import { RealtimePanel } from './RealtimePanel';
import { RecentActivityPanel } from './RecentActivityPanel';
import { ClearCacheButton } from './ClearCacheButton';
import AnalyticsDailyOverviewCard from './AnalyticsDailyOverviewCard';
import { AnalyticsCleanupCard } from './AnalyticsCleanupCard';
import { AnalyticsVideoPerformanceCard } from './AnalyticsVideoPerformanceCard';
import AnalyticsCtaPerformanceCard from './AnalyticsCtaPerformanceCard';
import AnalyticsGeoDistributionCard from './AnalyticsGeoDistributionCard';

const GA4AnalyticsDashboard: React.FC = () => {
  const { startDate, endDate, locale } = useDashboardFilters();

  // Debug Link functionality
  const handleCopyDebugLink = () => {
    const params = new URLSearchParams({
      start: startDate,
      end: endDate,
      locale: locale || "all",
    });
    const url = `${window.location.origin}/fr-FR/admin?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      // Simple success feedback
      const btn = document.querySelector('[data-testid="copy-debug-link"]') as HTMLElement;
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-orange-600" />
          Analytics GA4 - Video Performance Dashboard
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time video analytics from Google Analytics 4 Data API - Gallery videos only
        </p>
      </div>

      {/* Controls Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Dashboard Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <AnalyticsControls />
              
              {/* Debug Link Button */}
              <Button
                onClick={handleCopyDebugLink}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                data-testid="copy-debug-link"
                title="Copy shareable link with current filters"
              >
                <Copy className="h-4 w-4" />
                Copy Debug Link
              </Button>
            </div>
            
            {/* Clear Cache Button */}
            <ClearCacheButton />
          </div>
        </CardContent>
      </Card>

      {/* KPI Strip */}
      <div className="grid gap-4">
        <KpiStrip />
      </div>

      {/* Main dashboard layout */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Videos Section */}
        <TopVideosSection />

        {/* B. Watch Funnel */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">B. Watch Progress Funnel</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FunnelChart />
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* C. Trend Over Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">C. Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart />
          </CardContent>
        </Card>

        {/* D. Realtime */}
        <RealtimePanel />
      </div>

      {/* Compact Analytics Dashboard - 4 Main Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overview Card */}
        <AnalyticsDailyOverviewCard />
        
        {/* Video Performance Card */}
        <AnalyticsVideoPerformanceCard dateRange="30" />
        
        {/* CTA Performance Card */}
        <AnalyticsCtaPerformanceCard />
        
        {/* Geographic Distribution Card */}
        <AnalyticsGeoDistributionCard />
      </div>

      {/* Additional Analytics Panels */}
      <div className="grid gap-4 lg:grid-cols-2">        
        {/* Recent Activity from Database */}
        <RecentActivityPanel />
        
        {/* Analytics Data Cleanup */}
        <AnalyticsCleanupCard />
      </div>
    </div>
  );
};

export default GA4AnalyticsDashboard;