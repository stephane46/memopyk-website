import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { buildAnalyticsParams, buildAnalyticsUrl } from '../admin/analyticsNew/data/analyticsFilters';
import { useAnalyticsNewFilters } from '../admin/analyticsNew/analyticsNewFilters.store';

type Kpis = {
  plays: number;
  completes: number;
  totals: { watchTimeSeconds: number };
  avgWatchSeconds: number;
  completionRate: number; // 0–100
  topLocale: { locale: string; plays: number };
};

function ymd(d: Date) { return d.toISOString().slice(0,10); }

function prevPeriod(startYmd: string, endYmd: string) {
  const start = new Date(startYmd);
  const end = new Date(endYmd);
  const days = Math.round((+end - +start) / 86400000) + 1;
  const prevEnd = new Date(+start - 86400000);
  const prevStart = new Date(+prevEnd - (days - 1) * 86400000);
  return { start: ymd(prevStart), end: ymd(prevEnd) };
}

async function fetchKpis(filterState: any, signal?: AbortSignal): Promise<Kpis> {
  // ✅ CRITICAL FIX: Use centralized parameter building to ensure locale is sent correctly
  const filterParams = buildAnalyticsParams('kpis', filterState);
  const url = buildAnalyticsUrl('/api/ga4/kpis', filterParams);
  
  console.log('🔍 useKpis - URL with centralized params:', url);
  
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
  const ga4Data = await res.json();
  
  // Return authentic GA4 data directly - if it's 0, that's the real data
  return ga4Data;
}

export function useKpis(params: { startDate: string; endDate: string; locale: "all"|"fr-FR"|"en-US" }) {
  const { startDate, endDate, locale } = params;
  const [current, setCurrent] = useState<Kpis | null>(null);
  const [previous, setPrevious] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // trigger refetch

  const reload = useCallback(() => setBump(b => b + 1), []);

  // Ref to store the current abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let alive = true;
    setLoading(true);
    setError(null);
    
    const { start: ps, end: pe } = prevPeriod(startDate, endDate);

    // ✅ CRITICAL FIX: Build filter state for centralized parameter system
    const currentFilterState = {
      datePreset: 'custom',
      start: startDate,
      end: endDate,
      sinceDate: undefined,
      sinceDateEnabled: false,
      language: locale,
      country: 'all',
      videoId: 'all'
    };

    const previousFilterState = {
      ...currentFilterState,
      start: ps,
      end: pe
    };

    Promise.all([
      fetchKpis(currentFilterState, abortController.signal), 
      fetchKpis(previousFilterState, abortController.signal)
    ])
      .then(([cur, prev]) => { 
        if (alive && !abortController.signal.aborted) { 
          console.log('🔍 useKpis - RAW DATA:');
          console.log('  Current API response:', JSON.stringify(cur, null, 2));
          console.log('  Previous API response:', JSON.stringify(prev, null, 2));
          console.log('  Current plays value:', cur?.plays);
          console.log('  Previous plays value:', prev?.plays);
          setCurrent(cur); 
          setPrevious(prev); 
        }
      })
      .catch(e => { 
        if (alive && !abortController.signal.aborted && e.name !== 'AbortError') {
          setError(String(e.message || e)); 
        }
      })
      .finally(() => { if (alive && !abortController.signal.aborted) setLoading(false); });

    return () => { 
      alive = false;
      abortController.abort();
    };
  }, [startDate, endDate, locale, bump]);

  const withDeltas = useMemo(() => {
    if (!current) return null;
    if (!previous) {
      // If we have current but no previous data, show current with 0% delta
      const result = {
        plays: { value: current.plays ?? 0, delta: 0 },
        avgWatchSeconds: { value: current.avgWatchSeconds ?? 0, delta: 0 },
        completionRate: { value: current.completionRate ?? 0, delta: 0 },
        topLocale: current.topLocale ?? { locale: 'n/a', plays: 0 },
        watchTimeSeconds: { value: current.totals?.watchTimeSeconds ?? 0, delta: 0 }
      };
      return result;
    }

    // Improved delta calculation that handles no historical data gracefully
    const delta = (now: number, prev: number) => {
      if (prev === 0) {
        // If no previous data and current has data, show "New" instead of 100%
        return now > 0 ? 100 : 0;
      }
      return ((now - prev) / prev) * 100;
    };

    const result = {
      plays: { value: current.plays ?? 0, delta: delta(current.plays ?? 0, previous.plays ?? 0) },
      avgWatchSeconds: {
        value: current.avgWatchSeconds ?? 0,
        delta: delta(current.avgWatchSeconds ?? 0, previous.avgWatchSeconds ?? 0)
      },
      completionRate: {
        value: current.completionRate ?? 0,
        delta: delta(current.completionRate ?? 0, previous.completionRate ?? 0)
      },
      topLocale: current.topLocale ?? { locale: 'n/a', plays: 0 },
      watchTimeSeconds: {
        value: current.totals?.watchTimeSeconds ?? 0,
        delta: delta(current.totals?.watchTimeSeconds ?? 0, previous.totals?.watchTimeSeconds ?? 0)
      }
    };
    
    console.log('🔍 useKpis - PROCESSED DATA:');
    console.log('  Final result plays:', result.plays.value);
    console.log('  Raw current plays:', current.plays);
    console.log('  Raw previous plays:', previous.plays);
    console.log('  Complete result:', JSON.stringify(result, null, 2));
    
    return result;
  }, [current, previous]);

  return { loading, error, data: withDeltas, reload };
}