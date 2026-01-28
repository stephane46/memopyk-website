import React from "react";
import { useFilteredAnalytics } from "../hooks/useFilteredAnalytics";
import { useAnalyticsNewFilters } from "../analyticsNewFilters.store";
import type { VideoFunnelResponse } from "../data/types";
import { AnalyticsNewLoadingStates } from '../AnalyticsNewLoadingStates';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VideoFunnelProps {
  videoTitle?: string;
  liveView?: boolean;
  onClose?: () => void;
  className?: string;
}

export function VideoFunnel({ 
  videoTitle, 
  liveView = false,
  onClose,
  className = "" 
}: VideoFunnelProps) {
  // Get current videoId to ensure we only load funnel for specific videos
  const { videoId } = useAnalyticsNewFilters();
  
  // Only fetch data when a specific video is selected (not 'all')
  const shouldFetch = videoId && videoId !== 'all';
  
  const { data, isLoading: loading, error } = useFilteredAnalytics<VideoFunnelResponse>({
    reportType: liveView ? "realtimeVideoProgress" : "videoFunnel",
    enabled: shouldFetch
  });

  // Show message when no video is selected
  if (!shouldFetch) {
    return (
      <div className={`analytics-new-card border-l-4 border-gray-300 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
            Video Engagement Funnel
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--analytics-new-text-muted)] hover:text-[var(--analytics-new-text)] text-xl font-bold"
              data-testid="close-funnel"
            >
              ×
            </button>
          )}
        </div>
        <AnalyticsNewLoadingStates 
          mode="empty" 
          title="Select a video"
          description="Click on a video in the table above to view its engagement funnel"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`analytics-new-card border-l-4 border-[var(--analytics-new-accent)] ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
            Video Engagement Funnel - {videoTitle || 'Selected Video'}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--analytics-new-text-muted)] hover:text-[var(--analytics-new-text)] text-xl font-bold"
              data-testid="close-funnel"
            >
              ×
            </button>
          )}
        </div>
        <AnalyticsNewLoadingStates mode="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`analytics-new-card border-l-4 border-red-500 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
            Video Engagement Funnel - {videoTitle || 'Selected Video'}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--analytics-new-text-muted)] hover:text-[var(--analytics-new-text)] text-xl font-bold"
              data-testid="close-funnel"
            >
              ×
            </button>
          )}
        </div>
        <AnalyticsNewLoadingStates 
          mode="error" 
          title="Error loading funnel"
          description="Unable to fetch video engagement data"
        />
      </div>
    );
  }

  // Handle both regular and realtime data structures
  const funnelData = data?.funnel || [];
  if (!data || funnelData.length === 0) {
    return (
      <div className={`analytics-new-card border-l-4 border-gray-300 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
            Video Engagement Funnel - {videoTitle || 'Selected Video'}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--analytics-new-text-muted)] hover:text-[var(--analytics-new-text)] text-xl font-bold"
              data-testid="close-funnel"
            >
              ×
            </button>
          )}
        </div>
        <AnalyticsNewLoadingStates 
          mode="empty" 
          title="No funnel data"
          description="No engagement data available for this video"
        />
      </div>
    );
  }

  const USE_MOCK = import.meta.env?.VITE_USE_MOCK === "true";
  const maxCount = Math.max(...funnelData.map((step: any) => step.count));

  return (
    <div className={`analytics-new-card border-l-4 border-[var(--analytics-new-accent)] ${className}`} data-testid="video-funnel">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-[var(--analytics-new-text)]">
              {liveView ? 'Live View — last ~30 min' : 'Video Engagement Funnel'} - {videoTitle || 'Selected Video'}
              {liveView && <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Live</span>}
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-[var(--analytics-new-text-muted)] cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">
                    Event-based counts. Numbers are total video_progress events at 10/25/50/75/90. 
                    Replays or scrubbing may add multiple events per viewer.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {USE_MOCK && (
            <div className="text-xs text-orange-500 font-medium mt-1">🧪 Mock Data</div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--analytics-new-text-muted)] hover:text-[var(--analytics-new-text)] text-xl font-bold"
            data-testid="close-funnel"
          >
            ×
          </button>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {funnelData.map((step: any) => (
          <div 
            key={step.bucket} 
            className="p-4 rounded-xl border border-gray-200 text-center"
            data-testid={`funnel-bucket-${step.bucket}`}
          >
            <div className="text-sm font-medium text-[var(--analytics-new-text-muted)] mb-1">
              {step.bucket === 90 ? "90% (Complete)" : `${step.bucket}%`}
            </div>
            <div className="text-xl font-bold text-[var(--analytics-new-text)]">
              {step.count.toLocaleString()}
            </div>
            {maxCount > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-[var(--analytics-new-accent)] h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${(step.count / maxCount) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-xs text-[var(--analytics-new-text-muted)] border-t pt-4">
        <p>
          <strong>Progress Buckets:</strong> Shows how many users reached each milestone. 
          90% completion indicates users who watched at least 90% of the video.
        </p>
      </div>
    </div>
  );
}