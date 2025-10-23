import React from 'react';
import { Loader2, AlertCircle, Database, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import './analyticsNew.tokens.css';

interface AnalyticsNewLoadingStatesProps {
  mode: 'loading' | 'empty' | 'error';
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  className?: string;
}

export const AnalyticsNewLoadingStates: React.FC<AnalyticsNewLoadingStatesProps> = ({
  mode,
  title,
  description,
  showRetry = false,
  onRetry,
  className = '',
}) => {
  const getStateConfig = () => {
    switch (mode) {
      case 'loading':
        return {
          icon: Loader2,
          iconClass: 'text-[var(--analytics-new-info)] animate-spin',
          bgClass: 'bg-blue-50',
          title: title || 'Loading analytics data...',
          description: description || 'Please wait while we fetch your data',
        };
      case 'empty':
        return {
          icon: Database,
          iconClass: 'text-[var(--analytics-new-text-muted)]',
          bgClass: 'bg-gray-50',
          title: title || 'No data available',
          description: description || 'There is no data to display for the selected time period',
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconClass: 'text-[var(--analytics-new-danger)]',
          bgClass: 'bg-red-50',
          title: title || 'Failed to load data',
          description: description || 'An error occurred while fetching analytics data',
        };
      default:
        return {
          icon: Zap,
          iconClass: 'text-[var(--analytics-new-accent)]',
          bgClass: 'bg-orange-50',
          title: title || 'Ready to load',
          description: description || 'Analytics dashboard is ready',
        };
    }
  };

  const config = getStateConfig();
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        'analytics-new-card flex flex-col items-center justify-center text-center py-12',
        config.bgClass,
        className
      )}
      data-testid={`loading-state-${mode}`}
    >
      <div className="mb-4">
        <Icon className={cn('h-12 w-12', config.iconClass)} />
      </div>
      
      <h3 className="text-lg font-semibold text-[var(--analytics-new-text)] mb-2">
        {config.title}
      </h3>
      
      <p className="text-[var(--analytics-new-text-muted)] mb-6 max-w-md">
        {config.description}
      </p>

      {showRetry && (
        <Button 
          variant="outline" 
          onClick={onRetry}
          className="analytics-new-button-secondary"
          data-testid="retry-button"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}

      {/* Demo State Toggles for Phase 1 */}
      {mode === 'empty' && (
        <div className="mt-6 p-3 bg-white rounded border border-gray-200 text-xs text-gray-600">
          <p className="font-medium mb-1">🔧 Phase 1 Demo States</p>
          <p>Toggle the <code>mode</code> prop to test: loading, empty, error</p>
        </div>
      )}
    </div>
  );
};

// Skeleton loading component for individual elements
interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const AnalyticsNewSkeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  lines = 1 
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index}
          className="analytics-new-loading h-4 rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
};

// Grid skeleton for cards/KPIs
export const AnalyticsNewGridSkeleton: React.FC<{ 
  items?: number;
  className?: string;
}> = ({ 
  items = 5, 
  className = '' 
}) => {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="analytics-new-card">
          <div className="animate-pulse">
            <div className="flex items-start justify-between mb-4">
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};