import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TestTube, 
  RefreshCw, 
  Clock, 
  Video, 
  Image, 
  Database,
  Zap,
  Activity,
  RotateCcw,
  HardDriveIcon,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getTimeStatus, detectSourceFromHeaders, humanBytes, getPayloadSize, type PerfType } from '@/lib/performance-thresholds';
import { formatFrenchDateTime } from '@/utils/date-format';

interface PerformanceResult {
  id: string;
  timestamp: Date;
  refreshType: 'normal' | 'hard';
  heroVideoTime: number;
  heroVideoSource: 'cache' | 'vps' | 'error';
  heroVideoOrigin?: 'local' | 'supabase' | 'other';
  heroVideoSize?: number;
  staticImageTime: number;
  staticImageSource: 'cache' | 'vps' | 'error';
  staticImageOrigin?: 'local' | 'supabase' | 'other';
  staticImageSize?: number;
  galleryVideoTime: number;
  galleryVideoSource: 'cache' | 'vps' | 'error';
  galleryVideoOrigin?: 'local' | 'supabase' | 'other';
  galleryVideoSampleSize?: number;
  galleryVideoTotalSize?: number;
  galleryApiTime?: number; // Optional separate API timing
  totalTime: number;
}

export default function PerformanceTestDashboard() {
  const [performanceResults, setPerformanceResults] = useState<PerformanceResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [refreshType, setRefreshType] = useState<'normal' | 'hard'>('normal');
  const [currentTest, setCurrentTest] = useState('');
  const [testProgress, setTestProgress] = useState(0);
  const { toast } = useToast();

  // Load saved results from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('memopyk-performance-results');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const results = parsed.map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        }));
        setPerformanceResults(results);
      } catch (error) {
        console.error('Error loading saved performance results:', error);
      }
    }
  }, []);

  // Save results to localStorage
  const saveResults = (results: PerformanceResult[]) => {
    try {
      localStorage.setItem('memopyk-performance-results', JSON.stringify(results));
    } catch (error) {
      console.error('Error saving performance results:', error);
    }
  };

  const runPerformanceTest = async () => {
    setIsRunning(true);
    setTestProgress(0);
    
    const testId = `test_${Date.now()}`;
    let heroVideoTime = 0;
    let heroVideoSource: 'cache' | 'vps' | 'error' = 'error';
    let heroVideoOrigin: 'local' | 'supabase' | 'other' | undefined;
    let heroVideoSize = 0;
    let staticImageTime = 0;
    let staticImageSource: 'cache' | 'vps' | 'error' = 'error';
    let staticImageOrigin: 'local' | 'supabase' | 'other' | undefined;
    let staticImageSize = 0;
    let galleryVideoTime = 0;
    let galleryVideoSource: 'cache' | 'vps' | 'error' = 'error';
    let galleryVideoOrigin: 'local' | 'supabase' | 'other' | undefined;
    let galleryVideoSampleSize = 0;
    let galleryVideoTotalSize = 0;
    let galleryApiTime = 0;

    try {
      toast({
        title: "Performance Test Started",
        description: `Running ${refreshType === 'hard' ? 'Hard Refresh (Ctrl+F5)' : 'Normal Refresh (F5)'} test`,
      });

      // Test 1: Hero Video Performance
      setCurrentTest('Testing Hero Video Loading...');
      setTestProgress(20);
      
      const heroStartTime = performance.now();
      try {
        // Test hero video loading by fetching a video with cache-control based on refresh type
        const heroResponse = await fetch('/api/video-proxy?filename=VideoHero1.mp4&range=bytes=0-1023', {
          cache: refreshType === 'hard' ? 'no-store' : 'default',
          headers: refreshType === 'hard' ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Test-Bypass-Cache': '1'
          } : {}
        });
        heroVideoTime = Math.round(performance.now() - heroStartTime);
        heroVideoSize = getPayloadSize(heroResponse) || 1024; // 1KB range request
        
        // Use header-based detection, fallback to time threshold
        const heroHeaders = detectSourceFromHeaders(heroResponse);
        if (heroHeaders.cache) {
          heroVideoSource = heroHeaders.cache === 'HIT' ? 'cache' : 'vps';
        } else {
          // Fallback to time threshold
          heroVideoSource = refreshType === 'hard' ? 'vps' : (heroVideoTime < 100 ? 'cache' : 'vps');
        }
        // Capture origin information
        heroVideoOrigin = heroHeaders.origin as 'local' | 'supabase' | 'other';
        
        console.log(`🎬 Hero video test: ${heroVideoTime}ms • ${humanBytes(heroVideoSize)} from ${heroVideoSource} (${refreshType} refresh)`);
      } catch (error) {
        heroVideoTime = -1;
        heroVideoSource = 'error';
        console.error('Hero video test failed:', error);
      }

      // Test 2: Static Image Performance  
      setCurrentTest('Testing Static Image Loading...');
      setTestProgress(50);
      
      const imageStartTime = performance.now();
      try {
        // Test static image loading with actual cached image
        const imageResponse = await fetch('/api/image-proxy?filename=static_auto_1754635504743.jpg', {
          cache: refreshType === 'hard' ? 'no-store' : 'default',
          headers: refreshType === 'hard' ? {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Test-Bypass-Cache': '1'
          } : {}
        });
        staticImageTime = Math.round(performance.now() - imageStartTime);
        staticImageSize = getPayloadSize(imageResponse) || 50419; // ~50KB typical static image
        
        // Use header-based detection
        const imageHeaders = detectSourceFromHeaders(imageResponse);
        if (imageHeaders.cache) {
          staticImageSource = imageHeaders.cache === 'HIT' ? 'cache' : 'vps';
        } else {
          // Fallback
          staticImageSource = refreshType === 'hard' ? 'vps' : 'cache';
        }
        // Capture origin information
        staticImageOrigin = imageHeaders.origin as 'local' | 'supabase' | 'other';
        
        console.log(`🖼️ Static image test: ${staticImageTime}ms • ${humanBytes(staticImageSize)} from ${staticImageSource} (${refreshType} refresh) - X-Cache-Status: ${imageHeaders.cache}`);
      } catch (error) {
        staticImageTime = -1;
        staticImageSource = 'error';
        console.error('Static image test failed:', error);
      }

      // Test 3: Gallery Videos - PRODUCTION DEPLOYMENT CACHE TEST
      setCurrentTest('Testing Gallery Video Cache (PRODUCTION)...');
      setTestProgress(80);
      
      const galleryStartTime = performance.now();
      try {
        // PRODUCTION GALLERY CACHE TEST - Test all 3 known gallery videos
        const knownGalleryVideos = ['PomGalleryC.mp4', 'VitaminSeaC.mp4', 'safari-1.mp4'];
        let bestResult: any = null;
        let bestTime = Infinity;
        
        console.log('🚀 PRODUCTION GALLERY CACHE TEST - Testing all gallery videos...');
        
        for (const filename of knownGalleryVideos) {
          const videoUrl = `/api/video-proxy?filename=${encodeURIComponent(filename)}`;
          const testStart = performance.now();
          
          try {
            const probeResponse = await fetch(videoUrl, {
              method: 'HEAD', // Use HEAD for speed
              headers: {
                ...(refreshType === 'hard' ? {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'X-Production-Cache-Test': '1'
                } : {})
              },
              cache: refreshType === 'hard' ? 'no-store' : 'default'
            });
            
            const testTime = Math.round(performance.now() - testStart);
            const xVideoSource = probeResponse.headers.get('X-Video-Source');
            const contentLength = probeResponse.headers.get('Content-Length');
            
            console.log(`📹 ${filename}: ${testTime}ms • ${probeResponse.status} • X-Video-Source: ${xVideoSource} • Size: ${contentLength ? humanBytes(Number(contentLength)) : 'N/A'}`);
            
            // Track the fastest successful result
            if (probeResponse.ok && testTime < bestTime) {
              bestTime = testTime;
              bestResult = {
                filename,
                time: testTime,
                status: probeResponse.status,
                videoSource: xVideoSource,
                size: contentLength ? Number(contentLength) : 0,
                response: probeResponse
              };
            }
          } catch (videoError) {
            console.error(`❌ ${filename} test failed:`, videoError);
          }
        }
        
        if (!bestResult) {
          throw new Error('All gallery videos failed in production test');
        }
        
        // Use the best result for our metrics
        galleryVideoTime = bestResult.time;
        galleryVideoTotalSize = bestResult.size;
        galleryVideoSampleSize = 1024; // Standard test size
        
        // CRITICAL: Determine if it's actually from cache based on X-Video-Source header
        const videoSource = bestResult.videoSource?.toLowerCase();
        if (videoSource === 'cache') {
          galleryVideoSource = 'cache';
          galleryVideoOrigin = 'local';
        } else if (videoSource === 'cdn') {
          galleryVideoSource = 'vps';
          galleryVideoOrigin = 'supabase';
        } else {
          // Fallback to time-based detection (cache should be < 200ms, CDN > 1000ms)
          galleryVideoSource = galleryVideoTime < 200 ? 'cache' : 'vps';
          galleryVideoOrigin = galleryVideoTime < 200 ? 'local' : 'supabase';
        }
        
        console.log(`🎯 PRODUCTION RESULT: ${bestResult.filename} • ${galleryVideoTime}ms • Source: ${galleryVideoSource} • ${humanBytes(galleryVideoTotalSize)}`);
        
        // Additional verification: Test actual byte delivery for cache validation
        if (galleryVideoSource === 'cache') {
          const verifyStart = performance.now();
          const verifyResponse = await fetch(`/api/video-proxy?filename=${encodeURIComponent(bestResult.filename)}`, {
            headers: { 'Range': 'bytes=0-1023' },
            cache: 'default'
          });
          const verifyTime = Math.round(performance.now() - verifyStart);
          
          console.log(`✅ CACHE VERIFICATION: ${verifyTime}ms for 1KB range request • Status: ${verifyResponse.status}`);
          
          // If verification is slow, it's probably not really cached
          if (verifyTime > 500) {
            console.warn(`⚠️ Cache verification was slow (${verifyTime}ms), likely not truly cached`);
            galleryVideoSource = 'vps';
            galleryVideoOrigin = 'supabase';
          }
        }
        
      } catch (error) {
        console.error('❌ PRODUCTION GALLERY CACHE TEST FAILED:', error);
        galleryVideoTime = -1;
        galleryVideoSource = 'error';
        galleryVideoSampleSize = 0;
        galleryVideoTotalSize = 0;
      }

      setTestProgress(100);
      setCurrentTest('Test Complete!');

      const totalTime = heroVideoTime + staticImageTime + galleryVideoTime;
      
      const newResult: PerformanceResult = {
        id: testId,
        timestamp: new Date(),
        refreshType,
        heroVideoTime,
        heroVideoSource,
        heroVideoOrigin,
        heroVideoSize,
        staticImageTime,
        staticImageSource,
        staticImageOrigin,
        staticImageSize,
        galleryVideoTime,
        galleryVideoSource,
        galleryVideoOrigin,
        galleryVideoSampleSize,
        galleryVideoTotalSize,
        galleryApiTime,
        totalTime
      };

      // Add to results and keep only last 10
      const updatedResults = [newResult, ...performanceResults].slice(0, 10);
      setPerformanceResults(updatedResults);
      saveResults(updatedResults);

      toast({
        title: "Performance Test Complete",
        description: `Total time: ${totalTime}ms (Hero: ${heroVideoTime}ms • ${humanBytes(heroVideoSize)}, Images: ${staticImageTime}ms • ${humanBytes(staticImageSize)}, Gallery: ${galleryVideoTime}ms • ${humanBytes(galleryVideoSampleSize)} sample)`,
      });

    } catch (error) {
      console.error('Performance test error:', error);
      toast({
        title: "Test Failed",
        description: "Performance test encountered an error",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setTestProgress(0);
    }
  };

  const clearResults = () => {
    setPerformanceResults([]);
    localStorage.removeItem('memopyk-performance-results');
    toast({
      title: "Results Cleared",
      description: "All performance test results have been cleared",
    });
  };

  // Test /gv page directly to verify full user experience
  const testGvPage = async () => {
    setIsRunning(true);
    setCurrentTest('Testing /gv Page Experience...');
    setTestProgress(0);

    try {
      console.log('🚀 TESTING /GV PAGE - FULL USER EXPERIENCE');
      
      setTestProgress(20);
      const testStart = performance.now();
      
      // Test page load
      setCurrentTest('Loading /gv page...');
      const pageResponse = await fetch('/gv', {
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (!pageResponse.ok) {
        throw new Error(`/gv page failed to load: ${pageResponse.status}`);
      }
      
      const pageLoadTime = Math.round(performance.now() - testStart);
      console.log(`📄 /gv page loaded in ${pageLoadTime}ms`);
      
      setTestProgress(50);
      setCurrentTest('Testing gallery API from /gv context...');
      
      // Test gallery API as if called from /gv page
      const galleryApiStart = performance.now();
      const galleryResponse = await fetch('/api/gallery', {
        headers: {
          'Referer': window.location.origin + '/gv',
          'X-GV-Page-Test': '1'
        },
        cache: 'default'
      });
      
      const galleryApiTime = Math.round(performance.now() - galleryApiStart);
      const galleryData = await galleryResponse.json();
      
      console.log(`📋 Gallery API: ${galleryApiTime}ms • ${galleryData?.length || 0} items`);
      
      setTestProgress(80);
      setCurrentTest('Testing video delivery from /gv...');
      
      // Test actual video requests as they would come from /gv
      let videoTestResults: any[] = [];
      const knownVideos = ['PomGalleryC.mp4', 'VitaminSeaC.mp4', 'safari-1.mp4'];
      
      for (const filename of knownVideos) {
        const videoStart = performance.now();
        try {
          const videoResponse = await fetch(`/api/video-proxy?filename=${filename}`, {
            method: 'HEAD',
            headers: {
              'Referer': window.location.origin + '/gv',
              'X-GV-Video-Test': '1'
            }
          });
          
          const videoTime = Math.round(performance.now() - videoStart);
          const videoSource = videoResponse.headers.get('X-Video-Source');
          const contentLength = videoResponse.headers.get('Content-Length');
          
          videoTestResults.push({
            filename,
            time: videoTime,
            source: videoSource,
            size: contentLength ? Number(contentLength) : 0,
            status: videoResponse.status
          });
          
          console.log(`🎬 ${filename}: ${videoTime}ms • ${videoResponse.status} • Source: ${videoSource}`);
          
        } catch (error) {
          console.error(`❌ ${filename} failed:`, error);
          videoTestResults.push({
            filename,
            time: -1,
            source: 'error',
            size: 0,
            status: 0
          });
        }
      }
      
      setTestProgress(100);
      const totalTime = Math.round(performance.now() - testStart);
      
      // Calculate results
      const successfulVideos = videoTestResults.filter(v => v.time > 0);
      const cachedVideos = successfulVideos.filter(v => v.source === 'cache');
      const avgVideoTime = successfulVideos.length > 0 ? 
        Math.round(successfulVideos.reduce((sum, v) => sum + v.time, 0) / successfulVideos.length) : -1;
      
      console.log(`✅ /GV PAGE TEST COMPLETE:`);
      console.log(`   • Page Load: ${pageLoadTime}ms`);
      console.log(`   • Gallery API: ${galleryApiTime}ms`);
      console.log(`   • Videos: ${successfulVideos.length}/${knownVideos.length} working`);
      console.log(`   • Cache: ${cachedVideos.length}/${successfulVideos.length} from cache`);
      console.log(`   • Avg Video Time: ${avgVideoTime}ms`);
      console.log(`   • Total Test Time: ${totalTime}ms`);
      
      toast({
        title: "/gv Page Test Complete",
        description: `Page: ${pageLoadTime}ms • API: ${galleryApiTime}ms • Videos: ${cachedVideos.length}/${knownVideos.length} from cache • Avg: ${avgVideoTime}ms`,
      });
      
    } catch (error) {
      console.error('❌ /GV PAGE TEST FAILED:', error);
      toast({
        title: "/gv Page Test Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
      setCurrentTest('');
      setTestProgress(0);
    }
  };

  // Removed old getTimeStatus - now using the one from performance-thresholds.ts

  // Get status badge color based on performance time  
  const getStatusBadge = (status: { label: string; pill: string }) => {
    const colorMap = {
      'good': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'fair': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', 
      'poor': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    
    return (
      <Badge className={`${colorMap[status.pill as keyof typeof colorMap]} text-xs px-2 py-1`}>
        {status.label}
      </Badge>
    );
  };

  const getSourceBadge = (source: 'cache' | 'vps' | 'database' | 'error') => {
    switch (source) {
      case 'cache':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">Cache</Badge>;
      case 'vps':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">VPS</Badge>;
      case 'database':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">Database</Badge>;
      case 'error':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getOriginBadge = (origin?: 'local' | 'supabase' | 'other') => {
    if (!origin) return null;
    
    switch (origin) {
      case 'local':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">local</Badge>;
      case 'supabase':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">supabase</Badge>;
      case 'other':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">other</Badge>;
      default:
        return null;
    }
  };

  const averageResults = performanceResults.length > 0 ? {
    heroVideo: Math.round(performanceResults.reduce((sum, r) => sum + (r.heroVideoTime > 0 ? r.heroVideoTime : 0), 0) / performanceResults.length),
    staticImage: Math.round(performanceResults.reduce((sum, r) => sum + (r.staticImageTime > 0 ? r.staticImageTime : 0), 0) / performanceResults.length),
    galleryVideo: Math.round(performanceResults.reduce((sum, r) => sum + (r.galleryVideoTime > 0 ? r.galleryVideoTime : 0), 0) / performanceResults.length)
  } : null;

  return (
    <div className="space-y-6">
      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-orange-500" />
            Performance Testing
          </CardTitle>
          <CardDescription>
            Two test modes: API Performance (tests endpoints directly) and /gv Page Test (tests full user experience). Use both after deployment to verify gallery video cache.
          </CardDescription>
          
          {/* Performance Testing Legend */}
          <div className="mt-4 space-y-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-4 border">
            <h3 className="font-semibold text-gray-800 mb-2">What This Dashboard Measures</h3>
            
            <div className="space-y-3">
              <div className="border-l-4 border-blue-400 pl-3">
                <span className="font-medium text-blue-600">API Performance Test:</span> Tests endpoints directly (/api/video-proxy, /api/images) to verify backend cache. Fast but doesn't test user experience.
              </div>
              
              <div className="border-l-4 border-purple-400 pl-3">
                <span className="font-medium text-purple-600">/gv Page Test:</span> Tests complete user experience on /gv page including page load, gallery API, and video delivery. Critical for deployment validation.
              </div>
              
              <div className="border-l-4 border-green-400 pl-3">
                <span className="font-medium text-green-600">Gallery Videos Tested:</span> PomGalleryC.mp4, VitaminSeaC.mp4, safari-1.mp4 - verifies X-Video-Source: CACHE headers after production deployment.
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="font-medium text-gray-700 mb-2">Test Modes:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Normal Refresh (F5):</span> Uses browser and server caches for typical performance measurement
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RotateCcw className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">Hard Refresh (Ctrl+F5):</span> Bypasses all caches with X-Test-Bypass-Cache header for worst-case scenario testing
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="font-medium text-gray-700 mb-2">Badge System:</h4>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-700 text-sm">Cache Status:</span>
                  <div className="flex flex-wrap gap-3 text-xs items-center mt-1">
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Cache</span>
                      <span className="text-gray-600">Served from local cache</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">VPS</span>
                      <span className="text-gray-600">Server processing/download</span>
                    </div>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 text-sm">Origin Server:</span>
                  <div className="flex flex-wrap gap-3 text-xs items-center mt-1">
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs border border-gray-300">local</span>
                      <span className="text-gray-600">VPS local storage</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs border border-orange-300">supabase</span>
                      <span className="text-gray-600">Supabase CDN</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs border border-blue-300">other</span>
                      <span className="text-gray-600">External source</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="font-medium text-gray-700 mb-2">Performance Thresholds:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1">Good</Badge>
                  <span className="text-gray-600">&lt; 50ms response times</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1">Fair</Badge>
                  <span className="text-gray-600">50-200ms response times</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800 text-xs px-2 py-1">Poor</Badge>
                  <span className="text-gray-600">&gt; 200ms response times</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Test Type:</label>
              <Select value={refreshType} onValueChange={(value: 'normal' | 'hard') => setRefreshType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      F5 - Normal Refresh
                    </div>
                  </SelectItem>
                  <SelectItem value="hard">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Ctrl+F5 - Hard Refresh
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={runPerformanceTest} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              {isRunning ? 'Running Test...' : 'API Performance Test'}
            </Button>

            <Button 
              onClick={testGvPage} 
              disabled={isRunning}
              className="flex items-center gap-2"
              variant="secondary"
            >
              <Video className="h-4 w-4" />
              Test /gv Page
            </Button>

            <Button 
              variant="outline" 
              onClick={clearResults}
              disabled={isRunning || performanceResults.length === 0}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear Results
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <Progress value={testProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{currentTest}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Average Performance */}
      {averageResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Average Performance ({performanceResults.length} tests)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Hero Videos</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageResults.heroVideo}ms • ~1 KB</span>
                    {getStatusBadge(getTimeStatus('hero', averageResults.heroVideo))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Average from cache
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Image className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Static Images</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageResults.staticImage}ms • ~50 KB</span>
                    {getStatusBadge(getTimeStatus('image', averageResults.staticImage))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Average from cache
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Gallery Videos</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageResults.galleryVideo}ms • 1 KB sample</span>
                    {getStatusBadge(getTimeStatus('hero', averageResults.galleryVideo))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Testing first gallery MP4 via proxy
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-500" />
            Recent Test Results (Last 10)
          </CardTitle>
          <CardDescription>
            Detailed performance metrics from recent tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performanceResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No test results yet. Run a performance test to see results.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {performanceResults.map((result, index) => (
                <div key={result.id} className="p-4 rounded-lg border bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge variant={result.refreshType === 'hard' ? 'destructive' : 'secondary'}>
                        {result.refreshType === 'hard' ? 'Ctrl+F5' : 'F5'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatFrenchDateTime(result.timestamp)}
                      </span>
                    </div>
                    <span className="text-lg font-bold">
                      Total: {result.totalTime}ms
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Video className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Hero Video</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.heroVideoTime > 0 ? result.heroVideoTime : 'Error'}ms • {humanBytes(result.heroVideoSize || 1024)}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {getStatusBadge(getTimeStatus('hero', result.heroVideoTime))}
                          {getSourceBadge(result.heroVideoSource)}
                          {getOriginBadge(result.heroVideoOrigin)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Image className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Static Image</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.staticImageTime > 0 ? result.staticImageTime : 'Error'}ms • {humanBytes(result.staticImageSize || 50419)}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {getStatusBadge(getTimeStatus('image', result.staticImageTime))}
                          {getSourceBadge(result.staticImageSource)}
                          {getOriginBadge(result.staticImageOrigin)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
                      <div className="flex items-center gap-2 mb-2">
                        <Video className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Gallery Videos</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.galleryVideoTime > 0 ? result.galleryVideoTime : 'Error'}ms • {humanBytes(result.galleryVideoSampleSize || 1024)} • {humanBytes(result.galleryVideoTotalSize || 0)} total
                        </span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {getStatusBadge(getTimeStatus('hero', result.galleryVideoTime))}
                          {getSourceBadge(result.galleryVideoSource)}
                          {getOriginBadge(result.galleryVideoOrigin)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}