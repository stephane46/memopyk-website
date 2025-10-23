import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DateTime } from 'luxon';

export interface DatePreset {
  key: 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom';
  label: string;
  days?: number;
}

export interface AnalyticsNewFilters {
  // Date filters
  datePreset: DatePreset['key'];
  customDateStart: string;
  customDateEnd: string;
  sinceDate: string;
  sinceDateEnabled: boolean;
  
  // Segmentation filters
  language: string;
  country: string;
  
  // UI state
  isLoading: boolean;
  error: string | null;
}

interface AnalyticsNewFiltersStore extends AnalyticsNewFilters {
  // Actions
  setDatePreset: (preset: DatePreset['key']) => void;
  setCustomDateRange: (start: string, end: string) => void;
  setSinceDate: (date: string) => void;
  setSinceDateEnabled: (enabled: boolean) => void;
  setLanguage: (language: string) => void;
  setCountry: (country: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Computed
  getDateRange: () => { start: string; end: string };
  getActiveFilters: () => Partial<AnalyticsNewFilters>;
}

// Get yesterday's date in YYYY-MM-DD format in Paris timezone
const getYesterdayDate = () => {
  const ZONE = 'Europe/Paris';
  return DateTime.now().setZone(ZONE).minus({ days: 1 }).toFormat('yyyy-LL-dd');
};

// Removed unused getTodayDate function - using Paris timezone consistently

const defaultState: AnalyticsNewFilters = {
  datePreset: '7d',
  customDateStart: '',
  customDateEnd: '',
  sinceDate: getYesterdayDate(), // Default to yesterday in Paris timezone
  sinceDateEnabled: false, // Disable start date filter by default to use preset
  language: 'all',
  country: 'all',
  isLoading: false,
  error: null,
};

export const useAnalyticsNewFilters = create<AnalyticsNewFiltersStore>()(
  // Add persistence with localStorage
  persist(
    (set, get) => ({
      ...defaultState,

      setDatePreset: (preset) => {
        set({ datePreset: preset });
        if (preset !== 'custom') {
          set({ customDateStart: '', customDateEnd: '' });
        }
      },

      setCustomDateRange: (start, end) => {
        set({ 
          customDateStart: start, 
          customDateEnd: end,
          datePreset: 'custom'
        });
      },

      setSinceDate: (date) => {
        // Normalize date to ISO format (YYYY-MM-DD) regardless of input format
        const normalizedDate = (() => {
          if (!date) return '';
          
          const ZONE = 'Europe/Paris';
          
          // Try parsing DD/MM/YYYY format first (common from date pickers)
          const ddMMYYYY = DateTime.fromFormat(date, 'dd/MM/yyyy', { zone: ZONE });
          if (ddMMYYYY.isValid) {
            return ddMMYYYY.toFormat('yyyy-LL-dd');
          }
          
          // Try ISO format (YYYY-MM-DD)
          const isoDate = DateTime.fromFormat(date, 'yyyy-LL-dd', { zone: ZONE });
          if (isoDate.isValid) {
            return date; // Already in correct format
          }
          
          // Try parsing as Date object or other formats
          const parsed = DateTime.fromJSDate(new Date(date), { zone: ZONE });
          if (parsed.isValid) {
            return parsed.toFormat('yyyy-LL-dd');
          }
          
          console.warn('setSinceDate: Could not parse date, storing as-is:', date);
          return date;
        })();
        
        set({ sinceDate: normalizedDate });
      },
      setSinceDateEnabled: (enabled) => set({ sinceDateEnabled: enabled }),

      setLanguage: (language) => {
        console.log('🔧 LANGUAGE CHANGED:', language, '→', (language || 'all').toLowerCase());
        set({ language: (language || 'all').toLowerCase() });
      },
      setCountry: (country) => set({ country }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      reset: () => set(defaultState),

  getDateRange: () => {
    const state = get();
    const ZONE = 'Europe/Paris';
    const todayParis = DateTime.now().setZone(ZONE).startOf('day');
    
    let dateRange: { start: string; end: string };
    
    if (state.datePreset === 'custom') {
      // If custom dates are empty, fallback to today
      if (!state.customDateStart || !state.customDateEnd) {
        const todayStr = todayParis.toFormat('yyyy-LL-dd');
        dateRange = {
          start: todayStr,
          end: todayStr
        };
      } else {
        dateRange = {
          start: state.customDateStart,
          end: state.customDateEnd
        };
      }
    } else if (state.datePreset === 'today') {
      const todayStr = todayParis.toFormat('yyyy-LL-dd');
      const tomorrowStr = todayParis.plus({ days: 1 }).toFormat('yyyy-LL-dd');
      dateRange = {
        start: todayStr,
        end: tomorrowStr // Exclusive end date (matches server logic)
      };
    } else if (state.datePreset === 'yesterday') {
      const yesterdayStr = todayParis.minus({ days: 1 }).toFormat('yyyy-LL-dd');
      const todayStr = todayParis.toFormat('yyyy-LL-dd');
      dateRange = {
        start: yesterdayStr,
        end: todayStr // Exclusive end date (matches server logic)
      };
    } else {
      // ✅ CRITICAL FIX: Match server computeParisWindow logic exactly
      // Server uses: 7d = today minus 6 days, 30d = today minus 29 days, 90d = today minus 89 days
      const days = state.datePreset === '7d' ? 6 : state.datePreset === '30d' ? 29 : 89;
      const startDate = todayParis.minus({ days });
      
      dateRange = {
        start: startDate.toFormat('yyyy-LL-dd'),
        end: todayParis.toFormat('yyyy-LL-dd')
      };
    }
    
    // 🔧 FIX: Apply Date Filter when enabled - exclude data BEFORE the specified date
    if (state.sinceDateEnabled && state.sinceDate) {
      try {
        // Use proper DateTime comparison instead of string comparison
        const ZONE = 'Europe/Paris';
        const sinceDateTime = DateTime.fromFormat(state.sinceDate, 'yyyy-LL-dd', { zone: ZONE });
        const startDateTime = DateTime.fromFormat(dateRange.start, 'yyyy-LL-dd', { zone: ZONE });
        const endDateTime = DateTime.fromFormat(dateRange.end, 'yyyy-LL-dd', { zone: ZONE });
        
        if (sinceDateTime.isValid && startDateTime.isValid && endDateTime.isValid) {
          // Only override start date if the exclusion date is AFTER the calculated start
          // This excludes data before the specified date
          if (sinceDateTime > startDateTime) {
            dateRange.start = state.sinceDate;
            
            // 🔧 CRITICAL FIX: If exclusion date is after the end date, extend end date to exclusion date
            // This prevents backwards date ranges (start > end) that return 0 results
            if (sinceDateTime > endDateTime) {
              dateRange.end = state.sinceDate;
            }
          }
        } else {
          console.warn('getDateRange: Invalid date format in sinceDate comparison', {
            sinceDate: state.sinceDate,
            rangeStart: dateRange.start,
            rangeEnd: dateRange.end,
            sinceValid: sinceDateTime.isValid,
            startValid: startDateTime.isValid,
            endValid: endDateTime.isValid
          });
        }
      } catch (error) {
        console.error('getDateRange: Error in date comparison:', error);
      }
    }
    
    return dateRange;
  },

  getActiveFilters: () => {
    const state = get();
    const filters: Partial<AnalyticsNewFilters> = {};
    
    if (state.language !== 'all') filters.language = state.language;
    if (state.country !== 'all') filters.country = state.country;
    if (state.sinceDateEnabled && state.sinceDate) filters.sinceDate = state.sinceDate;
    
    return filters;
  },
    }),
    {
      name: 'analytics-new-filters', // localStorage key
      partialize: (state) => ({
        sinceDate: state.sinceDate,
        sinceDateEnabled: state.sinceDateEnabled,
        datePreset: state.datePreset,
        customDateStart: state.customDateStart,
        customDateEnd: state.customDateEnd,
        language: state.language,
        country: state.country,
      }),
    }
  )
);

// Helper function to format dates for active window display
export const formatParisDateWindow = (start: string, end: string): string => {
  const ZONE = 'Europe/Paris';
  
  try {
    // Handle empty or undefined inputs
    if (!start || !end) {
      console.warn('formatParisDateWindow: Missing dates', { start, end });
      return 'Missing date';
    }
    
    // Handle various input formats: YYYY-MM-DD, ISO strings, etc.
    const parseDate = (dateStr: string) => {
      // If it's already a valid ISO string, use it
      if (dateStr.includes('T')) {
        return DateTime.fromISO(dateStr).setZone(ZONE);
      }
      // Otherwise assume YYYY-MM-DD format and convert to proper DateTime
      const dt = DateTime.fromFormat(dateStr, 'yyyy-LL-dd', { zone: ZONE });
      return dt.isValid ? dt : DateTime.fromISO(dateStr).setZone(ZONE);
    };
    
    const startDate = parseDate(start);
    const endDate = parseDate(end);
    
    // Check if parsing was successful
    if (!startDate.isValid || !endDate.isValid) {
      console.error('formatParisDateWindow: Invalid date format:', { 
        start, 
        end, 
        startValid: startDate.isValid, 
        endValid: endDate.isValid,
        startError: startDate.invalidExplanation,
        endError: endDate.invalidExplanation 
      });
      return `Invalid dates: ${start} - ${end}`;
    }
    
    // English formatting: DD MMMM YYYY
    const formatEnglish = (date: DateTime) => date.setLocale('en').toFormat('dd LLLL yyyy');
    
    if (start === end) {
      // Single day
      return formatEnglish(startDate);
    } else {
      // Date range
      return `${formatEnglish(startDate)} – ${formatEnglish(endDate)}`;
    }
  } catch (error) {
    console.error('formatParisDateWindow: Exception:', error, { start, end });
    return 'Formatting error';
  }
};

export const DATE_PRESETS: DatePreset[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'custom', label: 'Custom range' },
];