// client/src/hooks/useTopVideos.ts
import { useEffect, useState, useCallback } from "react";
import { buildAnalyticsParams, buildAnalyticsUrl } from '../admin/analyticsNew/data/analyticsFilters';

export type TopVideoRow = {
  video_id: string;
  title: string;
  plays: number;
  avgWatchSeconds: number;
  reach50Pct: number;
  completePct: number;
};

export function useTopVideos(params: { startDate: string; endDate: string; locale: "all" | "fr-FR" | "en-US" }) {
  const { startDate, endDate, locale } = params;
  const [data, setData] = useState<TopVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // trigger refetch

  const reload = useCallback(() => setBump(b => b + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    // ✅ CRITICAL FIX: Use centralized parameter building to ensure locale is sent correctly
    const filterState = {
      datePreset: 'custom',
      start: startDate,
      end: endDate,
      sinceDate: undefined,
      sinceDateEnabled: false,
      language: locale,
      country: 'all',
      videoId: 'all'
    };

    const filterParams = buildAnalyticsParams('topVideos', filterState);
    const url = buildAnalyticsUrl('/api/ga4/top-videos', filterParams);

    console.log('🔍 useTopVideos - URL with centralized params:', url);

    fetch(url)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => { 
        if (alive) {
          // Ensure we always set an array, even if API returns something unexpected
          setData(Array.isArray(json) ? json : []);
        }
      })
      .catch((e) => { 
        if (alive) {
          setError(String(e.message || e));
          setData([]); // Reset to empty array on error
        }
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [startDate, endDate, locale, bump]);

  return { data, loading, error, reload };
}