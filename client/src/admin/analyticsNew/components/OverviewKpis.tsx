import React from 'react';
import type { KpisResponse } from "../data/types";
import { AnalyticsNewLoadingStates } from '../AnalyticsNewLoadingStates';
import { VisitorFocusedKpis } from './VisitorFocusedKpis';

interface OverviewKpisProps {
  preset?: "today" | "yesterday" | "7d" | "30d" | "90d";
  className?: string;
  startDate?: string;
  endDate?: string;
  // Props passed from parent to avoid duplicate API calls
  data?: KpisResponse | null;
  loading?: boolean;
  error?: unknown;
}

export function OverviewKpis({ 
  preset = "7d", 
  className = "", 
  startDate, 
  endDate,
  data,
  loading,
  error
}: OverviewKpisProps) {
  // Use loading/error/data from parent component (single source of truth)
  const isLoading = !!loading;
  const err = error;
  const kpiData = data?.kpis;

  if (isLoading) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (err) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="error" 
          title="Error loading KPIs"
          description="Unable to fetch analytics data"
          showRetry={true}
        />
      </div>
    );
  }

  if (!kpiData) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="empty" 
          title="No data available"
          description="No analytics data found for the selected period"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Visitor-focused metrics (like Analytics Old) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Visitor Overview</h3>
        <VisitorFocusedKpis 
          preset={preset} 
          startDate={startDate} 
          endDate={endDate} 
        />
      </div>
    </div>
  );
}