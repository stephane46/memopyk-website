import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Play, RefreshCw, HardDrive, Trash2, Zap, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import VideoCacheStatus from '@/components/admin/VideoCacheStatus';

interface HeroVideo {
  id: string;
  urlEn: string;
  urlFr: string;
  useSameVideo: boolean;
}

interface GalleryItem {
  id: string;
  videoUrlEn: string | null;
  videoUrlFr: string | null;
  useSameVideo: boolean;
}

export default function CacheManagementSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isBulletproofCacheRunning, setIsBulletproofCacheRunning] = useState(false);

  // Handle bulletproof cache loading state
  useEffect(() => {
    const handleBulletproofComplete = () => {
      setIsBulletproofCacheRunning(false);
    };

    const handleBulletproofError = () => {
      setIsBulletproofCacheRunning(false);
    };

    // Listen for completion events from VideoCacheStatus component
    window.addEventListener('bulletproofCacheComplete', handleBulletproofComplete);
    window.addEventListener('bulletproofCacheError', handleBulletproofError);

    return () => {
      window.removeEventListener('bulletproofCacheComplete', handleBulletproofComplete);
      window.removeEventListener('bulletproofCacheError', handleBulletproofError);
    };
  }, []);

  // Fetch hero videos (for video filenames in VideoCacheStatus)
  const { data: heroVideos = [] } = useQuery<HeroVideo[]>({
    queryKey: ['/api/hero-videos'],
  });

  // Fetch gallery items (for video filenames in VideoCacheStatus)
  const { data: galleryItems = [] } = useQuery<GalleryItem[]>({
    queryKey: ['/api/gallery'],
  });

  // Extract unique hero video filenames
  const heroVideoFilenames = useMemo(() => {
    const fns: string[] = [];
    for (const v of heroVideos) {
      if (v.urlEn && !fns.includes(v.urlEn)) fns.push(v.urlEn);
      if (!v.useSameVideo && v.urlFr && v.urlFr !== v.urlEn && !fns.includes(v.urlFr)) fns.push(v.urlFr);
    }
    return fns;
  }, [heroVideos]);

  // Extract unique gallery video filenames from full URLs
  const galleryVideoFilenames = useMemo(() => {
    const fns: string[] = [];
    const extract = (url: string) => {
      try { return decodeURIComponent(url.split('/').pop()!); }
      catch { return url.split('/').pop()!; }
    };
    for (const item of galleryItems) {
      if (item.videoUrlEn) {
        const fn = extract(item.videoUrlEn);
        if (!fns.includes(fn)) fns.push(fn);
      }
      if (!item.useSameVideo && item.videoUrlFr && item.videoUrlFr !== item.videoUrlEn) {
        const fn = extract(item.videoUrlFr);
        if (!fns.includes(fn)) fns.push(fn);
      }
    }
    return fns;
  }, [galleryItems]);

  // Fetch detailed cache breakdown
  const { data: cacheBreakdown } = useQuery<any>({
    queryKey: ['/api/cache/breakdown'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Cache refresh mutation
  const refreshCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/video-cache/refresh', 'POST');
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      toast({
        title: "Cache Refreshed",
        description: `Successfully refreshed ${data.cached?.length || 0} critical videos`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to refresh video cache", variant: "destructive" });
    }
  });

  // Smart gallery cache refresh mutation - syncs cache with current database
  const smartCacheRefreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/video-cache/refresh-gallery', 'POST');
      return await response.json() as {
        success: boolean;
        message: string;
        removed: string[];
        cached: string[];
        stats: any;
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      const removedCount = data.removed?.length || 0;
      const cachedCount = data.cached?.length || 0;
      toast({
        title: "Smart Cache Refresh Complete",
        description: `Removed ${removedCount} outdated files, cached ${cachedCount} new files`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to refresh gallery cache", variant: "destructive" });
    }
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/video-cache/clear', 'POST');
      return await response.json() as {removed?: {videosRemoved: number; imagesRemoved: number}; message?: string};
    },
    onSuccess: (data) => {
      const result = data.removed || { videosRemoved: 0, imagesRemoved: 0 };
      queryClient.invalidateQueries({ queryKey: ['/api/video-cache/stats'] });
      toast({
        title: "Cache Completely Cleared",
        description: `Removed ${result.videosRemoved} videos and ${result.imagesRemoved} images. Cache is now empty.`
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clear video cache", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion du Cache</h2>
        <p className="text-gray-600 dark:text-gray-700">Gestion complète du cache pour tous les médias (Vidéos Hero, Vidéos Galerie, Images)</p>
      </div>

      {/* Storage Management Overview — uses /api/cache/breakdown (real data) */}
      {cacheBreakdown && (
        <Card className="border-2 border-orange-200 bg-orange-50 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-orange-900">
              <HardDrive className="h-5 w-5" />
              Storage Management Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Cache Usage</div>
                <div className="flex items-center gap-2">
                  <Badge variant={Number(cacheBreakdown.total?.sizeMB) > 800 ? "destructive" : Number(cacheBreakdown.total?.sizeMB) > 500 ? "default" : "secondary"}>
                    {cacheBreakdown.total?.sizeMB || 0}MB / {cacheBreakdown.total?.limitMB || 1000}MB
                  </Badge>
                  <span className="text-sm text-gray-600">({cacheBreakdown.total?.usagePercent || 0}%)</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Auto Cleanup</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                    30 days
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Enabled
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Media Files</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{cacheBreakdown.total?.fileCount || 0} files</Badge>
                  <Badge variant="outline">{cacheBreakdown.total?.sizeMB || 0}MB total</Badge>
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Auto cleanup removes files older than 30 days. Manual cleanup available below.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              Vidéos Hero
            </CardTitle>
            <CardDescription>Vidéos critiques du carrousel homepage</CardDescription>
          </CardHeader>
          <CardContent>
            <VideoCacheStatus
              title="Hero Videos Cache Status"
              description="Critical videos for homepage carousel - preloaded for instant display"
              videoFilenames={heroVideoFilenames}
              showForceAllButton={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Vidéos Galerie
            </CardTitle>
            <CardDescription>Vidéos portfolio optimisées pour lightbox</CardDescription>
          </CardHeader>
          <CardContent>
            <VideoCacheStatus
              title="Gallery Videos Cache Status"
              description="Portfolio gallery videos - optimized for lightbox display"
              videoFilenames={galleryVideoFilenames}
              showForceAllButton={false}
            />
          </CardContent>
        </Card>
      </div>

      {/* Global Cache Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-purple-600" />
            Actions Globales du Cache
          </CardTitle>
          <CardDescription>
            Gestion complète du cache pour tous les médias (Hero Videos + Gallery Videos + Images)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              size="lg"
              variant="default"
              disabled={isBulletproofCacheRunning}
              onClick={() => {
                setIsBulletproofCacheRunning(true);
                const event = new CustomEvent('triggerAllMediaCache');
                window.dispatchEvent(event);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium h-20 flex-col gap-2 disabled:opacity-70"
            >
              <div className="flex items-center gap-2">
                {isBulletproofCacheRunning ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5" />
                )}
                <span className="text-lg">
                  {isBulletproofCacheRunning ? '⚡ Processing All Media...' : '🚀 All Media Cache'}
                </span>
              </div>
              <span className="text-sm opacity-90">
                {isBulletproofCacheRunning ? 'This will take 15-45 seconds...' : 'Cache tous les médias avec vérification complète'}
              </span>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              onClick={() => {
                // Smart cleanup functionality - removes only outdated files
                const event = new CustomEvent('triggerClearCache');
                window.dispatchEvent(event);
              }}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="text-lg">🧹 Smart Cleanup</span>
              </div>
              <span className="text-sm opacity-90">Supprime fichiers expirés (&gt;30j) + orphelins uniquement</span>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-2 border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
              onClick={async () => {
                try {
                  const response = await apiRequest('/api/cache/cleanup-orphaned-static-images', 'POST');
                  const data = await response.json();

                  if (data.cleaned > 0) {
                    toast({
                      title: "Images orphelines supprimées",
                      description: `${data.cleaned} images orphelines supprimées. Cache maintenant: ${data.referencedImages.length} images pour ${data.referencedImages.length} galeries actives.`,
                    });
                  } else {
                    toast({
                      title: "Aucune image orpheline",
                      description: "Toutes les images en cache sont utilisées par des galeries actives.",
                    });
                  }

                  // Refresh cache stats
                  queryClient.invalidateQueries({ queryKey: ['/api/cache/breakdown'] });
                } catch (error) {
                  toast({
                    title: "Erreur nettoyage",
                    description: "Impossible de nettoyer les images orphelines.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                <span className="text-lg">🗑️ Images Orphelines</span>
              </div>
              <span className="text-sm opacity-90">Supprime images inutilisées uniquement</span>
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                <strong>Contenu:</strong> {cacheBreakdown ?
                  `${cacheBreakdown.videos?.fileCount || 0} Vidéos + ${cacheBreakdown.images?.fileCount || 0} Images (≈${cacheBreakdown.total?.sizeMB || 0}MB total)` :
                  '6 vidéos + 4 images (≈290MB total)'
                }
              </div>

              <div><strong>Usage:</strong> Recommandé après chaque déploiement en production</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
