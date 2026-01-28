import React, { useState } from 'react';
import { TopVideosTable } from './components/TopVideosTable';
import { VideoFunnel } from './components/VideoFunnel';
import { useAnalyticsNewFilters } from './analyticsNewFilters.store';
import type { TopVideoRow } from './data/types';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';


interface AnalyticsNewVideoProps {
  className?: string;
}

export const AnalyticsNewVideo: React.FC<AnalyticsNewVideoProps> = ({ 
  className = '' 
}) => {
  const [selectedVideo, setSelectedVideo] = useState<TopVideoRow | null>(null);
  const [liveView, setLiveView] = useState(false);
  const { setVideoId } = useAnalyticsNewFilters();

  const handleVideoSelect = (video: TopVideoRow) => {
    setSelectedVideo(video);
    // Set the global videoId filter so VideoFunnel gets the correct data
    setVideoId(video.videoId);
  };

  const handleCloseFunnel = () => {
    setSelectedVideo(null);
    // Clear the global videoId filter
    setVideoId('all');
  };

  return (
    <div className={cn('analytics-new-container space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--analytics-new-text)]">Video Analytics</h2>
          <p className="text-[var(--analytics-new-text-muted)] mt-1">
            Video performance and engagement metrics
          </p>
        </div>
        
        {/* Live View Toggle */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="live-view-toggle"
              checked={liveView}
              onCheckedChange={setLiveView}
              data-testid="live-view-toggle"
            />
            <Label 
              htmlFor="live-view-toggle" 
              className="text-sm font-medium text-[var(--analytics-new-text)] cursor-pointer"
            >
              Live View (last 30 min)
            </Label>
          </div>
          {liveView && (
            <div className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full border border-orange-200">
              Live GA4
            </div>
          )}
        </div>
      </div>

      {/* Top Videos Table */}
      <TopVideosTable 
        onSelect={handleVideoSelect}
        liveView={liveView}
        className="mb-6"
      />

      {/* Video Funnel - renders when video is selected or shows empty state */}
      {selectedVideo ? (
        <VideoFunnel 
          videoTitle={selectedVideo.title}
          liveView={liveView}
          onClose={handleCloseFunnel}
          className="mt-6"
        />
      ) : (
        <div className="analytics-new-card border-l-4 border-gray-300 mt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-lg font-medium text-[var(--analytics-new-text-muted)] mb-2">
                📊 Select a video to see the funnel
              </div>
              <div className="text-sm text-[var(--analytics-new-text-muted)]">
                Click any row in the table above to view engagement metrics
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};