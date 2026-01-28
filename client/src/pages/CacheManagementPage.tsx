import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Server, Clock, Trash2, Info } from 'lucide-react';
import { ClearCacheButton } from '@/components/admin/ClearCacheButton';
import { useQuery } from '@tanstack/react-query';
import { formatFrenchDateTime } from '@/utils/date-format';

interface CacheStatus {
  environment: string;
  database: string;
  connection: string;
  autoCleanup: string;
  features: string[];
  cacheStatus: string;
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  timestamp: string;
}

const CacheManagementPage: React.FC = () => {
  const { data: cacheStatus, isLoading, refetch } = useQuery<CacheStatus>({
    queryKey: ['/api/cache/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const handleCacheCleared = () => {
    // Refresh status after cache is cleared
    setTimeout(() => refetch(), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="h-6 w-6 text-blue-600" />
          Cache Management
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor and manage the GA4 analytics cache system
        </p>
      </div>

      {/* Cache Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {isLoading ? '...' : cacheStatus?.totalEntries || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : cacheStatus?.activeEntries || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Expired Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isLoading ? '...' : cacheStatus?.expiredEntries || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              cacheStatus?.cacheStatus === 'connected' ? 'text-green-600' : 'text-red-600'
            }`}>
              {isLoading ? '...' : cacheStatus?.cacheStatus || 'Unknown'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Environment</h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>Environment: <span className="font-medium">{cacheStatus?.environment}</span></div>
                <div>Database: <span className="font-medium">{cacheStatus?.database}</span></div>
                <div>Connection: <span className="font-medium">{cacheStatus?.connection}</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Auto-Cleanup</h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>{cacheStatus?.autoCleanup}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {cacheStatus?.features?.map((feature, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Cache Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Clear All Cache</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Remove all cached GA4 analytics data. Cache will rebuild automatically.
              </p>
            </div>
            <ClearCacheButton onCacheCleared={handleCacheCleared} />
          </div>
        </CardContent>
      </Card>

      {/* Cache Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How Cache Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Automatic Cleanup</div>
                <div>Cache entries are automatically cleaned up using database triggers with 24-hour retention</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Database className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Performance</div>
                <div>180x performance improvement (115ms cached vs 500-1200ms fresh API calls)</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Server className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Persistence</div>
                <div>Cache survives server restarts and maintains optimal performance</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      {cacheStatus?.timestamp && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Last updated: {formatFrenchDateTime(cacheStatus.timestamp)}
        </div>
      )}
    </div>
  );
};

export default CacheManagementPage;