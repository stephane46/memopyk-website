import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnalyticsNewLoadingStates } from './AnalyticsNewLoadingStates';
import {
  Activity,
  Database,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
} from 'lucide-react';
import './analyticsNew.tokens.css';

interface HealthDetailed {
  status: string;
  version: string;
  timestamp: string;
  uptime: number;
  services: {
    database: {
      connected: boolean;
      responseTime?: number;
      error?: string;
    };
  };
}

interface CacheBreakdown {
  videos?: { fileCount: number; totalSize: number };
  images?: { fileCount: number; totalSize: number };
  total?: { fileCount: number; totalSize: number; sizeMB: number; limitMB: number; usagePercent: number };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const AnalyticsNewFallback: React.FC = () => {
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useQuery<HealthDetailed>({
    queryKey: ['/api/health/detailed'],
    refetchInterval: 30000,
  });

  const {
    data: cache,
    isLoading: cacheLoading,
    refetch: refetchCache,
  } = useQuery<CacheBreakdown>({
    queryKey: ['/api/cache/breakdown'],
    refetchInterval: 60000,
  });

  const {
    data: analyticsHealth,
    refetch: refetchAnalytics,
  } = useQuery<{ success: boolean; analytics_db_enabled: boolean; ga4_configured: boolean }>({
    queryKey: ['/api/analytics/health'],
  });

  const isLoading = healthLoading;

  const handleRefreshAll = () => {
    refetchHealth();
    refetchCache();
    refetchAnalytics();
  };

  if (isLoading) {
    return (
      <div className="analytics-new-container space-y-6">
        <h2 className="text-xl font-bold text-gray-900">System Diagnostics</h2>
        <AnalyticsNewLoadingStates mode="loading" title="Loading diagnostics..." />
      </div>
    );
  }

  if (healthError) {
    return (
      <div className="analytics-new-container space-y-6">
        <h2 className="text-xl font-bold text-gray-900">System Diagnostics</h2>
        <AnalyticsNewLoadingStates
          mode="error"
          title="Failed to load diagnostics"
          description="Could not reach the health endpoint"
          showRetry={true}
          onRetry={handleRefreshAll}
        />
      </div>
    );
  }

  const dbConnected = health?.services?.database?.connected ?? false;
  const dbResponseTime = health?.services?.database?.responseTime;
  const serverStatus = health?.status || 'unknown';
  const isHealthy = serverStatus === 'healthy';

  return (
    <div className="analytics-new-container space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">System Diagnostics</h2>
        <Button variant="outline" size="sm" onClick={handleRefreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Server Status */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Server</CardTitle>
            <Server className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              {isHealthy ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-lg font-bold text-gray-900 capitalize">{serverStatus}</span>
            </div>
            <p className="text-xs text-gray-500">v{health?.version || '?'}</p>
          </CardContent>
        </Card>

        {/* Database */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Database</CardTitle>
            <Database className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              {dbConnected ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-lg font-bold text-gray-900">
                {dbConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {dbResponseTime != null && (
              <p className="text-xs text-gray-500">{dbResponseTime}ms response time</p>
            )}
          </CardContent>
        </Card>

        {/* Uptime */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-gray-900 mb-1">
              {health?.uptime ? formatUptime(health.uptime) : '—'}
            </div>
            <p className="text-xs text-gray-500">Since last restart</p>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Analytics</CardTitle>
            <Activity className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={analyticsHealth?.analytics_db_enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                  DB {analyticsHealth?.analytics_db_enabled ? 'ON' : 'OFF'}
                </Badge>
                <Badge variant="outline" className={analyticsHealth?.ga4_configured ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                  GA4 {analyticsHealth?.ga4_configured ? 'ON' : 'OFF'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cache Stats */}
      {cache && (
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-[#D67C4A]" />
              Cache Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cache.videos && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Video Cache</p>
                  <p className="text-2xl font-bold text-gray-900">{cache.videos.fileCount}</p>
                  <p className="text-xs text-gray-500">files ({formatBytes(cache.videos.totalSize)})</p>
                </div>
              )}
              {cache.images && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Image Cache</p>
                  <p className="text-2xl font-bold text-gray-900">{cache.images.fileCount}</p>
                  <p className="text-xs text-gray-500">files ({formatBytes(cache.images.totalSize)})</p>
                </div>
              )}
              {cache.total && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Total Usage</p>
                  <p className="text-2xl font-bold text-gray-900">{cache.total.usagePercent}%</p>
                  <p className="text-xs text-gray-500">
                    {cache.total.sizeMB} MB / {cache.total.limitMB} MB
                  </p>
                  {/* Usage bar */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${cache.total.usagePercent > 80 ? 'bg-red-500' : cache.total.usagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(cache.total.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      <div className="text-xs text-gray-400 text-right">
        Last checked: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}
      </div>
    </div>
  );
};
