import React from 'react';
import {
  BarChart3,
  Eye,
  Video,
  Globe,
  MousePointer,
  TrendingUp,
  Activity,
  AlertTriangle,
  Shield,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './analyticsNew.tokens.css';

export interface AnalyticsNewTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const ANALYTICS_NEW_TABS: AnalyticsNewTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: BarChart3,
    description: '',
  },
  {
    id: 'live',
    label: 'Live View',
    icon: Eye,
    description: '',
  },
  {
    id: 'trends',
    label: 'Trends',
    icon: TrendingUp,
    description: '',
  },
  {
    id: 'video',
    label: 'Video',
    icon: Video,
    description: '',
  },
  {
    id: 'geo',
    label: 'Geo',
    icon: Globe,
    description: '',
  },
  {
    id: 'cta',
    label: 'CTA',
    icon: MousePointer,
    description: '',
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: FileText,
    description: '',
  },
  {
    id: 'clarity',
    label: 'Clarity',
    icon: Activity,
    description: '',
  },
  {
    id: 'fallback',
    label: 'Fallback',
    icon: AlertTriangle,
    description: '',
  },
  {
    id: 'exclusions',
    label: 'Exclusions',
    icon: Shield,
    description: '',
  },
];

interface AnalyticsNewTabNavigationProps {
  className?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const AnalyticsNewTabNavigation: React.FC<AnalyticsNewTabNavigationProps> = ({ 
  className = '',
  activeTab = 'overview',
  onTabChange
}) => {
  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <nav className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {ANALYTICS_NEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                    isActive
                      ? 'border-[var(--analytics-new-accent)] text-[var(--analytics-new-accent)] bg-[var(--analytics-new-surface)]'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  )}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <nav className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="grid grid-cols-2 gap-1 p-2">
            {ANALYTICS_NEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    'flex flex-col items-center p-3 rounded-md text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-[var(--analytics-new-accent)] text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  data-testid={`tab-mobile-${tab.id}`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="text-center leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Tab Description */}
      <div className="mt-2">
        {ANALYTICS_NEW_TABS.map((tab) => {
          if (activeTab !== tab.id) return null;
          
          return (
            <p 
              key={tab.id} 
              className="text-sm text-gray-600"
              data-testid={`tab-description-${tab.id}`}
            >
              {tab.description}
            </p>
          );
        })}
      </div>
    </div>
  );
};