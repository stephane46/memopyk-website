import { useDashboardFilters } from "@/analytics/FiltersContext";
import { useKpis } from "@/hooks/useKpis";
import { ErrorBlock } from "./ErrorBlock";
import { formatInt, formatSeconds, formatPercent } from "@/utils/format";

export function KpiStrip() {
  const { startDate, endDate, locale } = useDashboardFilters();
  const { loading, error, data, reload } = useKpis({ startDate, endDate, locale });

  // Debug: Check if data is properly structured
  if (data && data.plays) {
    console.log('✅ KpiStrip - PLAYS VALUE:', data.plays.value);
  } else {
    console.log('❌ KpiStrip - NO PLAYS DATA:', data);
  }

  // Show loading state while data is being fetched
  if (loading || !data) return <div className="p-4 text-gray-500 text-sm">Loading KPIs…</div>;
  if (error) return <ErrorBlock message={`KPI data temporarily unavailable: ${error}`} onRetry={reload} compact />;

  const Card = ({ label, value, delta, fmt = (v:any)=>v }: {
    label: string;
    value: number;
    delta: number;
    fmt?: (v: any) => string;
  }) => (
    <div className="p-4 rounded-2xl shadow border bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{fmt(value)}</div>
      <div className={`text-xs ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
        {delta >= 0 ? "▲" : "▼"} {formatPercent(delta, 1)}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Card label="Plays" value={data.plays.value} delta={data.plays.delta} fmt={formatInt} />
      <Card label="Avg Watch Time" value={data.avgWatchSeconds.value} delta={data.avgWatchSeconds.delta} fmt={formatSeconds} />
      <Card label="Completion Rate" value={data.completionRate.value} delta={data.completionRate.delta} fmt={(v)=>formatPercent(v,1)} />
      <div className="p-4 rounded-2xl shadow border bg-white">
        <div className="text-xs text-gray-500">Top Locale</div>
        <div className="text-2xl font-semibold">{data.topLocale.locale || "n/a"}</div>
        <div className="text-xs text-gray-500">{formatInt(data.topLocale.plays)} plays</div>
      </div>
    </div>
  );
}