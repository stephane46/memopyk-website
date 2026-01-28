import { useEffect, useState, useCallback } from "react";

type TrendData = { date: string; plays: number; avgWatch: number };

export function useTrend(params: { startDate: string; endDate: string; locale: string }) {
  const { startDate, endDate, locale } = params;
  const [data, setData] = useState<TrendData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // trigger refetch

  const reload = useCallback(() => setBump(b => b + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    // Fetch trend data from backend
    fetch(`/api/ga4/trend?startDate=${startDate}&endDate=${endDate}&locale=${locale}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(data => { 
        if (alive) {
          // Ensure we always set an array, even if API returns something unexpected
          setData(Array.isArray(data) ? data : []);
        }
      })
      .catch(e => { 
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