import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import './analyticsNew.tokens.css';

export interface KpiData {
  id: string;
  title: string;
  value: string | number;
  change?: number; // percentage change
  trend?: 'up' | 'down' | 'flat';
  sparklineData?: number[]; // Simple sparkline data points
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  isLoading?: boolean;
  error?: string;
}

interface AnalyticsNewKpiCardProps {
  data: KpiData;
  className?: string;
}

// Mock sparkline component for Phase 1
const MockSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = range === 0 ? 50 : ((max - value) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-16 h-8 ml-auto">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
          className="opacity-60"
        />
      </svg>
    </div>
  );
};

export const AnalyticsNewKpiCard: React.FC<AnalyticsNewKpiCardProps> = ({ 
  data, 
  className = '' 
}) => {
  const {
    title,
    value,
    change,
    trend,
    sparklineData,
    icon: Icon,
    color,
    isLoading,
    error,
  } = data;

  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50', 
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  const sparklineColors = {
    blue: '#2563eb',
    green: '#16a34a',
    orange: '#ea580c', 
    red: '#dc2626',
    purple: '#9333ea',
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'flat':
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className={cn('analytics-new-card', className)}>
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
    );
  }

  if (error) {
    // Check if this is a GA4 custom dimension error
    const isGA4CustomDimensionError = typeof error === 'string' && 
                                     (error.includes('GA4 Invalid Argument') || error.includes('custom dimension'));
    
    const errorTitle = isGA4CustomDimensionError ? "GA4 Setup Required" : "Error loading data";
    const errorMessage = isGA4CustomDimensionError 
      ? "Create video_id, video_title, progress_bucket in GA4 Admin → Custom definitions"
      : error;

    return (
      <div className={cn('analytics-new-card border-red-200', className)}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <div className={cn('p-2 rounded-lg', colorClasses[color])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-sm text-red-600">{errorTitle}</p>
        <p className="text-xs text-gray-500 mt-1">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div 
      className={cn('analytics-new-card', className)}
      data-testid={`kpi-card-${data.id}`}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mb-3">
        <p 
          className="text-2xl font-bold text-gray-900"
          data-testid={`kpi-value-${data.id}`}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          {change !== undefined && (
            <span 
              className={cn(
                'text-sm font-medium',
                change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
              )}
              data-testid={`kpi-change-${data.id}`}
            >
              {formatChange(change)}
            </span>
          )}
        </div>

        {sparklineData && (
          <MockSparkline 
            data={sparklineData} 
            color={sparklineColors[color]}
          />
        )}
      </div>
    </div>
  );
};