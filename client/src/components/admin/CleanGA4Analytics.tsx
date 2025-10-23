import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, TrendingUp, Play, Users, Clock, RefreshCw, Globe, Eye, UserCheck, MapPin, Languages, MousePointer, X, Ban, UserX, Settings, Shield, Calendar, Trash2, Edit2, Check, Plus } from 'lucide-react';
import { TrendingGraphs } from './TrendingGraphs';
import { CountryFlag } from './CountryFlag';
import AdminCountryNamesCard from './AdminCountryNamesCard';
import SessionReplaysCard from './SessionReplaysCard';
import { formatFrenchDateTime } from '@/utils/date-format';
import { formatDate, getRelativeTime } from '@/lib/date-utils';
import { formatInt, formatSeconds, formatPercent } from '@/utils/format';
import { apiRequest } from '@/lib/queryClient';

// Comprehensive language mapping with flags for 100+ languages
const LANGUAGE_MAP: Record<string, { display: string; flag: string }> = {
  // Major languages
  'en': { display: 'English', flag: '🇺🇸' },
  'fr': { display: 'Français', flag: '🇫🇷' },
  'es': { display: 'Español', flag: '🇪🇸' },
  'de': { display: 'Deutsch', flag: '🇩🇪' },
  'it': { display: 'Italiano', flag: '🇮🇹' },
  'pt': { display: 'Português', flag: '🇵🇹' },
  'ru': { display: 'Русский', flag: '🇷🇺' },
  'zh': { display: '中文', flag: '🇨🇳' },
  'ja': { display: '日本語', flag: '🇯🇵' },
  'ko': { display: '한국어', flag: '🇰🇷' },
  'ar': { display: 'العربية', flag: '🇸🇦' },
  'hi': { display: 'हिन्दी', flag: '🇮🇳' },
  
  // European languages
  'no': { display: 'Norwegian', flag: '🇳🇴' },
  'nb': { display: 'Norwegian', flag: '🇳🇴' },
  'nn': { display: 'Norwegian', flag: '🇳🇴' },
  'sv': { display: 'Svenska', flag: '🇸🇪' },
  'da': { display: 'Dansk', flag: '🇩🇰' },
  'nl': { display: 'Nederlands', flag: '🇳🇱' },
  'fi': { display: 'Suomi', flag: '🇫🇮' },
  'pl': { display: 'Polski', flag: '🇵🇱' },
  'cs': { display: 'Čeština', flag: '🇨🇿' },
  'sk': { display: 'Slovenčina', flag: '🇸🇰' },
  'hu': { display: 'Magyar', flag: '🇭🇺' },
  'ro': { display: 'Română', flag: '🇷🇴' },
  'bg': { display: 'Български', flag: '🇧🇬' },
  'hr': { display: 'Hrvatski', flag: '🇭🇷' },
  'sr': { display: 'Српски', flag: '🇷🇸' },
  'sl': { display: 'Slovenščina', flag: '🇸🇮' },
  'et': { display: 'Eesti', flag: '🇪🇪' },
  'lv': { display: 'Latviešu', flag: '🇱🇻' },
  'lt': { display: 'Lietuvių', flag: '🇱🇹' },
  'el': { display: 'Ελληνικά', flag: '🇬🇷' },
  'tr': { display: 'Türkçe', flag: '🇹🇷' },
  'uk': { display: 'Українська', flag: '🇺🇦' },
  'be': { display: 'Беларуская', flag: '🇧🇾' },
  'is': { display: 'Íslenska', flag: '🇮🇸' },
  'mt': { display: 'Malti', flag: '🇲🇹' },
  'ga': { display: 'Gaeilge', flag: '🇮🇪' },
  'cy': { display: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  'eu': { display: 'Euskera', flag: '🇪🇸' },
  'ca': { display: 'Català', flag: '🇪🇸' },
  'gl': { display: 'Galego', flag: '🇪🇸' },
  
  // Asian languages
  'th': { display: 'ไทย', flag: '🇹🇭' },
  'vi': { display: 'Tiếng Việt', flag: '🇻🇳' },
  'id': { display: 'Bahasa Indonesia', flag: '🇮🇩' },
  'ms': { display: 'Bahasa Melayu', flag: '🇲🇾' },
  'tl': { display: 'Filipino', flag: '🇵🇭' },
  'my': { display: 'မြန်မာ', flag: '🇲🇲' },
  'km': { display: 'ខ្មែរ', flag: '🇰🇭' },
  'lo': { display: 'ລາວ', flag: '🇱🇦' },
  'ka': { display: 'ქართული', flag: '🇬🇪' },
  'hy': { display: 'Հայերեն', flag: '🇦🇲' },
  'az': { display: 'Azərbaycan', flag: '🇦🇿' },
  'kk': { display: 'Қазақ', flag: '🇰🇿' },
  'ky': { display: 'Кыргыз', flag: '🇰🇬' },
  'uz': { display: 'Oʻzbek', flag: '🇺🇿' },
  'tk': { display: 'Türkmen', flag: '🇹🇲' },
  'tg': { display: 'Тоҷикӣ', flag: '🇹🇯' },
  'mn': { display: 'Монгол', flag: '🇲🇳' },
  'ne': { display: 'नेपाली', flag: '🇳🇵' },
  'si': { display: 'සිංහල', flag: '🇱🇰' },
  'bn': { display: 'বাংলা', flag: '🇧🇩' },
  'ur': { display: 'اردو', flag: '🇵🇰' },
  'fa': { display: 'فارسی', flag: '🇮🇷' },
  'ps': { display: 'پښتو', flag: '🇦🇫' },
  'he': { display: 'עברית', flag: '🇮🇱' },
  
  // African languages
  'sw': { display: 'Kiswahili', flag: '🇰🇪' },
  'am': { display: 'አማርኛ', flag: '🇪🇹' },
  'ha': { display: 'Hausa', flag: '🇳🇬' },
  'yo': { display: 'Yorùbá', flag: '🇳🇬' },
  'ig': { display: 'Igbo', flag: '🇳🇬' },
  'zu': { display: 'isiZulu', flag: '🇿🇦' },
  'xh': { display: 'isiXhosa', flag: '🇿🇦' },
  'af': { display: 'Afrikaans', flag: '🇿🇦' },
  
  // American languages
  'qu': { display: 'Quechua', flag: '🇵🇪' },
  'gn': { display: 'Guaraní', flag: '🇵🇾' },
  
  // Others
  'eo': { display: 'Esperanto', flag: '🌍' },
  'la': { display: 'Latin', flag: '🇻🇦' },
  'jv': { display: 'Basa Jawa', flag: '🇮🇩' },
  'su': { display: 'Basa Sunda', flag: '🇮🇩' },
  'ceb': { display: 'Cebuano', flag: '🇵🇭' },
  'mg': { display: 'Malagasy', flag: '🇲🇬' },
  'haw': { display: 'ʻŌlelo Hawaiʻi', flag: '🇺🇸' },
  'mi': { display: 'Te Reo Māori', flag: '🇳🇿' },
  'sm': { display: 'Gagana Samoa', flag: '🇼🇸' },
  'to': { display: 'Lea Fakatonga', flag: '🇹🇴' },
  'fj': { display: 'Vosa Vakaviti', flag: '🇫🇯' }
};

// Types for IP Management
interface ActiveViewerIp {
  ip_address: string;
  country: string;
  city: string;
  first_seen: string;
  last_activity: string;
  session_count: number;
}

interface AnalyticsSettings {
  excludedIps: Array<{ ip: string; comment?: string; added_at?: string; }>;
}

// Language formatting utility with comprehensive mapping
const formatLanguage = (langCode: string): { display: string; flag: string; variant: 'default' | 'secondary' } => {
  if (!langCode) return { display: 'Unknown', flag: '🌐', variant: 'secondary' };
  
  const code = langCode.toLowerCase().split(/[-_]/)[0]; // Get base language code
  
  // Check comprehensive mapping first
  const mapped = LANGUAGE_MAP[code];
  if (mapped) {
    const variant = code === 'fr' ? 'default' : 'secondary';
    return { ...mapped, variant };
  }
  
  // Fallback for unmapped languages
  const cleaned = langCode.replace(/[-_].*/, '').toLowerCase();
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return { display: capitalized, flag: '🌐', variant: 'secondary' };
};

// Site language utility (only French or English)
const formatSiteLanguage = (langName: string): { display: string; flag: string } => {
  const name = langName.toLowerCase();
  if (name === 'french' || name.includes('fr')) return { display: 'Français', flag: '🇫🇷' };
  return { display: 'English', flag: '🇺🇸' };
};

interface GA4MetricsResponse {
  // Visitor Analytics
  totalViews: number;
  uniqueVisitors: number;
  returnVisitors: number;
  averageSessionDuration: number;
  activeVisitors: number;
  // Period-over-period comparisons
  totalViewsChange?: number;
  uniqueVisitorsChange?: number;
  returnVisitorsChange?: number;
  videoStartsChange?: number;
  // Video Analytics  
  totalVideoStarts: number;
  totalCompletions: number;
  totalWatchTimeSeconds: number;
  averageWatchTimeSeconds: number;
  completionRate: number;
  // Geographic Data
  topCountries: Array<{
    country: string;
    visitors: number;
    flag: string;
  }>;
  // Language & Traffic
  languageBreakdown: Array<{
    language: string;
    visitors: number;
    percentage: number;
  }>;
  siteLanguageChoice: Array<{
    language: string;
    visitors: number;
    percentage: number;
  }>;
  topReferrers: Array<{
    referrer: string;
    visitors: number;
  }>;
  // Video Performance
  topVideos: Array<{
    videoId: string;
    videoTitle: string;
    plays: number;
    completions: number;
  }>;
}

interface RecentVisitor {
  ip_address: string;
  country: string;
  country_code?: string;
  city: string;
  region?: string;
  language: string;
  last_visit: string;
  user_agent: string;
  visit_count?: number;
  session_duration?: number;
  previous_visit?: string;
}

interface ActiveViewerIp {
  ip_address: string;
  country: string;
  country_code?: string;
  city: string;
  region?: string;
  last_visit: string;
  user_agent: string;
  visit_count: number;
  session_duration?: number;
}

interface AnalyticsSettings {
  excludedIps: Array<{
    ip: string;
    comment?: string;
    added_at?: string;
  }>;
  trackingEnabled?: boolean;
  retentionDays?: number;
  anonymizeIPs?: boolean;
  trackVideoViews?: boolean;
  trackPageViews?: boolean;
  trackFormSubmissions?: boolean;
  excludeBots?: boolean;
  languages?: string[];
}

export default function CleanGA4Analytics() {
  const [dateRange, setDateRange] = useState('90d'); // Match the filter default
  const [locale, setLocale] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReturningModalOpen, setIsReturningModalOpen] = useState(false);
  
  // Advanced Date Range Filter state
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  // IP Management state
  const [showIpManagement, setShowIpManagement] = useState(false);
  const [newExcludedIp, setNewExcludedIp] = useState('');
  const [newIpComment, setNewIpComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [tempComment, setTempComment] = useState('');
  
  // Direct fetch state for modal data (avoiding React Query enabled pattern issues)
  const [recentVisitors, setRecentVisitors] = useState<RecentVisitor[]>([]);
  const [returningVisitors, setReturningVisitors] = useState<RecentVisitor[]>([]);
  const [isLoadingVisitors, setIsLoadingVisitors] = useState(false);
  const [visitorsError, setVisitorsError] = useState<Error | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Comprehensive GA4 + visitor analytics data fetch
  const { data: ga4Data, isLoading, error, refetch } = useQuery<GA4MetricsResponse>({
    queryKey: ['ga4-clean-comprehensive', dateRange, locale, customDateFrom, customDateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        range: dateRange,
        locale: locale
      });
      
      // Add custom date range if applicable
      if (dateRange === 'custom' && customDateFrom && customDateTo) {
        params.set('startDate', customDateFrom);
        params.set('endDate', customDateTo);
      }
      
      const response = await fetch(`/api/ga4/clean-comprehensive?${params}`);
      if (!response.ok) {
        throw new Error(`GA4 API error: ${response.status}`);
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for real-time data
    refetchInterval: 5 * 60 * 1000, // 5 minutes auto-refresh
  });

  // Direct fetch functions for modal data (replacing problematic React Query enabled pattern)
  const fetchRecentVisitors = async () => {
    setIsLoadingVisitors(true);
    setVisitorsError(null);
    try {
      // Pass current date filters to modal for consistent data (skip enrichment for fast loading)
      const params = new URLSearchParams({ skipEnrichment: 'true' });
      
      let dateFrom: string | undefined;
      let dateTo: string | undefined;
      
      if (dateRange === 'custom' && customDateFrom && customDateTo) {
        dateFrom = customDateFrom;
        dateTo = customDateTo;
      } else if (dateRange !== 'custom') {
        // Calculate dates for preset ranges (1d = today only in France timezone, 7d, 30d, 90d, etc.)
        const daysNum = parseInt(dateRange.replace('d', '')) || 90;
        const now = new Date();
        
        if (daysNum === 1) {
          // For 1-day filter: show only today (from midnight France time until now)
          const todayInFrance = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
          dateFrom = todayInFrance;
          // For dateTo, add 23:59:59 to include all of today
          dateTo = todayInFrance + "T23:59:59";
        } else {
          // For other filters: show last N days including today
          const startDate = new Date();
          startDate.setDate(now.getDate() - daysNum + 1); // Adjust to show exactly N days
          dateFrom = startDate.toISOString().split('T')[0];
          dateTo = now.toISOString().split('T')[0];
        }
      }
      
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      console.log('🚀 MODAL: Fetching recent visitors with date filters:', { dateRange, dateFrom, dateTo });
      const response = await fetch(`/api/analytics/recent-visitors?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('✅ MODAL: Received visitors data:', data?.length || 0, 'visitors');
      setRecentVisitors(data);
    } catch (error) {
      console.error('❌ MODAL: Error fetching recent visitors:', error);
      setVisitorsError(error as Error);
    } finally {
      setIsLoadingVisitors(false);
    }
  };

  const fetchReturningVisitors = async () => {
    try {
      // Pass current date filters to returning visitors modal for consistent data
      const params = new URLSearchParams();
      
      let dateFrom: string | undefined;
      let dateTo: string | undefined;
      
      if (dateRange === 'custom' && customDateFrom && customDateTo) {
        dateFrom = customDateFrom;
        dateTo = customDateTo;
      } else if (dateRange !== 'custom') {
        // Calculate dates for preset ranges (1d = today only in France timezone, 7d, 30d, 90d, etc.)
        const daysNum = parseInt(dateRange.replace('d', '')) || 90;
        const now = new Date();
        
        if (daysNum === 1) {
          // For 1-day filter: show only today (from midnight France time until now)
          const todayInFrance = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
          dateFrom = todayInFrance;
          // For dateTo, add 23:59:59 to include all of today
          dateTo = todayInFrance + "T23:59:59";
        } else {
          // For other filters: show last N days including today
          const startDate = new Date();
          startDate.setDate(now.getDate() - daysNum + 1); // Adjust to show exactly N days
          dateFrom = startDate.toISOString().split('T')[0];
          dateTo = now.toISOString().split('T')[0];
        }
      }
      
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      
      console.log('🚀 RETURNING MODAL: Fetching returning visitors with date filters:', { dateRange, dateFrom, dateTo });
      const response = await fetch(`/api/analytics/returning-visitors?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('✅ RETURNING MODAL: Received visitors data:', data?.length || 0, 'visitors');
      setReturningVisitors(data);
    } catch (error) {
      console.error('❌ RETURNING MODAL: Error fetching returning visitors:', error);
    }
  };

  // IP Management queries
  const { data: activeIps, isLoading: activeIpsLoading, refetch: refetchActiveIps } = useQuery<ActiveViewerIp[]>({
    queryKey: ['/api/analytics/active-ips'],
    enabled: showIpManagement,
    staleTime: 30000,
    refetchInterval: showIpManagement ? 60000 : false
  });

  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useQuery<{
    excludedIps: Array<{ ip: string; comment?: string; added_at?: string; }>;
    trackingEnabled?: boolean;
    retentionDays?: number;
    anonymizeIPs?: boolean;
    trackVideoViews?: boolean;
    trackPageViews?: boolean;
    trackFormSubmissions?: boolean;
    excludeBots?: boolean;
    languages?: string[];
  }>({
    queryKey: ['/api/analytics/settings'],
    enabled: true, // Always load settings for IP management
    staleTime: 30000,
    refetchInterval: 60000 // Consistent refresh interval
  });

  // Detect current admin IP
  const { data: currentAdminIp } = useQuery<string>({
    queryKey: ['/api/analytics/current-ip'],
    enabled: showIpManagement,
    staleTime: 30000
  });

  // IP Management mutations
  const addExcludedIpMutation = useMutation({
    mutationFn: ({ ipAddress, comment }: { ipAddress: string; comment?: string }) => 
      apiRequest('/api/analytics/exclude-ip', 'POST', { ipAddress, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/active-ips'] });
      refetchSettings();
      refetchActiveIps();
      setNewExcludedIp('');
      setNewIpComment('');
      toast({
        title: "IP Excluded",
        description: "IP address has been excluded from tracking.",
      });
    },
    onError: (error) => {
      console.error('Exclude IP error:', error);
      toast({
        title: "Exclusion Failed",
        description: "Failed to exclude IP address.",
        variant: "destructive",
      });
    }
  });

  const updateIpCommentMutation = useMutation({
    mutationFn: ({ ipAddress, comment }: { ipAddress: string; comment: string }) => 
      apiRequest(`/api/analytics/exclude-ip/${encodeURIComponent(ipAddress)}/comment`, 'PATCH', { comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/settings'] });
      refetchSettings();
      setEditingComment(null);
      setTempComment('');
      toast({
        title: "Comment Updated",
        description: "IP comment has been updated.",
      });
    },
    onError: (error) => {
      console.error('Update IP comment error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update IP comment.",
        variant: "destructive",
      });
    }
  });

  const removeExcludedIpMutation = useMutation({
    mutationFn: (ipAddress: string) => 
      apiRequest(`/api/analytics/exclude-ip/${encodeURIComponent(ipAddress)}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/active-ips'] });
      toast({
        title: "IP Restored",
        description: "IP address has been restored to tracking.",
      });
    },
    onError: (error) => {
      console.error('Remove excluded IP error:', error);
      toast({
        title: "Restore Failed",
        description: "Failed to restore IP address.",
        variant: "destructive",
      });
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // Advanced Filter Handlers
  const handleQuickFilter = (filterValue: string) => {
    setDateRange(filterValue);
    if (filterValue === 'custom') {
      // Keep custom dates as they are
      return;
    }
    // Clear custom dates for preset filters
    setCustomDateFrom('');
    setCustomDateTo('');
  };

  const handleApplyCustomRange = () => {
    if (customDateFrom && customDateTo) {
      setDateRange('custom');
      // The GA4 query will use custom dates when dateRange is 'custom'
    }
  };

  const handleClearFilters = () => {
    setDateRange('90d');
    setLocale('all');
    setCustomDateFrom('');
    setCustomDateTo('');
  };

  const getFilterSummary = () => {
    if (dateRange === 'custom' && customDateFrom && customDateTo) {
      return `${customDateFrom} to ${customDateTo}`;
    }
    
    const filterLabels: Record<string, string> = {
      '1d': 'Today',
      '7d': 'Last 7 Days', 
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
      '365d': 'Last Year'
    };
    
    return filterLabels[dateRange] || 'Custom Period';
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (rate: number) => `${Math.round(rate * 100)}%`;

  // Modal handling with data fetching
  const handleModalOpen = () => {
    console.log('🔥 MODAL CLICKED: Opening recent visitors modal');
    setIsModalOpen(true);
    fetchRecentVisitors(); // Fetch data when modal opens
  };
  const handleModalClose = () => setIsModalOpen(false);
  const handleReturningModalOpen = () => {
    setIsReturningModalOpen(true);
    fetchReturningVisitors(); // Fetch data when modal opens
  };
  const handleReturningModalClose = () => setIsReturningModalOpen(false);

  // ESC key handler for modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isModalOpen) handleModalClose();
        if (isReturningModalOpen) handleReturningModalClose();
      }
    };

    if (isModalOpen || isReturningModalOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isModalOpen, isReturningModalOpen]);

  // Helper functions for visitor data
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Just now';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 5) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      
      return formatFrenchDateTime(date);
    } catch (error) {
      return 'Just now';
    }
  };

  const formatSessionDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Comprehensive Analytics (Clean)
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Visitor analytics, video engagement, and geographic insights
          </p>
        </div>
        
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Professional Date Range Filter */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-3 text-slate-800 dark:text-slate-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Analytics Filters
          </CardTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Select date range and language to filter analytics data
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Modern Filter Controls */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
              {/* Date Range Section */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Date Range</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-from" className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      From Date
                    </Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 rounded-xl font-medium text-slate-700 dark:text-slate-300"
                      lang="fr-FR"
                      style={{ direction: 'ltr' }}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-to" className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      To Date
                    </Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 rounded-xl font-medium text-slate-700 dark:text-slate-300"
                      lang="fr-FR"
                      style={{ direction: 'ltr' }}
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                </div>
              </div>

              {/* Language Filter Section */}
              <div className="lg:col-span-2 space-y-2">
                <Label htmlFor="locale" className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Language Filter
                </Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500 rounded-xl font-medium text-slate-700 dark:text-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        All Languages
                      </div>
                    </SelectItem>
                    <SelectItem value="fr-FR" className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>🇫🇷</span>
                        Français
                      </div>
                    </SelectItem>
                    <SelectItem value="en-US" className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>🇺🇸</span>
                        English
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Button */}
              <div className="lg:col-span-2">
                <Button 
                  onClick={handleApplyCustomRange}
                  disabled={!customDateFrom || !customDateTo}
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-none border-0"
                  style={{ color: '#ffffff !important' }}
                >
                  <BarChart3 className="h-4 w-4 mr-2 text-white" />
                  <span className="text-white font-semibold">Apply Filters</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Professional Quick Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-slate-700 dark:text-slate-300">Quick Time Ranges</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { value: '1d', label: 'Today', description: 'Last 24 hours', visual: '1D' },
                  { value: '7d', label: '7 Days', description: 'Past week', visual: '7D' },
                  { value: '30d', label: '30 Days', description: 'Past month', visual: '30D' },
                  { value: '90d', label: '90 Days', description: 'Past quarter', visual: '90D' },
                  { value: '365d', label: '1 Year', description: 'Past 12 months', visual: '1Y' },
                  { value: 'custom', label: 'Custom', description: 'User-defined period', visual: '••' }
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    onClick={() => handleQuickFilter(filter.value)}
                    variant="outline"
                    className={`h-16 flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all duration-200 group ${
                      dateRange === filter.value
                        ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-500 text-blue-700 dark:from-blue-900/40 dark:to-blue-800/40 dark:border-blue-400 dark:text-blue-300 shadow-md'
                        : 'border-slate-300 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
                    }`}
                    title={filter.description}
                  >
                    <span className="text-lg font-bold text-slate-600 dark:text-slate-400">{filter.visual}</span>
                    <span className="text-xs font-medium">{filter.label}</span>
                  </Button>
                ))}
              </div>
              
              {/* Clear Filters Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <X className="h-3 w-3 mr-1" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Modern Active Filter Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800">
                  <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active Filters</span>
                    <Badge variant="secondary" className="bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-600 text-xs font-medium">
                      {getFilterSummary()}
                    </Badge>
                    {locale !== 'all' && (
                      <Badge variant="secondary" className="bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-600 text-xs font-medium">
                        {locale === 'fr-FR' ? '🇫🇷 Français' : '🇺🇸 English'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Data refreshes automatically every 5 minutes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <RefreshCw className="h-3 w-3" />
                <span>Live Data</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-6">
            <div className="text-red-600 dark:text-red-400">
              <h3 className="font-semibold">Error loading GA4 data</h3>
              <p className="text-sm mt-1">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger 
            value="analytics" 
            className="flex items-center gap-2 analytics-tab"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="ip-management" 
            className="flex items-center gap-2 analytics-tab"
          >
            <Shield className="h-4 w-4" />
            IP Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {/* Visitor Overview Metrics */}
          {ga4Data && (
            <>
          {/* Enhanced KPI Cards with Period-over-Period Trend Indicators */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900">{ga4Data.totalViews.toLocaleString()}</div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${
                  (ga4Data.totalViewsChange || 0) >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {(ga4Data.totalViewsChange || 0) >= 0 ? "▲" : "▼"} {Math.abs(ga4Data.totalViewsChange || 0)}% vs previous period
                </div>
                <p className="text-xs text-blue-700">
                  Page views across site
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-transform hover:scale-105 relative bg-gradient-to-r from-green-50 to-green-100 border-green-200"
              onClick={handleModalOpen}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-900">Unique Visitors</CardTitle>
                <Users className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-green-900">{ga4Data.uniqueVisitors.toLocaleString()}</div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${
                  (ga4Data.uniqueVisitorsChange || 0) >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {(ga4Data.uniqueVisitorsChange || 0) >= 0 ? "▲" : "▼"} {Math.abs(ga4Data.uniqueVisitorsChange || 0)}% vs previous period
                </div>
                <p className="text-xs text-green-700">
                  Distinct visitors (IP-based)
                </p>
                <Eye className="absolute bottom-2 right-2 h-4 w-4 text-green-400" />
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-transform hover:scale-105 relative bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200"
              onClick={handleReturningModalOpen}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-900">Return Visitors</CardTitle>
                <UserCheck className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-purple-900">{ga4Data.returnVisitors.toLocaleString()}</div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${
                  (ga4Data.returnVisitorsChange || 0) >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {(ga4Data.returnVisitorsChange || 0) >= 0 ? "▲" : "▼"} {Math.abs(ga4Data.returnVisitorsChange || 0)}% vs previous period
                </div>
                <p className="text-xs text-purple-700">
                  Returning visitors
                </p>
                <Eye className="absolute bottom-2 right-2 h-4 w-4 text-purple-400" />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-900">Active Now</CardTitle>
                <MousePointer className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">{ga4Data.activeVisitors.toLocaleString()}</div>
                <div className="text-xs flex items-center gap-1 mt-1 text-orange-600">
                  ⚡ Live data
                </div>
                <p className="text-xs text-orange-700">
                  Currently browsing
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Video Performance Metrics with Trend Indicators */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-900">Video Plays</CardTitle>
                <Play className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">{ga4Data.totalVideoStarts.toLocaleString()}</div>
                <div className={`text-xs flex items-center gap-1 mt-1 ${
                  (ga4Data.videoStartsChange || 0) >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {(ga4Data.videoStartsChange || 0) >= 0 ? "▲" : "▼"} {Math.abs(ga4Data.videoStartsChange || 0)}% vs previous period
                </div>
                <p className="text-xs text-red-700">
                  Total video starts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(ga4Data.averageSessionDuration)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Time on site
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Video Completions</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ga4Data.totalCompletions.toLocaleString()}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Videos finished
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(ga4Data.completionRate)}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Video engagement
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Geographic Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Top Countries</span>
              </CardTitle>
              <CardDescription>Where your visitors come from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-w-md">
                {ga4Data.topCountries?.map((country, index) => (
                  <div key={country.country} className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold">
                      {index + 1}
                    </div>
                    <CountryFlag country={country.country} size={24} />
                    <span className="font-medium flex-1">{country.country}</span>
                    <div className="font-semibold text-right min-w-[3rem]">{(country.visitors || 0).toLocaleString()}</div>
                  </div>
                )) || <p className="text-gray-500">No geographic data available</p>}
              </div>
            </CardContent>
          </Card>

          {/* Admin Country Names Management */}
          <AdminCountryNamesCard />

          {/* Language & Traffic Sources */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Languages className="h-5 w-5" />
                  <span>Language Analysis</span>
                </CardTitle>
                <CardDescription>Site language choice vs browser language</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Column 1: Site Language */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">
                      Site Language Choice
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">Which MEMOPYK version they chose</p>
                    <div className="space-y-2">
                      {ga4Data.siteLanguageChoice?.map((lang) => {
                        const siteInfo = formatSiteLanguage(lang.language);
                        const isFrench = lang.language.toLowerCase() === 'french' || lang.language.toLowerCase().includes('fr');
                        return (
                          <div key={`site-${lang.language}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant={isFrench ? 'default' : 'secondary'}>
                                {siteInfo.flag} {siteInfo.display}
                              </Badge>
                              <span className="text-xs text-gray-600">{Math.ceil(lang.percentage)}%</span>
                            </div>
                            <div className="text-sm font-semibold text-right min-w-[3rem]">{(lang.visitors || 0).toLocaleString()}</div>
                          </div>
                        );
                      }) || <p className="text-xs text-gray-500">No site language data</p>}
                    </div>
                  </div>

                  {/* Column 2: Browser Language */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">
                      Browser Language
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">Visitor's browser language setting</p>
                    <div className="space-y-2">
                      {ga4Data.languageBreakdown?.map((lang) => {
                        const browserInfo = formatLanguage(lang.language);
                        return (
                          <div key={`browser-${lang.language}`} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant={browserInfo.variant}>
                                {browserInfo.flag} {browserInfo.display}
                              </Badge>
                              <span className="text-xs text-gray-600">{Math.ceil(lang.percentage)}%</span>
                            </div>
                            <div className="text-sm font-semibold text-right min-w-[3rem]">{(lang.visitors || 0).toLocaleString()}</div>
                          </div>
                        );
                      }) || <p className="text-xs text-gray-500">No browser language data</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Traffic Sources</span>
                </CardTitle>
                <CardDescription>How visitors found your site</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ga4Data.topReferrers?.map((ref, index) => (
                    <div key={ref.referrer || 'direct'} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400">
                          {index + 1}
                        </div>
                        <span className="font-medium truncate max-w-[200px]">
                          {ref.referrer || 'Direct Traffic'}
                        </span>
                      </div>
                      <div className="font-semibold">{ref.visitors?.toLocaleString() || 0}</div>
                    </div>
                  )) || <p className="text-gray-500">No referrer data available</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Videos */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Videos</CardTitle>
              <CardDescription>Videos ranked by total plays</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ga4Data.topVideos?.map((video, index) => (
                  <div key={video.videoId} className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{video.videoTitle}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {video.videoId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{video.plays.toLocaleString()} plays</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {video.completions.toLocaleString()} completed
                      </p>
                    </div>
                  </div>
                )) || <p className="text-gray-500">No video data available</p>}
              </div>
            </CardContent>
          </Card>

          {/* Total Watch Time Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Total Watch Time</CardTitle>
              <CardDescription>Accumulated viewing time across all videos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-center py-6">
                {formatDuration(ga4Data.totalWatchTimeSeconds)}
              </div>
              <p className="text-center text-gray-600 dark:text-gray-400">
                Total time viewers spent watching your videos
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Recent Visitors Details Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && handleModalClose()}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden relative">
            <div 
              className="p-6 border-b border-gray-200 dark:border-gray-700"
              style={{
                background: 'linear-gradient(135deg, #2A4759 0%, #89BAD9 100%)',
                color: '#ffffff'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3" style={{
                  color: '#ffffff'
                }}>
                  <Users style={{ width: '24px', height: '24px' }} />
                  Unique Visitors
                </div>
                <button
                  onClick={handleModalClose}
                  className="text-white hover:text-gray-200 transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {isLoadingVisitors ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Users style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>Loading visitors...</p>
                  </div>
                </div>
              ) : visitorsError ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Users style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#ef4444'
                    }} />
                    <p style={{ margin: 0, color: '#ef4444' }}>Error loading visitors:</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>{visitorsError.message}</p>
                  </div>
                </div>
              ) : recentVisitors && recentVisitors.length > 0 ? (
                <div className="space-y-4">
                  {recentVisitors.map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-sm font-medium">{visitor.country}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Language</span>
                          </div>
                          <Badge variant="outline">
                            {formatLanguage(visitor.language).flag} {formatLanguage(visitor.language).display}
                          </Badge>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Last Visit</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {getRelativeTime(visitor.last_visit)}
                          </div>
                        </div>

                        {visitor.session_duration && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Session</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatSessionDuration(visitor.session_duration)}
                            </div>
                          </div>
                        )}

                        {visitor.visit_count && visitor.visit_count > 1 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <UserCheck className="h-4 w-4 text-indigo-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Visits</span>
                            </div>
                            <Badge variant="secondary">{visitor.visit_count} visits</Badge>
                          </div>
                        )}

                        <div className="lg:col-span-3">
                          <div className="flex items-center gap-2 mb-2">
                            <MousePointer className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900 dark:text-white">IP & Browser</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div className="font-mono">{visitor.ip_address}</div>
                            <div className="text-xs mt-1 truncate" title={visitor.user_agent}>
                              {visitor.user_agent}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <Users style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No recent visitors found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Returning Visitors Details Modal */}
      {isReturningModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && handleReturningModalClose()}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden relative">
            <div 
              className="p-6 border-b border-gray-200 dark:border-gray-700"
              style={{
                background: 'linear-gradient(135deg, #2A4759 0%, #89BAD9 100%)',
                color: '#ffffff'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3" style={{
                  color: '#ffffff'
                }}>
                  <UserCheck style={{ width: '24px', height: '24px' }} />
                  Return Visitors
                </div>
                <button
                  onClick={handleReturningModalClose}
                  className="text-white hover:text-gray-200 transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {returningVisitors && returningVisitors.length > 0 ? (
                <div className="space-y-4">
                  {returningVisitors.map((visitor, index) => (
                    <div 
                      key={`${visitor.ip_address}-${index}`}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Location</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CountryFlag country={visitor.country_code || visitor.country} size={20} />
                            <div>
                              <div className="text-sm font-medium">{visitor.country}</div>
                              {visitor.city && visitor.region && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {visitor.city}, {visitor.region}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Languages className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Language</span>
                          </div>
                          <Badge variant="outline">
                            {formatLanguage(visitor.language).flag} {formatLanguage(visitor.language).display}
                          </Badge>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span className="font-medium text-gray-900 dark:text-white">Last Visit</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {getRelativeTime(visitor.last_visit)}
                          </div>
                        </div>

                        {visitor.session_duration && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-purple-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Session</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {formatSessionDuration(visitor.session_duration)}
                            </div>
                          </div>
                        )}

                        {visitor.visit_count && visitor.visit_count > 1 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <UserCheck className="h-4 w-4 text-indigo-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Return Visits</span>
                            </div>
                            <Badge variant="secondary">{visitor.visit_count} times</Badge>
                          </div>
                        )}

                        {visitor.previous_visit && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-gray-600" />
                              <span className="font-medium text-gray-900 dark:text-white">Previous Visit</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {getRelativeTime(visitor.previous_visit)}
                            </div>
                          </div>
                        )}

                        <div className="lg:col-span-3">
                          <div className="flex items-center gap-2 mb-2">
                            <MousePointer className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900 dark:text-white">IP & Browser</span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div className="font-mono">{visitor.ip_address}</div>
                            <div className="text-xs mt-1 truncate" title={visitor.user_agent}>
                              {visitor.user_agent}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center gap-3">
                    <UserCheck style={{ 
                      width: '48px', 
                      height: '48px',
                      color: '#d1d5db'
                    }} />
                    <p style={{ margin: 0 }}>No returning visitors found</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
          </TabsContent>

          <TabsContent value="ip-management" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  IP Management
                </CardTitle>
                <CardDescription>
                  Manage IP addresses excluded from analytics tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Admin IP Detection */}
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-900 dark:text-orange-300">Exclude Current IP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          refetchSettings();
                          refetchActiveIps();
                        }}
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const ipToExclude = "109.17.150.48";
                          addExcludedIpMutation.mutate({ 
                            ipAddress: ipToExclude, 
                            comment: "Admin - My Current IP (Manual)" 
                          });
                        }}
                        disabled={addExcludedIpMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        data-testid="button-exclude-current-ip-manual"
                      >
                        {addExcludedIpMutation.isPending ? (
                          <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Ban className="h-3 w-3 mr-1" />
                        )}
                        Exclude My IP (109.17.150.48)
                      </Button>
                    </div>
                  </div>
                  <div className="font-mono text-sm text-orange-800 dark:text-orange-400 mb-2">
                    Auto-detection: {currentAdminIp || "Failed"} → Using known IP: 109.17.150.48
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    IP auto-detection isn't working perfectly, but you can exclude your known IP address from the session logs.
                  </p>
                </div>

                {/* Add New Excluded IP */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Exclude New IP Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-ip">IP Address</Label>
                      <Input
                        id="new-ip"
                        placeholder="192.168.1.1"
                        value={newExcludedIp}
                        onChange={(e) => setNewExcludedIp(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ip-comment">Comment (Optional)</Label>
                      <Input
                        id="ip-comment"
                        placeholder="Admin office, My home IP..."
                        value={newIpComment}
                        onChange={(e) => setNewIpComment(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={() => addExcludedIpMutation.mutate({ ipAddress: newExcludedIp, comment: newIpComment })}
                        disabled={!newExcludedIp || addExcludedIpMutation.isPending}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        data-testid="button-exclude-ip"
                      >
                        {addExcludedIpMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            Excluding...
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-2" />
                            Exclude IP
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Currently Excluded IPs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Currently Excluded IPs</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        refetchSettings();
                      }}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh List
                    </Button>
                  </div>
                  {settingsLoading ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <span>Loading...</span>
                    </div>
                  ) : settings?.excludedIps && settings.excludedIps.length > 0 ? (
                    <div className="space-y-3">
                      {settings.excludedIps.map((excludedIp) => {
                        const ipObj = excludedIp as { ip: string; comment?: string; added_at?: string };
                        return (
                        <div key={ipObj.ip} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-mono text-sm font-medium">
                                {ipObj.ip}
                              </div>
                              {ipObj.comment && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {editingComment === ipObj.ip ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={tempComment}
                                        onChange={(e) => setTempComment(e.target.value)}
                                        className="text-xs"
                                        placeholder="Comment..."
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => updateIpCommentMutation.mutate({ 
                                          ipAddress: ipObj.ip, 
                                          comment: tempComment 
                                        })}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingComment(null);
                                          setTempComment('');
                                        }}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <span>{ipObj.comment}</span>
                                  )}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Added: {ipObj.added_at ? formatFrenchDateTime(new Date(ipObj.added_at)) : 'Unknown'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingComment(ipObj.ip);
                                  setTempComment(ipObj.comment || '');
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeExcludedIpMutation.mutate(ipObj.ip)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No excluded IP addresses
                    </div>
                  )}
                </div>

                {/* Active Viewer IPs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Active Viewer IPs</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        refetchActiveIps();
                      }}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh Active IPs
                    </Button>
                  </div>
                  {activeIpsLoading ? (
                    <div className="text-center py-4">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <span>Loading...</span>
                    </div>
                  ) : activeIps && activeIps.length > 0 ? (
                    <div className="space-y-3">
                      {activeIps.map((ip) => (
                        <div key={ip.ip_address} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Globe className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-sm">IP & Location</span>
                              </div>
                              <div className="font-mono text-sm">{ip.ip_address}</div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                <CountryFlag country={ip.country_code || 'Unknown'} />
                                {ip.city && ` ${ip.city}`}
                                {ip.region && `, ${ip.region}`}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-sm">Last Visit</span>
                              </div>
                              <div className="text-sm">{formatFrenchDateTime(new Date(ip.last_visit))}</div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-sm">Visits</span>
                              </div>
                              <div className="text-sm">{ip.visit_count} visits</div>
                            </div>
                            <div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setNewExcludedIp(ip.ip_address);
                                  setNewIpComment(`Active visitor from ${ip.country}`);
                                }}
                                className="w-full"
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Exclude
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No active viewer IPs found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Session Replays & Heatmaps Section */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-2">
            <SessionReplaysCard />
          </div>
          <div>
            <AdminCountryNamesCard />
          </div>
        </div>

        {/* Trending Graphs Section */}
        <TrendingGraphs 
          dateFrom={customDateFrom || (dateRange !== 'custom' ? undefined : customDateFrom)}
          dateTo={customDateTo || (dateRange !== 'custom' ? undefined : customDateTo)}
        />
    </div>
  );
}