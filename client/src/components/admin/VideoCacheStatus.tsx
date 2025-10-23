import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  HardDrive, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Zap,
  Clock
} from 'lucide-react';

interface VideoCacheStatusProps {
  videoFilenames: string[];
  title?: string;
  showForceAllButton?: boolean;
  description?: string;
}

interface CacheStatsResponse {
  fileCount: number;
  sizeMB: string;
  [key: string]: unknown;
}

interface UnifiedCacheStats {
  videos: { fileCount: number; totalSize: number; sizeMB: string };
  images: { fileCount: number; totalSize: number; sizeMB: string };
  total: { fileCount: number; totalSize: number; sizeMB: string; limitMB: string; usagePercent: number };
  management: { maxCacheDays: number; autoCleanup: boolean; nextCleanup: string };
}

interface CacheStatus {
  cached: boolean;
  size?: number;
  lastModified?: string;
  loadTime?: number;
}

export const VideoCacheStatus: React.FC<VideoCacheStatusProps> = ({ 
  videoFilenames, 
  title = "Video Cache Status",
  showForceAllButton = false,
  description
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingVideos, setPendingVideos] = React.useState<Set<string>>(new Set());

  // Listen for global cache triggers
  React.useEffect(() => {
    const handleAllMediaCache = () => {
      forceAllMediaMutation.mutate();
    };

    const handleClearCache = () => {
      clearCacheMutation.mutate();
    };

    window.addEventListener('triggerAllMediaCache', handleAllMediaCache);
    window.addEventListener('triggerClearCache', handleClearCache);
    
    return () => {
      window.removeEventListener('triggerAllMediaCache', handleAllMediaCache);
      window.removeEventListener('triggerClearCache', handleClearCache);
    };
  }, []);

  // Query cache status for specific videos
  const { data: cacheStatusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/video-cache/status', videoFilenames],
    queryFn: async () => {
      const videos = videoFilenames.map(filename => ({ filename, type: 'hero' }));
      const response = await apiRequest('/api/video-cache/status', 'POST', { videos });
      return await response.json();
    },
    enabled: videoFilenames.length > 0
    // Removed automatic refresh - use on-demand refresh buttons instead
  });

  // Query overall cache stats
  const { data: cacheStats, refetch: refetchStats } = useQuery<CacheStatsResponse>({
    queryKey: ['/api/video-cache/stats']
    // Removed automatic refresh - use on-demand refresh buttons instead
  });

  // Query unified cache stats with storage management
  const { data: unifiedStats, refetch: refetchUnified } = useQuery<UnifiedCacheStats>({
    queryKey: ['/api/unified-cache/stats']
    // Removed automatic refresh - use on-demand refresh buttons instead
  });

  // Refresh cache status for section (all videos in this component)
  const refreshStatusMutation = useMutation({
    mutationFn: async () => {
      const videos = videoFilenames.map(filename => ({ filename, type: 'hero' }));
      const response = await apiRequest('/api/video-cache/status', 'POST', { videos });
      return await response.json();
    },
    onSuccess: () => {
      refetchStatus();
      refetchStats();
      refetchUnified();
      toast({
        title: "Status Updated",
        description: `Updated cache status for ${videoFilenames.length} videos`,
      });
    },
    onError: (error) => {
      toast({
        title: "Refresh Failed", 
        description: "Failed to refresh cache status",
        variant: "destructive"
      });
    }
  });

  // Force cache single video mutation
  const forceCacheMutation = useMutation({
    mutationFn: async (filename: string) => {
      setPendingVideos(prev => new Set(Array.from(prev).concat([filename])));
      const response = await apiRequest('/api/video-cache/force', 'POST', { filename });
      const data = await response.json();
      return { response: data as {message?: string}, filename };
    },
    onSuccess: (data: {response: {message?: string}, filename: string}) => {
      const { response, filename } = data;
      setPendingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(filename);
        return newSet;
      });
      toast({
        title: "Video Cached",
        description: response.message || `${filename} has been cached successfully`,
      });
      refetchStatus();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
    },
    onError: (error: Error & {response?: {data?: {details?: string}}}, filename: string) => {
      setPendingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(filename);
        return newSet;
      });
      toast({
        title: "Cache Failed",
        description: `Failed to cache ${filename}: ${error.response?.data?.details || error.message}`,
        variant: "destructive",
      });
    }
  });

  // Force cache all videos mutation  
  const forceAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/video-cache/force-all', 'POST');
      return await response.json() as {cached?: string[]};
    },
    onSuccess: (data: {cached?: string[]}) => {
      toast({
        title: "All Videos Cached",
        description: `Successfully cached ${data.cached?.length || 0} videos`,
      });
      refetchStatus();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
    },
    onError: (error: Error & {response?: {data?: {details?: string}}}) => {
      toast({
        title: "Bulk Cache Failed", 
        description: `Failed to cache all videos: ${error.response?.data?.details || error.message}`,
        variant: "destructive",
      });
    }
  });

  // Force cache gallery videos mutation
  const forceCacheGalleryMutation = useMutation({
    mutationFn: () => apiRequest('/api/video-cache/cache-gallery-videos', 'POST'),
    onSuccess: (data) => {
      toast({
        title: "Gallery Videos Cached",
        description: "All gallery videos are now cached for instant playback",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
    },
    onError: (error: any) => {
      console.error('Force cache gallery error:', error);
      toast({
        title: "Cache Error",
        description: error.message || "Failed to cache gallery videos",
        variant: "destructive",
      });
    },
  });

  // Environment safety check with debug logging
  const currentHostname = window.location.hostname;
  const isProduction = currentHostname.includes('replit.app') || currentHostname.includes('memopyk');
  
  // Environment detection only - no logging dependencies
  React.useEffect(() => {
    // Clean environment detection without log dependencies
  }, [currentHostname, isProduction]);

  // Manual cleanup mutation - removes outdated/orphaned cache files
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/video-cache/clear', 'POST');
      return await response.json() as {removed?: {videosRemoved: number; imagesRemoved: number}; message?: string};
    },
    onSuccess: (data) => {
      const result = data.removed || { videosRemoved: 0, imagesRemoved: 0 };
      const totalRemoved = result.videosRemoved + result.imagesRemoved;
      
      if (totalRemoved > 0) {
        toast({
          title: "Intelligent Cleanup Complete",
          description: `Removed ${result.videosRemoved} outdated videos and ${result.imagesRemoved} expired images. Active cache preserved.`,
        });
      } else {
        toast({
          title: "Cache is Clean",
          description: "No outdated or orphaned files found. All cache files are current and needed.",
          variant: "default",
        });
      }
      
      refetchStatus();
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unified-cache/stats'] });
    },
    onError: (error: Error & {response?: {data?: {details?: string}}}) => {
      toast({
        title: "Clear Failed",
        description: `Failed to clear cache: ${error.response?.data?.details || error.message}`,
        variant: "destructive",
      });
    }
  });

  // Force cache ALL MEDIA (videos + images) mutation  
  const forceAllMediaMutation = useMutation({
    mutationFn: async () => {
      // Show immediate feedback
      toast({
        title: "All Media Cache Starting",
        description: "Processing all media files... This will take 30-60 seconds.",
      });
      
      try {
        // Use longer timeout for this heavy operation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for heavy operations
        
        const response = await fetch('/api/video-cache/force-all-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        return await response.json() as {
          stats?: {
            videos: {attempted: number, successful: number};
            images: {attempted: number, successful: number};
            processingTime: string;
          };
          verification?: {
            videos: Array<{filename: string, success: boolean, sizeMB: string}>;
            images: Array<{filename: string, success: boolean, sizeMB: string}>;
          };
        };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error('Operation timed out after 60 seconds. The cache may still be processing in background.');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      const videoCount = data.stats?.videos?.successful || 0;
      const imageCount = data.stats?.images?.successful || 0;
      const processingTime = data.stats?.processingTime || '0s';
      
      toast({
        title: "All Media Cache Complete",
        description: `Successfully cached ${videoCount} videos & ${imageCount} images in ${processingTime}`,
      });
      refetchStatus();
      refetchStats();
      refetchUnified();
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/unified-cache/stats'] });
      
      // Notify AdminPage that bulletproof cache is complete
      window.dispatchEvent(new CustomEvent('bulletproofCacheComplete'));
    },
    onError: (error: Error & {response?: {data?: {details?: string}}}) => {
      console.error('BULLETPROOF cache error:', error);
      
      // Check if this might be a timeout but operation could still be running
      const isTimeout = error.message.includes('timeout') || error.message.includes('timed out');
      
      toast({
        title: isTimeout ? "Cache Operation May Still Be Running" : "BULLETPROOF Cache Failed",
        description: isTimeout 
          ? "The operation timed out but may still be processing. Check cache status in a few minutes."
          : `Failed to cache all media: ${error.response?.data?.details || error.message}`,
        variant: isTimeout ? "default" : "destructive",
      });
      
      // Refresh stats in case operation actually succeeded
      if (isTimeout) {
        setTimeout(() => {
          refetchStats();
          refetchUnified();
          queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
        }, 5000);
      }
      
      // Notify AdminPage that bulletproof cache failed
      window.dispatchEvent(new CustomEvent('bulletproofCacheError'));
    }
  });

  // Extract cache status from the API response structure
  const cacheStatus: Record<string, CacheStatus> = React.useMemo(() => {
    if (!cacheStatusData?.videos) {
      return {};
    }
    
    // Convert array response to object keyed by filename
    const statusMap: Record<string, CacheStatus> = {};
    cacheStatusData.videos.forEach((video: any) => {
      statusMap[video.filename] = {
        cached: video.cached,
        size: video.size || 0,
        lastModified: video.lastModified || new Date().toISOString(),
        loadTime: video.cached ? 50 : 1500
      };
    });
    return statusMap;
  }, [cacheStatusData]);

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const formatLastModified = (dateString: string): string => {
    const date = new Date(dateString);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    const diffHours = diffMinutes / 60;
    const diffDays = diffHours / 24;
    
    // Cache status is determined by active server queries, not logs
    
    if (diffMinutes < 5) return 'Just cached';
    if (diffMinutes < 60) return `${Math.floor(diffMinutes)}min ago`;
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  const getCacheAgeColor = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays < 1) return 'text-green-600'; // Fresh (< 1 day)
    if (diffDays < 7) return 'text-blue-600';  // Recent (< 1 week)
    if (diffDays < 30) return 'text-yellow-600'; // Older (< 1 month)
    return 'text-red-600'; // Very old (> 1 month)
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Checking cache status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cachedCount = Object.values(cacheStatus).filter(status => status.cached).length;
  const totalCount = videoFilenames.length;

  return (
    <div className="space-y-4">
      {/* Section-Specific Cache Status */}
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <HardDrive className="h-5 w-5 flex-shrink-0" />
                <span className="font-semibold text-lg">{title}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={`text-xs ${isProduction ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {isProduction ? 'Production' : 'Dev'}
                </Badge>
                <Badge variant={cachedCount === totalCount ? "default" : "secondary"} className="whitespace-nowrap text-xs">
                  {cachedCount}/{totalCount}
                </Badge>
                
                {/* Section Refresh Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => refreshStatusMutation.mutate()}
                  disabled={refreshStatusMutation.isPending}
                  className="h-7 px-2 text-xs"
                  title={`Update cache status timestamps for all ${videoFilenames.length} videos in this section`}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${refreshStatusMutation.isPending ? 'animate-spin' : ''}`} />
                  Update Status
                </Button>
                
                {showForceAllButton && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => forceAllMutation.mutate()}
                    disabled={forceAllMutation.isPending}
                    className="text-xs px-2 py-1 h-7"
                  >
                    {forceAllMutation.isPending ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Zap className="h-3 w-3 mr-1" />
                    )}
                    Force Cache
                  </Button>
                )}
              </div>
            </div>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          )}
          <div className="text-xs text-muted-foreground mt-1 truncate">
            Server: {currentHostname}
          </div>
        </CardHeader>
      <CardContent>
        {/* Section-specific cache stats only */}
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Section Status: {cachedCount}/{totalCount} cached ({cachedCount > 0 && totalCount > 0 ? Math.round((cachedCount/totalCount)*100) : 0}%)</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Performance: ~50ms cached vs ~1500ms uncached
            </div>
          </div>
        </div>

        {/* Individual video status */}
        <div className="space-y-3">
          {videoFilenames.map((filename) => {
            const status = cacheStatus[filename];
            const isCached = status?.cached || false;
            
            return (
              <div key={filename} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {isCached ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <div className="font-medium text-sm">{filename}</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {isCached ? (
                        <div className="space-y-1">
                          <div className="text-green-600 font-medium">✅ Cached (~50ms)</div>
                          <div className="flex items-center gap-3 text-xs">
                            {status?.size && <span>Size: {formatFileSize(status.size)}</span>}
                            {status?.lastModified && (
                              <span className={`flex items-center gap-1 ${getCacheAgeColor(status.lastModified)}`}>
                                <Clock className="h-3 w-3" /> {formatLastModified(status.lastModified)}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-orange-600 font-medium">⏳ Not Cached (~1500ms)</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isCached && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => forceCacheMutation.mutate(filename)}
                      disabled={pendingVideos.has(filename)}
                    >
                      {pendingVideos.has(filename) ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      Cache Now
                    </Button>
                  )}
                  
                  {isCached && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => forceCacheMutation.mutate(filename)}
                      disabled={pendingVideos.has(filename)}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      {pendingVideos.has(filename) ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Refresh Cache
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalCount === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No videos to display cache status for</p>
          </div>
        )}

        {/* Cache Management - Individual buttons provide all needed functionality */}
        {/* Removed redundant "Smart Gallery Refresh" - use individual cache buttons or All Media Cache instead */}
      </CardContent>
      </Card>
    </div>
  );
};

export default VideoCacheStatus;