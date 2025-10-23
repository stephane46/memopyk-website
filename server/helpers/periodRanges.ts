import { startOfISOWeek, endOfISOWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";

export type PeriodMode = "week" | "month" | "auto";

export interface PeriodRange {
  from: string;
  to: string;
}

export interface PeriodComparison {
  baseline: PeriodRange;
  comparison: PeriodRange;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computePeriods(params: {
  mode: PeriodMode;
  from?: string;
  to?: string;
}): PeriodComparison {
  const now = new Date(); // UTC, adjust if needed
  const useAuto = params.mode === "auto" && params.from && params.to;

  if (params.mode === "week" || (!useAuto && params.mode === "auto")) {
    // Week mode (ISO weeks, Monday–Sunday)
    const thisWeekStart = startOfISOWeek(now);
    const thisWeekEnd = endOfISOWeek(now);
    const lastWeekStart = startOfISOWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfISOWeek(subWeeks(now, 1));
    
    return {
      baseline: { from: iso(thisWeekStart), to: iso(thisWeekEnd) },
      comparison: { from: iso(lastWeekStart), to: iso(lastWeekEnd) }
    };
  }

  if (params.mode === "month") {
    // Month mode (calendar months)
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    
    return {
      baseline: { from: iso(thisMonthStart), to: iso(thisMonthEnd) },
      comparison: { from: iso(lastMonthStart), to: iso(lastMonthEnd) }
    };
  }

  // AUTO from manual range → previous equal-length range
  const from = new Date(params.from! + "T00:00:00Z");
  const to = new Date(params.to! + "T00:00:00Z");
  const days = Math.max(1, Math.round((+to - +from) / 86400000) + 1);
  
  const cmpTo = new Date(from);
  cmpTo.setUTCDate(cmpTo.getUTCDate() - 1);
  const cmpFrom = new Date(cmpTo);
  cmpFrom.setUTCDate(cmpFrom.getUTCDate() - (days - 1));
  
  return {
    baseline: { from: iso(from), to: iso(to) },
    comparison: { from: iso(cmpFrom), to: iso(cmpTo) }
  };
}