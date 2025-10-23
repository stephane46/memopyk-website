// client/src/analytics/FiltersContext.tsx
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

export type LocaleOpt = "all"|"fr-FR"|"en-US";
type Filters = { startDate: string; endDate: string; locale: LocaleOpt };
type Ctx = Filters & { setFilters: (f: Partial<Filters>) => void };

const FiltersCtx = createContext<Ctx | null>(null);

const readFromURL = (): Filters => {
  const p = new URLSearchParams(window.location.search);
  const now = new Date();
  const sevenDaysAgo = new Date(Date.now() - 6*864e5); // 6 days back + today = 7 days
  
  const startDate = p.get("start") || sevenDaysAgo.toISOString().slice(0,10);
  const endDate   = p.get("end")   || now.toISOString().slice(0,10);
  const locale    = (p.get("loc") as LocaleOpt) || "all";
  
  const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  console.log('📅 FiltersContext - Default date range:');
  console.log('  Start date:', startDate);
  console.log('  End date:', endDate);
  console.log('  Days count:', days);
  console.log('  Locale:', locale);
  
  return { startDate, endDate, locale };
};

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Filters>(readFromURL());

  // write to URL on change (no reload)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    q.set("start", state.startDate);
    q.set("end", state.endDate);
    q.set("loc", state.locale);
    const url = `${window.location.pathname}?${q.toString()}`;
    window.history.replaceState(null, "", url);
  }, [state]);

  const value = useMemo<Ctx>(() => ({
    ...state,
    setFilters: (f) => setState(s => ({ ...s, ...f }))
  }), [state]);

  return <FiltersCtx.Provider value={value}>{children}</FiltersCtx.Provider>;
}

export const useDashboardFilters = () => {
  const ctx = useContext(FiltersCtx);
  if (!ctx) throw new Error("useDashboardFilters must be used within FiltersProvider");
  return ctx;
};