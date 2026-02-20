import React, { useMemo, useState } from "react";
import { useFilteredTopVideos } from "../hooks/useFilteredAnalytics";
import type { TopVideosResponse, TopVideoRow } from "../data/types";
import { AnalyticsNewLoadingStates } from '../AnalyticsNewLoadingStates';
import { ChevronDown, ChevronUp, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopVideosTableProps {
  onSelect: (video: TopVideoRow) => void;
  liveView?: boolean;
  className?: string;
}

export function TopVideosTable({ onSelect, liveView = false, className = "" }: TopVideosTableProps) {
  // 🎯 CENTRALIZED FILTERING: Use the new modular system
  const { data, isLoading: loading, error } = useFilteredTopVideos<TopVideosResponse>();
  const [sortBy, setSortBy] = useState<keyof TopVideoRow>("plays");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sortedRows = useMemo(() => {
    // Handle topVideos structure (backend returns both 'topVideos' and 'videos' arrays)
    const raw = data?.topVideos || (data as any)?.videos || [];
    if (!raw.length) return [];

    // Normalize rows: ensure 'plays' is always populated from 'views' if missing
    const videos: TopVideoRow[] = raw.map((item: any) => ({
      ...item,
      plays: item.plays ?? item.views ?? 0,
      completions: item.completions ?? 0,
      completionRate: item.completionRate ?? item.completePct ?? 0,
    }));

    const sorted = [...videos].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      // For string fields
      return direction === "asc"
        ? String(aVal || '').localeCompare(String(bVal || ''))
        : String(bVal || '').localeCompare(String(aVal || ''));
    });

    return sorted;
  }, [data, sortBy, direction, liveView]);

  const toggleSort = (column: keyof TopVideoRow) => {
    if (column === sortBy) {
      setDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setDirection("desc");
    }
  };

  const getSortIcon = (column: keyof TopVideoRow) => {
    if (sortBy !== column) return null;
    return direction === "desc" ? (
      <ChevronDown className="h-4 w-4" />
    ) : (
      <ChevronUp className="h-4 w-4" />
    );
  };

  const getAriaSortValue = (column: keyof TopVideoRow) => {
    if (column === sortBy) {
      return direction === "asc" ? "ascending" : "descending";
    }
    return "none";
  };

  if (loading) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (error) {
    // Check if this is a GA4 custom dimension error
    const errorMessage = (error as any)?.message || String(error);
    const isGA4CustomDimensionError = errorMessage?.includes?.('GA4 Invalid Argument') || 
                                     errorMessage?.includes?.('custom dimension');
    
    const errorTitle = isGA4CustomDimensionError ? "GA4 Setup Required" : "Error loading videos";
    const errorDescription = isGA4CustomDimensionError 
      ? "Missing custom dimensions in GA4. Create video_id, video_title, and progress_bucket in GA4 Admin → Custom definitions (Event scope)"
      : `Unable to fetch video analytics data: ${errorMessage || 'Unknown error'}`;

    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="error" 
          title={errorTitle}
          description={errorDescription}
          showRetry={true}
        />
      </div>
    );
  }

  if (!sortedRows.length) {
    return (
      <div className={className}>
        <AnalyticsNewLoadingStates 
          mode="empty" 
          title="No videos found"
          description="No video data available for the selected period"
        />
      </div>
    );
  }

  const USE_MOCK = import.meta.env?.VITE_USE_MOCK === "true";

  return (
    <div className={`analytics-new-card ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">Top Videos</h3>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-[var(--analytics-new-text-muted)]">
            {sortedRows.length} videos • Click to view funnel
          </span>
          {USE_MOCK && (
            <div className="text-xs text-orange-500 font-medium">🧪 Mock</div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="top-videos-table">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)]">
                Video
              </th>
              <th 
                role="columnheader" 
                aria-sort={getAriaSortValue("plays")}
                className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSort("plays")}
                data-testid="sort-plays"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>{liveView ? "Plays (RT)" : "Plays"}</span>
                  {getSortIcon("plays")}
                </div>
              </th>
              {!liveView && (
                <>
                  <th 
                    role="columnheader" 
                    aria-sort={getAriaSortValue("completions")}
                    className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSort("completions")}
                    data-testid="sort-completions"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Completions (90%)</span>
                      {getSortIcon("completions")}
                    </div>
                  </th>
                  <th 
                    role="columnheader" 
                    aria-sort={getAriaSortValue("completionRate")}
                    className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleSort("completionRate")}
                    title="90% progress ÷ starts"
                    data-testid="sort-completion-rate"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Completion Rate</span>
                      {getSortIcon("completionRate")}
                    </div>
                  </th>
                </>
              )}
              {liveView && (
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text-muted)]" colSpan={2}>
                  Realtime Data (Limited)
                </th>
              )}
              {sortedRows.some(row => row.avgEngagement !== undefined) && (
                <th 
                  role="columnheader" 
                  aria-sort={getAriaSortValue("avgEngagement")}
                  className="text-right py-3 px-4 text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSort("avgEngagement")}
                  data-testid="sort-engagement"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Avg Engagement (s)</span>
                    {getSortIcon("avgEngagement")}
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr 
                key={row.videoId}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onSelect(row)}
                data-testid={`video-row-${row.videoId}`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Play className="h-4 w-4 text-[var(--analytics-new-accent)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--analytics-new-text)] truncate">
                        {row.title}
                      </p>
                      <p className="text-xs text-[var(--analytics-new-text-muted)] truncate">
                        {row.videoId}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]" data-testid={`plays-${row.videoId}`}>
                  {(row.plays || 0).toLocaleString()}
                </td>
                {!liveView && (
                  <>
                    <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]" data-testid={`completions-${row.videoId}`}>
                      {(row.completions || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]">
                      <div className="flex items-center justify-end space-x-2">
                        {(() => {
                          const plays = row.plays ?? row.views ?? 0;
                          // No plays means no meaningful completion rate
                          if (plays === 0) {
                            return (
                              <>
                                <span data-testid={`completion-rate-${row.videoId}`} className="text-[var(--analytics-new-text-muted)]">&mdash;</span>
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div className="bg-gray-300 h-1.5 rounded-full" style={{ width: '0%' }} />
                                </div>
                              </>
                            );
                          }
                          // completionRate from backend is 0..100 (integer percentage)
                          const rawRate = row.completionRate ?? 0;
                          // If the value looks like a 0..1 ratio, convert to percentage
                          const pct = rawRate > 0 && rawRate <= 1 ? Math.round(rawRate * 100) : Math.round(rawRate);
                          const displayPct = Math.min(Math.max(pct, 0), 100);
                          return (
                            <>
                              <span data-testid={`completion-rate-${row.videoId}`}>{displayPct}%</span>
                              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-[var(--analytics-new-accent)] h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${displayPct}%` }}
                                />
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </>
                )}
                {liveView && (
                  <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text-muted)]" colSpan={2}>
                    Realtime data - completion metrics unavailable
                  </td>
                )}
                {row.avgEngagement !== undefined && (
                  <td className="py-4 px-4 text-right text-sm text-[var(--analytics-new-text)]" data-testid={`engagement-${row.videoId}`}>
                    {row.avgEngagement}s
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}