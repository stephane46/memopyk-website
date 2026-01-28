import { useEffect, useState, useCallback } from "react";

type FunnelData = { plays: number; half: number; completes: number };

export function useFunnel(params: { startDate: string; endDate: string; locale: string }) {
  const { startDate, endDate, locale } = params;
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0); // trigger refetch

  const reload = useCallback(() => setBump(b => b + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    // Fetch funnel data directly - now returns {plays, half, completes} format
    fetch(`/api/ga4/funnel?startDate=${startDate}&endDate=${endDate}&locale=${locale}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(data => { 
        if (alive) {
          setData(data);
        }
      })
      .catch(e => { 
        if (alive) {
          setError(String(e.message || e));
          setData(null); // Reset to null on error
        }
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [startDate, endDate, locale, bump]);

  return { data, loading, error, reload };
}