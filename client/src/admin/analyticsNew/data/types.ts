/**
 * 🚨 CENTRALIZED ANALYTICS TYPES - NO DUPLICATES ALLOWED 🚨
 * 
 * ⛔ RULE: These are the ONLY type definitions for analytics data.
 * ⛔ RULE: DO NOT create duplicate interfaces in other files.
 * ⛔ RULE: If you need a new type, add it here and import it everywhere.
 * 
 * Duplicate types cause:
 * - Version mismatches between components
 * - Breaking changes when APIs evolve
 * - Inconsistent data transformations
 */

export type TrendPoint = { date: string; value: number };

export type KpisResponse = {
  kpis: {
    // Technical metrics (Row 2)
    sessions: { value: number; trend: TrendPoint[]; change?: number };
    plays: { value: number; trend: TrendPoint[]; change?: number };
    completions: { value: number; trend: TrendPoint[]; change?: number };
    avgWatch: { value: number; trend: TrendPoint[]; change?: number };
    // Visitor-focused metrics (Row 1) 
    totalViews: { value: number; trend: TrendPoint[]; change?: number };
    uniqueVisitors: { value: number; trend: TrendPoint[]; change?: number };
    returnVisitors: { value: number; trend: TrendPoint[]; change?: number };
  };
  timestamp?: string;
  cached?: boolean;
};

export interface TopVideoRow {
  videoId: string;
  title: string;
  views: number;
  uniqueViewers: number;
  averageWatchTime: number;
  completionRate: number;
  engagement: number;
  thumbnail?: string;
  duration?: number;
  // Legacy aliases for backward compatibility
  plays?: number;  // alias for views
  completions?: number;  // alias for uniqueViewers at completion rate
  avgEngagement?: number; // alias for averageWatchTime
}

export interface TopVideosData {
  videos: TopVideoRow[];
  totalViews: number;
  totalUniqueViewers: number;
  averageCompletionRate: number;
}

export type TopVideosResponse = { 
  topVideos: TopVideoRow[];
  timestamp?: string;
  cached?: boolean;
};

export type ProgressBucket = 10 | 25 | 50 | 75 | 90;

export type VideoFunnelResponse = {
  funnel: Array<{ bucket: ProgressBucket; count: number }>;
  timestamp?: string;
  cached?: boolean;
};

export type ReportParams = {
  report: "kpis" | "topVideos" | "videoFunnel" | "cta";
  videoId?: string;
  preset?: "today" | "yesterday" | "7d" | "30d" | "90d";
  startDate?: string; // ISO
  endDate?: string;   // ISO
  lang?: string;      // locale
  country?: string;   // ISO2
  sinceDate?: string; // ISO - for exclusion filters
};

// CTA Analytics types
export interface CtaBreakdown {
  ctaId: string;
  ctaName: string;
  totalClicks: number;
  languageBreakdown: {
    'fr-FR': number;
    'en-US': number;
  };
  sectionBreakdown: {
    [sectionName: string]: number;
  };
  dailyTrend: Array<{
    date: string;
    clicks: number;
  }>;
}

export interface CtaAnalyticsData {
  totalClicks: number;
  timeRange: {
    start: string;
    end: string;
  };
  ctas: {
    book_call: CtaBreakdown;
    quick_quote: CtaBreakdown;
  };
  languageTotals: {
    'fr-FR': number;
    'en-US': number;
  };
  dailyTotals: Array<{
    date: string;
    formattedDate: string;
    book_call: number;
    quick_quote: number;
    total: number;
  }>;
  topSections: Array<{
    sectionName: string;
    clicks: number;
    percentage: number;
  }>;
}

export type CtaAnalyticsResponse = {
  ctaData: CtaAnalyticsData;
  timestamp?: string;
  cached?: boolean;
};