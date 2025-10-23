import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface VideoSourceIndicatorProps {
  videoUrl: string;
  filename: string;
}

export function VideoSourceIndicator({ videoUrl, filename }: VideoSourceIndicatorProps) {
  const [sourceInfo, setSourceInfo] = useState<{
    source: string;
    serveTime: string;
    status: number;
  } | null>(null);

  useEffect(() => {
    // Make a HEAD request to check video source without downloading
    const checkVideoSource = async () => {
      try {
        const response = await fetch(videoUrl, { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        const source = response.headers.get('X-Video-Source') || 'UNKNOWN';
        const serveTime = response.headers.get('X-Serve-Time') || 'N/A';
        
        setSourceInfo({
          source,
          serveTime,
          status: response.status
        });
        
        console.log(`📊 Video Source Check for ${filename}:`, {
          source,
          serveTime,
          status: response.status,
          url: videoUrl
        });
      } catch (error) {
        console.error(`❌ Failed to check video source for ${filename}:`, error);
        setSourceInfo({
          source: 'ERROR',
          serveTime: 'N/A',
          status: 0
        });
      }
    };

    if (videoUrl) {
      checkVideoSource();
    }
  }, [videoUrl, filename]);

  if (!sourceInfo) {
    return (
      <Badge variant="outline" className="text-xs">
        Checking...
      </Badge>
    );
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'LOCAL_CACHE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'SUPABASE_CDN':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSourceText = (source: string) => {
    switch (source) {
      case 'LOCAL_CACHE':
        return '⚡ Cache';
      case 'SUPABASE_CDN':
        return '🌐 CDN';
      case 'ERROR':
        return '❌ Error';
      default:
        return '❓ Unknown';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Badge 
        variant="outline" 
        className={`text-xs ${getSourceColor(sourceInfo.source)}`}
      >
        {getSourceText(sourceInfo.source)}
      </Badge>
      <div className="text-xs text-gray-500">
        {sourceInfo.serveTime}
      </div>
    </div>
  );
}