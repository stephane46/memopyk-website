// client/src/components/admin/AnalyticsDashboard.tsx
import * as React from "react";
import { GlobalFilterProvider } from "./GlobalFilterContext";
import GlobalFilterBar from "./GlobalFilterBar";
import ExportPdfControls from "./ExportPdfControls";
// GA4AnalyticsSection removed - all data now comes from Supabase only
import AnalyticsDailyOverviewCard from "./AnalyticsDailyOverviewCard";
import { AnalyticsVideoPerformanceCard } from "./AnalyticsVideoPerformanceCard";
import AnalyticsCtaPerformanceCard from "./AnalyticsCtaPerformanceCard";
import AnalyticsGeoDistributionCard from "./AnalyticsGeoDistributionCard";
import AnalyticsWorldMapCard from "./AnalyticsWorldMapCard";

export function AnalyticsDashboard() {
  return (
    <GlobalFilterProvider>
      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics Dashboard</h1>
          <ExportPdfControls />
        </div>

        {/* NEW: Global filter bar */}
        <GlobalFilterBar />

        {/* GA4 Analytics Section removed - all data now comes from Supabase only */}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-2"><AnalyticsDailyOverviewCard /></div>
          <div><AnalyticsCtaPerformanceCard /></div>
          <div className="md:col-span-2 xl:col-span-2"><AnalyticsVideoPerformanceCard /></div>
          <div><AnalyticsGeoDistributionCard /></div>
          <div className="md:col-span-2 xl:col-span-2"><AnalyticsWorldMapCard /></div>
        </div>
      </div>
    </GlobalFilterProvider>
  );
}