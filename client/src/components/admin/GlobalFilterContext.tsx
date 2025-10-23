// client/src/components/admin/GlobalFilterContext.tsx
import * as React from "react";

export type DateRange = { from?: string; to?: string };
export type GlobalFilter = {
  range: DateRange;
  language?: string;
  source?: string;
  device?: string;
  country?: string;
  countryIso3?: string;
};

export type ComparisonConfig = {
  enabled: boolean;
  mode: "period" | "language" | "device" | "source";
};

export type PeriodMode = "week" | "month" | "auto";

export type PeriodComparisonConfig = {
  enabled: boolean;
  mode: PeriodMode;
};

export const GlobalFilterContext = React.createContext<{
  filters: GlobalFilter;
  setFilters: (f: GlobalFilter) => void;
  comparison: ComparisonConfig;
  setComparison: (c: ComparisonConfig) => void;
  periodComparison: PeriodComparisonConfig;
  setPeriodComparison: (p: PeriodComparisonConfig) => void;
}>({
  filters: { range: {} },
  setFilters: () => {},
  comparison: { enabled: false, mode: "period" },
  setComparison: () => {},
  periodComparison: { enabled: false, mode: "week" },
  setPeriodComparison: () => {},
});

export function GlobalFilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<GlobalFilter>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("global-filters") || "{}");
      return {
        range: saved.range || {},
        language: saved.language,
        source: saved.source,
        device: saved.device,
        country: saved.country,
        countryIso3: saved.countryIso3
      };
    } catch {
      return { range: {} };
    }
  });

  const [comparison, setComparison] = React.useState<ComparisonConfig>(() => {
    try {
      return JSON.parse(localStorage.getItem("global-comparison") || '{"enabled": false, "mode": "period"}');
    } catch {
      return { enabled: false, mode: "period" };
    }
  });

  const [periodComparison, setPeriodComparison] = React.useState<PeriodComparisonConfig>(() => {
    try {
      return JSON.parse(localStorage.getItem("global-period-comparison") || '{"enabled": false, "mode": "week"}');
    } catch {
      return { enabled: false, mode: "week" };
    }
  });

  React.useEffect(() => {
    localStorage.setItem("global-filters", JSON.stringify(filters));
  }, [filters]);

  React.useEffect(() => {
    localStorage.setItem("global-comparison", JSON.stringify(comparison));
  }, [comparison]);

  React.useEffect(() => {
    localStorage.setItem("global-period-comparison", JSON.stringify(periodComparison));
  }, [periodComparison]);

  return (
    <GlobalFilterContext.Provider value={{ filters, setFilters, comparison, setComparison, periodComparison, setPeriodComparison }}>
      {children}
    </GlobalFilterContext.Provider>
  );
}