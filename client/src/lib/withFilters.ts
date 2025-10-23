// client/src/lib/withFilters.ts
import { GlobalFilter, ComparisonConfig, PeriodComparisonConfig } from "@/components/admin/GlobalFilterContext";

export function withFilters(
  url: string, 
  filters: GlobalFilter, 
  comparison?: ComparisonConfig, 
  periodComparison?: PeriodComparisonConfig
) {
  const u = new URL(url, window.location.origin);
  if (filters.range.from) u.searchParams.set("from", filters.range.from);
  if (filters.range.to) u.searchParams.set("to", filters.range.to);
  if (filters.language) u.searchParams.set("lang", filters.language);
  if (filters.source) u.searchParams.set("source", filters.source);
  if (filters.device) u.searchParams.set("device", filters.device);
  
  // Add comparison parameters
  if (comparison?.enabled) {
    u.searchParams.set("compare", comparison.mode);
    if (comparison.mode === "period" && periodComparison) {
      u.searchParams.set("periodMode", periodComparison.mode);
    }
  }
  
  return u.pathname + u.search;
}